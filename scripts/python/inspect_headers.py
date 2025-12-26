import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def check_headers():
    print("Checking BTC Yield Fund headers...")
    # Read without header to get raw values
    df_btc = pd.read_excel(file_path, sheet_name='BTC Yield Fund', header=None, nrows=5)
    # Print the first row (which usually contains headers)
    print("Row 0 (potential headers):")
    print(df_btc.iloc[0].tolist())
    
    print("\nChecking ETH Yield Fund headers...")
    df_eth = pd.read_excel(file_path, sheet_name='ETH Yield Fund', header=None, nrows=10)
    print("Row 7 (potential headers):")
    print(df_eth.iloc[7].tolist())
    print("\nRow 6:")
    print(df_eth.iloc[6].tolist())
    print("\nRow 5:")
    print(df_eth.iloc[5].tolist())

try:
    check_headers()
except Exception as e:
    print(f"Error: {e}")
