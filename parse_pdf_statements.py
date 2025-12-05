import os
import re
import json
import uuid
from datetime import datetime
import sys
import unicodedata # Import for string normalization
import calendar # Import for calendar operations

# Output SQL file for statements and positions
output_sql_file = 'generated_statements_positions.sql'
# Investor IDs JSON file
investor_ids_file = 'investor_ids.json'
# Directory containing PDF reports (for storage_path reference)
reports_dir = 'REPORTS'

# Load investor IDs
try:
    with open(investor_ids_file, 'r', encoding='utf-8') as f:
        investor_ids = json.load(f)
except FileNotFoundError:
    print(f"Error: {investor_ids_file} not found. Run parse_csv_transactions.py first.")
    sys.exit(1)

# Helper function to normalize strings (remove accents and standardize cases)
def normalize_string(text):
    if not isinstance(text, str):
        return text
    # Convert to lowercase, normalize to NFD (canonical decomposition) and remove combining characters (accents)
    normalized_text = unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode('utf-8')
    return normalized_text.strip()

def parse_pdf_content_and_generate_sql(ocr_text, filename):
    sql_statements = []

    # Map investor_ids to normalized keys for easier lookup
    normalized_investor_ids_map = {normalize_string(name): (name, id) for name, id in investor_ids.items()}

    # Extract Investor Name
    investor_name_match = re.search(r'ATTN: (.*)', ocr_text, re.IGNORECASE)
    full_attn_line = investor_name_match.group(1).strip() if investor_name_match else "Unknown Investor"

    # Attempt to find investor name in a more structured way
    candidate_name = full_attn_line

    # Remove common legal/address phrases early
    cleaned_candidate = re.sub(r'TRUSTEE OF THE .*? REVOCABLE TRUST UAD .*?', '', candidate_name, flags=re.IGNORECASE)
    cleaned_candidate = re.sub(r'\d{1,4}[A-Z]{0,2} [A-Z].*$', '', cleaned_candidate) # Remove address at end
    cleaned_candidate = re.sub(r', Director', '', cleaned_candidate) # Remove "Director"
    cleaned_candidate = re.sub(r'INDIGO DIGITAL ASSET FUND LP', '', cleaned_candidate, flags=re.IGNORECASE) # Remove fund name
    cleaned_candidate = re.sub(r'(\s+-\s+.*)|(\s+–\s+.*)', '', cleaned_candidate) # Remove hyphenated suffixes
    cleaned_candidate = cleaned_candidate.strip()

    investor_name_from_pdf = ""
    # Try to match the cleaned candidate against normalized investor IDs
    normalized_cleaned_candidate = normalize_string(cleaned_candidate)

    # First, try to find an exact match of the normalized cleaned candidate
    if normalized_cleaned_candidate in normalized_investor_ids_map:
        investor_name_from_pdf = normalized_investor_ids_map[normalized_cleaned_candidate][0]
    else:
        # If not exact, try partial matches
        for normalized_stored_name, (original_stored_name, stored_id) in normalized_investor_ids_map.items():
            if normalized_stored_name in normalized_cleaned_candidate or normalized_cleaned_candidate in normalized_stored_name:
                investor_name_from_pdf = original_stored_name
                break
    
    # If not found yet, try more generic name extraction if "Trustee of" type wording is present
    if not investor_name_from_pdf:
        trustee_match = re.search(r'(?:ATTN:)?\s*(.*?)\s*TRUSTEE OF THE', full_attn_line, re.IGNORECASE)
        if trustee_match:
            potential_name = trustee_match.group(1).strip()
            potential_name = re.sub(r'\s+-\s+.*', '', potential_name)
            potential_name = re.sub(r'UAD.*', '', potential_name).strip()
            
            normalized_potential_name = normalize_string(potential_name)
            for normalized_stored_name, (original_stored_name, stored_id) in normalized_investor_ids_map.items():
                if normalized_stored_name in normalized_potential_name or normalized_potential_name in normalized_stored_name:
                    investor_name_from_pdf = original_stored_name
                    break
    
    # If investor name from PDF is still not found in existing investor_ids,
    # generate a new UUID and add a profiles INSERT statement
    if investor_name_from_pdf not in investor_ids:
        new_investor_id = str(uuid.uuid4())
        
        # Ensure investor_name_from_pdf is not empty for the new investor entry
        # Fallback to a sanitized version of the filename if investor_name_from_pdf is empty
        if not investor_name_from_pdf or investor_name_from_pdf == "Unknown Investor":
            # Sanitize filename for a more descriptive fallback
            sanitized_filename_name = re.sub(r'[^a-zA-Z\s]', '', filename.replace('Reporting_YieldFund - ', '').replace('.pdf', '')).strip()
            if sanitized_filename_name:
                investor_name_from_pdf = sanitized_filename_name
            else:
                investor_name_from_pdf = "Unknown Investor " + str(uuid.uuid4())[:8] # Last resort unique name

        # Clean up investor_name for display and email
        clean_name_for_email = re.sub(r'[^a-zA-Z\s]', '', investor_name_from_pdf).strip() # Use investor_name_from_pdf here
        first_name = clean_name_for_email.split(' ')[0] if ' ' in clean_name_for_email else clean_name_for_email
        last_name = clean_name_for_email.split(' ')[-1] if ' ' in clean_name_for_email and len(clean_name_for_email.split(' ')) > 1 else ''
        email = f'{first_name.lower().replace(" ","")}.{last_name.lower().replace(" ","")}@example.com' if last_name else f'{first_name.lower().replace(" ","")}@example.com'
        
        sql_statements.append(f"""
INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
VALUES (
    '{new_investor_id}',
    '{email}',
    '{first_name}',
    '{last_name}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
""")
        investor_id = new_investor_id
        investor_ids[investor_name_from_pdf] = new_investor_id # Add to current session's map
        # Also, update the investor_ids.json file for persistence
        with open(investor_ids_file, 'w', encoding='utf-8') as f:
            json.dump(investor_ids, f, indent=4)
        print(f"Added new investor '{investor_name_from_pdf}' with ID '{new_investor_id}'.")
    else:
        investor_id = investor_ids[investor_name_from_pdf]

    # Extract Statement Date
    statement_date_match = re.search(r'Investor Statement for the Period Ended: (.*)', ocr_text, re.IGNORECASE)
    statement_date_raw_str = statement_date_match.group(1).strip() if statement_date_match else ""

    if not statement_date_raw_str:
        print(f"Warning: Could not find statement date in PDF '{filename}'. Skipping.")
        return []

    # Clean the date string: remove ordinal suffixes and then periods
    statement_date_cleaned_str = statement_date_raw_str.replace('st', '').replace('nd', '').replace('rd', '').replace('th', '')
    statement_date_cleaned_str = statement_date_cleaned_str.replace('.', '').strip() # Remove periods *after* suffixes

    try:
        statement_date = None
        # Try a more explicit format
        try:
            statement_date = datetime.strptime(statement_date_cleaned_str, '%B %d, %Y')
        except ValueError:
            try:
                statement_date = datetime.strptime(statement_date_cleaned_str, '%B %d %Y')
            except ValueError:
                # If these specific formats fail, then try a more generic approach if needed
                pass
        
        if not statement_date:
            raise ValueError(f"No suitable date format found for cleaned string '{statement_date_cleaned_str}' from raw '{statement_date_raw_str}'")
    except ValueError as e:
        print(f"Warning: Could not parse date '{statement_date_raw_str}' from '{filename}'. Error: {e}. Falling back to filename date if possible.")
        # Fallback logic: try to parse date from filename if available
        filename_date_match = re.search(r'(\w+)\s*(\d{4})', filename) # e.g., "August 2025" in "Reporting_YieldFund - August 2025 (2).pdf"
        if filename_date_match:
            month_name = filename_date_match.group(1)
            year = int(filename_date_match.group(2))
            try:
                # Get month number from name
                month_num = datetime.strptime(month_name, '%B').month
                # Set day to last day of month to represent "period ended"
                import calendar
                last_day = calendar.monthrange(year, month_num)[1]
                statement_date = datetime(year, month_num, last_day) 
                print(f"Using fallback date from filename: {statement_date.strftime('%Y-%m-%d')}")
            except ValueError:
                print(f"Could not parse date from filename: {filename}. Using end of current month as ultimate fallback.")
                statement_date = datetime.now() # Ultimate fallback, not ideal but prevents crash
        else:
            print(f"Could not parse date from filename either. Using end of current month as ultimate fallback.")
            statement_date = datetime.now() # Ultimate fallback, not ideal but prevents crash

    period_year = statement_date.year
    period_month = statement_date.month

    # Regular expression to capture fund sections and their data
    # It looks for "YIELD FUND" followed by "CAPITAL ACCOUNT SUMMARY" and then captures lines until another fund or end.
    fund_sections_matches = list(re.finditer(r'([A-Z]{3,4}) YIELD FUND\s+CAPITAL ACCOUNT SUMMARY(?:.*?)?\s+(FROM .*?)?\s*(.*?)(?=(?:[A-Z]{3,4} YIELD FUND)|$)', ocr_text, re.DOTALL | re.IGNORECASE))

    if not fund_sections_matches:
        print(f"Warning: No fund sections found in PDF '{filename}'. Skipping.")
        return []

    for match in fund_sections_matches:
        asset_code = match.group(1).strip().upper()
        fund_summary_text = match.group(3).strip()

        # Sanitize asset_code for ENUM
        valid_currencies = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC', 'XRP', 'XAUT'] 
        if asset_code not in valid_currencies:
            print(f"Warning: Unknown asset code '{asset_code}' in PDF '{filename}'. Skipping this fund section.")
            continue

        data_points_patterns = {
            "Beginning Balance": r'Beginning Balance\s*([\d.,-]+)',
            "Additions": r'Additions\s*([\d.,-]+)',
            "Redemptions": r'Redemptions\s*([\d.,-]+)',
            "Net Income": r'Net Income\s*([\d.,-]+)',
            "Ending Balance": r'Ending Balance\s*([\d.,-]+)',
            "Rate of Return MTD": r'Rate of Return\s*([\d.,-]*%)' 
        }

        extracted_values = {}
        for key, pattern in data_points_patterns.items():
            value_match = re.search(pattern, fund_summary_text, re.IGNORECASE)
            if value_match:
                cleaned_value = value_match.group(1).replace(',', '').replace('%', '').strip()
                if cleaned_value == '-' or cleaned_value == '':
                    extracted_values[key] = 0.0
                else:
                    try:
                        extracted_values[key] = float(cleaned_value)
                    except ValueError:
                        print(f"Warning: Could not convert '{cleaned_value}' for {key} of {asset_code} in '{filename}'. Setting to 0.0")
                        extracted_values[key] = 0.0
            else:
                extracted_values[key] = 0.0 # Default if not found

        # Adjust Rate of Return to decimal if it's a percentage
        if "Rate of Return MTD" in extracted_values and extracted_values["Rate of Return MTD"] > 1: 
             extracted_values["Rate of Return MTD"] /= 100.0

        # For simplicity, assign MTD rate to QTD, YTD, ITD if not separately parsed
        rate_of_return_mtd = extracted_values.get("Rate of Return MTD", 0.0)
        rate_of_return_qtd = rate_of_return_mtd
        rate_of_return_ytd = rate_of_return_mtd
        rate_of_return_itd = rate_of_return_mtd

        # Store the path to the PDF file
        storage_path = os.path.join(reports_dir, filename).replace('\\', '/') # Ensure forward slashes for SQL

        # Generate INSERT statement for public.statements
        sql_statements.append(f"""
INSERT INTO public.statements (id, investor_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, end_balance, rate_of_return_mtd, rate_of_return_qtd, rate_of_return_ytd, rate_of_return_itd, storage_path, created_at)
VALUES (
    '{uuid.uuid4()}',
    '{investor_id}',
    {period_year},
    {period_month},
    '{asset_code}',
    {extracted_values['Beginning Balance']},
    {extracted_values['Additions']},
    {extracted_values['Redemptions']},
    {extracted_values['Net Income']},
    {extracted_values['Ending Balance']},
    {rate_of_return_mtd},
    {rate_of_return_qtd},
    {rate_of_return_ytd},
    {rate_of_return_itd},
    '{storage_path}',
    NOW()
)
ON CONFLICT (investor_id, period_year, period_month, asset_code) DO UPDATE SET
    begin_balance = EXCLUDED.begin_balance,
    additions = EXCLUDED.additions,
    redemptions = EXCLUDED.redemptions,
    net_income = EXCLUDED.net_income,
    end_balance = EXCLUDED.end_balance,
    rate_of_return_mtd = EXCLUDED.rate_of_return_mtd,
    rate_of_return_qtd = EXCLUDED.rate_of_return_qtd,
    rate_of_return_ytd = EXCLUDED.rate_of_return_ytd,
    rate_of_return_itd = EXCLUDED.rate_of_return_itd,
    storage_path = EXCLUDED.storage_path;
""")
        # Also generate UPSERT for public.positions
        sql_statements.append(f"""
INSERT INTO public.positions (id, investor_id, asset_code, current_balance, updated_at)
VALUES (
    '{uuid.uuid4()}',
    '{investor_id}',
    '{asset_code}',
    {extracted_values['Ending Balance']},
    NOW()
)
ON CONFLICT (investor_id, asset_code) DO UPDATE SET
    current_balance = EXCLUDED.current_balance,
    updated_at = EXCLUDED.updated_at;
""")
    return sql_statements

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python parse_pdf_statements.py <filename> <ocr_text_file>")
        sys.exit(1)
    
    filename = sys.argv[1]
    ocr_text_file = sys.argv[2]

    with open(ocr_text_file, 'r', encoding='utf-8') as f:
        ocr_text = f.read()

    generated_sqls = parse_pdf_content_and_generate_sql(ocr_text, filename)

    mode = 'a' if os.path.exists(output_sql_file) else 'w'
    with open(output_sql_file, mode, encoding='utf-8') as outfile:
        for sql in generated_sqls:
            outfile.write(sql + '\n')

    print(f"Appended {len(generated_sqls)} SQL statements to {output_sql_file} for {filename}")