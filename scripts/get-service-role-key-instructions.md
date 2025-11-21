# How to Get Your Supabase Service Role Key

## Steps:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api

2. **Find the Service Role Key:**
   - Look for the "service_role" secret key
   - It's labeled as: "This key has the ability to bypass Row Level Security. Never share it publicly."
   - Click "Reveal" to see the key

3. **Copy and Use:**
   ```bash
   # Option 1: Set environment variable temporarily
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

   # Then run the password reset script
   node scripts/admin-reset-password.js hammadou@indigo.fund NewPassword123!
   ```

   ```bash
   # Option 2: Use inline (one-time use)
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" node scripts/admin-reset-password.js hammadou@indigo.fund NewPassword123!
   ```

## Alternative: Manual Reset via Dashboard

1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users
2. Search for: `hammadou@indigo.fund`
3. Click the three dots (•••) next to the user
4. Select "Reset Password"
5. Choose:
   - **Send Recovery Email** (if email is working)
   - **Set New Password** (manual password set - recommended if rate limited)

## Rate Limit Information

Supabase Auth has default rate limits:
- **Email per hour:** 4 emails per hour per recipient
- **SMS per hour:** 4 SMS per hour per recipient

### How to Check Rate Limit Status:
Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/logs/auth-logs

Look for entries related to `hammadou@indigo.fund` to see when the rate limit will reset.

### How to Increase Rate Limits:
1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/auth
2. Scroll to "Rate Limits"
3. Adjust the values (requires Pro plan or higher)

## Security Note

⚠️ **NEVER commit the service role key to git!**
- Add it to `.env.local` (not tracked)
- Use it only for administrative tasks
- It bypasses ALL Row Level Security policies
