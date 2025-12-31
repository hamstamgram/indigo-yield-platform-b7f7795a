# Quick Testing Guide - Indigo Yield Platform iOS

**Last Updated:** November 4, 2025

---

## Pre-Testing Setup

### 1. Fix Build Configuration (REQUIRED)
```bash
cd /Users/mama/Desktop/Claude\ code/indigo-yield-platform-v01/ios

# The Typography.swift file is in Theme/ but project expects it in Utils/
# Option A: Update Xcode project file
# Option B: Create symbolic link (quick fix for testing)
ln -s IndigoInvestor/Theme/Typography.swift IndigoInvestor/Utils/Typography.swift
```

### 2. Build for Simulator
```bash
# Boot iPhone 16 simulator
xcrun simctl boot "iPhone 16"
open -a Simulator

# Build and run
xcodebuild -scheme IndigoInvestor \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build
```

### 3. Install on Physical Device (for native features)
```bash
# Build for device
xcodebuild -scheme IndigoInvestor \
  -sdk iphoneos \
  -configuration Debug \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO
```

---

## Testing Checklist by Priority

### 🔴 CRITICAL - Test First

#### Authentication Flow (10 min)
- [ ] Launch app → Splash screen displays
- [ ] Login with valid credentials
- [ ] Test Face ID/Touch ID login
- [ ] Register new account
- [ ] Verify email flow
- [ ] Forgot password flow
- [ ] TOTP 2FA verification

**Expected:** All auth flows work, biometric prompts correctly

#### Home Dashboard (5 min)
- [ ] View portfolio summary
- [ ] Check market overview
- [ ] Verify real-time data updates
- [ ] Pull-to-refresh works
- [ ] Quick actions panel functional

**Expected:** Data loads, charts render, navigation works

#### Transactions (10 min)
- [ ] Create deposit with Apple Pay
- [ ] Request withdrawal
- [ ] View transaction history
- [ ] Filter and search transactions
- [ ] Export transaction report

**Expected:** Apple Pay sheet shows, transactions process

---

### 🟡 IMPORTANT - Test Second

#### Portfolio Management (15 min)
- [ ] View portfolio overview
- [ ] Check individual positions
- [ ] View performance charts
- [ ] Test rebalancing tool
- [ ] Use yield calculator

**Expected:** Charts interactive, calculations accurate

#### Documents (10 min)
- [ ] View document vault
- [ ] Upload document with scanner
- [ ] View statement PDF
- [ ] Download tax documents
- [ ] Annotate PDF

**Expected:** Scanner works, PDFs render, annotations save

#### Settings & Security (10 min)
- [ ] Edit profile information
- [ ] Enable/disable biometric auth
- [ ] Set up TOTP 2FA
- [ ] Change password
- [ ] Manage sessions
- [ ] Configure notifications

**Expected:** Settings persist, security features work

---

### 🟢 NICE TO HAVE - Test Last

#### Reports (5 min)
- [ ] Generate performance report
- [ ] Create tax report
- [ ] Build custom report
- [ ] Export to PDF/CSV

**Expected:** Reports generate, exports work

#### Notifications (5 min)
- [ ] View notification center
- [ ] Set up price alerts
- [ ] Configure notification preferences

**Expected:** Notifications display, settings save

#### Support (5 min)
- [ ] Browse FAQ
- [ ] Contact support
- [ ] Create support ticket

**Expected:** Forms submit, search works

#### Admin Panel (15 min) - Admin access required
- [ ] View admin dashboard
- [ ] Manage investors
- [ ] Approve withdrawals
- [ ] Review documents
- [ ] Check audit logs

**Expected:** Admin features restricted, actions work

---

## Native Feature Testing

### Face ID / Touch ID (Physical Device Required)

**Screens to Test:**
1. Login screen
2. Biometric setup
3. Transaction confirmation
4. Settings changes

**Test Steps:**
```bash
# Enable Face ID in simulator
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged 1
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged

# Test Face ID success
Hardware > Face ID > Matching Face

# Test Face ID failure
Hardware > Face ID > Non-matching Face
```

**Expected:**
- ✅ Face ID prompt appears
- ✅ Successful auth logs in
- ✅ Failed auth shows error
- ✅ Fallback to password works

---

### Apple Pay (Physical Device Required)

**Screens to Test:**
1. Deposit method selection
2. Apple Pay integration

**Prerequisites:**
- Add test card to Wallet app
- Enable Apple Pay in Settings

