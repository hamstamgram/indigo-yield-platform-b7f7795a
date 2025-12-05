import csv
import uuid
from datetime import datetime
import json

# Path to the CSV file
csv_file_path = 'REPORTS/Accounting Yield Funds - Investments.csv'
# Output SQL file
output_sql_file = 'generated_transactions.sql'
# Output investor IDs JSON file
investor_ids_file = 'investor_ids.json'

# Mappings to store generated investor IDs and track existing ones
investor_ids = {}

# List to store SQL statements
sql_statements = []

# Helper function to sanitize text for SQL
def sanitize_sql_text(text):
    if text is None:
        return 'NULL'
    return f"'{text.replace("'", "''")}'"

# Read the CSV and process data
with open(csv_file_path, mode='r', newline='', encoding='utf-8') as file:
    reader = csv.reader(file)
    header = [h.strip() for h in next(reader)] # Read header and strip whitespace

    for row_num, row in enumerate(reader):
        if not row:
            continue

        row_data = dict(zip(header, row))

        # Extract data from row, handling potential missing values
        investment_date_str = row_data.get('Investment Date', '').strip()
        investor_name = row_data.get('Investor Name', '').strip()
        currency = row_data.get('Currency', '').strip().upper()
        amount_str = row_data.get('Amount', '').replace('$', '').replace(',', '').strip()
        usd_value_str = row_data.get('USD Value', '').replace('$', '').replace(',', '').strip()
        email = row_data.get('Email', '').strip()
        # The last column might be notes, if it exists and wasn't part of the header
        note = ''
        if len(row) > len(header):
            note = row[-1].strip() # Assuming the last extra column is the note

        if not investor_name or not currency or not amount_str or not investment_date_str:
            print(f"Skipping row {row_num + 2} due to missing critical data: {row}")
            continue

        # Generate or retrieve investor_id
        if investor_name not in investor_ids:
            investor_id = str(uuid.uuid4())
            investor_ids[investor_name] = investor_id
            
            # Insert into public.profiles
            sql_statements.append(f"""
INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
VALUES (
    '{investor_id}',
    {sanitize_sql_text(email if email else f'{investor_name.replace(" ", ".").lower()}@example.com')},
    {sanitize_sql_text(investor_name.split(' ')[0] if ' ' in investor_name else investor_name)},
    {sanitize_sql_text(investor_name.split(' ')[-1] if ' ' in investor_name else '')},
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
""")
        else:
            investor_id = investor_ids[investor_name]

        # Parse date
        # Assuming date format is MM/DD/YYYY
        try:
            investment_date = datetime.strptime(investment_date_str, '%m/%d/%Y')
        except ValueError:
            # Try DD/MM/YYYY if MM/DD/YYYY fails
            try:
                investment_date = datetime.strptime(investment_date_str, '%d/%m/%Y')
            except ValueError:
                print(f"Skipping row {row_num + 2} due to invalid date format: {investment_date_str}")
                continue

        # Determine transaction type and amount
        try:
            amount = float(amount_str)
        except ValueError:
            print(f"Skipping row {row_num + 2} due to invalid amount: {amount_str}")
            continue

        transaction_type = 'DEPOSIT' if amount >= 0 else 'WITHDRAWAL'
        
        # Ensure currency is one of the ENUM values, default to BTC if not
        valid_currencies = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC', 'XRP', 'XAUT'] 
        if currency not in valid_currencies:
            print(f"Warning: Currency '{currency}' not in valid list, defaulting to BTC for row {row_num + 2}.")
            currency = 'BTC'

        # Generate INSERT statement for public.transactions
        sql_statements.append(f"""
INSERT INTO public.transactions (id, investor_id, asset_code, amount, type, status, note, created_at, confirmed_at)
VALUES (
    '{uuid.uuid4()}',
    '{investor_id}',
    '{currency}',
    {amount},
    '{transaction_type}',
    'confirmed',
    {sanitize_sql_text(note)},
    '{investment_date.isoformat()}',
    '{investment_date.isoformat()}'
)
ON CONFLICT (id) DO NOTHING;
""")

# Write all SQL statements to the output file
with open(output_sql_file, 'w', encoding='utf-8') as outfile:
    outfile.write('\n'.join(sql_statements))

# Write investor_ids to a JSON file
with open(investor_ids_file, 'w', encoding='utf-8') as jsonfile:
    json.dump(investor_ids, jsonfile, indent=4)

print(f"Generated {len(sql_statements)} SQL statements in {output_sql_file}")
print(f"Identified {len(investor_ids)} unique investors.")
print(f"Saved investor IDs to {investor_ids_file}")