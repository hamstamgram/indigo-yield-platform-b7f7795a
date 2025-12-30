import os
import json
import re
from supabase import create_client, Client

# Configuration - Use environment variables for security
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nkfimvovosdehmyyjubn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_KEY environment variable not set. Run: export SUPABASE_SERVICE_KEY=your_key")

def fix_data_integrity():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to {SUPABASE_URL}")

    print("Linking Investors to Profiles (Phase 2: Name Matching)...")
    try:
        # Get unlinked investors
        res = supabase.table('investors').select('id, email, name').is_('profile_id', 'null').execute()
        orphans = res.data
        
        if orphans:
            print(f"Found {len(orphans)} unlinked investors.")
            
            # Get all profiles
            p_res = supabase.table('profiles').select('id, email, first_name, last_name').execute()
            profiles = p_res.data
            
            # Build maps
            email_map = {p['email'].lower().strip(): p for p in profiles if p.get('email')}
            name_map = {}
            for p in profiles:
                first = p.get('first_name', '') or ''
                last = p.get('last_name', '') or ''
                if first or last:
                    full_name = " ".join(filter(None, [first, last])).lower().strip()
                    name_map[full_name] = p

            count = 0
            for inv in orphans:
                inv_email = inv.get('email', '').lower().strip()
                inv_name = inv.get('name', '').lower().strip()
                
                match = None
                match_type = ""

                # Try Email
                if inv_email in email_map:
                    match = email_map[inv_email]
                    match_type = "Email"
                
                # Try Name
                if not match and inv_name in name_map:
                    match = name_map[inv_name]
                    match_type = "Name"
                
                # Specific Manual Overrides for known data issues
                manual_map = {
                    "Pierre Bezençon": "Pierre Bezencon",
                    "Vivie-Ann Bakos": "Vivie & Liana",
                    "Ryan Van Der Wall": "",
                    "Joel Barbeau": "",
                    "Alec Beckman": "",
                    "Lars Ahlgreen": "",
                    "Alex Jacobs": "",
                }
                
                if inv_name in manual_map and manual_map[inv_name]:
                    target_name = manual_map[inv_name].lower()
                    if target_name in name_map:
                        match = name_map[target_name]
                        match_type = "Manual Map"

                # Try Fuzzy Name (improved)
                if not match:
                    # Remove accents
                    clean_inv = inv_name.replace('ç', 'c').replace('ë', 'e').replace('é', 'e')
                    clean_inv = clean_inv.replace('-', ' ').replace('_', ' ')
                    
                    for pname, p in name_map.items():
                        clean_p = pname.replace('-', ' ')
                        if clean_p == clean_inv:
                            match = p
                            match_type = "Cleaned Name"
                            break
                        # Partial
                        if clean_inv in clean_p or clean_p in clean_inv:
                             # High confidence check (e.g. length match > 50%)
                             if len(clean_inv) > 5:
                                 match = p
                                 match_type = "Fuzzy Contain"
                                 break

                if match:
                    print(f"  Linking '{inv['name']}' -> '{match['first_name']} {match['last_name']}' [{match_type}]")
                    supabase.table('investors').update({
                        'profile_id': match['id'],
                        'email': match['email']
                    }).eq('id', inv['id']).execute()
                    count += 1
                else:
                    # CREATE NEW USER for the orphan
                    print(f"  Creating new Auth User for '{inv_name}'...")
                    try:
                        # Construct email: use existing if valid, else generate
                        new_email = inv_email
                        if "@investor.local" in new_email or not new_email:
                            safe_name = re.sub(r'[^a-z0-9]', '.', inv_name.lower())
                            new_email = f"{safe_name}@placeholder.indigo"
                        
                        # Split name
                        parts = inv_name.split()
                        first = parts[0] if parts else "Unknown"
                        last = " ".join(parts[1:]) if len(parts) > 1 else ""
                        
                        # Create Auth
                        user = supabase.auth.admin.create_user({
                            "email": new_email,
                            "password": "TempPassword123!",
                            "email_confirm": True,
                            "user_metadata": {"first_name": first, "last_name": last}
                        })
                        new_id = user.user.id
                        
                        # Create Profile
                        supabase.table('profiles').upsert({
                            "id": new_id,
                            "email": new_email,
                            "first_name": first,
                            "last_name": last
                        }).execute()
                        
                        # Link
                        supabase.table('investors').update({
                            'profile_id': new_id,
                            'email': new_email
                        }).eq('id', inv['id']).execute()
                        
                        print(f"  Created & Linked '{inv_name}' -> {new_id}")
                        count += 1
                        
                    except Exception as create_err:
                        print(f"  FAILED to create '{inv_name}': {create_err}")

            print(f"  Phase 2 Linked: {count}/{len(orphans)}")
        else:
            print("  No unlinked investors found.")

    except Exception as e:
        print(f"Error linking investors: {e}")

if __name__ == "__main__":
    fix_data_integrity()
