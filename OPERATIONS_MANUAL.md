# 📘 Indigo Yield Platform - Operations Manual

**Version:** 1.0  
**Last Updated:** September 8, 2025

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Daily Operations](#daily-operations)
3. [Monthly Operations](#monthly-operations)
4. [Management Tools](#management-tools)
5. [Emergency Procedures](#emergency-procedures)

---

## 🌐 Platform Overview

### Current Status
- **Investors:** 23 active accounts
- **Assets Under Management:** $7.8 million
- **Supported Assets:** BTC, ETH, USDT, SOL, USDC, EURC
- **Database:** Supabase (nkfimvovosdehmyyjubn)
- **Frontend:** React + Vite at Vercel

### Key Personnel
- **Admin:** hammadou@indigo.fund (Hammadou Monoja)
- **Service Role Key:** Stored securely (required for operations)

---

## 📅 Daily Operations

### 1. Record Daily Yields (Required Daily)

**Tool:** `manage-daily-yields.js`

```bash
node manage-daily-yields.js
```

**Steps:**
1. Select option 1: "Record daily yields"
2. Enter date (or press Enter for today)
3. Enter yield percentage for each asset:
   - BTC: (e.g., 0.05 for 0.05% daily)
   - ETH: (e.g., 0.04 for 0.04% daily)
   - USDT: (e.g., 0.03 for 0.03% daily)
4. Confirm entries

**Example Yields:**
- Conservative: 0.02-0.05% daily
- Moderate: 0.05-0.10% daily
- Aggressive: 0.10-0.20% daily

### 2. Apply Yields to Positions (After Recording)

```bash
node manage-daily-yields.js
```

**Steps:**
1. Select option 2: "Apply yields to positions"
2. Confirm date
3. Review yields to be applied
4. Confirm application

This updates all investor balances with earned interest.

### 3. Process Deposits/Withdrawals (As Needed)

**Tool:** `manage-transactions.js`

```bash
node manage-transactions.js
```

**For Deposits:**
1. Select option 1: "Record deposit"
2. Select investor
3. Select asset
4. Enter amount
5. Enter transaction hash (optional)
6. Add note (optional)
7. Confirm

**For Withdrawals:**
1. Select option 2: "Record withdrawal"
2. Select investor
3. Select position
4. Enter amount (must be ≤ available balance)
5. Enter transaction hash (optional)
6. Add note (optional)
7. Confirm

---

## 📆 Monthly Operations

### 1. Generate Monthly Statements (1st of Month)

**Tool:** `generate-investor-statements.js`

```bash
node generate-investor-statements.js
```

This creates HTML statements for all investors in `/statements/YYYY_MM/`

### 2. Review Monthly Performance

```bash
node manage-daily-yields.js
```

Select option 4: "Calculate monthly performance"
- Enter month (1-12)
- Enter year (YYYY)
- Review performance metrics

### 3. Send Statements to Investors

**Current Process (Manual):**
1. Open statements folder: `open statements/2025_09`
2. Convert to PDF: Print → Save as PDF
3. Email to investors with secure links

**Future:** Automated email distribution via MailerLite

---

## 🛠 Management Tools

### Tool Directory

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `manage-daily-yields.js` | Record & apply yields | Daily |
| `manage-transactions.js` | Deposits & withdrawals | As needed |
| `generate-investor-statements.js` | Create statements | Monthly |
| `show-import-summary.js` | View platform totals | Anytime |
| `import-investors-with-service-key.js` | Add new investors | As needed |

### Quick Commands

#### View Platform Summary
```bash
node show-import-summary.js
```

#### Check Yield History
```bash
node manage-daily-yields.js
# Select option 3
```

#### View Transaction History
```bash
node manage-transactions.js
# Select option 3
```

#### Generate Statements
```bash
node generate-investor-statements.js
```

---

## 🚀 Standard Operating Procedures

### Daily Routine (9:00 AM)

1. **Record Previous Day's Yields**
   ```bash
   node manage-daily-yields.js
   # Option 1: Record daily yields
   ```

2. **Apply Yields to All Positions**
   ```bash
   node manage-daily-yields.js
   # Option 2: Apply yields
   ```

3. **Check for Pending Transactions**
   ```bash
   node manage-transactions.js
   # Option 3: View history
   ```

4. **Process Any New Deposits/Withdrawals**
   ```bash
   node manage-transactions.js
   # Option 1 or 2 as needed
   ```

### Monthly Routine (1st of Month)

1. **Calculate Previous Month's Performance**
   ```bash
   node manage-daily-yields.js
   # Option 4: Monthly performance
   ```

2. **Generate Investor Statements**
   ```bash
   node generate-investor-statements.js
   ```

3. **Review Statements**
   ```bash
   open statements/YYYY_MM/
   ```

4. **Distribute Statements**
   - Convert to PDF
   - Email to investors

### Adding New Investors

1. **Prepare Excel File**
   - Update `ops/import/first_run.xlsx`
   - Ensure "Investments" sheet has correct columns

2. **Run Import**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-key"
   node import-investors-with-service-key.js
   ```

3. **Verify Import**
   ```bash
   node show-import-summary.js
   ```

---

## 🚨 Emergency Procedures

### Service Outage

1. **Check Supabase Status**
   - Visit: https://status.supabase.com
   - Check project dashboard

2. **Check Vercel Status**
   - Visit: https://www.vercel-status.com
   - Check deployment status

### Data Recovery

1. **Backup Current Data**
   ```bash
   # Export positions
   node show-import-summary.js > backup_positions.txt
   
   # Export transactions
   node manage-transactions.js
   # Option 3 with 365 days
   ```

2. **Contact Support**
   - Supabase: support@supabase.io
   - Vercel: Through dashboard

### Failed Yield Application

1. **Check Error Message**
   - Note the position ID
   - Note the error details

2. **Manual Correction**
   - Use Supabase dashboard
   - Update positions table directly
   - Recalculate balances

### Incorrect Transaction

1. **Record Reversal**
   ```bash
   node manage-transactions.js
   ```
   - For wrong deposit: Record equivalent withdrawal
   - For wrong withdrawal: Record equivalent deposit

2. **Add Explanatory Note**
   - Include "REVERSAL:" in note
   - Reference original transaction

---

## 📊 Key Metrics to Monitor

### Daily Metrics
- Total AUM by asset
- Daily yield rates applied
- New deposits/withdrawals
- Number of active positions

### Monthly Metrics
- Average monthly return by asset
- Total earnings distributed
- Net deposits/withdrawals
- Investor count changes

### Warning Signs
- ❗ Yield > 1% daily (verify before applying)
- ❗ Withdrawal > 50% of position
- ❗ Multiple failed transactions
- ❗ Database connection errors

---

## 🔐 Security Best Practices

### Credentials Management
1. **Never commit keys to git**
2. **Use environment variables**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="..."
   ```
3. **Rotate keys quarterly**

### Audit Trail
- All transactions record `created_by`
- All updates record timestamps
- Keep transaction hashes for blockchain verification

### Access Control
- Admin operations require service role key
- Investors can only view own data
- Statements use signed URLs with expiry

---

## 📞 Support Contacts

### Technical Support
- **Database:** Supabase Dashboard
- **Frontend:** Vercel Dashboard
- **Email:** MailerLite Dashboard

### Business Support
- **Admin:** hammadou@indigo.fund
- **Operations:** Contact admin

### Emergency Contacts
- Keep updated list of:
  - Database admin
  - Frontend developer
  - Business owner

---

## 📝 Appendix

### Environment Setup
```bash
# Required environment variable
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Install dependencies
npm install

# Test connection
node show-import-summary.js
```

### Troubleshooting

**"User not allowed" error:**
- Check service role key is set
- Verify key is correct
- Ensure using service key, not anon key

**"Failed to fetch" errors:**
- Check internet connection
- Verify Supabase is online
- Check project status

**Empty statements:**
- Ensure yields have been applied
- Check positions exist
- Verify date ranges

### Useful SQL Queries

```sql
-- Check total AUM
SELECT asset_code, SUM(current_balance) 
FROM positions 
GROUP BY asset_code;

-- Recent transactions
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Investor balances
SELECT p.first_name, p.last_name, pos.asset_code, pos.current_balance
FROM profiles p
JOIN positions pos ON p.id = pos.investor_id
ORDER BY p.first_name;
```

---

**End of Operations Manual**

For updates or questions, contact the platform administrator.
