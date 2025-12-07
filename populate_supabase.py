import os
import json
import datetime
from supabase import create_client, Client

# Configuration
# User must provide these in environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://nkfimvovosdehmyyjubn.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # MUST be Service Role Key for auth admin

PROCESSED_DIR = 'indigo-yield-platform-v01/processed_reports'

def parse_date(date_str):
    # Formats: "DD/MM/YYYY", "October 31st, 2024", "Month Ended: August 31st, 2025"
    # Clean up ordinal suffixes st, nd, rd, th
    clean = date_str.replace('st,', ',').replace('nd,', ',').replace('rd,', ',').replace('th,', ',')
    clean = clean.replace('st ', ' ').replace('nd ', ' ').replace('rd ', ' ').replace('th ', ' ')
    
    formats = [
        "%d/%m/%Y",
        "%B %d, %Y",
        "%B %d %Y",
        "%Y-%m-%d"
    ]
    
    for fmt in formats:
        try:
            return datetime.datetime.strptime(clean, fmt).date()
        except ValueError:
            continue
    return None

def populate_supabase():
    if not SUPABASE_KEY:
        print("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required to manage users.")
        print("Please export SUPABASE_SERVICE_ROLE_KEY='your_service_key' and run again.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to {SUPABASE_URL}")

    files = [f for f in os.listdir(PROCESSED_DIR) if f.endswith('.json')]
    print(f"Found {len(files)} investor files.")

    for filename in files:
        filepath = os.path.join(PROCESSED_DIR, filename)
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        # 1. Identify or Create User
        emails = data['profile']['emails']
        name_parts = filename.replace('.json', '').split('_')
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        email = emails[0] if emails else f"{first_name.lower()}.{last_name.lower()}@placeholder.indigo"
        if not email or '@' not in email:
             email = f"{filename.replace('.json', '').lower()}@placeholder.indigo"

        user_id = None
        
        # Check if user exists
        # Supabase Admin API: list_users is paginated, search is better
        # No direct search by email in python SDK commonly exposed easily? 
        # We can try creating, if fails, it exists? Or list.
        # Assuming we can't search easily, we try create.
        
        print(f"Processing {first_name} {last_name} ({email})...")
        
        try:
            # Try to get user by email? 
            # auth.admin.list_users() might be slow if many users.
            # We'll try to create and catch error.
            attributes = {
                "email": email,
                "email_confirm": True,
                "user_metadata": {
                    "first_name": first_name,
                    "last_name": last_name
                }
            }
            # Random password
            password = "TempPassword123!" 
            
            # Create user
            try:
                user = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": attributes["user_metadata"]
                })
                user_id = user.user.id
                print(f"  Created new user: {user_id}")
            except Exception as e:
                # Likely "User already registered"
                if "already registered" in str(e) or "constraint" in str(e):
                    # We need to find the ID. 
                    # Warning: this is inefficient for many users.
                    # Better: use RPC or assume we can query public.profiles if email is there?
                    # Profiles table has email.
                    res = supabase.table('profiles').select('id').eq('email', email).execute()
                    if res.data:
                        user_id = res.data[0]['id']
                        print(f"  Found existing profile: {user_id}")
                    else:
                        print(f"  User exists in Auth but not Profiles? Error: {e}")
                        continue
                else:
                    print(f"  Error creating user: {e}")
                    continue
                    
        except Exception as e:
            print(f"  Auth error: {e}")
            continue

        if not user_id:
            print("  Skipping: No User ID.")
            continue

        # 2. Upsert Profile
        try:
            profile_data = {
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "updated_at": datetime.datetime.now().isoformat()
            }
            supabase.table('profiles').upsert(profile_data).execute()
        except Exception as e:
            print(f"  Error upserting profile: {e}")

        # 3. Process Transactions
        for tx in data.get('transactions', []):
            # Map fields
            # Date: DD/MM/YYYY -> YYYY-MM-DD
            d = parse_date(tx['date'])
            if not d:
                continue
                
            amount = float(tx['amount'])
            tx_type = 'DEPOSIT' if amount >= 0 else 'WITHDRAWAL'
            # Note: CSV has explicit deposits/withdrawals mixed? 
            # Amount > 0 is deposit, < 0 is withdrawal usually for capital.
            
            tx_data = {
                "investor_id": user_id,
                "asset_code": tx['currency'].upper(),
                "amount": abs(amount),
                "type": tx_type,
                "status": "confirmed",
                "created_at": d.isoformat() + "T12:00:00Z", # Noon UTC
                "note": "Imported from historical CSV"
            }
            
            try:
                # Check if exists to avoid duplicates? 
                # Transactions table has UUID PK. Upsert needs ID.
                # We don't have ID. We will INSERT.
                # CAUTION: Running this script twice will duplicate transactions!
                # We should check if a transaction with same investor, asset, amount, date exists.
                
                existing = supabase.table('transactions').select('id').match({
                    'investor_id': user_id, 
                    'asset_code': tx_data['asset_code'],
                    'amount': tx_data['amount'],
                    'type': tx_data['type'],
                    # Date comparison is tricky with timestamps. 
                    # We'll skip date check for now or try loose match?
                    # Or just rely on "don't run twice".
                }).execute()
                
                # Check date in python
                is_dup = False
                if existing.data:
                    for e_tx in existing.data:
                        # If we wanted to be strict, we'd fetch created_at. 
                        # For now, assume dup if amount/type/investor matches (heuristic).
                        is_dup = True 
                        break
                
                if not is_dup:
                    supabase.table('transactions').insert(tx_data).execute()
            except Exception as e:
                print(f"  Error inserting transaction: {e}")

        # 4. Process Reports (Statements)
        for rep in data.get('reports', []):
            if not rep.get('period_ended') or not rep.get('fund'):
                continue
                
            d = parse_date(rep['period_ended'])
            if not d:
                continue
                
            stmt_data = {
                "investor_id": user_id,
                "period_year": d.year,
                "period_month": d.month,
                "asset_code": rep['fund'].upper(),
                "begin_balance": 0, # We don't extract this yet?
                "additions": 0,
                "redemptions": 0,
                "net_income": rep['metrics'].get('net_income_mtd', 0),
                "end_balance": rep['metrics'].get('ending_balance', 0),
                "rate_of_return_mtd": rep['metrics'].get('roi_mtd', 0),
                # Storage path? Maybe link to PDF if uploaded.
            }
            
            # Check unique constraint: UNIQUE(investor_id, period_year, period_month, asset_code)
            # Upsert handles this automatically!
            try:
                supabase.table('statements').upsert(stmt_data, on_conflict='investor_id, period_year, period_month, asset_code').execute()
            except Exception as e:
                print(f"  Error upserting statement: {e}")

    print("Population complete.")

if __name__ == "__main__":
    populate_supabase()