**Test Steps:**
1. Navigate to Deposits
2. Select Apple Pay
3. Tap Apple Pay button
4. Authenticate with Face ID/Touch ID
5. Confirm payment

**Expected:**
- ✅ Apple Pay sheet displays
- ✅ Card selection works
- ✅ Authentication succeeds
- ✅ Payment processes
- ✅ Receipt generated

---

### Document Scanner (Physical Device Required)

**Screens to Test:**
1. KYC document upload
2. Document vault upload
3. Support ticket screenshot

**Test Steps:**
1. Navigate to document upload
2. Tap scan button
3. Point camera at document
4. Auto-capture or manual capture
5. Review and save

**Expected:**
- ✅ Camera opens
- ✅ Edge detection works
- ✅ Document corners highlighted
- ✅ Image quality sufficient
- ✅ Upload succeeds

---

### Push Notifications (Physical Device Required)

**Test Steps:**
1. Request notification permissions
2. Trigger test notification from backend
3. Receive notification
4. Tap notification
5. Navigate to related screen

**Expected:**
- ✅ Permission prompt shows
- ✅ Notification received
- ✅ Banner displays correctly
- ✅ Deep link navigation works
- ✅ Badge count updates

---

## UI/UX Verification

### Dark Mode Testing (5 min)
```bash
# Toggle dark mode in simulator
Settings > Developer > Dark Appearance
# Or use Xcode: Environment Overrides > Interface Style
```

**Screens to Verify:**
- [ ] Home dashboard
- [ ] Portfolio screens
- [ ] Transaction history
- [ ] Settings screens

**Expected:**
- ✅ All text readable
- ✅ Proper contrast
- ✅ Images have dark variants
- ✅ Charts visible

---

### Accessibility Testing (10 min)

**Enable VoiceOver:**
```bash
# In simulator
Settings > Accessibility > VoiceOver > On
# Or triple-click Home button
```

**Screens to Test:**
- [ ] Login screen
- [ ] Home dashboard
- [ ] Transaction history
- [ ] Settings

**Expected:**
- ✅ All buttons have labels
- ✅ Labels are descriptive
- ✅ Navigation order logical
- ✅ Hints provide context

**Dynamic Type:**
```bash
# Change text size
Settings > Display & Brightness > Text Size
```

**Expected:**
- ✅ Text scales appropriately
- ✅ No text truncation
- ✅ Layout adjusts

---

### iPad Testing (10 min)

**Simulator:** iPad Air (5th generation)

**Screens to Test:**
- [ ] Home dashboard (split view)
- [ ] Portfolio with sidebar
- [ ] Settings with master-detail

**Expected:**
- ✅ Sidebar appears on iPad
- ✅ Split view works
- ✅ Popovers instead of sheets
- ✅ Optimal layout for screen size

---

## Performance Testing

### Launch Time Test
```bash
# Measure cold launch
1. Force quit app
2. Clear from multitasking
3. Launch and time to home screen
Target: < 2 seconds
```

### Memory Test
```bash
# Use Instruments
Xcode > Product > Profile > Allocations
Navigate through all screens
Target: < 100MB typical, < 200MB peak
```

### Network Performance
```bash
# Simulate slow network
Settings > Developer > Network Link Conditioner > 3G
Test: Transaction history, document downloads
Expected: Loading states, reasonable timeouts
```

### Chart Rendering
```bash
# Monitor frame rate
Xcode > Debug > View Debugging > Rendering > Show Frame Rate
Navigate to performance chart
Target: 60fps sustained
```

---

## Regression Testing Scenarios

### Edge Cases to Test

#### Network Errors
1. Enable Airplane Mode
2. Navigate to portfolio
3. **Expected:** Offline message, cached data displays

#### Low Battery
1. Settings > Battery > Low Power Mode
2. Test chart animations
3. **Expected:** Reduced animations

#### Interruptions
1. Start transaction
2. Receive phone call
3. Return to app
4. **Expected:** State preserved

#### Memory Warnings
1. Open many screens
2. Navigate back
3. **Expected:** No crashes, proper cleanup

#### Background App Refresh
1. Background app for 10 minutes
2. Reopen
3. **Expected:** Data refreshed, state restored

---

## Screenshot Capture for Testing

