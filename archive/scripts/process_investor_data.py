import csv
import json
import os
from collections import defaultdict
from datetime import datetime

# Configuration
INPUT_FILE = 'indigo-yield-platform-v01/REPORTS/Accounting Yield Funds - Investments.csv'
OUTPUT_DIR = 'indigo-yield-platform-v01/processed_reports'

def parse_currency_value(value_str):
    if not value_str:
        return 0.0
    clean_str = value_str.replace('$', '').replace(',', '').strip()
    try:
        return float(clean_str)
    except ValueError:
        return 0.0

def process_reports():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    investor_data = defaultdict(lambda: {
        'profile': {'emails': set()},
        'transactions': [],
        'summary': {'currencies': defaultdict(float), 'total_usd_value': 0.0}
    })

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize name
            investor_name = row['Investor Name'].strip().title()
            if not investor_name:
                continue

            date_str = row['Investment Date']
            currency = row['Currency']
            amount = parse_currency_value(row['Amount'])
            usd_value = parse_currency_value(row['USD Value'])
            email = row['Email'].strip()

            if email:
                emails = [e.strip() for e in email.replace(',', ' ').split() if e.strip()]
                investor_data[investor_name]['profile']['emails'].update(emails)

            transaction = {
                'date': date_str,
                'currency': currency,
                'amount': amount,
                'usd_value': usd_value,
                'original_row': row
            }
            investor_data[investor_name]['transactions'].append(transaction)

            investor_data[investor_name]['summary']['currencies'][currency] += amount
            investor_data[investor_name]['summary']['total_usd_value'] += usd_value

    for investor, data in investor_data.items():
        data['profile']['emails'] = list(data['profile']['emails'])
        safe_filename = "".join([c for c in investor if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(' ', '_')
        file_path = os.path.join(OUTPUT_DIR, f"{safe_filename}.json")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)

    print(f"Successfully processed {len(investor_data)} investors.")

if __name__ == "__main__":
    process_reports()
