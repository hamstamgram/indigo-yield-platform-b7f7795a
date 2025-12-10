import pandas as pd
import json

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def extract_fee_rates():
    print("Extracting Fee Rates per Investor...")
    fee_data = []
    
    # Define sheets and where to look
    # Based on previous inspects:
    # BTC Yield Fund: Investors at Col 8 (I), Fees at Col 9 (J)
    # DONE - BTC Boosted: Investors at Col 8, Fees at Col 9
    # Done - ETH TAC: Investors at Col 8, Fees at Col 9
    
    sheets_to_check = [
        "BTC Yield Fund",
        "ETH Yield Fund",
        "DONE - BTC Boosted Program",
        "DONE - BTC TAC Program",
        "Done - ETH TAC Program",
        "USDT Yield Fund",
        "SOL Yield Fund",
        "XRP Yield Fund"
    ]
    
    for sheet in sheets_to_check:
        try:
            print(f"\n--- Processing {sheet} ---")
            # Read specific columns
            # Assuming Investors is Col 8 and Fees is Col 9 (0-indexed)
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            
            # Search for the header row that contains "Investors"
            header_row = -1
            for idx, row in df.iterrows():
                row_values = [str(v) for v in row.values]
                if "Investors" in row_values:
                    header_row = idx
                    break
            
            if header_row == -1:
                print(f"Could not find 'Investors' header in {sheet}")
                continue
                
            # Find exact column indices
            row_vals = df.iloc[header_row].values
            inv_col_idx = -1
            fee_col_idx = -1
            
            for i, v in enumerate(row_vals):
                v_str = str(v)
                if "Investors" in v_str: inv_col_idx = i
                if "Fees" in v_str: fee_col_idx = i
            
            if inv_col_idx == -1 or fee_col_idx == -1:
                print(f"Columns not found. Inv: {inv_col_idx}, Fee: {fee_col_idx}")
                continue
                
            print(f"Found headers at Row {header_row}: Investors(Col {inv_col_idx}), Fees(Col {fee_col_idx})")
            
            # Extract data
            for idx, row in df.iterrows():
                if idx <= header_row: continue
                
                investor = row[inv_col_idx]
                fee_val = row[fee_col_idx]
                
                if pd.notnull(investor) and isinstance(investor, str):
                    # Cleanup
                    if "Total" in investor or "Indigo" in investor: continue
                    
                    # Normalize Fee
                    # Fees might be 0.2 (20%), 0.1 (10%), etc.
                    # Or they might be 0.
                    
                    if pd.notnull(fee_val):
                        fee_data.append({
                            "fund_sheet": sheet,
                            "investor_name": investor.strip(),
                            "fee_rate": fee_val
                        })
                        print(f"   Found: {investor.strip()} -> {fee_val}")

        except Exception as e:
            print(f"Error reading {sheet}: {e}")

    # Save to JSON
    with open('extracted_fees.json', 'w') as f:
        json.dump(fee_data, f, indent=2)
    
    # Create CSV
    df_fees = pd.DataFrame(fee_data)
    df_fees.to_csv('fee_schedule.csv', index=False)
    print("\nFee extraction complete. Saved to 'fee_schedule.csv' and 'extracted_fees.json'.")

extract_fee_rates()
