import os
from supabase import create_client, Client

# Configuration - Use environment variables for security
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nkfimvovosdehmyyjubn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_KEY environment variable not set. Run: export SUPABASE_SERVICE_KEY=your_key")

def audit_system():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"--- AUDITING SYSTEM STATE ({SUPABASE_URL}) ---\n")

    # 1. Check Profiles (The New Source of Truth)
    print("[1] Checking 'profiles' table extensions...")
    try:
        # Try to select the new columns
        res = supabase.table('profiles').select('id, status, kyc_status, entity_type').limit(1).execute()
        if res.data:
            print(f"✅ Success: 'profiles' has new columns. Sample: {res.data[0]}")
        else:
            print("⚠️ Warning: 'profiles' query returned no data, but columns likely exist.")
    except Exception as e:
        print(f"❌ FAIL: 'profiles' table is missing expected columns: {e}")

    # 2. Check Investors (The Ghost)
    print("\n[2] Checking 'investors' table (Should be gone or empty)...")
    try:
        res = supabase.table('investors').select('*').limit(1).execute()
        if res.data:
            print(f"❌ FAIL: 'investors' table still exists and has data! Migration incomplete.")
        else:
            print("✅ Success: 'investors' table is empty or inaccessible (likely dropped).")
    except Exception as e:
        print(f"✅ Success: 'investors' table query failed (likely dropped): {e}")

    # 3. Check Yield Engine Tables
    print("\n[3] Checking 'investor_fund_performance' (V2)...")
    try:
        res = supabase.table('investor_fund_performance').select('*').limit(1).execute()
        if res.data:
            print(f"✅ Success: Table exists and has data. Sample ID: {res.data[0]['id']}")
        else:
            print("⚠️ Warning: Table exists but is empty. (Did population script run?)")
    except Exception as e:
        print(f"❌ FAIL: 'investor_fund_performance' table access failed: {e}")

    # 4. Check Views
    print("\n[4] Checking 'v_live_investor_balances' View...")
    try:
        res = supabase.table('v_live_investor_balances').select('*').limit(1).execute()
        print("✅ Success: View is accessible.")
    except Exception as e:
        print(f"❌ FAIL: View access failed: {e}")

    # 5. Check Fund Codes
    print("\n[5] Checking 'funds' table for code standardization...")
    try:
        res = supabase.table('funds').select('id, name, code, asset').execute()
        if res.data:
            print("Fund Codes Found:")
            for f in res.data:
                print(f"  - {f['name']}: Code='{f['code']}', Asset='{f['asset']}'")
        else:
            print("⚠️ Warning: No funds found.")
    except Exception as e:
        print(f"❌ FAIL: 'funds' table access failed: {e}")

if __name__ == "__main__":
    audit_system()
