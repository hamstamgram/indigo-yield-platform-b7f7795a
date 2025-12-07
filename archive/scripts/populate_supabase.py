import os
import json
import datetime
from supabase import create_client, Client

# Configuration
SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co"
# Hardcoding key for this session as provided by user
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"

PROCESSED_DIR = 'indigo-yield-platform-v01/processed_reports'

def parse_date(date_str):
    clean = date_str.replace('st,', ',').replace('nd,', ',').replace('rd,', ',').replace('th,', ',')
    clean = clean.replace('st ', ' ').replace('nd ', ' ').replace('rd ', ' ').replace('th ', ' ')
    formats = ["%d/%m/%Y", "%B %d, %Y", "%B %d %Y", "%Y-%m-%d"]
    for fmt in formats:
        try:
            return datetime.datetime.strptime(clean, fmt).date()
        except ValueError:
            continue
    return None

def populate_supabase():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to {SUPABASE_URL}")

    # 1. Fetch ALL existing profiles for matching
    print("Fetching existing profiles...")
    try:
        # Pagination might be needed for large sets, but assuming <1000 for now
        res = supabase.table('profiles').select('id, email, first_name, last_name').execute()
        profiles = res.data
        print(f"Loaded {len(profiles)} existing profiles.")
    except Exception as e:
        print(f"Error fetching profiles: {e}")
        return

    # Build Lookup Maps
    email_map = {}
    name_map = {}
    
    for p in profiles:
        if p.get('email'):
            email_map[p['email'].lower().strip()] = p['id']
        
        if p.get('first_name') and p.get('last_name'):
            full_name = f"{p['first_name']} {p['last_name']}".lower().strip()
            name_map[full_name] = p['id']

    # 2. Ensure Admin User for 'created_by' (needed for statement_periods)
    admin_id = None
    try:
        res = supabase.table('profiles').select('id').eq('is_admin', True).limit(1).execute()
        if res.data:
            admin_id = res.data[0]['id']
            print(f"Using admin ID for records: {admin_id}")
    except Exception:
        pass

    files = [f for f in os.listdir(PROCESSED_DIR) if f.endswith('.json')]
    print(f"Found {len(files)} investor files to process.")

    matched_count = 0
    skipped_count = 0

    for filename in files:
        filepath = os.path.join(PROCESSED_DIR, filename)
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        # Identify Investor
        file_emails = [e.lower().strip() for e in data['profile']['emails']]
        name_parts = filename.replace('.json', '').split('_')
        first_name_guess = name_parts[0]
        last_name_guess = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        full_name_guess = f"{first_name_guess} {last_name_guess}".lower().strip()
        
        user_id = None
        
        # Match by Email
        for email in file_emails:
            if email in email_map:
                user_id = email_map[email]
                print(f"Matched {filename} by email ({email}) -> {user_id}")
                break
        
        # Match by Name if no email match
        if not user_id and full_name_guess in name_map:
            user_id = name_map[full_name_guess]
            print(f"Matched {filename} by name ({full_name_guess}) -> {user_id}")
            
        if not user_id:
            print(f"SKIPPING {filename}: No matching existing user found.")
            skipped_count += 1
            continue

        matched_count += 1

        # 3. Transactions
        for tx in data.get('transactions', []):
            d = parse_date(tx['date'])
            if not d: continue
            
            amount = float(tx['amount'])
            tx_type = 'DEPOSIT' if amount >= 0 else 'WITHDRAWAL'
            
            tx_payload = {
                "investor_id": user_id,
                "asset_code": tx['currency'].upper(),
                "amount": abs(amount),
                "type": tx_type,
                "status": "confirmed",
                "created_at": d.isoformat() + "T12:00:00Z",
                "note": "Imported from log"
            }
            try:
                # Simple dedup check
                exists = supabase.table('transactions').select('id').match({
                    "investor_id": user_id,
                    "asset_code": tx_payload['asset_code'],
                    "amount": tx_payload['amount'],
                    "type": tx_payload['type']
                }).execute()
                
                if not exists.data:
                    supabase.table('transactions').insert(tx_payload).execute()
            except Exception as e:
                print(f"  Tx Error: {e}")

        # 4. Performance / Statement Periods
        for rep in data.get('reports', []):
            if not rep.get('period_ended'): continue
            d = parse_date(rep['period_ended'])
            if not d: continue
            
            year, month = d.year, d.month
            
            # Ensure Statement Period
            period_id = None
            try:
                res = supabase.table('statement_periods').select('id').match({"year": year, "month": month}).execute()
                if res.data:
                    period_id = res.data[0]['id']
                elif admin_id:
                    # Only create period if we have an admin to attribute it to
                    period_name = d.strftime("%B %Y")
                    res = supabase.table('statement_periods').insert({
                        "year": year,
                        "month": month,
                        "period_name": period_name,
                        "period_end_date": d.isoformat(),
                        "created_by": admin_id,
                        "status": "FINALIZED"
                    }).execute()
                    period_id = res.data[0]['id']
            except Exception as e:
                print(f"  Period Error: {e}")
                continue
            
            if not period_id: continue

            # Insert Performance
            try:
                perf_data = {
                    "period_id": period_id,
                    "user_id": user_id,
                    "fund_name": rep['fund'].upper(),
                    "mtd_net_income": rep['metrics'].get('net_income_mtd', 0),
                    "mtd_ending_balance": rep['metrics'].get('ending_balance_mtd', rep['metrics'].get('ending_balance', 0)),
                    "mtd_rate_of_return": rep['metrics'].get('roi_mtd', 0),
                }
                supabase.table('investor_fund_performance').upsert(
                    perf_data, 
                    on_conflict='period_id,user_id,fund_name'
                ).execute()
            except Exception as e:
                print(f"  Perf Error: {e}")

    print(f"Done. Matched: {matched_count}, Skipped: {skipped_count}")

if __name__ == "__main__":
    populate_supabase()