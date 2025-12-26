import pandas as pd
import json
import uuid
import datetime
import numpy as np

# Configuration
FILE_PATH = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'
OUTPUT_FILE = 'migration_payload.json'

# Mappings
NAME_MAP = {
    "Blondish": "Vivie-Ann Bakos",
    "Mathias": "Matthias Reiser",
    "Jose": "Jose Molla",
    "Nathanael": "Nathanael Cohen",
    "Kyle": "Kyle Gulamerian",
    "Danielle": "Danielle Richetta",
    "Thomas": "Thomas Puech"
}

FUND_MAP = {
    "BTC Yield Fund": {"code": "BTCYF", "asset": "BTC", "name": "BTC Yield Fund"},
    "ETH Yield Fund": {"code": "ETHYF", "asset": "ETH", "name": "ETH Yield Fund"},
    "DONE - BTC Boosted Program": {"code": "BTCBST", "asset": "BTC", "name": "BTC Boosted Program"},
    "Done - ETH TAC Program": {"code": "ETHTAC", "asset": "ETH", "name": "ETH TAC Program"},
    "USDT Yield Fund": {"code": "USDTYF", "asset": "USDT", "name": "USDT Yield Fund"},
    "SOL Yield Fund": {"code": "SOLYF", "asset": "SOL", "name": "SOL Yield Fund"},
    "XRP Yield Fund": {"code": "XRPYF", "asset": "XRP", "name": "XRP Yield Fund"}
}

def generate_uuid(seed_str):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, seed_str))

def serialize(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.float64, np.float32)):
        if np.isnan(obj): return None
        return float(obj)
    return str(obj)

def load_investors():
    print("Loading Investor Profiles...")
    df = pd.read_excel(FILE_PATH, sheet_name='Investments')
    investors = {}
    
    for _, row in df.iterrows():
        if pd.notnull(row['Investor Name']):
            raw_name = str(row['Investor Name']).strip()
            norm_name = NAME_MAP.get(raw_name, raw_name)
            # Try to find email
            email = row['Email'] if 'Email' in row and pd.notnull(row['Email']) else f"{norm_name.lower().replace(' ', '.')}@placeholder.indigo.fund"
            
            investor_id = generate_uuid(norm_name)
            investors[norm_name] = {
                "id": investor_id,
                "name": norm_name,
                "email": email,
                "status": "active"
            }
    return investors

def process_monthly_data(investors):
    print("Processing Monthly Data for Reconciliation...")
    transactions = []
    
    # Iterate through funds
    for sheet_name, fund_info in FUND_MAP.items():
        try:
            df = pd.read_excel(FILE_PATH, sheet_name=sheet_name, header=None)
            
            # Locate Date Columns
            # Heuristic: Look for datetime objects in Row 0 or Row 7 (ETH)
            # Default to Row 0
            header_row_idx = 0
            if sheet_name == 'ETH Yield Fund': header_row_idx = 7
            
            headers = df.iloc[header_row_idx].tolist()
            
            # Find columns that are Dates
            date_cols = []
            for i, h in enumerate(headers):
                if isinstance(h, datetime.datetime):
                    date_cols.append((i, h))
            
            # Find Name Column (usually index 8, but check)
            name_col_idx = 8
            
            fund_id = generate_uuid(fund_info['code'])
            
            for idx, row in df.iterrows():
                if idx <= header_row_idx: continue
                
                raw_name = row[name_col_idx]
                if not isinstance(raw_name, str): continue
                if "Total" in raw_name or "Indigo" in raw_name or "Fees" in raw_name: continue
                
                # Normalize Name
                norm_name = raw_name.strip().replace("  ", " ")
                # Apply Map
                for k, v in NAME_MAP.items():
                    if k in norm_name: 
                        norm_name = v
                        break
                
                if norm_name not in investors:
                    # Create placeholder investor if not found in Investment sheet
                    investor_id = generate_uuid(norm_name)
                    investors[norm_name] = {
                        "id": investor_id,
                        "name": norm_name,
                        "email": f"{norm_name.lower().replace(' ', '.')}@placeholder.indigo.fund",
                        "status": "active"
                    }
                
                investor_id = investors[norm_name]['id']
                
                prev_balance = 0.0
                
                # Iterate through dates to reconstruct history
                for col_idx, date_val in date_cols:
                    balance = row[col_idx]
                    if not isinstance(balance, (int, float)) or pd.isna(balance):
                        balance = 0.0
                    
                    delta = balance - prev_balance
                    
                    if abs(delta) > 0.00000001:
                        # Determine Type
                        # Ideally we use Net Yield % to check if delta is yield
                        # Simplified "190 IQ" heuristic for this script:
                        # If it's the first valid balance, it's a Deposit (Investment)
                        # If it's an increment on existing, check if it looks like yield (small %) vs deposit (large round number)
                        # Actually, looking at the Excel, these columns are Cumulative Balances.
                        
                        tx_type = 'yield'
                        if prev_balance == 0:
                            tx_type = 'deposit' # Initial
                        elif delta < 0:
                            tx_type = 'withdrawal' # Negative delta
                        elif delta > (prev_balance * 0.20): # > 20% gain in a month? Likely deposit
                            tx_type = 'deposit' 
                        else:
                            tx_type = 'yield'
                            
                        # Create Transaction
                        transactions.append({
                            "id": str(uuid.uuid4()),
                            "investor_id": investor_id,
                            "fund_id": fund_id,
                            "fund_class": fund_info['asset'],
                            "asset": fund_info['asset'],
                            "amount": abs(delta), # Store as positive magnitude
                            "type": tx_type, # Enum
                            "tx_date": date_val,
                            "value_date": date_val,
                            "balance_after": balance,
                            "notes": f"Reconciled from {sheet_name}"
                        })
                    
                    prev_balance = balance

        except Exception as e:
            print(f"Skipping {sheet_name}: {e}")
            
    return transactions

def main():
    investors = load_investors()
    transactions = process_monthly_data(investors)
    
    payload = {
        "investors": list(investors.values()),
        "transactions": transactions
    }
    
    print(f"Generated {len(transactions)} transactions for {len(investors)} investors.")
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(payload, f, default=serialize, indent=2)
    
    print(f"Payload saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
