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
    # Remove '$', ',', and whitespace
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
            investor_name = row['Investor Name'].strip().title()
            if not investor_name:
                continue

            # Parse transaction data
            date_str = row['Investment Date']
            currency = row['Currency']
            amount = parse_currency_value(row['Amount'])
            usd_value = parse_currency_value(row['USD Value'])
            email = row['Email'].strip()

            # Update Investor Profile
            if email:
                # Handle multiple emails separated by comma or space if any
                emails = [e.strip() for e in email.replace(',', ' ').split() if e.strip()]
                investor_data[investor_name]['profile']['emails'].update(emails)

            # Add Transaction
            transaction = {
                'date': date_str,
                'currency': currency,
                'amount': amount,
                'usd_value': usd_value,
                'original_row': row
            }
            investor_data[investor_name]['transactions'].append(transaction)

            # Update Summary
            investor_data[investor_name]['summary']['currencies'][currency] += amount
            investor_data[investor_name]['summary']['total_usd_value'] += usd_value

    # Write individual investor files
    organization_plan = []
    
    for investor, data in investor_data.items():
        # Convert sets to lists for JSON serialization
        data['profile']['emails'] = list(data['profile']['emails'])
        
        # Sanitize filename
        safe_filename = "".join([c for c in investor if c.isalpha() or c.isdigit() or c==' ']).rstrip().replace(' ', '_')
        file_path = os.path.join(OUTPUT_DIR, f"{safe_filename}.json")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        
        organization_plan.append({
            'investor': investor,
            'file': f"{safe_filename}.json",
            'transaction_count': len(data['transactions']),
            'total_usd_value': data['summary']['total_usd_value']
        })

    # Write Organization Plan
    plan_path = os.path.join(OUTPUT_DIR, 'ORGANIZATION_PLAN.md')
    with open(plan_path, 'w', encoding='utf-8') as f:
        f.write("# Indigo Yield Platform - Data Organization Plan\n\n")
        f.write("## Overview\n")
        f.write("This plan organizes investment data from raw CSV logs into individual, structured JSON files suitable for Supabase ingestion.\n")
        f.write("Each file represents a unique investor entity and contains their profile, transaction history, and calculated summaries.\n\n")
        f.write("## Data Structure\n")
        f.write("- **Root Directory:** `indigo-yield-platform-v01/processed_reports/`\n")
        f.write("- **Format:** JSON\n")
        f.write("- **Schema:**\n")
        f.write("  ```json\n")
        f.write("  {\n")
        f.write("    \"profile\": { \"emails\": [...] },\n")
        f.write("    \"transactions\": [ { \"date\": \"...\", \"currency\": \"...\", \"amount\": 0.0, \"usd_value\": 0.0, ... } ],\n")
        f.write("    \"summary\": { \"currencies\": { \"BTC\": 0.0, ... }, \"total_usd_value\": 0.0 }\n")
        f.write("  }\n")
        f.write("  ```\n\n")
        f.write("## Processed Investors\n")
        f.write("| Investor Name | File Name | Transactions | Net USD Value (Est.) |\n")
        f.write("|---|---|---|---|")
        for item in sorted(organization_plan, key=lambda x: x['total_usd_value'], reverse=True):
            f.write(f"| {item['investor']} | `{item['file']}` | {item['transaction_count']} | ${item['total_usd_value']:,.2f} |\n")

    print(f"Successfully processed {len(investor_data)} investors.")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    process_reports()
