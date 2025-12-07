# 📱 iOS App Deployment Guide

## ULTRATHINK Platform - iOS Investor App

This guide provides step-by-step instructions for building, testing, and deploying the iOS app to TestFlight and the App Store.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Build Configuration](#build-configuration)
4. [Testing](#testing)
5. [Push Notifications Setup](#push-notifications-setup)
6. [TestFlight Deployment](#testflight-deployment)
7. [App Store Submission](#app-store-submission)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **macOS**: Version 13.0 (Ventura) or later
- **Xcode**: Version 15.0 or later
- **iOS SDK**: iOS 16.0 or later
- **CocoaPods** or **Swift Package Manager**: For dependency management
- **Apple Developer Account**: Paid membership ($99/year)

### Required Access

- [ ] Apple Developer Portal access
- [ ] App Store Connect access
- [ ] Supabase project credentials
- [ ] GitHub repository access

---

## Project Setup

### Step 1: Open Xcode Project

```bash
cd /Users/mama/Desktop/Claude\ code/indigo-yield-platform-v01/ios
open IndigoInvestor.xcodeproj
```

Or if using CocoaPods:

```bash
open IndigoInvestor.xcworkspace
```

### Step 2: Verify Project Configuration

1. **Select the project** in the Project Navigator (left sidebar)
2. **Select the IndigoInvestor target**
3. **Verify settings**:
   - **Display Name**: Indigo Investor
   - **Bundle Identifier**: com.indigo.investor (or your registered ID)
   - **Version**: 1.0.0
   - **Build**: 1
   - **Deployment Target**: iOS 16.0
   - **Supported Orientations**: Portrait only

### Step 3: Configure Supabase Credentials

#### Option A: Environment Variables (Recommended)

Create `ios/IndigoInvestor/Config.xcconfig`:

```
SUPABASE_URL = https:/​/nkfimvovosdehmyyjubn.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Then reference in SupabaseManager.swift:

```swift
let url = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "fallback_url"
let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "fallback_key"
```

#### Option B: Hardcoded (Development Only)

Update `ios/IndigoInvestor/Services/SupabaseManager.swift`:

```swift
private init() {
    let supabaseURL = "https://nkfimvovosdehmyyjubn.supabase.co"
    let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

    client = SupabaseClient(supabaseURL: URL(string: supabaseURL)!, supabaseKey: supabaseKey)
}
```

⚠️ **Security Warning**: Do NOT commit hardcoded credentials to public repositories.

### Step 4: Install Dependencies

If using Swift Package Manager (recommended):

1. In Xcode: **File → Add Packages...**
2. Add Supabase Swift client:
   ```
   https://github.com/supabase-community/supabase-swift
   ```
3. Select version: **1.0.0** or later

If using CocoaPods:

```bash
cd ios
pod install
```

---

## Build Configuration

### Debug vs Release

#### Debug Configuration (Development)

- **Code Optimization**: None [-Onone]
- **Swift Compiler Flags**: -DDEBUG
- **Logging**: Verbose console output
- **API**: Development Supabase project

**To build Debug:**

```bash
xcodebuild -scheme IndigoInvestor -configuration Debug clean build
```

#### Release Configuration (Production)

- **Code Optimization**: Optimize for Speed [-O]
- **Swift Compiler Flags**: -DRELEASE
- **Logging**: Production-level only
- **API**: Production Supabase project
- **Bitcode**: Disabled (deprecated in Xcode 14+)

**To build Release:**

```bash
xcodebuild -scheme IndigoInvestor -configuration Release clean build
```

### Build Settings Checklist

- [ ] **Signing & Capabilities** configured
- [ ] **Team** selected (Apple Developer account)
- [ ] **Bundle Identifier** matches App Store Connect
- [ ] **Provisioning Profile** set to "Automatic"
- [ ] **Code Signing Identity** set to "Apple Development" (Debug) or "Apple Distribution" (Release)

---

## Testing

### Step 1: Run Unit Tests

```bash
# Command line
xcodebuild test -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0'

# Or in Xcode: Cmd + U
```

**Test Suites:**
- `AuthViewModelTests` - Authentication flow
- `DashboardViewModelTests` - Dashboard data loading
- `StatementViewModelTests` - Monthly statements (investor_monthly_reports)
- `DailyRatesViewModelTests` - Daily rates feature
- `TransactionViewModelTests` - Transaction history

### Step 2: Run UI Tests

```bash
xcodebuild test -scheme IndigoInvestorUITests -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0'
```

### Step 3: Manual Testing Checklist

#### Authentication
- [ ] Email login works
- [ ] Google OAuth login works
- [ ] GitHub OAuth login works
- [ ] Password reset flow
- [ ] Session persistence
- [ ] Logout works

#### Dashboard
- [ ] Dashboard loads with real data
- [ ] Asset cards display correct balances
- [ ] Navigation to asset details works
- [ ] Refresh pull-to-refresh

#### Daily Rates
- [ ] Daily Rates tab appears in navigation
- [ ] Today's rates load correctly
- [ ] All 6 assets displayed (BTC, ETH, SOL, USDT, USDC, EURC)
- [ ] 24h change indicators show correctly
- [ ] Pull-to-refresh updates rates
- [ ] Empty state shown when no rates

#### Portfolio
- [ ] Portfolio view loads
- [ ] Asset allocation chart renders
- [ ] Individual asset details
- [ ] Yield history

#### Transactions
- [ ] Transaction list loads
- [ ] Filter by date/type works
- [ ] Transaction details view
- [ ] Search functionality

#### Monthly Statements
- [ ] Statements list loads from investor_monthly_reports
- [ ] Filter by year works
- [ ] Filter by asset works (BTC, ETH, SOL, USDT, USDC, EURC)
- [ ] Statement details show all fields:
  - Opening Balance
  - Additions
  - Withdrawals
  - Yield Earned
  - Closing Balance
  - Rate of Return (%)
- [ ] Empty state when no statements

#### Documents
- [ ] Documents vault loads
- [ ] PDF viewer works
- [ ] Download documents

#### Account
- [ ] Profile settings
- [ ] Security settings
- [ ] Notification preferences
- [ ] Withdrawal history
- [ ] Support contact

### Step 4: Device Testing

Test on physical devices:
- [ ] iPhone SE (smallest screen)
- [ ] iPhone 15 Pro (standard screen)
- [ ] iPhone 15 Pro Max (largest screen)
- [ ] iPad (if supporting tablets)

---

## Push Notifications Setup

### Step 1: Enable Push Notifications in Xcode

1. Select **IndigoInvestor** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes** → Check "Remote notifications"

### Step 2: Generate APNs Auth Key

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Keys**
4. Click **+** to create a new key
5. Name: "ULTRATHINK Push Notifications"
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue** → **Register**
8. **Download the .p8 file** (one-time download!)
9. Note the **Key ID** (e.g., ABC123XYZ)
10. Note your **Team ID** (in top right of portal)

### Step 3: Configure Supabase for APNS

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select project: **nkfimvovosdehmyyjubn**
3. Navigate to **Settings → API**
4. Scroll to **Push Notifications**
5. Upload the .p8 file
6. Enter **Key ID** and **Team ID**
7. Enter **Bundle ID**: `com.indigo.investor`
8. Set **Environment**: Production or Sandbox
9. Click **Save**

### Step 4: Handle Push Notifications in Code

The code is already implemented in:

- `ios/IndigoInvestor/AppDelegate.swift` - APNs registration
- `ios/IndigoInvestor/Extensions/SupabaseManager+DailyRates.swift` - Real-time subscriptions
- `ios/IndigoInvestor/ViewModels/DailyRatesViewModel.swift` - Subscription handling

**Test push notifications:**

```bash
# Using curl to send test notification
curl -X POST https://api.supabase.io/v1/projects/YOUR_PROJECT_ID/push \
  -H "Authorization: Bearer YOUR_SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "DEVICE_TOKEN_FROM_APP",
    "title": "Daily Rates Updated",
    "body": "New rates available for BTC, ETH, SOL",
    "data": {"type": "daily_rate_update"}
  }'
```

### Step 5: Database RPC Function for Notifications

The database already has the `notify_daily_rate_published()` function that triggers when admin publishes rates:

```sql
-- Already created in Phase 5
CREATE OR REPLACE FUNCTION notify_daily_rate_published()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'daily_rate_update',
    json_build_object(
      'rate_date', NEW.rate_date,
      'btc_rate', NEW.btc_rate,
      'eth_rate', NEW.eth_rate,
      'sol_rate', NEW.sol_rate
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## TestFlight Deployment

### Step 1: Archive the App

1. In Xcode, select **Product → Archive**
2. Wait for archive to complete (2-5 minutes)
3. Organizer window opens automatically

### Step 2: Distribute to App Store Connect

1. In Organizer, select the archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Next**
5. Select **Upload**
6. Click **Next**
7. Review distribution options:
   - [ ] Upload your app's symbols (recommended for crash reports)
   - [ ] Manage version and build number
8. Click **Upload**
9. Wait for processing (5-15 minutes)

### Step 3: Configure TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select **IndigoInvestor** app
3. Go to **TestFlight** tab
4. Wait for build to process (shows "Processing" → "Ready to Submit")

#### Add Internal Testers

1. Click **App Store Connect Users**
2. Click **+** to add testers
3. Select users from your organization
4. Build is available immediately after processing

#### Add External Testers

1. Click **External Testing** → **+**
2. Create a test group (e.g., "Beta Testers")
3. Add email addresses of testers
4. Submit for Beta App Review (required for external testers)
5. Wait 24-48 hours for approval

### Step 4: Distribute to Testers

Once approved:

1. Testers receive email with TestFlight link
2. Testers install TestFlight app from App Store
3. Testers open link and install ULTRATHINK app
4. Collect feedback via TestFlight

**TestFlight limits:**
- **Internal testers**: Up to 100 users
- **External testers**: Up to 10,000 users
- **Build expiration**: 90 days

---

## App Store Submission

### Step 1: Prepare App Store Listing

#### Required Assets

**App Icon:**
- [ ] 1024×1024px (no transparency, no alpha channel)

**Screenshots (at least 3 per device size):**
- [ ] 6.7" iPhone (1290×2796) - iPhone 15 Pro Max
- [ ] 6.5" iPhone (1284×2778) - iPhone 14 Plus
- [ ] 5.5" iPhone (1242×2208) - iPhone 8 Plus
- [ ] iPad Pro 12.9" (2048×2732) - if supporting iPad

**Optional:**
- [ ] App Preview videos (30 seconds max, optional)

#### App Information

- [ ] **App Name**: ULTRATHINK Investor
- [ ] **Subtitle**: Cryptocurrency Investment Platform
- [ ] **Description**: (4000 characters max)
  ```
  ULTRATHINK Investor is the official mobile app for ULTRATHINK platform investors.
  Track your cryptocurrency portfolio, view daily rates, access monthly statements,
  and manage your investments on the go.

  Features:
  • Real-time portfolio tracking across 6 cryptocurrencies (BTC, ETH, SOL, USDT, USDC, EURC)
  • Daily cryptocurrency rates with 24-hour change indicators
  • Monthly investment statements with detailed breakdowns
  • Secure authentication (Email, Google, GitHub)
  • Transaction history and filtering
  • Document vault for tax documents and reports
  • Push notifications for rate updates
  • Professional-grade security with Supabase backend
  ```

- [ ] **Keywords**: cryptocurrency, investment, portfolio, bitcoin, ethereum, solana, USDT, USDC
- [ ] **Support URL**: https://indigo.fund/support
- [ ] **Marketing URL**: https://indigo.fund
- [ ] **Privacy Policy URL**: https://indigo.fund/privacy

#### App Review Information

- [ ] **First Name**: Your name
- [ ] **Last Name**: Your name
- [ ] **Phone Number**: Contact phone
- [ ] **Email**: Contact email
- [ ] **Demo Account**:
  - Username: `demo@indigo.fund`
  - Password: `DemoPassword123!`
- [ ] **Notes**:
  ```
  This app requires a valid investor account with ULTRATHINK platform.
  Demo credentials provided for review purposes. The app connects to
  production Supabase database. Push notifications are enabled for daily
  rate updates.
  ```

#### Age Rating

- [ ] **Rating**: 4+ (No objectionable content)

#### Pricing

- [ ] **Price Tier**: Free

### Step 2: Submit for Review

1. In App Store Connect, go to your app
2. Click **+ Version or Platform**
3. Select **iOS**
4. Enter **Version Number**: 1.0.0
5. Fill in all required fields (above)
6. Upload screenshots and app icon
7. Select the build from TestFlight
8. Click **Submit for Review**

### Step 3: App Review Process

**Timeline:**
- **Initial Review**: 24-48 hours
- **Rejections**: Address issues and resubmit (adds 24-48 hours)

**Common Rejection Reasons:**
- Missing demo account or invalid credentials
- Crashes during testing
- Incomplete functionality
- Privacy policy issues
- Guideline violations

### Step 4: Release

Once approved:

1. **Manual Release**: Click "Release This Version" in App Store Connect
2. **Automatic Release**: Set during submission
3. **Phased Release**: Gradual rollout over 7 days (optional)

App appears on App Store within 24 hours of release.

---

## Troubleshooting

### Build Errors

#### "No signing certificate found"

**Solution:**
1. Go to Xcode → Preferences → Accounts
2. Select your Apple ID
3. Click "Download Manual Profiles"
4. Select project → Signing & Capabilities → Reset to "Automatically manage signing"

#### "Supabase module not found"

**Solution:**
1. File → Add Packages
2. Add `https://github.com/supabase-community/supabase-swift`
3. Or run `pod install` if using CocoaPods

#### "Build failed with exit code 65"

**Solution:**
1. Clean build folder: Cmd + Shift + K
2. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Restart Xcode
4. Rebuild: Cmd + B

### Runtime Errors

#### "Failed to fetch" or network errors

**Check:**
1. Supabase URL is correct in SupabaseManager.swift
2. Supabase anon key is valid
3. Internet connection is active
4. Supabase project is not paused (free tier)

#### "Investor profile not found"

**Check:**
1. User exists in `profiles` table
2. Investor record exists in `investors` table
3. `investors.profile_id` matches `profiles.id`

#### Statements page is empty

**Check:**
1. investor_monthly_reports table has data
2. Query uses correct investor_id
3. RLS policies allow read access

### TestFlight Issues

#### "Build is not available"

**Wait:** Processing can take 15-30 minutes after upload.

#### "Beta App Review rejected"

**Common reasons:**
- App crashes on launch
- Missing demo account
- Incomplete functionality
- Requires additional compliance documentation (FinCrypt apps)

### Push Notification Issues

#### Notifications not received

**Check:**
1. APNs certificate is uploaded to Supabase
2. Device token is registered
3. App has notification permissions
4. Environment matches (Sandbox vs Production)
5. `notify_daily_rate_published()` trigger is active

#### "Invalid device token"

**Solution:**
- Regenerate device token
- Check Bundle ID matches
- Verify environment (Sandbox vs Production)

---

## Post-Deployment Checklist

### Monitoring

- [ ] Install analytics (Firebase, Mixpanel, etc.)
- [ ] Set up crash reporting (Sentry, Crashlytics)
- [ ] Monitor App Store reviews
- [ ] Track TestFlight feedback

### Maintenance

- [ ] Weekly check for iOS updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Annual certificate renewal

### Future Enhancements

- [ ] Implement real-time subscriptions (Supabase Realtime)
- [ ] Add biometric authentication (Face ID, Touch ID)
- [ ] Implement document caching
- [ ] Add offline mode support
- [ ] Localization for multiple languages
- [ ] iPad-optimized layout
- [ ] Widget support (iOS 14+)
- [ ] Shortcuts integration

---

## Support

### Resources

- **Apple Developer Documentation**: https://developer.apple.com/documentation/
- **Supabase Swift Docs**: https://github.com/supabase-community/supabase-swift
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

### Contact

- **Technical Issues**: hammadou@indigo.fund
- **App Store Connect**: Use your Apple Developer account
- **Supabase Support**: https://supabase.com/support

---

## Appendix A: Required Files Checklist

### iOS Project Files

- [x] `ios/IndigoInvestor/Models/DailyRate.swift` - Created
- [x] `ios/IndigoInvestor/ViewModels/DailyRatesViewModel.swift` - Created
- [x] `ios/IndigoInvestor/Views/DailyRates/DailyRatesView.swift` - Created
- [x] `ios/IndigoInvestor/Extensions/SupabaseManager+DailyRates.swift` - Created
- [x] `ios/IndigoInvestor/ViewModels/StatementViewModel.swift` - Updated for investor_monthly_reports
- [x] `ios/IndigoInvestor/Views/Navigation/MainTabView.swift` - Updated with Daily Rates tab

### Configuration Files

- [ ] `ios/IndigoInvestor/Config.xcconfig` - To be created (optional)
- [ ] `ios/IndigoInvestor/GoogleService-Info.plist` - If using Firebase
- [x] `ios/IndigoInvestor.xcodeproj` - Exists

### Asset Files

- [ ] `ios/IndigoInvestor/Assets.xcassets/AppIcon.appiconset` - Update app icon
- [ ] Screenshots for App Store (6 sizes minimum)
- [ ] App Preview video (optional)

---

## Appendix B: Database Schema Reference

### Tables Used by iOS App

#### `investor_monthly_reports`
Primary data source for monthly statements.

```sql
CREATE TABLE investor_monthly_reports (
  id UUID PRIMARY KEY,
  investor_id UUID REFERENCES investors(id),
  report_month DATE,          -- First day of month
  asset_code TEXT,            -- BTC, ETH, SOL, USDT, USDC, EURC
  opening_balance NUMERIC,
  closing_balance NUMERIC,
  additions NUMERIC,
  withdrawals NUMERIC,
  yield_earned NUMERIC,
  entry_date DATE,
  exit_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `daily_rates`
Data source for daily cryptocurrency rates.

```sql
CREATE TABLE daily_rates (
  id UUID PRIMARY KEY,
  rate_date DATE UNIQUE NOT NULL,
  btc_rate NUMERIC NOT NULL,
  eth_rate NUMERIC NOT NULL,
  sol_rate NUMERIC NOT NULL,
  usdt_rate NUMERIC NOT NULL,
  usdc_rate NUMERIC NOT NULL,
  eurc_rate NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `profiles`
User authentication and profile data.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  role TEXT,           -- 'investor' or 'admin'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `investors`
Investor-specific data.

```sql
CREATE TABLE investors (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  investor_code TEXT UNIQUE,
  status TEXT,
  created_at TIMESTAMP
);
```

---

**Version**: 1.0.0
**Last Updated**: January 6, 2025
**Author**: Claude Code
**Platform**: ULTRATHINK Investment Platform
