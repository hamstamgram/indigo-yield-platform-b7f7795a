import json
import uuid

# Files
EXTRACTED_FEES_FILE = 'extracted_fees.json'
OUTPUT_SQL_FILE = 'import_fee_schedule.sql'

# Mappings (Same as before)
FUND_MAP = {
    "BTC Yield Fund": {"code": "BTCYF", "asset": "BTC", "name": "BTC Yield Fund"},
    "ETH Yield Fund": {"code": "ETHYF", "asset": "ETH", "name": "ETH Yield Fund"},
    "DONE - BTC Boosted Program": {"code": "BTCBST", "asset": "BTC", "name": "BTC Boosted Program"},
    "DONE - BTC TAC Program": {"code": "BTCTAC", "asset": "BTC", "name": "BTC TAC Program"}, # Added this
    "Done - ETH TAC Program": {"code": "ETHTAC", "asset": "ETH", "name": "ETH TAC Program"},
    "USDT Yield Fund": {"code": "USDTYF", "asset": "USDT", "name": "USDT Yield Fund"},
    "SOL Yield Fund": {"code": "SOLYF", "asset": "SOL", "name": "SOL Yield Fund"},
    "XRP Yield Fund": {"code": "XRPYF", "asset": "XRP", "name": "XRP Yield Fund"}
}

NAME_MAP = {
    "Blondish": "Vivie-Ann Bakos",
    "Mathias": "Matthias Reiser",
    "Jose": "Jose Molla",
    "Nathanael": "Nathanael Cohen",
    "Kyle": "Kyle Gulamerian",
    "Danielle": "Danielle Richetta",
    "Thomas": "Thomas Puech",
    "Sam Johnson": "Sam Johnson", # Keep as is
    "Ryan Van Der Wall": "Ryan Van Der Wall" # Keep as is
}

def clean_name(name):
    if not name: return ""
    name = name.strip().replace("  ", " ")
    for k, v in NAME_MAP.items():
        if k in name: return v
    return name

def generate_fee_sql():
    with open(EXTRACTED_FEES_FILE, 'r') as f:
        fee_data = json.load(f)
        
    sql_lines = []
    
    # 1. Create Table if not exists
    sql_lines.append("""
    CREATE TABLE IF NOT EXISTS public.investor_fee_schedule (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        investor_id uuid REFERENCES public.investors(id) ON DELETE CASCADE,
        fund_id uuid REFERENCES public.funds(id) ON DELETE CASCADE,
        perf_fee_bps integer DEFAULT 2000,
        mgmt_fee_bps integer DEFAULT 200,
        effective_date date DEFAULT '2024-01-01',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(investor_id, fund_id)
    );
    
    -- Add RLS policies if needed (omitted for migration script)
    """)
    
    # 2. Inserts
    for entry in fee_data:
        sheet = entry['fund_sheet']
        raw_name = entry['investor_name']
        fee_rate = entry['fee_rate']
        
        # Skip if invalid
        if not isinstance(fee_rate, (int, float)): continue
        
        # Convert to BPS
        # 0.2 -> 20% -> 2000 bps
        # 0.1 -> 10% -> 1000 bps
        perf_bps = int(round(fee_rate * 10000))
        
        # Normalize Name
        investor_name = clean_name(raw_name)
        
        # Map Fund
        fund_info = FUND_MAP.get(sheet)
        if not fund_info:
            # Try matching substrings
            for k, v in FUND_MAP.items():
                if k in sheet:
                    fund_info = v
                    break
        
        if not fund_info:
            print(f"Skipping fee for {sheet} - Fund not found in map")
            continue
            
        # Generate SQL using subqueries for IDs to ensure they match the DB
        sql = f"""
        INSERT INTO public.investor_fee_schedule (investor_id, fund_id, perf_fee_bps, mgmt_fee_bps)
        SELECT i.id, f.id, {perf_bps}, 200
        FROM public.investors i, public.funds f
        WHERE i.name = '{investor_name.replace("'", "''")}'
          AND f.code = '{fund_info['code']}'
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET perf_fee_bps = EXCLUDED.perf_fee_bps;
        """
        sql_lines.append(sql)

    with open(OUTPUT_SQL_FILE, 'w') as f:
        f.write("\n".join(sql_lines))
        
    print(f"Generated {len(sql_lines)} SQL statements in {OUTPUT_SQL_FILE}")

if __name__ == "__main__":
    generate_fee_sql()
