import os
from supabase import create_client, Client

# Configuration - Use environment variables for security
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nkfimvovosdehmyyjubn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_KEY environment variable not set. Run: export SUPABASE_SERVICE_KEY=your_key")

def check_fund_usage():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Checking Fund Usage...")
    
    # Get all funds
    const_funds = supabase.table('funds').select('id, code, name').execute()
    funds = const_funds.data
    
    for fund in funds:
        # Check transactions count
        res = supabase.table('transactions_v2').select('id', count='exact').eq('fund_id', fund['id']).execute()
        count = res.count
        print(f"Fund {fund['code']} ({fund['name']}): {count} transactions")

if __name__ == "__main__":
    check_fund_usage()
