import requests
import json
import decimal

# --- Financial Utilities ---
class FinancialEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return str(obj)
        return super().default(obj)

def to_decimal(val):
    if val is None: return decimal.Decimal(0)
    return decimal.Decimal(str(val))

# --- Config ---
SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co"
# We don't have the anon key, but we can try to find it in the source
# Actually, I'll just check the platform via HTTP if possible,
# or assume the user wants me to verify logic in the workbench.

print("--- Live Platform Verification Strategy ---")
print("1. Target: https://indigo-yield-platform.lovable.app/")
print("2. Admin: adriel@indigo.fund")
print("3. Verification: Numerical Consistency with Excel")

# Load excel data
with open('excel_data_mapped.json', 'r') as f:
    excel_data = json.load(f)

# Extract a few key data points for the user to confirm manually or for my record
# Focus on 'Kyle Gulamerian' in BTC Boosted
kyle_data = [row for row in excel_data.get('DONE - BTC Boosted Program', []) if row.get('Investors') == 'Kyle Gulamerian']
if kyle_data:
    row = kyle_data[-1]
    print(f"\nExcel Reference (Kyle Gulamerian - BTC Boosted):")
    print(f"  Date: {row.get('Date')}")
    print(f"  AUM: {row.get('AUM')}")
    print(f"  Expected Distribution (Dec): {row.get('2025-01-01 00:00:00')}")

