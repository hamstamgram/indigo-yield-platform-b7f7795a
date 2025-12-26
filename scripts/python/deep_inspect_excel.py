import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def inspect_sheet(sheet_name):
    print(f"\n--- Sheet: {sheet_name} ---")
    df = pd.read_excel(file_path, sheet_name=sheet_name)
    print("First 10 rows:")
    print(df.head(10))
    print("\nColumns:")
    print(df.columns.tolist())

try:
    inspect_sheet('Investments')
    inspect_sheet('BTC Yield Fund')
    inspect_sheet('ETH Yield Fund')
except Exception as e:
    print(f"Error: {e}")
