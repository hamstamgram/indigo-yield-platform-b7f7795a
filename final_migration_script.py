import json
import datetime
import uuid
import pandas as pd
import numpy as np

# Files
PAYLOAD_FILE = 'migration_payload.json'
EXTRACTED_DATA_FILE = 'extracted_data.json'
OUTPUT_SQL_FILE = 'final_migration.sql'

# Mappings
FUND_MAP = {
    "BTC Yield Fund": {"code": "BTCYF", "asset": "BTC", "name": "BTC Yield Fund", "class": "BTC"},
    "ETH Yield Fund": {"code": "ETHYF", "asset": "ETH", "name": "ETH Yield Fund", "class": "ETH"},
    "DONE - BTC Boosted Program": {"code": "BTCBST", "asset": "BTC", "name": "BTC Boosted Program", "class": "BTC"},
    "Done - ETH TAC Program": {"code": "ETHTAC", "asset": "ETH", "name": "ETH TAC Program", "class": "ETH"},
    "USDT Yield Fund": {"code": "USDTYF", "asset": "USDT", "name": "USDT Yield Fund", "class": "USDT"},
    "SOL Yield Fund": {"code": "SOLYF", "asset": "SOL", "name": "SOL Yield Fund", "class": "SOL"},
    "XRP Yield Fund": {"code": "XRPYF", "asset": "XRP", "name": "XRP Yield Fund", "class": "XRP"}
}

NAME_MAP = {
    "Blondish": "Vivie-Ann Bakos",
    "Mathias": "Matthias Reiser",
    "Jose": "Jose Molla",
    "Nathanael": "Nathanael Cohen",
    "Kyle": "Kyle Gulamerian",
    "Danielle": "Danielle Richetta",
    "Thomas": "Thomas Puech"
}

def generate_uuid(seed):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(seed)))

def clean_str(s):
    if not s: return ""
    return str(s).replace("'", "''").strip()

