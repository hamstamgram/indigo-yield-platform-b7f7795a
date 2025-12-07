import csv
import uuid
import hashlib
import os
import re
import datetime

# Source Data
CSV_PATH = "REPORTS/Accounting Yield Funds - Investments.csv"
REPORTS_DIR = "REPORTS"
OUTPUT_SQL = "master_data_import.sql"

# Namespace for deterministic UUIDs
NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, "indigo-yield.com")

def generate_uuid(name):
    return str(uuid.uuid5(NAMESPACE, name.lower().strip()))

def normalize_name(name):
    return name.strip()

def split_name(full_name):
    parts = full_name.split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        return parts[0], " ".join(parts[1:])

def parse_date(date_str):
    # CSV Date format: DD/MM/YYYY (e.g. 12/06/2024)
    try:
        return datetime.datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None

def get_month_number(month_name):
    months = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'novembre': 11  # French? Found in file list
    }
    return months.get(month_name.lower())

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # Escape single quotes for SQL
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def main():
    investors = {} # name -> {id, email, first_name, last_name}
    transactions = []
    
    # 1. Process CSV
    print(f"Processing {CSV_PATH}...")
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = row['Investor Name']
            if not raw_name: continue
            
            name = normalize_name(raw_name)
            email = row.get('Email', '').strip()
            
            if name not in investors:
                uid = generate_uuid(name)
                first, last = split_name(name)
                if not email:
                    # Generate a dummy email if missing
                    slug = re.sub(r'[^a-z0-9]', '.', name.lower())
                    email = f"{slug}@example.com"
                
                investors[name] = {
                    'id': uid,
                    'email': email,
                    'first_name': first,
                    'last_name': last,
                    'original_name': name
                }
            
            # Transaction
            amount_str = row['Amount']
            if not amount_str: continue
            
            # Clean amount (remove quotes, commas, etc)
            amount_str = amount_str.replace(',', '').replace('"', '').replace('$', '')
            try:
                amount = float(amount_str)
            except ValueError:
                print(f"Warning: Invalid amount {amount_str} for {name}")
                continue
            
            # Type deduction (CSV doesn't verify Type, assume DEPOSIT if positive, WITHDRAWAL if negative)
            # Actually CSV has negative amounts for withdrawals based on `head` output
            tx_type = 'DEPOSIT' if amount >= 0 else 'WITHDRAWAL'
            
            # Asset
            asset = row['Currency']
            if asset == 'USDT': asset = 'USDT' # Clean if needed
            
            # Date
            date_str = row['Investment Date']
            created_at = parse_date(date_str)
            if not created_at:
                print(f"Warning: Invalid date {date_str} for {name}")
                continue

            transactions.append({
                'investor_id': investors[name]['id'],
                'asset_code': asset,
                'amount': amount,
                'type': tx_type,
                'status': 'confirmed',
                'created_at': created_at
            })

    # 2. Process Reports (PDFs)
    statements = []
    print(f"Scanning {REPORTS_DIR}...")
    
    # Special Mapping based on previous analysis
    # "Vivie-Ann Bakos" -> "Vivie & Liana"
    # We can do fuzzy matching or hardcode known aliases
    aliases = {
        "Vivie-Ann Bakos": "Vivie & Liana",
        "Vivie-Ann": "Vivie & Liana",
        # Add others if found
    }

    for filename in os.listdir(REPORTS_DIR):
        if not filename.lower().endswith('.pdf'): continue
        
        # Try to extract Name, Month, Year
        # Format: [Name]_Reporting_YieldFund - [Month] [Year].pdf
        # Or: Reporting_YieldFund - [Month] [Year].pdf (Generic)
        
        investor_id = None
        period_year = 2025 # Default?
        period_month = 1   # Default?
        
        # Parse Year
        year_match = re.search(r'202[4-9]', filename)
        if year_match:
            period_year = int(year_match.group(0))
        
        # Parse Month
        found_month = False
        for m_name, m_num in {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'novembre': 11
        }.items():
            if m_name in filename.lower():
                period_month = m_num
                found_month = True
                break
        
        # Identify Investor
        # Strategy: Check if any Known Investor Name is in the filename
        match_name = None
        
        # Check aliases first
        for alias, target in aliases.items():
            if alias.lower() in filename.lower():
                match_name = target
                break
        
        if not match_name:
            # Check main list
            for name in investors:
                # Simple heuristic: if full name is in filename
                if name.lower() in filename.lower():
                    match_name = name
                    break
        
        if match_name:
            investor_id = investors[match_name]['id']
        else:
            # Check if it's a generic report
            if "Reporting_YieldFund" in filename:
                # Link to Fund LP?
                # "INDIGO DIGITAL ASSET FUND LP"
                if "INDIGO DIGITAL ASSET FUND LP" in investors:
                     investor_id = investors["INDIGO DIGITAL ASSET FUND LP"]['id']
        
        if investor_id and found_month:
             statements.append({
                 'id': str(uuid.uuid4()),
                 'investor_id': investor_id,
                 'period_year': period_year,
                 'period_month': period_month,
                 'asset_code': 'USDT', # Default asset for statement? Or make it generic. Schema requires asset_code.
                 # Usually statements are multi-asset. I'll insert one for USDT for now as placeholder or try to infer.
                 # Actually, the statements table PK is (investor_id, year, month, asset_code).
                 # So we might need multiple entries if they have multiple assets. 
                 # For now, I will assume 'USDT' as the base currency for the report reference.
                 'begin_balance': 0,
                 'additions': 0,
                 'redemptions': 0,
                 'net_income': 0,
                 'end_balance': 0,
                 'storage_path': f"REPORTS/{filename}"
             })

    # 3. Generate SQL
    print(f"Generating {OUTPUT_SQL}...")
    with open(OUTPUT_SQL, 'w') as sql:
        sql.write("-- Master Data Import Script\n")
        sql.write("-- Generated by Gemini CLI\n\n")
        
        # Auth Users
        sql.write("-- 1. Auth Users\n")
        for name, data in investors.items():
            sql.write(f"""
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, role, is_super_admin, email_confirmed_at)
VALUES (
    '{data['id']}',
    '{data['email']}',
    '{{"first_name": "{data['first_name']}", "last_name": "{data['last_name']}"}}',
    NOW(),
    NOW(),
    'authenticated',
    FALSE,
    NOW()
) ON CONFLICT (id) DO NOTHING;
""")

        # Profiles (Trigger should handle, but we can ensure fields if needed. 
        # Since trigger handles ON CONFLICT DO NOTHING, we skip manual profile insert to rely on trigger logic 
        # matches what we want. But we need to ensure the TRIGGER FIRES.
        # Inserting into auth.users fires the trigger.
        
        # Transactions
        sql.write("\n-- 2. Transactions\n")
        for tx in transactions:
            sql.write(f"""
INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at)
VALUES (
    '{tx['investor_id']}',
    '{tx['asset_code']}',
    {tx['amount']},
    '{tx['type']}',
    '{tx['status']}',
    '{tx['created_at']}'
);
""")
            
        # Statements
        sql.write("\n-- 3. Statements (PDF Links)\n")
        for stmt in statements:
            sql.write(f"""
INSERT INTO public.statements (id, investor_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, end_balance, storage_path)
VALUES (
    '{stmt['id']}',
    '{stmt['investor_id']}',
    {stmt['period_year']},
    {stmt['period_month']},
    '{stmt['asset_code']}',
    0, 0, 0, 0, 0,
    {escape_sql(stmt['storage_path'])}
) ON CONFLICT (investor_id, period_year, period_month, asset_code) DO UPDATE SET storage_path = EXCLUDED.storage_path;
""")

if __name__ == "__main__":
    main()