import os
from supabase import create_client, Client

SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"

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
