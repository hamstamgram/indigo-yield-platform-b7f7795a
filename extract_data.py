import pandas as pd
import json
import datetime
import numpy as np

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def serialize(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.float64, np.float32)):
        if np.isnan(obj):
            return None
        return float(obj)
    return str(obj)

def clean_df(df):
    # Convert columns to string
    df.columns = df.columns.astype(str)
    # Convert NaN to None (which becomes null in JSON)
    df = df.replace({np.nan: None})
    return df.to_dict(orient='records')

data = {}

try:
    # 1. Investments
    print("Reading Investments...")
    df_inv = pd.read_excel(file_path, sheet_name='Investments')
    df_inv = df_inv.dropna(subset=['Investor Name'])
    data['investments'] = clean_df(df_inv)

    # 2. Calculus (Current Snapshot)
    print("Reading Calculus...")
    df_calc = pd.read_excel(file_path, sheet_name='Calculus', header=1)
    first_col = df_calc.columns[0]
    df_calc.rename(columns={first_col: 'Investor Name'}, inplace=True)
    df_calc = df_calc.dropna(subset=['Investor Name'])
    data['calculus'] = clean_df(df_calc)

    # 3. BTC Performance
    print("Reading BTC Yield Fund...")
    df_btc = pd.read_excel(file_path, sheet_name='BTC Yield Fund')
    cols_to_keep = ['Date', 'Gross Performance (%)', 'Net Performance', 'AUM']
    existing_cols = [c for c in cols_to_keep if c in df_btc.columns]
    data['btc_performance'] = clean_df(df_btc[existing_cols])

    # 4. ETH Performance
    print("Reading ETH Yield Fund...")
    df_eth = pd.read_excel(file_path, sheet_name='ETH Yield Fund', header=7)
    existing_cols_eth = [c for c in cols_to_keep if c in df_eth.columns]
    data['eth_performance'] = clean_df(df_eth[existing_cols_eth])

    # Save to JSON
    with open('extracted_data.json', 'w') as f:
        json.dump(data, f, default=serialize, indent=2)
    
    print("Data extraction complete. Saved to extracted_data.json")

except Exception as e:
    print(f"Error extracting data: {e}")
    import traceback
    traceback.print_exc()