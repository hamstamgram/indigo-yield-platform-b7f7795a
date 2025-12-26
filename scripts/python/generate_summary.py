import pandas as pd
import json
import datetime
import numpy as np

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def serialize(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    return str(obj)

def get_latest_valid_column(df, name_row_idx, start_col_idx):
    headers = df.iloc[0].tolist()
    target_date = datetime.datetime(2025, 2, 1)
    best_col_idx = -1
    best_date = None
    for i in range(start_col_idx, len(headers)):
        val = headers[i]
        if isinstance(val, datetime.datetime):
            if val <= target_date:
                if best_date is None or val > best_date:
                    best_date = val
                    best_col_idx = i
    return best_col_idx, best_date

investor_summary = {}

def process_sheet(sheet_name, name_col_idx, start_date_col_idx):
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        col_idx, date_val = get_latest_valid_column(df, 0, start_date_col_idx)
        if col_idx == -1: return

        # Iterate rows, stop if we hit "Total AUM" or similar to avoid reading percentage blocks
        for idx, row in df.iterrows():
            if idx == 0: continue
            name = row[name_col_idx]
            if not isinstance(name, str): continue
            
            if "Total AUM" in name:
                break # Stop processing this sheet/block

            if "Indigo" in name or "Fees" in name:
                continue

            balance = row[col_idx]
            if isinstance(balance, (int, float)) and balance > 0:
                norm_name = name.strip().replace("  ", " ")
                # Normalization map
                name_map = {
                    "Blondish": "Vivie-Ann Bakos",
                    "Mathias": "Matthias Reiser",
                    "Jose": "Jose Molla",
                    "Nathanael": "Nathanael Cohen",
                    "Kyle": "Kyle Gulamerian"
                }
                norm_name = name_map.get(norm_name, norm_name)
                
                if norm_name not in investor_summary:
                    investor_summary[norm_name] = {"holdings": []}
                
                investor_summary[norm_name]["holdings"].append({
                    "fund": sheet_name,
                    "balance": balance,
                    "currency": "ETH" if "ETH" in sheet_name else "BTC" if "BTC" in sheet_name else "USD",
                    "date": date_val
                })
    except Exception as e:
        print(f"Error processing {sheet_name}: {e}")

process_sheet('Done - ETH TAC Program', 8, 11)
process_sheet('DONE - BTC Boosted Program', 8, 11)
process_sheet('BTC Yield Fund', 8, 11)

with open('INVESTOR_DATA_SUMMARY.json', 'w') as f:
    json.dump(investor_summary, f, default=serialize, indent=2)