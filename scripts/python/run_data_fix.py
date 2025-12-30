import os
from supabase import create_client, Client

# Configuration - Use environment variables for security
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nkfimvovosdehmyyjubn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_KEY environment variable not set. Run: export SUPABASE_SERVICE_KEY=your_key")

def fix_data_integrity():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"Connected to {SUPABASE_URL}")

        # 1. Fix Fee Percentages (e.g., 2.0 -> 0.02)
        print("Scanning for incorrect fee formats...")
        # Get all profiles with fee > 1
        res = supabase.table('profiles').select('id, fee_percentage').gt('fee_percentage', 1).execute()
        bad_fees = res.data
        
        if bad_fees:
            print(f"Found {len(bad_fees)} profiles with fees > 100% (likely format error). Fixing...")
            for p in bad_fees:
                new_fee = float(p['fee_percentage']) / 100.0
                print(f"  Fixing {p['id']}: {p['fee_percentage']} -> {new_fee}")
                supabase.table('profiles').update({'fee_percentage': new_fee}).eq('id', p['id']).execute()
        else:
            print("  No fee format errors found.")
            
    except Exception as e:
        print(f"Error fixing fees: {e}")

    # 2. Link Investors to Profiles
    print("Linking Investors to Profiles...")
    try:
        # Get investors with missing profile_id
        res = supabase.table('investors').select('id, email').is_('profile_id', 'null').execute()
        orphans = res.data
        
        if orphans:
            print(f"Found {len(orphans)} unlinked investors. Attempting to link by email...")
            # Get all profiles
            p_res = supabase.table('profiles').select('id, email').execute()
            profile_map = {p['email'].lower().strip(): p['id'] for p in p_res.data if p['email']}
            
            count = 0
            for inv in orphans:
                email = inv['email'].lower().strip()
                if email in profile_map:
                    profile_id = profile_map[email]
                    print(f"  Linking {email} -> {profile_id}")
                    supabase.table('investors').update({'profile_id': profile_id}).eq('id', inv['id']).execute()
                    count += 1
                else:
                    print(f"  No profile found for {email}")
            print(f"  Successfully linked {count} investors.")
        else:
            print("  All investors are already linked.")

    except Exception as e:
        print(f"Error linking investors: {e}")

if __name__ == "__main__":
    fix_data_integrity()
