import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def raw_inspect(sheet_name):
    print(f"\n--- Raw Inspect: {sheet_name} ---")
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None, nrows=10)
    print(df)

try:
    raw_inspect('BTC Yield Fund')
    raw_inspect('ETH Yield Fund')
except Exception as e:
    print(f"Error: {e}")

