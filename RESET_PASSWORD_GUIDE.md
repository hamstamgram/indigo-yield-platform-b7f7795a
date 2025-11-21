# 🔐 Password Reset Guide - Fix Rate Limit Issues

## ⚠️ Current Issue
**Email:** hammadou@indigo.fund
**Error:** `email rate limit exceeded`
**Cause:** Supabase limits password reset emails to 4 per hour per user

---

## ✅ Quick Solutions (Choose One)

### **Option 1: Dashboard Reset (Easiest - Recommended)**

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users
   ```

2. **Find the user:**
   - Search for: `hammadou@indigo.fund`
   - Click on the user row

3. **Reset Password:**
   - Click the three dots (•••) menu on the right
   - Select **"Reset Password"**
   - Choose **"Set New Password"** (manual - bypasses email)
   - Enter a new secure password
   - Click **"Update User"**

4. **Done!** User can login immediately with the new password.

---

### **Option 2: Use Admin Script (Programmatic)**

I've created a script that uses the Supabase Admin API to bypass rate limits.

#### **Step 1: Get Your Service Role Key**

1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api
2. Find the **"service_role"** key (it's hidden by default)
3. Click **"Reveal"** to see the key
4. **Copy it** (keep it secret!)

#### **Step 2: Run the Script**

```bash
cd indigo-yield-platform-v01

# Set the service role key and run the script
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
  node scripts/admin-reset-password.mjs hammadou@indigo.fund NewSecurePassword123!
```

**Example output:**
```
🔄 Resetting password for: hammadou@indigo.fund
✅ Found user: 12345-67890-abcdef
✅ Password reset successfully!

📧 User can now login with:
   Email: hammadou@indigo.fund
   Password: NewSecurePassword123!
```

---

### **Option 3: Wait for Rate Limit to Reset**

If neither option works, wait **1 hour** from the last reset attempt, then try the normal reset flow again.

**Check when the rate limit resets:**
1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/logs/auth-logs
2. Filter by: `hammadou@indigo.fund`
3. Find the last `magiclink` or `recovery` email timestamp
4. Rate limit resets 1 hour after that timestamp

---

## 🔧 Prevent Future Rate Limit Issues

### **Option A: Increase Rate Limits (Requires Pro Plan)**

1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/auth
2. Scroll to **"Rate Limits"** section
3. Increase the limits:
   - Email: 10-20 per hour (default: 4)
   - SMS: 10-20 per hour (default: 4)

### **Option B: Use Alternative Reset Methods**

1. **Enable Phone/SMS Auth:**
   - Users can reset via SMS instead of email
   - Separate rate limit pool

2. **Implement Admin Password Reset UI:**
   - Admins can reset user passwords
   - Uses service role key (no rate limits)
   - Located in: `/admin/users/[id]/security`

3. **Use Magic Links Instead:**
   - Users click link in email (no password typing)
   - Same rate limits, but more convenient

---

## 📊 Current Supabase Configuration

**Project ID:** nkfimvovosdehmyyjubn
**Region:** US East (probably)
**Plan:** Free Tier (likely - has default rate limits)

**Auth Settings:**
- ✅ Email auth enabled
- ✅ Magic link enabled
- ❌ Phone auth disabled (enable for SMS reset)
- ❌ Social auth (Google, etc.) - optional

**Rate Limits (Default):**
- Email: 4 per hour per user
- SMS: 4 per hour per user
- Password: 10 attempts per 5 minutes

---

## 🚀 After Password Reset

Once the password is reset, the user should:

1. **Login to the platform:**
   ```
   https://nkfimvovosdehmyyjubn.supabase.co
   ```

2. **Update profile settings:**
   - Settings > Profile
   - Settings > Security
   - Settings > Notifications

3. **Change password (if admin-set):**
   - Settings > Security > Change Password
   - Choose a strong, unique password

---

## 🆘 Troubleshooting

### **Error: "User not found"**
- Check spelling of email
- Verify user exists in Dashboard
- Check if user was deleted

### **Error: "Invalid service role key"**
- Verify you copied the full key
- Check for extra spaces
- Make sure it's the **service_role** key, not **anon** key

### **Error: "Network error"**
- Check internet connection
- Verify Supabase project is active
- Check if project URL is correct

### **Still rate limited after 1 hour?**
- Clear browser cache
- Try incognito/private mode
- Check Auth logs for exact reset time

---

## 📞 Need More Help?

**Supabase Dashboard:**
https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn

**Auth Users:**
https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users

**Auth Logs:**
https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/logs/auth-logs

**API Settings:**
https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api

**Supabase Docs:**
https://supabase.com/docs/guides/auth/passwords

---

## ⚠️ Security Best Practices

1. **Never commit service role keys to git**
2. **Rotate service role keys regularly** (every 90 days)
3. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)
4. **Enable 2FA** for admin accounts
5. **Monitor Auth logs** for suspicious activity

---

**Last Updated:** November 18, 2025
**Created by:** Claude Code Assistant