def main():
    print("Generating Final Migration SQL...")
    
    # Load Data
    with open(PAYLOAD_FILE, 'r') as f:
        payload = json.load(f)
    with open(EXTRACTED_DATA_FILE, 'r') as f:
        raw_data = json.load(f)
    
    investors = payload['investors']
    monthly_txs = payload['transactions']
    investments_raw = raw_data['investments'] # Initial deposits list
    
    sql_lines = []
    
    sql_lines.append("-- 1. Funds Configuration")
    fund_ids = {}
    for fname, info in FUND_MAP.items():
        fid = generate_uuid(info['code'])
        fund_ids[fname] = fid
        # Use ON CONFLICT to be safe
        sql = f"""
        INSERT INTO public.funds (id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps, min_investment, fund_class)
        VALUES ('{fid}', '{info['code']}', '{info['name']}', '{info['asset']}', '2024-01-01', 'active', 200, 2000, 1000, '{info['class']}')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        """
        sql_lines.append(sql)

    sql_lines.append("\n-- 2. Investors Configuration")
    investor_ids = {}
    for inv in investors:
        iid = inv['id']
        name = clean_str(inv['name'])
        email = clean_str(inv['email'])
        investor_ids[name] = iid
        
        sql = f"""
        INSERT INTO public.investors (id, name, email, status, kyc_status, onboarding_date, entity_type, accredited)
        VALUES ('{iid}', '{name}', '{email}', 'active', 'approved', '2024-01-01', 'individual', true)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        """
        sql_lines.append(sql)

    sql_lines.append("\n-- 3. Transactions (Deposits from Investments Sheet)")
    # These are the initial "hard" deposits.
    # We need to dedup these against the monthly transactions if they overlap.
    # Strategy: Import these as type 'deposit'.
    
    processed_deposits = set()
    
    for inv_row in investments_raw:
        try:
            raw_name = inv_row.get('Investor Name')
            if not raw_name: continue
            
            # Normalize name
            norm_name = raw_name.strip().replace("  ", " ")
            for k, v in NAME_MAP.items():
                if k in norm_name: norm_name = v; break
            
            inv_id = investor_ids.get(norm_name)
            if not inv_id: continue
            
            currency = inv_row.get('Currency', 'USD')
            amount = inv_row.get('Amount', 0)
            date_val = inv_row.get('Investment Date')
            
            if not amount or amount == '#REF!': continue
            
            # Find matching fund
            # Heuristic: Map Currency to Fund.
            # If BTC -> BTC Yield Fund
            # If ETH -> ETH Yield Fund
            target_fund_name = None
            if currency == 'BTC': target_fund_name = "BTC Yield Fund"
            elif currency == 'ETH': target_fund_name = "ETH Yield Fund"
            elif currency == 'USDT': target_fund_name = "USDT Yield Fund"
            
            if not target_fund_name: continue
            fund_id = fund_ids[target_fund_name]
            
            tx_id = generate_uuid(f"{inv_id}-{date_val}-{amount}-deposit")
            
            # Create SQL
            # Note: We use transactions_v2
            sql = f"""
            INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
            VALUES ('{tx_id}', '{inv_id}', '{fund_id}', '{date_val}', '{date_val}', '{currency}', {amount}, 'deposit', 'approved', 0, 'Initial Investment from Excel', '{currency}')
            ON CONFLICT (id) DO NOTHING;
            """
            sql_lines.append(sql)
            processed_deposits.add(tx_id)
            
        except Exception as e:
            print(f"Skipping investment row: {e}")

    sql_lines.append("\n-- 4. Transactions (Monthly Reconciliation)")
    # These are the transactions derived from the monthly balance changes.
    # Ideally, we should check if a 'deposit' here matches one from section 3.
    # Since we don't have exact date matching (monthly vs specific date), we will import these as 'yield' or 'adjustment'.
    # BUT, if it's a large positive delta, it might be the deposit we just inserted.
    # To avoid double counting, we should be careful.
    # However, the user wants to "backfill performance".
    # Let's assume the Monthly Reconciliation contains ALL changes (including the effect of deposits).
    # Strategy:
    # If we insert the Deposit from Section 3, the balance increases.
    # The Monthly Reconciliation script (generate_migration_scripts.py) calculated deltas based on "Previous Balance = 0".
    # If we import BOTH, we might double count.
    # The "Reconciliation Strategy" document says "Reconstruct ... from Balance-Forward".
    # If `transactions` in payload covers the full history, we should prioritize that for the LEDGER.
    # However, `Investments` sheet has the *accurate dates* for deposits.
    # I will use the Payload transactions but try to backdate the 'deposit' types to the dates found in `Investments` if they match amounts.
    
    # Index investments for matching
    investment_lookup = [] # (inv_id, amount, date)
    for inv_row in investments_raw:
        try:
            r_name = inv_row.get('Investor Name')
            if not r_name: continue
            n_name = r_name.strip()
            for k,v in NAME_MAP.items():
                if k in n_name: n_name = v; break
            iid = investor_ids.get(n_name)
            amt = inv_row.get('Amount')
            dt = inv_row.get('Investment Date')
            if iid and amt and dt:
                investment_lookup.append({'id': iid, 'amount': float(amt), 'date': dt})
        except: pass

    for tx in monthly_txs:
        tx_id = tx['id']
        inv_id = tx['investor_id']
        fund_id = tx['fund_id']
        amount = tx['amount']
        tx_type = tx['type']
        date_val = tx['tx_date']
        
        # If it's a deposit, check if we have a better date from Investment sheet
        final_date = date_val
        final_notes = tx.get('notes', '')
        
        if tx_type == 'deposit':
            # Look for match
            for inv_rec in investment_lookup:
                if inv_rec['id'] == inv_id and abs(inv_rec['amount'] - amount) < 0.001:
                    final_date = inv_rec['date']
                    final_notes += f" (Matched Investment Date: {final_date})"
                    break
        
        # Convert date to SQL format if needed (already ISO in json?)
        if 'T' in final_date: final_date = final_date.split('T')[0]
        
        # Skip if this transaction ID was already added (unlikely given UUID gen method, but safe)
        if tx_id in processed_deposits: continue
        
        # Fund Class
        f_class = tx.get('asset', 'BTC') # Default fallback
        
        sql = f"""
        INSERT INTO public.transactions_v2 (id, investor_id, fund_id, tx_date, value_date, asset, amount, type, status, balance_after, notes, fund_class)
        VALUES ('{tx_id}', '{inv_id}', '{fund_id}', '{final_date}', '{final_date}', '{tx['asset']}', {amount}, '{tx_type}', 'approved', {tx['balance_after']}, '{clean_str(final_notes)}', '{f_class}')
        ON CONFLICT (id) DO NOTHING;
        """
        sql_lines.append(sql)

    sql_lines.append("\n-- 5. Update Investor Positions (Current State)")
    # We calculate the final position for each investor/fund based on the transactions we just prepared.
    # Actually, we can just take the last 'balance_after' from the transactions for each (investor, fund).
    
    final_positions = {} # (inv_id, fund_id) -> {balance, date}
    
    for tx in monthly_txs:
        k = (tx['investor_id'], tx['fund_id'])
        bal = tx['balance_after']
        dt = tx['tx_date']
        if k not in final_positions:
            final_positions[k] = {'balance': bal, 'date': dt, 'class': tx.get('asset', 'BTC')}
        else:
            # keep latest
            if dt > final_positions[k]['date']:
                final_positions[k] = {'balance': bal, 'date': dt, 'class': tx.get('asset', 'BTC')}
    
    for (inv_id, fund_id), pos in final_positions.items():
        sql = f"""
        INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, updated_at, fund_class)
        VALUES ('{inv_id}', '{fund_id}', {pos['balance']}, 0, NOW(), '{pos['class']}')
        ON CONFLICT (investor_id, fund_id) 
        DO UPDATE SET shares = EXCLUDED.shares, updated_at = NOW();
        """
        sql_lines.append(sql)

    # Write to file
    with open(OUTPUT_SQL_FILE, 'w') as f:
        f.write("\n".join(sql_lines))
        
    print(f"Successfully generated {OUTPUT_SQL_FILE}")

if __name__ == "__main__":
    main()
