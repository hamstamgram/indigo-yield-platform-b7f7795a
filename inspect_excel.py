import pandas as pd
import os

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    print(f"Sheet names: {xl.sheet_names}")
    
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
        print(df.columns.tolist())
        print(df.head())
except Exception as e:
    print(f"Error reading Excel file: {e}")

