# Indigo Yield Platform - Administrator User Guide

**Complete Guide for Platform Administrators**
Version 1.0 | Last Updated: November 2025

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Managing Investors](#3-managing-investors)
4. [Transaction Management](#4-transaction-management)
5. [Statement Generation](#5-statement-generation)
6. [Withdrawal Management](#6-withdrawal-management)
7. [Fund Management](#7-fund-management)
8. [Compliance Center](#8-compliance-center)
9. [Reports & Analytics](#9-reports--analytics)
10. [System Settings](#10-system-settings)
11. [Admin Best Practices](#11-admin-best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Introduction

### Purpose of This Guide

This guide is designed for platform administrators who manage the Indigo Yield Platform. It covers all administrative functions, from investor management to compliance oversight.

### Administrator Roles

**Typical Administrator Responsibilities**:
- Onboard and verify new investors
- Approve deposits and withdrawals
- Generate and distribute monthly statements
- Monitor fund performance
- Ensure regulatory compliance
- Resolve investor issues
- Maintain system configuration

### Prerequisites

**Before Using Admin Functions**:
- Administrator access granted (admin role assigned)
- Understanding of investment fund operations
- Familiarity with KYC/AML requirements
- Knowledge of platform workflows

### Accessing Admin Features

**Login Process**:
1. Navigate to platform login page
2. Enter admin credentials
3. Successfully log in
4. Automatically redirected to Admin Dashboard

**Admin Menu Location**:
- Web: Admin link in main navigation
- Mobile (iOS): More menu → Admin section

---

## 2. Admin Dashboard

### 2.1 Dashboard Overview

Access via: **Admin → Dashboard** (auto-loads after admin login)

The Admin Dashboard provides a comprehensive view of platform operations.

### 2.2 Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│  Admin Dashboard                                        │
│  Manage your yield fund platform          [Refresh]    │
├────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │Total AUM │  │Investors │  │Daily     │  │Pending  ││
│  │          │  │          │  │Yield     │  │Withdraw ││
│  │ $X.XXM   │  │    XXX   │  │ $X,XXX   │  │   XX    ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │ Fund Management Status                    │         │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │         │
│  │ │BTC Fund  │ │ETH Fund  │ │USDT Fund │  │         │
│  │ │Operation.│ │Operation.│ │Operation.│  │         │
│  │ └──────────┘ └──────────┘ └──────────┘  │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  Tabs: [Investors] [Withdrawal Requests]               │
└────────────────────────────────────────────────────────┘
```

### 2.3 Key Performance Indicators (KPIs)

#### Total AUM (Assets Under Management)
**What It Shows**:
- Combined value of all investor portfolios
- Aggregated across all funds
- Updated in real-time

**Why It Matters**:
- Primary measure of platform success
- Basis for performance fees
- Important for regulatory reporting

**Reading the Value**:
```
Total AUM: $5,250,000
Across all portfolios
```

#### Total Investors
**What It Shows**:
- Count of active investor accounts
- Only includes "Active" status investors
- Excludes pending or suspended accounts

**Investor Status Types**:
- **Active**: Fully onboarded, can invest
- **Pending**: Verification in progress
- **Suspended**: Temporarily restricted
- **Closed**: Account terminated

#### Daily Yield
**What It Shows**:
- Average daily yield distribution
- Calculated based on current AUM and yield rates
- Helps track platform profitability

**Formula**:
```
Daily Yield = Total AUM × Annual Yield Rate ÷ 365
```

#### Pending Withdrawals
**What It Shows**:
- Number of withdrawal requests awaiting admin action
- Critical metric requiring timely attention
- Includes only "pending" status requests

**Action Required**:
- Red badge indicates urgent items
- Click to go to Withdrawal Management
- Review and process daily

### 2.4 Fund Management Status

**Purpose**: Quick health check of each fund

**Each Fund Card Shows**:
- Fund name (BTC Fund, ETH Fund, USDT Fund)
- Operational status
- Current state indicator

**Status Types**:
- **Operational** (Green): Fund accepting investments, yield distributing normally
- **Maintenance** (Yellow): Temporary issues, non-critical
- **Offline** (Red): Fund not accepting new investments, requires attention

### 2.5 Dashboard Tabs

#### Investors Tab
**Quick Access To**:
- Recent investor activity
- New account approvals
- Investor summaries
- Top 5 most recent investors

**Actions Available**:
- View investor details
- Approve pending investors
- Navigate to full investor management

#### Withdrawal Requests Tab
**Quick Access To**:
- Pending withdrawal requests
- Recent approvals/rejections
- Processing status

**Actions Available**:
- Approve withdrawal
- Reject withdrawal
- View request details
- Navigate to full withdrawal management

### 2.6 Realtime Notifications

**Bell Icon (Top Right)**:
- Shows count of unread notifications
- Click to view notification panel

**Notification Types**:
- New investor registrations
- Withdrawal requests submitted
- Large deposits (over threshold)
- System alerts
- Compliance issues

**Managing Notifications**:
1. Click bell icon
2. Review notification list
3. Click notification to view details
4. Mark as read or take action
5. Configure notification settings in preferences

### 2.7 Refresh Data Button

**Purpose**: Manually refresh dashboard data

**When to Use**:
- After making changes in other admin sections
- To get latest investor counts
- To verify recent transactions processed
- Before generating reports

**How It Works**:
1. Click "Refresh Data" button
2. Loading indicator appears
3. All dashboard statistics update
4. Latest data displayed

**Auto-Refresh**:
- Dashboard auto-refreshes every 5 minutes
- Manual refresh provides immediate update

---

## 3. Managing Investors

### 3.1 Investor Management Overview

Access via: **Admin → Investors**

This section provides comprehensive investor account management.

### 3.2 Investor List View

**Columns Displayed**:
- **Name**: Investor full name
- **Email**: Contact email address
- **Status**: Account status badge
- **Total Value**: Current portfolio value
- **Join Date**: Account creation date
- **Actions**: Quick action buttons

**Sorting Options**:
- Name (A-Z or Z-A)
- Email
- Total Value (high to low / low to high)
- Join Date (newest first / oldest first)

**Search Functionality**:
1. Use search bar at top of list
2. Search by:
   - Investor name
   - Email address
   - Account ID
3. Results filter in real-time

### 3.3 Investor Status Management

#### Status Types Explained

**Pending**
- **Meaning**: New account awaiting verification
- **Investor Can**: Log in, view platform
- **Investor Cannot**: Make deposits, view full dashboard
- **Admin Action Required**: Complete KYC verification, approve account

**Active**
- **Meaning**: Fully verified, operational account
- **Investor Can**: All platform functions
- **Investor Cannot**: Nothing restricted
- **Admin Action Required**: None (routine monitoring)

**Suspended**
- **Meaning**: Temporarily restricted access
- **Investor Can**: Log in, view read-only information
- **Investor Cannot**: Deposit, withdraw, trade
- **Admin Action Required**: Resolve issue, then reactivate

**Closed**
- **Meaning**: Account permanently closed
- **Investor Can**: Nothing (login disabled)
- **Investor Cannot**: All functions
- **Admin Action Required**: Archive records per retention policy

#### Changing Investor Status

**Process**:
1. Navigate to investor detail page
2. Click current status badge
3. Select new status from dropdown
4. Enter reason for change (required)
5. Click "Update Status"
6. Confirmation email sent to investor

**Important Considerations**:
- Status changes logged in audit trail
- Investor notified via email
- Some changes require additional documentation
- Cannot reopen Closed accounts (create new instead)

### 3.4 Creating New Investor Accounts

Access via: **Admin → Investors → Create New**

#### When to Use Manual Creation

**Appropriate Scenarios**:
- VIP investor requiring special setup
- Institutional investor with complex structure
- Test accounts for development
- Migrating existing investors to platform

**Alternative**: Most investors self-register through normal onboarding wizard.

#### Creation Process

**Step 1: Basic Information**
Required Fields:
- Email address (becomes username)
- First name
- Last name
- Phone number
- Investor type (Individual, Entity, Trust, IRA)

Optional Fields:
- Company name (for entities)
- Tax ID / SSN
- Date of birth
- Mailing address

**Step 2: Investment Profile**
- Accredited investor status (Yes/No)
- Investment objectives (select multiple)
- Risk tolerance (Conservative, Moderate, Aggressive)
- Expected investment amount
- Funding source

**Step 3: KYC Information**
- Identity verification method
- Document upload (driver's license, passport)
- Proof of address (utility bill, bank statement)
- Accreditation verification (if applicable)

**Step 4: Fund Selection**
- Pre-select funds investor can access
- Set default allocations (if applicable)
- Configure fee structure
- Set investment minimums/maximums

**Step 5: Account Configuration**
- Initial password (investor must change on first login)
- Notification preferences
- Statement delivery method (email, portal, both)
- Special instructions or notes

**Step 6: Review and Create**
1. Review all entered information
2. Check for errors or omissions
3. Click "Create Account"
4. System generates investor ID
5. Welcome email sent to investor
6. Account appears in investor list with "Pending" status

### 3.5 Investor Detail Page

Access via: Click investor name in list

#### Overview Tab

**Personal Information Card**:
- Full legal name
- Email address
- Phone number
- Mailing address
- Date of birth
- Tax ID (masked for security)

**Investment Profile Card**:
- Investor type
- Accreditation status
- Investment objectives
- Risk tolerance
- Account status

**Account Summary Card**:
- Total portfolio value
- Number of fund positions
- Last login date
- Account creation date
- Assigned account manager (if applicable)

#### Positions Tab

**What You'll See**:
Table of all fund positions for this investor

**Columns**:
- Fund name
- Fund class (A, B, Institutional, etc.)
- Shares owned
- Current value
- Cost basis
- Unrealized gain/loss
- Allocation percentage

**Actions**:
- View position detail
- Adjust balance (manual adjustment)
- Transfer between funds
- Close position

**Position Detail View**:
- Complete transaction history for that position
- Dividend/yield payment history
- Performance vs. fund benchmark
- Tax lot information

#### Transactions Tab

**Transaction History**:
All transactions for this investor across all funds

**Transaction Types**:
- Deposits (incoming funds)
- Withdrawals (outgoing funds)
- Dividend/yield distributions
- Fees charged
- Balance adjustments

**Filtering Options**:
- Date range
- Transaction type
- Fund
- Status
- Amount range

**Export Functions**:
- Export to CSV
- Export to Excel
- Generate PDF report
- Email to investor

#### Documents Tab

**Investor Documents**:
- Subscription agreements (signed)
- KYC documentation
- Accreditation verification
- Tax forms
- Correspondence

**Statement History**:
- Monthly statements
- Quarterly reports
- Annual tax documents
- Special reports

**Actions**:
- View document
- Download document
- Resend to investor
- Delete document (with confirmation)
- Upload new document

#### Notes Tab

**Admin Notes**:
Internal notes visible only to administrators

**Use Cases**:
- Document phone conversations
- Record special instructions
- Track issues and resolutions
- Log compliance concerns

**Creating Notes**:
1. Click "Add Note"
2. Enter note content
3. Select category (General, Compliance, Support, Other)
4. Mark as important (optional)
5. Click "Save"

**Note Features**:
- Timestamp and author automatically recorded
- Cannot be edited (create new note instead)
- Can be deleted by admins
- Searchable

### 3.6 Approving New Investors

**Approval Workflow**:

1. **Review Application**
   - Go to investor detail page
   - Verify all information complete
   - Check for obvious errors or inconsistencies

2. **Verify KYC Documents**
   - Review uploaded ID documents
   - Verify identity matches application
   - Check document validity (not expired)
   - Confirm address verification

3. **Check Accreditation** (if applicable)
   - Review income/net worth documentation
   - Verify meets accreditation standards
   - Document verification method
   - Save accreditation proof

4. **Risk Assessment**
   - Review investor profile
   - Assess suitability of selected funds
   - Check for red flags
   - Document any concerns

5. **Approve or Request More Info**

   **If Approved**:
   1. Click "Approve Account" button
   2. Confirm approval
   3. System changes status to "Active"
   4. Welcome email sent with login instructions
   5. Investor can begin investing

   **If More Info Needed**:
   1. Click "Request Additional Information"
   2. Select missing items from checklist
   3. Add custom message explaining what's needed
   4. Click "Send Request"
   5. Email sent to investor
   6. Account remains "Pending"
   7. Notification created for follow-up

6. **Document Approval Decision**
   - Add note in Notes tab
   - Record who approved and when
   - Note any special considerations
   - Save for audit trail

### 3.7 Investor Bulk Operations

**When You Need Bulk Operations**:
- Sending statements to all investors
- Updating fee structures
- Distributing yield payments
- Mass communications

**Accessing Bulk Operations**:
1. Go to Investor Management page
2. Check boxes next to investors
3. "Bulk Actions" dropdown appears
4. Select action

**Available Bulk Actions**:
- Send email to selected
- Export selected to CSV
- Generate reports for selected
- Update status (with confirmation)
- Assign to account manager

**Safety Features**:
- Preview action before executing
- Confirmation required for destructive actions
- Audit log of bulk operations
- Ability to undo recent bulk changes

---

## 4. Transaction Management

### 4.1 Transaction Overview

Access via: **Admin → Transactions**

Monitor and manage all platform transactions.

### 4.2 Transaction Dashboard

**Summary Statistics**:
- Total transactions (24h / 7d / 30d)
- Total volume (USD)
- Pending transactions count
- Failed transactions requiring attention

**Transaction Feed**:
Real-time feed of latest transactions across all investors

### 4.3 Transaction Types

#### Deposits

**Manual Deposit Recording**:
Use when investor sends funds via:
- Wire transfer
- ACH transfer
- Cryptocurrency transfer

**Process**:
1. Navigate to Admin → Deposits
2. Click "Record Deposit"
3. Select investor
4. Enter amount
5. Select fund
6. Choose deposit method
7. Enter reference number (wire confirmation, transaction hash, etc.)
8. Upload proof (bank confirmation, blockchain explorer screenshot)
9. Add notes
10. Click "Record Deposit"

**What Happens**:
- Transaction recorded with "Pending" status
- Investor notified via email
- Appears in investor's transaction history
- Once funds confirmed, status changes to "Confirmed"
- Investor's balance updates

**Deposit Verification**:
1. Verify funds received in platform bank account
2. Match amount to deposit record
3. Confirm investor details correct
4. Click "Confirm Deposit"
5. Balance updates immediately

#### Withdrawals
(See Section 6 for detailed withdrawal management)

#### Yield Distributions

**Automated Process**:
- Yield calculated daily based on AUM and rates
- Automatically distributed to investor accounts
- Recorded as transactions
- Reflected in monthly statements

**Manual Yield Distribution**:
Use for:
- Correcting errors
- Special distributions
- Bonus payments

**Process**:
1. Admin → Transactions → Yield Distribution
2. Select distribution type (regular / special)
3. Select fund(s)
4. Enter distribution amount or rate
5. Select distribution date
6. Preview impact on each investor
7. Confirm and execute
8. Transactions created for all investors

#### Fees

**Fee Types**:
- Management fees (% of AUM)
- Performance fees (% of profits)
- Withdrawal fees (flat or %)
- Special fees (as needed)

**Fee Calculation**:
- Automated based on fee schedule
- Charged monthly or quarterly
- Recorded as transactions
- Deducted from investor balances

**Manual Fee Adjustment**:
1. Navigate to investor detail
2. Transactions tab → Add Transaction
3. Select "Fee" type
4. Enter amount and description
5. Add notes explaining fee
6. Save transaction

### 4.4 Transaction Approval Workflow

**Auto-Approval Rules**:
Configure in Admin Settings

**Example Rules**:
- Deposits under $10,000: Auto-approved
- Withdrawals under $5,000: Auto-approved
- Recognized investors: Auto-approved
- All others: Require manual approval

**Manual Approval Process**:
1. Navigate to Pending Transactions
2. Review transaction details
3. Verify investor identity
4. Check for fraud indicators
5. Approve or reject

**Approval Actions**:
- **Approve**: Transaction proceeds
- **Approve with Changes**: Modify amount or terms
- **Reject**: Transaction cancelled
- **Request More Info**: Ask investor for clarification

### 4.5 Transaction Monitoring

**Red Flags to Watch**:
- Large deposits from new investors
- Multiple withdrawals in short timeframe
- Unusual transaction patterns
- Round-number amounts (possible structuring)
- Transactions just below reporting thresholds

**AML Monitoring**:
- System flags suspicious transactions
- Review flagged transactions daily
- Document investigation
- File SARs if required
- Maintain records per regulatory requirements

---

## 5. Statement Generation

### 5.1 Statement Generation Overview

Access via: **Admin → Statements**

Generate, manage, and distribute monthly investor statements.

### 5.2 Statement Generation Process

#### Automatic Monthly Generation

**Default Schedule**:
- Runs on 5th of each month
- Generates statements for previous month
- All active investors included
- PDF format

**Automated Process**:
1. System calculates all values for month
2. Generates PDF for each investor
3. Uploads to document storage
4. Creates document record
5. Sends email notification to investors
6. Marks statements as "Sent"

#### Manual Statement Generation

**When to Use**:
- Generate for single investor
- Re-generate corrected statement
- Create special period statement
- Generate for new investor mid-month

**Process**:
1. Go to Admin → Statements
2. Click "Generate Statement"
3. **Select Investor**:
   - Choose from dropdown
   - Search by name or email
4. **Select Period**:
   - Year: Dropdown (current and 4 previous years)
   - Month: Dropdown (January - December)
5. **Click "Generate"**:
   - Processing begins
   - Progress indicator shown
   - Typically takes 30-60 seconds
6. **Result**:
   - Success message displayed
   - Statement added to list
   - Email option available

### 5.3 Statement Contents

**Standard Monthly Statement Includes**:

**Page 1: Summary**
- Investor name and account number
- Statement period
- Beginning balance
- Ending balance
- Net change for period
- Performance summary

**Page 2: Transaction Detail**
- All transactions for the period
- Date, description, amount for each
- Running balance
- Transaction reference numbers

**Page 3: Holdings Detail**
- Each fund position
- Shares owned
- Unit price
- Total value
- Allocation percentage
- Change from last month

**Page 4: Performance**
- Monthly return
- Year-to-date return
- Since inception return
- Comparison to benchmark
- Performance chart

**Page 5: Fee Summary**
- Management fees charged
- Performance fees (if any)
- Other fees
- Year-to-date fee totals

**Page 6: Notes & Disclaimers**
- Important notices
- Regulatory disclosures
- Contact information
- Definitions

### 5.4 Statement Review and Correction

**Quality Control Process**:

**Before Mass Distribution**:
1. Generate test statements for sample investors
2. Review calculations for accuracy
3. Check formatting and layout
4. Verify all data populated correctly
5. Confirm contact information current
6. Test PDF readability

**If Errors Found**:
1. Note the specific error
2. Correct underlying data if needed
3. Re-generate affected statements
4. Document correction in notes
5. Notify investors if statement already sent

**Correction Procedure**:
1. Admin → Statements
2. Find incorrect statement
3. Click "Mark as Void"
4. Generate new statement
5. Click "Send Corrected Statement"
6. Email explains correction
7. Old statement marked "Superseded"

### 5.5 Statement Distribution

#### Email Distribution

**Automatic Email**:
- Sent when statement generated
- Contains download link (not PDF attachment for security)
- Includes brief message
- Login required to access

**Manual Email**:
1. Select statement(s) from list
2. Click "Send Email Notification"
3. Review recipients
4. Customize message (optional)
5. Click "Send"
6. Confirmation displayed

#### Portal Access

**Investor Portal**:
- All statements available in Documents section
- Organized by year and month
- Can download anytime
- Unlimited access to historical statements

**Admin Management**:
- Control which statements visible to investors
- Can hide statements if needed
- Can revoke access to specific statements
- Audit trail of who accessed what

#### Physical Mail (If Applicable)

**Process**:
1. Generate statements as PDFs
2. Export list of investors requiring physical mail
3. Use print service or in-house printing
4. Mail via USPS or courier
5. Track delivery
6. Update delivery status in system

### 5.6 Statement History and Archiving

**Viewing Historical Statements**:
1. Admin → Statements
2. Use date filter to select period
3. View list of all statements for that period
4. Can filter by investor, status, or delivery method

**Archiving Requirements**:
- Retain all statements for 7+ years (per regulations)
- Store in secure, backed-up location
- Maintain access for audits
- Document retention policy

**Export Options**:
- Export statement list to CSV
- Bulk download all PDFs for period
- Create archive ZIP file
- Generate audit report

---

## 6. Withdrawal Management

### 6.1 Withdrawal Request Queue

Access via: **Admin → Withdrawals**

Comprehensive management of all withdrawal requests.

### 6.2 Request List View

**Columns Displayed**:
- Investor name
- Fund name
- Requested amount
- Withdrawal type (partial / full)
- Status badge
- Request date
- Actions

**Status Filter**:
- All requests
- Pending (requires action)
- Approved (awaiting processing)
- Processing (in progress)
- Completed
- Rejected
- Cancelled

**Search and Sort**:
- Search by investor name or email
- Sort by amount, date, status
- Filter by fund
- Filter by date range

### 6.3 Reviewing Withdrawal Requests

**Click Request to View Details**:

**Request Information**:
- Request ID (unique identifier)
- Investor details (name, email, account)
- Fund and position details
- Requested amount
- Withdrawal type
- Investor notes
- Request date and time

**Investor Position Information**:
- Current position value
- Available for withdrawal
- Locked/restricted amounts
- Cost basis
- Unrealized gains/losses

**Eligibility Checks**:
- Lock-up period met? (Yes/No)
- Sufficient balance? (Yes/No)
- No pending restrictions? (Yes/No)
- KYC current? (Yes/No)
- No compliance holds? (Yes/No)

### 6.4 Approval Process

**Review Checklist**:
1. ✓ Verify investor identity
2. ✓ Confirm sufficient available balance
3. ✓ Check lock-up period compliance
4. ✓ Review recent activity for patterns
5. ✓ Verify bank/payment information on file
6. ✓ Check for any compliance issues
7. ✓ Review investor notes

**Approval Actions**:

#### Full Approval
1. Click "Approve" button
2. Approved amount = Requested amount (pre-filled)
3. Add admin notes (optional but recommended)
4. Click "Confirm Approval"
5. Status changes to "Approved"
6. Investor notified via email
7. Request moves to processing queue

#### Partial Approval
**When to Use**:
- Available balance less than requested
- Partial amount allowed per fund rules
- Investor requests flexibility

**Process**:
1. Click "Approve" button
2. Modify approved amount
3. Explain in admin notes why amount reduced
4. Click "Confirm Approval"
5. Investor notified of partial approval
6. Can accept partial or cancel request

### 6.5 Rejection Process

**Common Rejection Reasons**:
- Insufficient available balance
- Lock-up period not met
- Missing bank information
- Compliance hold
- Suspicious activity
- Fund liquidity constraints

**Rejection Process**:
1. Click "Reject" button
2. Select rejection reason from dropdown
3. Add detailed explanation in admin notes
4. Optionally suggest resolution
5. Click "Confirm Rejection"
6. Status changes to "Rejected"
7. Investor notified with reason

**Communication Best Practices**:
- Be clear and specific about reason
- Provide actionable next steps if possible
- Offer to discuss via phone if complex
- Document all communication
- Follow up if no response

### 6.6 Processing Withdrawals

**After Approval**:

**Step 1: Initiate Payment**
1. Go to approved request
2. Click "Process Withdrawal"
3. Verify payment details:
   - Bank account information
   - Wallet address (if crypto)
   - Payment amount
4. Select payment method:
   - Wire transfer
   - ACH transfer
   - Cryptocurrency transfer
5. Click "Initiate Payment"

**Step 2: Execute Payment**
- For bank transfers: Process through bank portal
- For crypto: Execute blockchain transaction
- Record confirmation details

**Step 3: Record Payment Details**
1. Return to withdrawal request
2. Click "Update Processing Info"
3. Enter:
   - Transaction hash (crypto)
   - Wire reference number (bank)
   - Processing date
   - Expected settlement date
4. Click "Save"
5. Status changes to "Processing"

**Step 4: Confirm Settlement**
1. Once funds confirmed sent
2. Click "Mark as Completed"
3. Enter settlement date
4. Upload confirmation if available
5. Click "Confirm"
6. Status changes to "Completed"
7. Investor notified
8. Position balance updated

### 6.7 Withdrawal Timing

**Standard Processing Times**:
- Approval review: 1-2 business days
- Wire transfer: 1-3 business days
- ACH transfer: 3-5 business days
- Cryptocurrency: 1-2 hours (plus network confirmations)

**Expedited Processing**:
- Available for VIP investors
- Requires additional approval
- May incur extra fees
- Document reason for expediting

**Delays and Communication**:
- If delay expected, notify investor proactively
- Update withdrawal notes with status
- Provide realistic timeline
- Follow up regularly

### 6.8 Withdrawal Reports

**Generate Reports**:
1. Admin → Withdrawals → Reports
2. Select report type:
   - Daily withdrawal activity
   - Weekly summary
   - Monthly totals
   - Pending withdrawal queue
3. Select date range
4. Choose format (PDF, Excel, CSV)
5. Click "Generate"

**Report Uses**:
- Liquidity planning
- Compliance reporting
- Trend analysis
- Investor communication

---

## 7. Fund Management

### 7.1 Fund Configuration

Access via: **Admin → Funds** or **Admin → Fund Management**

Configure and manage all investment funds on the platform.

### 7.2 Fund List

**Viewing All Funds**:
- Fund name and code
- Fund type (BTC, ETH, USDC, Multi-Asset)
- Status (Active, Closed, Pending)
- Total AUM
- Investor count
- Current yield rate

**Actions**:
- View fund details
- Edit fund configuration
- View fund performance
- Generate fund reports

### 7.3 Fund Detail View

**Overview Tab**:
- Fund name and description
- Fund code (unique identifier)
- Fund class offerings (A, B, Institutional)
- Investment strategy
- Benchmark
- Inception date
- Fund manager

**Performance Tab**:
- NAV (Net Asset Value) history
- Performance chart
- Returns (daily, monthly, YTD, inception)
- Comparison to benchmark
- Sharpe ratio, volatility metrics

**Holdings Tab**:
- Current asset allocation
- Individual holdings
- Percentage of portfolio
- Cost basis
- Unrealized gains/losses

**Investors Tab**:
- List of all investors in fund
- Position sizes
- Total allocation
- Largest investors
- Recent additions/removals

### 7.4 NAV Calculation and Updates

**Daily NAV Update**:
1. Navigate to Fund Management
2. Select fund
3. Click "Update NAV"
4. Review calculation:
   - Total Assets
   - Total Liabilities
   - Shares Outstanding
   - NAV per share = (Assets - Liabilities) / Shares
5. Verify calculation
6. Click "Publish NAV"
7. NAV updated for all investors

**Automated NAV Updates**:
- Can configure automatic daily updates
- Uses real-time pricing feeds
- Calculates at specified time (e.g., 4pm ET)
- Publishes automatically
- Sends notifications if variance exceeds threshold

### 7.5 Yield Rate Management

**Setting Yield Rates**:
1. Go to Fund Management
2. Select fund
3. Click "Yield Settings"
4. Enter new yield rate (annual percentage)
5. Select effective date
6. Add notes explaining change
7. Click "Save and Notify Investors"

**Yield Distribution Schedule**:
- Configure distribution frequency (daily, monthly, quarterly)
- Set distribution day of month
- Choose distribution method (reinvest or cash)
- Save configuration

**Historical Rates**:
- View history of all yield rate changes
- Track effective dates
- Audit trail of who made changes
- Export for reporting

### 7.6 Fee Configuration

**Fee Types per Fund**:

**Management Fee**:
- Percentage of AUM
- Charged monthly or quarterly
- Typically 1-2% annually
- Configure rate and frequency

**Performance Fee**:
- Percentage of profits above benchmark
- Typically 10-20% of excess returns
- High water mark tracking
- Configure hurdle rate

**Other Fees**:
- Withdrawal fees
- Transfer fees
- Special services

**Configuring Fees**:
1. Fund Management → Select Fund
2. Click "Fee Configuration"
3. Enable/disable fee types
4. Set rates for each
5. Configure calculation method
6. Set billing frequency
7. Save configuration

**Fee Waivers**:
- Can waive fees for specific investors
- Set time-limited promotions
- Document waiver reasons
- Track revenue impact

---

## 8. Compliance Center

### 8.1 KYC/AML Management

Access via: **Admin → Compliance**

#### KYC Dashboard

**Pending Verifications**:
- List of investors awaiting KYC approval
- Days pending (aging report)
- Priority flag for high-value investors

**Verification Workflow**:
1. Select pending investor
2. Review submitted documents
3. Verify identity:
   - Name matches ID
   - Photo matches (if applicable)
   - Document not expired
   - Address verification provided
4. Check against sanctions lists
5. Complete risk assessment
6. Approve or request additional documents

**Document Types to Review**:
- Government-issued ID (passport, driver's license)
- Proof of address (utility bill, bank statement <3 months old)
- Proof of income (for accreditation)
- Entity documents (articles of incorporation, operating agreement)

**Sanctions Screening**:
- Automatic screening against OFAC lists
- Manual review of matches
- Document screening results
- Escalate any matches to compliance officer

#### AML Monitoring

**Transaction Monitoring**:
- Review flagged transactions
- Investigate unusual patterns
- Document findings

**Red Flag Indicators**:
- Structuring (multiple transactions under reporting threshold)
- Rapid movement of funds
- Inconsistent with investor profile
- Unusual geographic sources
- Complex entity structures with no clear purpose

**SAR Filing**:
If suspicious activity identified:
1. Document all details
2. Consult legal counsel
3. Prepare SAR (Suspicious Activity Report)
4. File with FinCEN
5. Do NOT notify investor
6. Maintain confidential records

### 8.2 Accredited Investor Verification

**Verification Methods**:

**Income-Based**:
- Individual: $200,000+ annual income (2 years)
- Joint: $300,000+ annual income (2 years)
- Documents: Tax returns, W-2s, pay stubs

**Net Worth-Based**:
- $1,000,000+ net worth (excluding primary residence)
- Documents: Bank statements, brokerage statements, property valuations

**Professional Certifications**:
- Series 7, 65, or 82 license
- Documents: Copy of license

**Entity-Based**:
- Entities with $5,000,000+ assets
- Documents: Financial statements, incorporation documents

**Verification Process**:
1. Investor selects verification method
2. Uploads required documents
3. Admin reviews documents
4. Verifies calculations
5. Checks expiration dates
6. Approves or requests additional proof
7. Documents decision
8. Updates investor status

### 8.3 Audit Trail

**What's Logged**:
- All login attempts
- Transaction approvals
- Status changes
- Configuration changes
- Document access
- Report generation

**Viewing Audit Logs**:
1. Admin → Compliance → Audit Logs
2. Filter by:
   - Date range
   - User (admin or investor)
   - Action type
   - Entity affected
3. View details
4. Export for reporting

**Audit Log Details**:
- Timestamp
- User ID and name
- Action performed
- Before/after values (for changes)
- IP address
- Session ID

**Retention**:
- Maintain for 7 years minimum
- Store in tamper-proof system
- Regular backups
- Available for regulatory audits

### 8.4 Regulatory Reporting

**Required Reports** (varies by jurisdiction):

**Form D** (US):
- File within 15 days of first sale
- Update annually
- Report offering details and investor counts

**Annual Audit**:
- Coordinate with external auditors
- Provide requested documentation
- Review draft financials
- Approve final audit report
- Distribute to investors

**1099/K-1 Generation**:
1. Admin → Compliance → Tax Forms
2. Select year
3. Click "Generate Tax Forms"
4. Review for accuracy
5. Approve batch
6. Distribute to investors by January 31st
7. File copies with IRS

**FBAR/FATCA** (if applicable):
- Report foreign accounts
- File by deadlines
- Maintain supporting documentation

### 8.5 Data Privacy and Security

**GDPR Compliance** (if applicable):
- Maintain data processing records
- Honor data subject requests (access, deletion, portability)
- Document legal basis for processing
- Notify of breaches within 72 hours

**Data Retention**:
- Define retention periods per data type
- Automatically purge expired data
- Maintain deletion logs
- Balance retention needs with privacy minimization

**Security Audits**:
- Regular penetration testing
- Vulnerability assessments
- Access control reviews
- Incident response drills

---

## 9. Reports & Analytics

### 9.1 Admin Reports Dashboard

Access via: **Admin → Reports**

### 9.2 Available Report Types

#### Platform Overview Reports

**Daily Operations Report**:
- New investor sign-ups
- Transactions processed (count and volume)
- Withdrawals pending/completed
- System uptime and performance
- Notable events

**Weekly Summary Report**:
- Week-over-week growth
- New AUM added
- Investor activity metrics
- Top performing funds
- Issues resolved

**Monthly Management Report**:
- Comprehensive platform metrics
- AUM trends
- Investor demographics
- Fund performance
- Compliance status
- Financial summary

#### Investor Reports

**Investor Activity Report**:
- Login frequency
- Transaction patterns
- Document access
- Support ticket history
- Engagement scores

**Investor Segmentation**:
- By AUM (small, medium, large)
- By fund preference
- By activity level
- By geography
- By investor type

**Investor Retention**:
- New investors this period
- Closed accounts
- Retention rate
- Churn analysis
- Reasons for leaving

#### Financial Reports

**AUM Analysis**:
- Total AUM over time
- AUM by fund
- AUM by investor segment
- Net flows (deposits - withdrawals)
- Projected AUM

**Revenue Report**:
- Management fees earned
- Performance fees earned
- Other revenue sources
- Total revenue
- Revenue by fund

**Transaction Volume**:
- Deposits (count and amount)
- Withdrawals (count and amount)
- Net inflows
- Average transaction size
- Peak transaction times

#### Fund Performance Reports

**Fund Performance Summary**:
- Returns by fund
- Comparison to benchmarks
- Sharpe ratio and risk metrics
- Attribution analysis
- Peer comparison

**NAV History**:
- NAV changes over time
- Distribution history
- Fee impact
- Total return

**Holdings Analysis**:
- Current allocation
- Changes over time
- Concentration risk
- Compliance with investment policy

#### Compliance Reports

**KYC/AML Report**:
- Pending verifications
- Completion rates
- Average processing time
- Rejected applications
- Escalated cases

**Audit Report**:
- User activity summary
- Configuration changes
- Access anomalies
- Failed login attempts
- Suspicious activity

**Regulatory Filing Status**:
- Form D status
- Tax form generation status
- Annual audit progress
- Other required filings

### 9.3 Generating Reports

**Standard Reports**:
1. Admin → Reports
2. Select report type from list
3. Choose date range
4. Select any additional filters
5. Click "Generate Report"
6. Report displays on screen
7. Options to download (PDF, Excel, CSV) or email

**Custom Reports**:
1. Admin → Reports → Custom Report Builder
2. Select data source (investors, transactions, funds)
3. Choose fields to include
4. Set filters
5. Choose grouping and sorting
6. Preview results
7. Save as template for future use
8. Generate and export

**Scheduled Reports**:
1. Create or select existing report
2. Click "Schedule"
3. Choose frequency (daily, weekly, monthly)
4. Select recipients (email addresses)
5. Choose format
6. Set schedule (day of week, time)
7. Save schedule
8. Reports automatically generated and emailed

### 9.4 Data Visualization

**Charts and Graphs**:
- Line charts for trends (AUM, NAV, transactions)
- Pie charts for allocation and segmentation
- Bar charts for comparisons (fund performance, time periods)
- Heat maps for activity patterns

**Interactive Dashboards**:
- Drill down from summary to detail
- Hover for additional information
- Click elements to filter
- Export chart images

**Customization**:
- Choose chart types
- Select colors and themes
- Configure axes and labels
- Add annotations

### 9.5 Exporting and Sharing

**Export Formats**:
- **PDF**: Best for sharing and printing
- **Excel**: Best for further analysis
- **CSV**: Best for importing to other systems
- **JSON**: For programmatic access

**Sharing Options**:
- Email report to recipients
- Share view-only link
- Schedule automatic distribution
- Download and store locally

**Access Control**:
- Control who can view which reports
- Set expiration on shared links
- Audit who accessed reports
- Revoke access as needed

---

## 10. System Settings

### 10.1 Platform Configuration

Access via: **Admin → Settings**

#### General Settings

**Platform Information**:
- Platform name
- Contact email
- Support phone number
- Mailing address
- Time zone
- Default currency

**Operational Settings**:
- Business days (Mon-Fri)
- Business hours
- Holiday calendar
- Maintenance windows

**Communication Settings**:
- Email templates
- Notification preferences
- Branding (logo, colors)
- Email signature

#### Security Settings

**Authentication**:
- Password requirements (length, complexity)
- Password expiration (90 days recommended)
- Failed login threshold (3-5 attempts)
- Account lockout duration (30 minutes)
- Session timeout (30 minutes)

**Two-Factor Authentication**:
- Require for admins (Yes/No)
- Require for investors (Yes/No)
- Allowed 2FA methods (Authenticator, SMS, Email)
- Backup codes enabled

**IP Restrictions**:
- Whitelist admin IPs
- Block specific IPs or ranges
- Geographic restrictions
- VPN detection

#### User Management

**Admin Users**:
- View all admin accounts
- Add new admin
- Assign permissions
- Deactivate accounts
- Reset passwords

**Role-Based Access Control**:
- Define roles (Super Admin, Fund Manager, Compliance Officer, Support)
- Assign permissions to roles
- Assign roles to users
- Audit permission changes

**Admin Permissions**:
- View investors
- Modify investors
- Approve withdrawals
- Generate statements
- Access compliance data
- Modify system settings
- View audit logs
- Manage other admins

### 10.2 Notification Settings

**Email Notifications to Investors**:
- Transaction confirmations (ON/OFF)
- Statement ready (ON/OFF)
- Withdrawal status updates (ON/OFF)
- Security alerts (ON/OFF - recommend ON)
- Marketing emails (ON/OFF)

**Email Notifications to Admins**:
- New investor registration
- Large deposits (threshold amount)
- Withdrawal requests
- Failed logins
- System errors
- Compliance alerts

**Notification Templates**:
- Edit email templates
- Customize subject lines
- Personalize content with variables
- Preview before saving
- A/B test different versions

### 10.3 Integration Settings

**Payment Integrations**:
- Bank connection configuration
- Cryptocurrency wallet setup
- Payment processor API keys
- Webhook endpoints

**Third-Party Services**:
- Analytics (Google Analytics, PostHog)
- Error tracking (Sentry)
- Communication (SendGrid, Twilio)
- KYC verification (IDology, Jumio)

**API Configuration**:
- Generate API keys
- Set rate limits
- Configure webhooks
- View API documentation
- Monitor API usage

### 10.4 Backup and Maintenance

**Database Backups**:
- Automatic daily backups
- Retention period (30 days recommended)
- Backup location (cloud storage)
- Test restore procedures

**System Maintenance**:
- Schedule maintenance windows
- Notify users in advance
- Display maintenance banner
- Post-maintenance verification

**Disaster Recovery**:
- Document recovery procedures
- Identify critical systems
- Define RTO and RPO
- Test recovery plan annually

---

## 11. Admin Best Practices

### 11.1 Daily Operations Checklist

**Morning Routine**:
- [ ] Review pending withdrawal requests (approve/reject)
- [ ] Check overnight transactions for errors
- [ ] Review security alerts and suspicious activity
- [ ] Respond to urgent investor inquiries
- [ ] Check system status and performance

**Throughout the Day**:
- [ ] Monitor new investor registrations
- [ ] Process deposit confirmations
- [ ] Review and approve KYC documents
- [ ] Update withdrawal statuses
- [ ] Respond to support tickets

**End of Day**:
- [ ] Review daily transaction summary
- [ ] Follow up on pending items
- [ ] Update notes on active issues
- [ ] Plan next day priorities
- [ ] Verify all critical tasks completed

### 11.2 Weekly Tasks

**Every Monday**:
- [ ] Review week's withdrawal requests
- [ ] Check for upcoming statement deadlines
- [ ] Review compliance calendar

**Mid-Week**:
- [ ] Generate weekly operations report
- [ ] Review investor activity trends
- [ ] Follow up on stale support tickets

**End of Week**:
- [ ] Review week's performance
- [ ] Update investor status changes
- [ ] Prepare for next week

### 11.3 Monthly Tasks

**First Week of Month**:
- [ ] Generate and review monthly statements
- [ ] Distribute statements to investors
- [ ] Update fund NAVs
- [ ] Calculate and charge fees

**Mid-Month**:
- [ ] Review monthly performance metrics
- [ ] Conduct KYC/AML review
- [ ] Update compliance documentation

**End of Month**:
- [ ] Generate month-end reports
- [ ] Review AUM and growth metrics
- [ ] Plan for next month
- [ ] Conduct team review meeting

### 11.4 Communication Best Practices

**Responding to Investors**:
- Respond within 24 business hours
- Be professional and courteous
- Provide clear, accurate information
- Avoid jargon; explain in plain language
- Follow up on promises
- Document all communication

**Email Etiquette**:
- Use professional email signature
- Clear subject lines
- Proper grammar and spelling
- Cc: relevant team members
- Confirm understanding
- Set expectations for next steps

**Difficult Conversations**:
- Stay calm and professional
- Listen actively
- Show empathy
- Explain policies clearly
- Offer solutions when possible
- Escalate when appropriate

### 11.5 Security Best Practices

**Personal Security**:
- Use strong, unique passwords
- Enable 2FA on admin account
- Never share credentials
- Log out when leaving workstation
- Lock computer when away
- Use secure networks only

**Data Protection**:
- Only access data needed for job
- Don't download sensitive data to personal devices
- Encrypt emails with PII
- Shred physical documents
- Report any data breaches immediately

**Fraud Prevention**:
- Verify investor identity for sensitive requests
- Watch for social engineering attempts
- Confirm bank details before processing withdrawals
- Report suspicious activity
- Follow verification procedures

### 11.6 Documentation

**What to Document**:
- All investor interactions
- Decisions made and rationale
- Exceptions to standard procedures
- Issues encountered and resolutions
- Changes to investor accounts

**Where to Document**:
- Admin notes in investor profiles
- Support ticket system
- Compliance log
- Email correspondence (saved)
- Shared team documentation

**Documentation Standards**:
- Be specific and factual
- Include date and time
- Note who was involved
- Describe action taken
- Record outcome
- Professional language

---

## 12. Troubleshooting

### 12.1 Common Issues and Solutions

#### Investor Can't Log In

**Possible Causes**:
1. Incorrect password
2. Account locked (too many failed attempts)
3. Account suspended
4. Email not verified

**Solutions**:
1. Send password reset email to investor
2. Admin can unlock account: Investor Detail → Security → Unlock Account
3. Check account status; reactivate if appropriate
4. Resend verification email

#### Transaction Not Appearing

**Possible Causes**:
1. Processing delay
2. Wrong account
3. System error
4. Not yet confirmed

**Solutions**:
1. Check transaction status in admin panel
2. Verify investor ID and account
3. Check system logs for errors
4. Manually add transaction if confirmed

#### Statement Generation Failed

**Possible Causes**:
1. Missing data for period
2. Calculation error
3. Template error
4. Storage issue

**Solutions**:
1. Verify all transactions present for period
2. Check NAV values entered
3. Review statement template
4. Check storage permissions
5. Contact technical support if persistent

#### Withdrawal Can't Be Processed

**Possible Causes**:
1. Lock-up period not met
2. Insufficient balance
3. Missing bank information
4. Compliance hold

**Solutions**:
1. Check fund rules and investor start date
2. Verify available balance vs. requested
3. Request bank details from investor
4. Review compliance notes; resolve issues

### 12.2 Technical Issues

#### Page Won't Load

**Steps**:
1. Refresh page (F5 or Cmd+R)
2. Clear browser cache
3. Try different browser
4. Check internet connection
5. Contact technical support

#### Data Appears Incorrect

**Steps**:
1. Refresh the data (Refresh button)
2. Check data entry for errors
3. Verify calculations manually
4. Review recent changes in audit log
5. Report to technical team

#### Can't Upload Documents

**Steps**:
1. Check file size (must be under 10MB typically)
2. Verify file format (PDF preferred)
3. Try different browser
4. Check internet connection
5. Contact support if persistent

### 12.3 Escalation Procedures

**When to Escalate**:
- Unable to resolve investor issue
- Suspected fraud or security breach
- System-wide technical issue
- Legal or compliance concern
- VIP investor complaint

**Escalation Path**:
1. **Level 1**: Front-line admin support
2. **Level 2**: Senior admin or team lead
3. **Level 3**: Fund manager or compliance officer
4. **Level 4**: Executive management
5. **External**: Legal counsel, auditors, regulators

**How to Escalate**:
1. Document issue thoroughly
2. Gather all relevant information
3. Note actions already taken
4. Explain why escalation needed
5. Contact next level
6. Follow up until resolved

### 12.4 Emergency Procedures

**System Outage**:
1. Notify technical team immediately
2. Post status update on status page
3. Email investors if extended outage
4. Document start time and impact
5. Keep stakeholders updated
6. Conduct post-mortem after resolution

**Data Breach**:
1. Immediately notify security team
2. Isolate affected systems
3. Contact legal counsel
4. Notify affected investors (per regulations)
5. File required regulatory reports
6. Implement remediation plan

**Fraudulent Activity**:
1. Freeze affected accounts
2. Document all evidence
3. Notify compliance officer
4. Contact law enforcement if appropriate
5. File SAR
6. Review and strengthen controls

---

## Appendix

### A. Keyboard Shortcuts

**Navigation**:
- `Alt + D`: Go to Dashboard
- `Alt + I`: Go to Investors
- `Alt + W`: Go to Withdrawals
- `Alt + S`: Go to Statements
- `Alt + R`: Go to Reports

**Actions**:
- `Ctrl + S`: Save changes
- `Ctrl + F`: Search/Filter
- `Esc`: Close modal
- `Enter`: Submit form

### B. Status Badge Reference

**Investor Status**:
- 🟢 Active: Operational account
- 🟡 Pending: Awaiting verification
- 🟠 Suspended: Temporarily restricted
- 🔴 Closed: Permanently closed

**Transaction Status**:
- 🟢 Confirmed: Successfully processed
- 🟡 Pending: Awaiting approval
- 🔵 Processing: In progress
- 🔴 Failed: Unsuccessful
- ⚫ Cancelled: User or system cancelled

**Withdrawal Status**:
- 🟡 Pending: Awaiting admin review
- 🟢 Approved: Admin approved, awaiting processing
- 🔵 Processing: Payment in progress
- 🟢 Completed: Funds sent successfully
- 🔴 Rejected: Admin rejected
- ⚫ Cancelled: Request cancelled

### C. Regulatory Requirements Quick Reference

**KYC/AML**:
- Collect ID within 30 days of account opening
- Verify identity before first transaction
- Update documentation every 3-5 years
- Screen against sanctions lists regularly

**Reporting**:
- File Form D within 15 days of first sale
- Distribute K-1s by March 15
- Send 1099s by January 31
- File SAR within 30 days of detection

**Recordkeeping**:
- Maintain all records for 7 years minimum
- Investor communications: 6 years
- Transaction records: 7 years
- Audit reports: Permanent

### D. Contact Information

**Technical Support**:
- Email: techsupport@indigoyield.com (example)
- Phone: 1-800-XXX-XXXX (example)
- Hours: 24/7 for critical issues

**Compliance Questions**:
- Email: compliance@indigoyield.com (example)
- Phone: 1-800-XXX-XXXX ext. 2 (example)
- Hours: Mon-Fri 9am-5pm ET

**Management**:
- Fund Manager: manager@indigoyield.com (example)
- Operations: ops@indigoyield.com (example)

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Intended Audience**: Platform Administrators
**Classification**: Internal Use Only

**Copyright Notice**: This guide is proprietary and confidential. Do not distribute outside organization.

---
