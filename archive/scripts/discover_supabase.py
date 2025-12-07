import os
from supabase import create_client, Client

# Valid config from .env
url = "https://nkfimvovosdehmyyjubn.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"

def discover_tables():
    try:
        supabase: Client = create_client(url, key)
        print(f"Connected to {url}")
        
        # Try to get a list of potential tables by querying them
        # We can't list tables directly with anon key via REST easily without a specific function or endpoint.
        # But we can test access.
        tables = ['investors', 'transactions', 'reports', 'users', 'profiles']
        
        for t in tables:
            try:
                res = supabase.table(t).select("*").limit(1).execute()
                print(f"[SUCCESS] Table '{t}' is accessible. Rows: {len(res.data)}")
            except Exception as e:
                # If table doesn't exist or RLS blocks it, we get an error
                msg = str(e)
                if "404" in msg:
                    print(f"[MISSING] Table '{t}' not found (404).")
                elif "401" in msg:
                    print(f"[DENIED] Table '{t}' access denied (401) - RLS?")
                else:
                    print(f"[ERROR] Table '{t}': {msg}")
                    
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    discover_tables()
