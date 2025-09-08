# 📊 Investor Import Guide

## Overview
This guide explains how to import investors from the Excel file into the Indigo Yield Platform database.

## 📁 Excel File Structure

The import script reads from: `ops/import/first_run.xlsx`

### Required Sheet: "Investments"
The script specifically looks for a sheet named "Investments" with the following columns:
- **Investment Date**: The date of the investment (Excel date serial number)
- **Investor Name**: Full name of the investor
- **Currency**: The asset symbol (BTC, ETH, USDT, etc.)
- **Amount**: The investment amount

### Sample Data Format:
```
| Investment Date | Investor Name    | Currency | Amount |
|----------------|------------------|----------|--------|
| 45455          | Jose Molla       | BTC      | 2.723  |
| 45455          | Jose Molla       | ETH      | 52.4   |
| 45481          | Kyle Gulamerian  | BTC      | 2.0    |
```

## 🔑 Prerequisites

### 1. Service Role Key Required
The import script needs the Supabase service role key to create new users. This key has admin privileges.

### 2. How to Get Your Service Role Key:

#### Option 1: Using the Helper Script
```bash
bash get-service-key.sh
```
This will guide you through the process step-by-step.

#### Option 2: Manual Steps
1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api
2. Log in with your Supabase account
3. Find the "Project API keys" section
4. Look for the key labeled "service_role" (secret)
5. Click "Reveal" to see the full key
6. Copy the key (it starts with `eyJ...`)

### 3. Set the Environment Variable
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

## 🚀 Running the Import

### Step 1: Ensure Excel File is in Place
```bash
ls -la ops/import/first_run.xlsx
```

### Step 2: Analyze the Excel File (Optional)
To see what data will be imported:
```bash
node analyze-excel.js
```

### Step 3: Run the Import Script
```bash
node import-investors-with-service-key.js
```

## 📝 What the Script Does

1. **Reads the Excel File**: Loads the "Investments" sheet
2. **Groups Investments**: Aggregates multiple investments by the same investor
3. **Creates Users**: For each unique investor:
   - Creates an auth user with a temporary password
   - Creates a profile record
   - Sets up portfolio entries with their asset balances
4. **Updates Existing**: If an investor already exists, updates their portfolio balances
5. **Reports Results**: Shows a summary of created, skipped, and failed imports

## 🔐 Security Notes

### Temporary Passwords
- New investors are created with temporary passwords in format: `TempPass[timestamp]!`
- These should be reset on first login
- Consider sending password reset emails to real investor emails when available

### Email Addresses
- The script generates temporary emails in format: `firstname.lastname@indigo-temp.fund`
- These should be updated with real investor emails later

## 📊 Import Results

After running, you'll see:
- **Import Summary**: Number of investors created, skipped, or failed
- **New Investor Details**: List of newly created investors with their credentials
- **Portfolio Summary**: Complete list of all investors and their holdings
- **Platform Totals**: Aggregate holdings across all investors

## 🔧 Troubleshooting

### "User not allowed" Error
- **Cause**: Using anon key instead of service role key
- **Fix**: Set the `SUPABASE_SERVICE_ROLE_KEY` environment variable

### "Asset not found" Warning
- **Cause**: Currency in Excel doesn't match available assets in database
- **Fix**: Ensure assets are initialized first (BTC, ETH, SOL, USDT, USDC, EURC)

### Profile Creation Fails
- **Cause**: RLS policies might be blocking the operation
- **Fix**: Service role key bypasses RLS, ensure you're using it correctly

### Excel File Not Found
- **Cause**: File path is incorrect or file doesn't exist
- **Fix**: Ensure file is at `ops/import/first_run.xlsx`

## 📁 Available Scripts

| Script | Purpose |
|--------|---------|
| `analyze-excel.js` | Analyzes Excel file structure and shows sample data |
| `import-investors-with-service-key.js` | Main import script (requires service role key) |
| `get-service-key.sh` | Helper to guide getting the service role key |
| `import-investors-from-investments.js` | Original script (doesn't work without service key) |

## 🔄 Re-running the Import

The script is idempotent:
- **Existing investors**: Will be skipped (based on name matching)
- **Existing portfolios**: Will have amounts added to current balance
- **New investors**: Will be created with new user IDs

## 📈 Next Steps After Import

1. **Verify Import Results**:
   ```bash
   # Check in Supabase Dashboard
   # Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users
   ```

2. **Update Real Emails**:
   - Replace temporary emails with real investor emails
   - Send password reset links to investors

3. **Test Login**:
   - Try logging in as an imported investor
   - Verify portfolio data is correct

4. **Add Missing Data**:
   - KYC information
   - Contact details
   - Investment preferences

## 💡 Tips

1. **Test First**: Consider testing with a small subset of data first
2. **Backup**: Export existing data before large imports
3. **Validate**: Check the analyzed Excel data before importing
4. **Monitor**: Watch the Supabase logs during import for any issues

## 🆘 Support

If you encounter issues:
1. Check the error messages in the console
2. Verify your service role key is correct
3. Ensure the Excel file format matches requirements
4. Check Supabase logs for detailed error information

---

**Important**: Keep your service role key secure! Never commit it to version control or share it publicly.
