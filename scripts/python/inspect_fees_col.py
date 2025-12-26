import pandas as pd

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def inspect_fees_column():
    print("Inspecting 'Fees' column in BTC Yield Fund...")
    try:
        df = pd.read_excel(file_path, sheet_name='BTC Yield Fund')
        # 'Fees' column name might be 'Fees'
        if 'Fees' in df.columns:
            print(df['Fees'].head(10))
        else:
            # Try by index. 'Fees' was at index 9.
            print(df.iloc[:, 9].head(10))
            
    except Exception as e:
        print(f"Error: {e}")

inspect_fees_column()
