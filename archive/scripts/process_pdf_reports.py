import os
import json
import re
from collections import defaultdict
from pypdf import PdfReader
from datetime import datetime

# Configuration
REPORTS_DIR = 'indigo-yield-platform-v01/REPORTS'
PROCESSED_DIR = 'indigo-yield-platform-v01/processed_reports'

def normalize_name(name):
    return name.strip().title().replace('  ', ' ')

def get_investor_filename(investor_name):
    # Try to find matching existing file
    safe_name = "".join([c for c in investor_name if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(' ', '_')
    potential_file = os.path.join(PROCESSED_DIR, f"{safe_name}.json")
    
    if os.path.exists(potential_file):
        return potential_file
    
    # Check for partial matches or different formatting in existing files
    # simple heuristic: check if last name is in the filename
    parts = investor_name.split()
    if len(parts) > 1:
        last_name = parts[-1]
        for f in os.listdir(PROCESSED_DIR):
            if f.endswith(".json") and last_name in f:
                # Potential match, but let's be careful. 
                # For now, if no exact match, we might create a new one or skip.
                # Given the user instruction "populate a supabase remote database... create one files per investor",
                # I should probably try to merge if strong match, else create new.
                pass
    
    return potential_file # Default to creating/using the standard name

def parse_currency_amount(text):
    # remove $ , and %
    clean = text.replace('$', '').replace(',', '').replace('%', '').strip()
    try:
        return float(clean)
    except ValueError:
        return 0.0

def extract_data_from_page(raw_text):
    data = {}
    
    # Normalize whitespace across the whole text
    # This turns "BTC\n\nYIELD\n\nFUND" into "BTC YIELD FUND"
    text = re.sub(r'\s+', ' ', raw_text).strip()
    
    # Extract Investor Name
    # Look for "ATTN: Name -" or "ATTN: Name,"
    attn_match = re.search(r"ATTN:\s*(.*?)(?:\s*[-–,]|\s+[\d]+\s+[A-Za-z]+|$)", text, re.IGNORECASE)
    if attn_match:
        raw_name = attn_match.group(1).strip()
        # Further cleanup if needed
        if "TRUSTEE" in raw_name.upper():
             # Extract just the name part? E.g. "LUIS JOSE MOLLA TRUSTEE..." -> "LUIS JOSE MOLLA"
             # Heuristic: take words until "TRUSTEE"
             trustee_match = re.search(r"^(.*?)\s+TRUSTEE", raw_name, re.IGNORECASE)
             if trustee_match:
                 raw_name = trustee_match.group(1)
        
        data['investor_name'] = normalize_name(raw_name)
    
    # Extract Period Ended
    # Look for "Period Ended: Date" followed by Fund Name or Capital Account Summary
    date_match = re.search(r"(?:Period|Year|Month) Ended:?\s*(.*?)(?:\s+(?:BTC|ETH|SOL|USDT|CAPITAL)|\Z)", text, re.IGNORECASE)
    if date_match:
        data['period_ended'] = date_match.group(1).strip()
        
    # Extract Fund Type
    if "BTC YIELD FUND" in text:
        data['fund'] = "BTC"
    elif "ETH YIELD FUND" in text:
        data['fund'] = "ETH"
    elif "SOL YIELD FUND" in text:
        data['fund'] = "SOL"
    elif "USDT YIELD FUND" in text:
        data['fund'] = "USDT"
        
    # Extract Financials using regex on normalized text
    # "Net Income 0.0237 0.0237 0.0237"
    # We want the FIRST number (MTD)
    
    # Regex for currency/number: [\d.,()%-]+  (handles negative in parens too if needed)
    
    net_income_match = re.search(r"Net Income\s+([(\d.,-]+)", text, re.IGNORECASE)
    if net_income_match:
        data['net_income_mtd'] = parse_currency_amount(net_income_match.group(1))
        
    ending_balance_match = re.search(r"Ending Balance\s+([(\d.,-]+)", text, re.IGNORECASE)
    if ending_balance_match:
        data['ending_balance'] = parse_currency_amount(ending_balance_match.group(1))
        
    roi_match = re.search(r"Rate of Return\s+([(\d.,-]+)", text, re.IGNORECASE)
    if roi_match:
        data['roi_mtd'] = parse_currency_amount(roi_match.group(1))

    return data

def process_pdfs():

    if not os.path.exists(PROCESSED_DIR):

        os.makedirs(PROCESSED_DIR)



    files = [f for f in os.listdir(REPORTS_DIR) if f.lower().endswith('.pdf')]

    print(f"Found {len(files)} PDF reports.")



    for filename in files:

        filepath = os.path.join(REPORTS_DIR, filename)

        print(f"Processing {filename}...")

        

        try:

            reader = PdfReader(filepath)

            # Some PDFs are consolidated (multi-investor), some are single.

            # We must treat each page (or set of pages for one person) as potentially unique.

            # Simple approach: Extract data from EVERY page and save it to the corresponding investor.

            

            for page_num, page in enumerate(reader.pages):

                text = page.extract_text()

                if not text.strip():

                    continue

                    

                extracted = extract_data_from_page(text)

                

                # Validation: We need at least a name and some data

                if 'investor_name' in extracted and extracted['investor_name']:

                    # Check if we have meaningful metrics or at least a date

                    has_metrics = any(k in extracted for k in ['net_income_mtd', 'ending_balance', 'roi_mtd'])

                    if not has_metrics and not extracted.get('period_ended'):

                        continue



                    investor = extracted['investor_name']

                    # print(f"  Found data for {investor} on page {page_num+1}")

                    

                    json_path = get_investor_filename(investor)

                    

                    # Load existing or create new

                    if os.path.exists(json_path):

                        with open(json_path, 'r') as f:

                            record = json.load(f)

                    else:

                        record = {

                            "profile": {"emails": []},

                            "transactions": [],

                            "summary": {"currencies": {}, "total_usd_value": 0.0},

                            "reports": []

                        }

                    

                    if "reports" not in record:

                        record["reports"] = []

                        

                    # Add report entry

                    report_entry = {

                        "source_file": filename,

                        "page": page_num + 1,

                        "period_ended": extracted.get("period_ended"),

                        "fund": extracted.get("fund"),

                        "metrics": {

                            "net_income_mtd": extracted.get("net_income_mtd", 0),

                            "ending_balance": extracted.get("ending_balance", 0),

                            "roi_mtd": extracted.get("roi_mtd", 0)

                        }

                    }

                    

                    # Avoid duplicates (now including page check to be safe, or just data equality)

                    is_dup = False

                    for r in record["reports"]:

                        if (r.get("period_ended") == report_entry["period_ended"] and 

                            r.get("fund") == report_entry["fund"] and

                            # If source file is same, check if metrics are identical. 

                            # Different pages might have same date/fund for different people (handled by different json files)

                            # But if same person has two pages for same fund/date? Unlikely.

                            r.get("metrics") == report_entry["metrics"]):

                            is_dup = True

                            break

                    

                    if not is_dup:

                        record["reports"].append(report_entry)

                        

                        # Balance check update

                        if "balance_checks" not in record:

                            record["balance_checks"] = []

                        

                        # Only add if we have a valid balance and date

                        if extracted.get("ending_balance") and extracted.get("period_ended"):

                            # Check if this balance check already exists

                            chk_dup = False

                            for c in record["balance_checks"]:

                                if (c.get("date") == extracted.get("period_ended") and 

                                    c.get("fund") == extracted.get("fund")):

                                    chk_dup = True

                                    break

                            if not chk_dup:

                                record["balance_checks"].append({

                                    "date": extracted.get("period_ended"),

                                    "fund": extracted.get("fund"),

                                    "balance": extracted.get("ending_balance", 0)

                                })



                    with open(json_path, 'w') as f:

                        json.dump(record, f, indent=4)

                else:

                    # print(f"  No investor name found on page {page_num+1}")

                    pass

                        

        except Exception as e:

            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    process_pdfs()