### Automated Screenshot Script
```bash
#!/bin/bash
# Save as capture_screenshots.sh

DEVICE_ID="FACFA1B1-243B-47DB-8E79-9C64997ACE8D"  # iPhone 16
OUTPUT_DIR="/Users/mama/Desktop/Claude code/indigo-yield-platform-v01/ios/test-reports/screenshots"

# Create directory
mkdir -p "$OUTPUT_DIR"

# Function to take screenshot
take_screenshot() {
    local name=$1
    xcrun simctl io "$DEVICE_ID" screenshot "$OUTPUT_DIR/$name.png"
    echo "Captured: $name"
}

# Capture screenshots
echo "Starting screenshot capture..."

# Launch app and wait
echo "Please navigate to Splash Screen and press Enter"
read
take_screenshot "01-splash"

echo "Navigate to Login and press Enter"
read
take_screenshot "02-login"

# Continue for all screens...

echo "Screenshot capture complete!"
```

### Manual Screenshot Guide
```
Each screen needs 3 screenshots:
1. Light mode - iPhone 16
2. Dark mode - iPhone 16
3. iPad Air - Light mode (for adaptive layout)

File naming: [section]-[screen]-[mode].png
Example: auth-login-light.png
```

---

## Automated Testing Commands

### Run Unit Tests
```bash
xcodebuild test \
  -scheme IndigoInvestor \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:IndigoInvestorTests
```

### Run UI Tests
```bash
xcodebuild test \
  -scheme IndigoInvestor \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:IndigoInvestorUITests
```

### Generate Code Coverage Report
```bash
xcodebuild test \
  -scheme IndigoInvestor \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -enableCodeCoverage YES
```

---

## Bug Reporting Template

When you find a bug, document it:

```markdown
## Bug Report

**Screen:** [Screen name]
**Build:** [Build number]
**Device:** [iPhone model / Simulator]
**iOS Version:** [e.g., 18.6]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots:**
[Attach screenshots]

**Console Logs:**
[Relevant logs]

**Severity:** [Critical / High / Medium / Low]
```

---

## Sign-Off Checklist

Before declaring testing complete:

### Functionality
- [ ] All 115 screens load without crashes
- [ ] Navigation flows work correctly
- [ ] Data loads and displays accurately
- [ ] Forms validate and submit
- [ ] Charts render and are interactive

### Native Features
- [ ] Face ID/Touch ID works
- [ ] Apple Pay processes payments
- [ ] Document scanner captures images
- [ ] Push notifications received
- [ ] PDFs render correctly

### UI/UX
- [ ] Dark mode fully functional
- [ ] Accessibility labels present
- [ ] Dynamic Type supported
- [ ] iPad layouts optimized
- [ ] Animations smooth (60fps)

### Performance
- [ ] Launch time < 2 seconds
- [ ] Memory usage < 100MB typical
- [ ] No memory leaks
- [ ] Network caching working
- [ ] Smooth scrolling

### Security
- [ ] Credentials stored securely (Keychain)
- [ ] Session management works
- [ ] Biometric authentication secure
- [ ] HTTPS for all network calls
- [ ] Data encrypted at rest

### Error Handling
- [ ] Network errors display friendly messages
- [ ] Validation errors clear
- [ ] Retry mechanisms work
- [ ] Offline mode functional
- [ ] Crash recovery works

---

## Quick Command Reference

```bash
# Build for simulator
xcodebuild -scheme IndigoInvestor -sdk iphonesimulator build

# Run on simulator
xcrun simctl install booted path/to/app
xcrun simctl launch booted com.indigo.investor

# Take screenshot
xcrun simctl io booted screenshot screenshot.png

# Record video
xcrun simctl io booted recordVideo video.mp4

# Simulate Face ID
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged

# List simulators
xcrun simctl list devices available

# Reset simulator
xcrun simctl erase all

# Check app logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "IndigoInvestor"'
```

---

## Testing Time Estimate

| Phase | Time | Priority |
|-------|------|----------|
| Build Fix & Setup | 1-2 hours | 🔴 Critical |
| Critical Path Testing | 4-6 hours | 🔴 Critical |
| Native Feature Testing | 3-4 hours | 🟡 Important |
| Comprehensive UI Testing | 8-10 hours | 🟡 Important |
| Performance & Edge Cases | 4-6 hours | 🟢 Nice to Have |
| Documentation & Screenshots | 2-3 hours | 🟢 Nice to Have |
| **TOTAL** | **22-31 hours** | **~3-4 days** |

---

## Contact & Resources

**Full Test Report:** `ios-all-screens-tests.md`
**Test Matrix:** `TEST_MATRIX.md`
**Summary:** `TESTING_SUMMARY.md`

**Xcode Version:** 26.0.1
**iOS Target:** 14.0+
**Test Platform:** iPhone 16 Simulator (iOS 18.6)

---

**Guide Version:** 1.0
**Last Updated:** November 4, 2025
