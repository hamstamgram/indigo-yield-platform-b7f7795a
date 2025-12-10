import json
import datetime
import uuid

# Configuration
PAYLOAD_FILE = 'migration_payload.json'
OUTPUT_SQL_FILE = 'migration_inserts.sql'

# Mappings (from generate_migration_scripts.py)
FUND_MAP = {
    "BTC Yield Fund": {"code": "BTCYF", "asset": "BTC", "name": "BTC Yield Fund"},
    "ETH Yield Fund": {"code": "ETHYF", "asset": "ETH", "name": "ETH Yield Fund"},
    "DONE - BTC Boosted Program": {"code": "BTCBST", "asset": "BTC", "name": "BTC Boosted Program"},
    "Done - ETH TAC Program": {"code": "ETHTAC", "asset": "ETH", "name": "ETH Yield Fund"}, # Assuming TAC is a sub-program of ETH Yield
    "USDT Yield Fund": {"code": "USDTYF", "asset": "USDT", "name": "USDT Yield Fund"},
    "SOL Yield Fund": {"code": "SOLYF", "asset": "SOL", "name": "SOL Yield Fund"},
    "XRP Yield Fund": {"code": "XRPYF", "asset": "XRP", "name": "XRP Yield Fund"}
}

def generate_fund_inserts(funds_data):
    sql_statements = []
    for excel_name, fund_info in funds_data.items():
        # Using UUID generated consistently based on code for idempotency
        fund_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, fund_info['code']))
        sql = f"""
        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('{fund_id}', '{fund_info['code']}', '{fund_info['name']}', '{fund_info['asset']}', '{datetime.date.today().isoformat()}', 'active', 200, 2000, 1000, '{fund_info['asset']}')
        ON CONFLICT (id) DO NOTHING;
        """
        sql_statements.append(sql)
    return "\n".join(sql_statements)

def generate_investor_inserts(investors_data):
    sql_statements = []
    for investor in investors_data:
        # Assuming investor IDs are already UUIDs from payload
        sql = f"""
        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date)
        VALUES ('{investor['id']}', '{investor['name'].replace("'", "''")}', '{investor['email']}', 'active', 'pending', '{datetime.date.today().isoformat()}')
        ON CONFLICT (id) DO NOTHING;
        """
        sql_statements.append(sql)
    return "\n".join(sql_statements)

def generate_transaction_inserts(transactions_data):
    sql_statements = []
    for tx in transactions_data:
        # Convert date to YYYY-MM-DD
        tx_date = datetime.datetime.fromisoformat(tx['tx_date']).strftime('%Y-%m-%d')
        value_date = datetime.datetime.fromisoformat(tx['value_date']).strftime('%Y-%m-%d')
        
        # tx_type enum is expected by Supabase
        # 'deposit', 'withdrawal', 'yield', 'fee'
        # My script produced 'deposit', 'withdrawal', 'yield'
        
        sql = f"""
        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, balance_after, notes, fund_class)
        VALUES ('{tx['id']}', '{tx['investor_id']}', '{tx['fund_id']}', '{tx_date}', '{value_date}', '{tx['asset']}', {tx['amount']}, '{tx['type']}', {tx['balance_after']}, '{tx['notes'].replace("'", "''")}', '{tx['asset']}')
        ON CONFLICT (id) DO NOTHING;
        """
        sql_statements.append(sql)
    return "\n".join(sql_statements)

def main():
    with open(PAYLOAD_FILE, 'r') as f:
        payload = json.load(f)

    investors = payload['investors']
    transactions = payload['transactions']

    # Generate fund inserts from the FUND_MAP used in data generation
    fund_inserts = generate_fund_inserts(FUND_MAP)
    # Generate investor inserts
    investor_inserts = generate_investor_inserts(investors)

    # Need to enrich transactions with actual fund_id and investor_id from the generated entities
    transaction_inserts = generate_transaction_inserts(transactions)

    with open(OUTPUT_SQL_FILE, 'w') as f:
        f.write("-- Supabase Migration Inserts\n\n")
        f.write("-- Funds Inserts\n")
        f.write(fund_inserts)
        f.write("\n\n-- Investor Inserts\n")
        f.write(investor_inserts)
        f.write("\n\n-- Transaction Inserts\n")
        f.write(transaction_inserts)
    
    print(f"SQL inserts generated and saved to {OUTPUT_SQL_FILE}")

if __name__ == "__main__":
    main()
