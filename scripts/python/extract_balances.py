import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def extract_investor_balances(sheet_name, name_col_idx, balance_col_idx):
    print(f"\n--- Extracting from {sheet_name} ---")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        # Print the value at the balance column header (Row 0)
        print(f"Balance Column Header (Row 0, Col {balance_col_idx}): {df.iloc[0, balance_col_idx]}")
        
        # Iterate rows starting from 1 (assuming 0 is header)
        for idx, row in df.iterrows():
            if idx == 0: continue
            name = row[name_col_idx]
            balance = row[balance_col_idx]
            # Only print if name is a string (valid investor name)
            if isinstance(name, str):
                print(f"Row {idx}: {name} -> {balance}")
    except Exception as e:
        print(f"Error: {e}")

# Based on findings:
# Done - ETH TAC Program: Name likely Col 8, Balance Jan 2025 likely Col 17
extract_investor_balances('Done - ETH TAC Program', 8, 17)

# DONE - BTC Boosted Program: Name likely Col 8? Balance Col 12?
extract_investor_balances('DONE - BTC Boosted Program', 8, 12)

# BTC Yield Fund: Found 5.2237 (Danielle Oct) at Col 15.
# Let's see if we can find names in BTC Yield Fund.
# inspect_excel showed 'Investors' at index 8.
extract_investor_balances('BTC Yield Fund', 8, 15)
