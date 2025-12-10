import pandas as pd
import numpy as np

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'
values_to_find = [5.2237, 3.5884, 63.4896, 120.6738, 4.9240]
tolerance = 0.0001

xl = pd.ExcelFile(file_path)

print(f"Searching for values: {values_to_find} with tolerance {tolerance}")

for sheet in xl.sheet_names:
    try:
        df = pd.read_excel(file_path, sheet_name=sheet, header=None)
        # Iterate over all cells
        for col in df.columns:
            for idx, val in df[col].items():
                if isinstance(val, (int, float)):
                    for target in values_to_find:
                        if abs(val - target) < tolerance:
                            print(f"FOUND {target} in Sheet '{sheet}' at Row {idx}, Col {col} (Value: {val})")
                            # Print context (row headers or column headers if possible)
                            # Try to identify row label (usually col 0) and col label (usually row 0 or 1)
                            row_label = df.iloc[idx, 0] if 0 in df.columns else "N/A"
                            col_label = df.iloc[0, col] if 0 in df.index else "N/A"
                            print(f"   Context -> Row Label: {row_label}, Col Header: {col_label}")
    except Exception as e:
        print(f"Error reading {sheet}: {e}")
