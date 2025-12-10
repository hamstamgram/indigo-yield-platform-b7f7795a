import pandas as pd
import numpy as np

file_path = 'archive/REPORTS/Copy of Accounting Yield Funds.xlsx'

def verify_btc_yield_math():
    print("\n--- Verifying BTC Yield Fund Math ---")
    try:
        # Load relevant columns: Date, Gross Perf, Net Perf, AUM
        df = pd.read_excel(file_path, sheet_name='BTC Yield Fund')
        # Columns 2: 'Gross Performance (%)', 3: 'Gross Performance (BTC)', 4: 'Net Performance'
        # Note: Pandas columns might be named slightly differently.
        
        print("Columns:", df.columns.tolist())
        
        # Let's rename for clarity based on index if names are standard
        # Looking at previous output, they seem consistent.
        
        # Iterate rows
        for i, row in df.iterrows():
            if i < 5: # Check first 5 rows
                date = row['Date']
                gross_btc = row['Gross Performance (BTC)']
                net_btc = row['Net Performance'] # This column is often just "Net Performance"
                
                # Is there a Fee column?
                # 'Fees' is at index 9 in 'BTC Yield Fund' based on inspect_excel output?
                # ['Date', 'AUM', 'Gross Performance (%)', 'Gross Performance (BTC)', 'Net Performance', 'Yearly APY', 'Commentaires', 'Unnamed: 7', 'Investors', 'Fees', ...]
                
                # Actually, 'Fees' header is likely for the ROW section (investor list), not a column for the time series.
                # Wait, looking at `inspect_excel` output for `BTC Yield Fund`:
                # Columns: 'Date', 'AUM', 'Gross Performance (%)', 'Gross Performance (BTC)', 'Net Performance', ...
                
                # Let's check if Gross - Net = Fee
                if pd.notnull(gross_btc) and pd.notnull(net_btc) and isinstance(gross_btc, (int, float)):
                    implied_fee = gross_btc - net_btc
                    print(f"Date: {date} | Gross: {gross_btc:.6f} | Net: {net_btc:.6f} | Implied Fee: {implied_fee:.6f}")
                    
    except Exception as e:
        print(f"Error: {e}")

verify_btc_yield_math()
