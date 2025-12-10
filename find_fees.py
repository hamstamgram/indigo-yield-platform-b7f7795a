import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def find_fees():
    print("Searching for Fee info in Excel...")
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, header=None)
            # Search for keywords like "Fee", "Mgmt", "Perf", "%" near investor names
            print(f"\n--- Scanning {sheet} ---")
            for idx, row in df.iterrows():
                row_str = row.to_string()
                if "Fee" in row_str or "Mgmt" in row_str or "Perf" in row_str:
                    print(f"Row {idx}: {row.values}")
                    
    except Exception as e:
        print(f"Error: {e}")

find_fees()
