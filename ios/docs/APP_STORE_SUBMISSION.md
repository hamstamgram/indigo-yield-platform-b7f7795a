# iOS App Store Submission Guide - IndigoInvestor

## 📱 Current Status
- ✅ Xcode project created and configured
- ✅ All features implemented (LP & Admin)
- ✅ Security features integrated (biometric, keychain, certificate pinning)
- ✅ Supabase backend connected
- ✅ UI/UX complete with SwiftUI

## 🎯 Pre-Submission Checklist

### 1. Apple Developer Account Setup
- [ ] Apple Developer Program membership active ($99/year)
- [ ] App Store Connect access configured
- [ ] Team ID obtained
- [ ] Bundle Identifier registered: `com.indigo.IndigoInvestor`

### 2. App Configuration in Xcode (Now Open)
1. **Select the IndigoInvestor target**
2. **General Tab:**
   - Display Name: `Indigo Investor`
   - Bundle Identifier: `com.indigo.IndigoInvestor`
   - Version: `1.0.0`
   - Build: `1`
   - Deployment Target: `iOS 14.0`
   - Device: iPhone and iPad

3. **Signing & Capabilities:**
   - Team: Select your development team
   - Signing Certificate: Automatic manage signing
   - Provisioning Profile: Automatic

4. **Info.plist Configurations:**
   - Privacy descriptions already added
   - App Transport Security configured
   - Background modes enabled

### 3. Build and Archive Process

#### Option A: Using Xcode GUI (Recommended for First Time)
1. **Select Generic iOS Device** as the build target
2. **Product → Clean Build Folder** (⇧⌘K)
3. **Product → Archive** (This will take 5-10 minutes)
4. Once complete, the Organizer window opens
5. Click **Distribute App**
6. Select **App Store Connect**
7. Choose **Upload**
8. Follow the prompts to upload

#### Option B: Using Command Line
```bash
# Clean build folder
xcodebuild clean -project IndigoInvestor.xcodeproj -scheme IndigoInvestor

# Create archive
xcodebuild archive \
  -project IndigoInvestor.xcodeproj \
  -scheme IndigoInvestor \
  -configuration Release \
  -archivePath ./build/IndigoInvestor.xcarchive \
  -destination "generic/platform=iOS"

# Export IPA
xcodebuild -exportArchive \
  -archivePath ./build/IndigoInvestor.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
  -f ./build/IndigoInvestor.ipa \
  -t ios \
  -u YOUR_APPLE_ID \
  -p YOUR_APP_SPECIFIC_PASSWORD
```

### 4. App Store Connect Setup

1. **Go to App Store Connect**: https://appstoreconnect.apple.com

2. **Create New App:**
   - Platform: iOS
   - Name: Indigo Investor
   - Primary Language: English (U.S.)
   - Bundle ID: Select `com.indigo.IndigoInvestor`
   - SKU: `INDIGO_INVESTOR_001`

3. **App Information:**
   - Category: Finance
   - Content Rights: Yes (own all rights)
   - Age Rating: 4+ (no objectionable content)

4. **Pricing and Availability:**
   - Price: Free
   - Availability: All territories

### 5. App Store Listing

#### Screenshots Required (Use Simulator)
- [ ] 6.7" iPhone (iPhone 15 Pro Max)
- [ ] 6.5" iPhone (iPhone 14 Plus)
- [ ] 5.5" iPhone (iPhone 8 Plus)
- [ ] 12.9" iPad Pro (3rd gen)
- [ ] 12.9" iPad Pro (2nd gen)

#### App Description
```
Indigo Investor - Professional Yield Management Platform

Indigo Investor provides sophisticated investors with secure access to their managed yield portfolios. Track performance, view statements, and manage your investments with institutional-grade security.

KEY FEATURES:
• Real-time Portfolio Tracking
• Secure Document Vault
• Transaction History
• Performance Analytics
• Withdrawal Management
• Two-Factor Authentication
• Biometric Security
• Offline Access

LIMITED PARTNER FEATURES:
• Dashboard with portfolio overview
• Asset allocation charts
• Monthly statements with PDF export
• Transaction history and filtering
• Secure messaging with administrators
• Push notifications for important updates

ADMIN FEATURES:
• Investor management dashboard
• Approval workflows
• Yield configuration
• Batch operations
• Audit logging
• Advanced analytics

SECURITY:
• Face ID/Touch ID authentication
• End-to-end encryption
• Certificate pinning
• Secure keychain storage
• Session management
• Two-factor authentication (TOTP)

REQUIREMENTS:
• iOS 14.0 or later
• iPhone, iPad, and iPod touch compatible
• Apple Watch app included
• Internet connection required for real-time updates
```

#### Keywords
```
investment, portfolio, yield, finance, wealth management, investor, returns, statements, secure, tracking
```

#### Support Information
- Support URL: `https://indigo-yield-platform-v01.vercel.app/support`
- Privacy Policy: `https://indigo-yield-platform-v01.vercel.app/privacy`
- Terms of Use: `https://indigo-yield-platform-v01.vercel.app/terms`

### 6. TestFlight Beta Testing

1. **After Upload:**
   - Build appears in TestFlight section
   - Complete compliance questionnaire
   - Export compliance: No encryption beyond standard HTTPS

2. **Beta Test Information:**
   - What to Test: All features, especially authentication and document viewing
   - Beta App Description: Same as above
   - Email: support@indigoyield.com

3. **Add Testers:**
   - Internal Testing: Add team members
   - External Testing: Add up to 10,000 testers via email

### 7. Final Submission

1. **Select Build:**
   - In App Store Connect, select the build from TestFlight

2. **Submit for Review:**
   - Review all information
   - Click "Submit for Review"
   - Typical review time: 24-48 hours

3. **Review Notes:**
   ```
   Demo Credentials:
   LP User: demo-lp@indigoyield.com / DemoLP2024!
   Admin User: demo-admin@indigoyield.com / DemoAdmin2024!
   
   Please test both user types to see full functionality.
   The app connects to our production Supabase backend.
   ```

## 🚀 Quick Start Commands

```bash
# Open Xcode (already done)
open IndigoInvestor.xcodeproj

# Build for testing
xcodebuild -project IndigoInvestor.xcodeproj -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15 Pro' build

# Run tests
xcodebuild test -project IndigoInvestor.xcodeproj -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

## 📊 Post-Submission Monitoring

1. **App Store Connect:**
   - Monitor review status
   - Respond to any reviewer questions within 24 hours
   - Check crash reports and feedback

2. **Analytics:**
   - Monitor download numbers
   - Track user engagement
   - Review crash reports

3. **Updates:**
   - Plan for regular updates
   - Respond to user feedback
   - Keep dependencies updated

## ⚠️ Common Rejection Reasons to Avoid

- ✅ Incomplete functionality (all features complete)
- ✅ Crashes or bugs (tested thoroughly)
- ✅ Broken links (all links verified)
- ✅ Placeholder content (all content finalized)
- ✅ Privacy policy missing (included)
- ✅ Inadequate testing credentials (provided above)

## 📞 Support Contacts

- App Store Connect Support: https://developer.apple.com/contact/
- Technical Support: https://developer.apple.com/support/
- App Review: https://developer.apple.com/app-store/review/

---

**Next Step:** In Xcode, select Generic iOS Device and run Product → Archive

The app is ready for submission! 🎉
