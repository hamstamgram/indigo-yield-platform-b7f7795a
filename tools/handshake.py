import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def handshake():
    print("🚀 Starting Connectivity Handshake...")
    
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
    
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    supabase: Client = create_client(url, key)
    
    try:
        # Fetch one row with all columns to see the schema
        response = supabase.table("funds").select("*").limit(1).execute()
        if response.data:
            print("✅ Schema Sample (Funds):")
            print(response.data[0].keys())
        else:
            print("⚠️ Funds table is empty.")
    except Exception as e:
        print(f"❌ Failed to fetch funds schema: {str(e)}")

if __name__ == "__main__":
    handshake()