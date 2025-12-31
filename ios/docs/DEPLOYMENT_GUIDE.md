# IndigoInvestor iOS App - Deployment Guide

This guide covers the complete deployment process for the IndigoInvestor iOS app from development to App Store release.

## 📋 Pre-Deployment Checklist

### ✅ Development Environment
- [ ] Xcode 15.0+ installed
- [ ] Valid Apple Developer account ($99/year)
- [ ] App Store Connect access configured
- [ ] Certificates and provisioning profiles created
- [ ] Push notification certificates (if applicable)

### ✅ Backend Setup
- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] RLS policies verified and tested
- [ ] Storage buckets configured
- [ ] Edge functions deployed (if applicable)

### ✅ App Configuration
- [ ] Bundle identifier set (com.indigo.investor)
- [ ] App icons in all required sizes
- [ ] Launch screen configured
- [ ] Info.plist permissions configured
- [ ] Environment variables set

## 🔧 1. Backend Integration

### Step 1.1: Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Note your project URL and anon key
3. Run the setup script:

```bash
cd /Users/mama/indigo-yield-platform-v01/ios
chmod +x setup_backend.sh
./setup_backend.sh
```

4. Enter your Supabase credentials when prompted

### Step 1.2: Apply Database Migrations

1. Open Supabase Dashboard > SQL Editor
2. Run each migration in order from `/supabase/migrations/`
3. Verify tables are created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Step 1.3: Create Test Data

Run the sample data script in Supabase SQL Editor:

```sql
-- Located at: IndigoInvestor/Scripts/generate_sample_data.sql
-- Creates test admin and LP users
```

## 🏗 2. Build Configuration

### Step 2.1: Development Build

1. Open Xcode:
```bash
open IndigoInvestor.xcodeproj
```

2. Select your development team in Signing & Capabilities
3. Choose simulator or device
4. Build and run (⌘R)

### Step 2.2: Testing Build

1. Run unit tests:
```bash
xcodebuild test \
  -scheme IndigoInvestor \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

2. Run UI tests:
```bash
xcodebuild test \
  -scheme IndigoInvestor \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -only-testing:IndigoInvestorUITests
```

### Step 2.3: Release Build

1. Set build configuration to Release
2. Update version and build numbers:
```swift
// In project settings:
MARKETING_VERSION = 1.0.0
CURRENT_PROJECT_VERSION = 1
```

3. Archive the app:
   - Product > Archive
   - Wait for build to complete

## 📱 3. TestFlight Deployment

### Step 3.1: Upload to App Store Connect

1. In Xcode Organizer:
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Select "Upload"

2. Configure options:
   - ✅ Include bitcode
   - ✅ Upload symbols
   - ✅ Automatically manage signing

### Step 3.2: Configure TestFlight

1. Log in to App Store Connect
2. Navigate to your app > TestFlight
3. Complete test information:
   - Beta App Description
   - Beta App Review Information
   - Add test groups

### Step 3.3: Internal Testing

1. Add internal testers (up to 100)
2. Build appears automatically after processing
3. Testers receive email invitations

### Step 3.4: External Testing

1. Submit build for Beta App Review
2. Add external testers (up to 10,000)
3. Configure test groups
4. Monitor feedback and crashes

## 🚀 4. App Store Submission

### Step 4.1: App Store Listing

Complete all required information:

#### App Information
- **Name**: IndigoInvestor
- **Subtitle**: Investment Portfolio Management
- **Primary Category**: Finance
- **Secondary Category**: Business

#### Pricing
- **Price**: Free
- **In-App Purchases**: None (initially)

#### App Privacy
- Data collection disclosures
- Privacy policy URL
- Terms of service URL

### Step 4.2: Screenshots

Required screenshots for each device size:
- 6.7" (iPhone 15 Pro Max)
- 6.5" (iPhone 14 Plus)
- 5.5" (iPhone 8 Plus)
- 12.9" (iPad Pro)

Key screens to showcase:
1. Login/Welcome screen
2. Dashboard overview
3. Portfolio details
4. Transaction history
5. Statements view

### Step 4.3: App Description

```
IndigoInvestor - Your Complete Investment Portfolio Manager

Access your Indigo investment portfolio anytime, anywhere with our secure iOS app designed for Limited Partners.

KEY FEATURES:

Portfolio Management
• Real-time portfolio valuation
• Performance tracking and analytics
• Asset allocation visualization
• Historical performance charts

Transaction Tracking
• Complete transaction history
• Deposits and withdrawals
• Dividend distributions
• Detailed transaction records

Statements & Documents
• Monthly and quarterly statements
• Tax documents
• Secure document storage
• Easy PDF downloads

Security First
• Face ID/Touch ID authentication
• Bank-level encryption
• Secure data transmission
• Session management

Admin Features (for authorized users)
• Investor management
• Approval workflows
• System analytics
• Comprehensive reporting

Stay connected to your investments with IndigoInvestor - the trusted platform for sophisticated investors.
```

### Step 4.4: Keywords

```
investment,portfolio,finance,wealth,management,
investor,limited partner,fund,asset,tracking
```

### Step 4.5: Support Information

- **Support URL**: https://indigo.com/support
- **Marketing URL**: https://indigo.com
- **Support Email**: support@indigo.com
- **Phone**: +1-555-0100

### Step 4.6: Review Information

- **Demo Account**: 
  - Email: demo@indigo.com
  - Password: DemoUser123!
- **Notes**: Explain any features requiring special access

## 🔍 5. App Review Process

### Expected Timeline
- **Initial Review**: 24-48 hours
- **Expedited Review**: 1-2 hours (if requested)
- **Updates**: 24 hours typically

### Common Rejection Reasons to Avoid
1. ❌ Crashes or bugs
2. ❌ Incomplete functionality
3. ❌ Missing privacy policy
4. ❌ Inappropriate content
5. ❌ Misleading screenshots

### Review Guidelines Compliance
- ✅ Follow Apple's Human Interface Guidelines
- ✅ Ensure all features work as described
- ✅ Provide clear user onboarding
- ✅ Handle errors gracefully
- ✅ Include proper attributions

## 🔄 6. Post-Launch

### Step 6.1: Monitor Performance

Use App Store Connect to track:
- Downloads and installations
- User ratings and reviews
- Crash reports
- Performance metrics

### Step 6.2: Respond to Feedback

1. Monitor reviews daily
2. Respond to user concerns
3. Track feature requests
4. Plan update roadmap

### Step 6.3: Regular Updates

Release schedule:
- **Bug fixes**: As needed (1-2 weeks)
- **Minor updates**: Monthly
- **Major features**: Quarterly

## 🛡 7. Security Considerations

### Production Checklist
- [ ] Remove all debug code
- [ ] Disable logging in release builds
- [ ] Verify certificate pinning
- [ ] Test with production endpoints
- [ ] Rotate API keys
- [ ] Enable App Transport Security
- [ ] Implement jailbreak detection

### Data Protection
- [ ] Enable data protection entitlement
- [ ] Encrypt sensitive local data
- [ ] Clear clipboard on app backgrounding
- [ ] Implement session timeout
- [ ] Disable screenshots for sensitive screens

## 📊 8. Analytics & Monitoring

### Recommended Services
1. **Crashlytics**: Crash reporting
2. **Analytics**: User behavior tracking
3. **Sentry**: Error tracking
4. **Performance Monitoring**: App performance

### Implementation
```swift
// In AppDelegate or App.swift
#if !DEBUG
FirebaseApp.configure()
Analytics.logEvent("app_open", parameters: nil)
#endif
```

## 🔧 9. Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean build folder
rm -rf ~/Library/Developer/Xcode/DerivedData
# Reset package caches
swift package reset
```

#### Signing Issues
1. Revoke existing certificates
2. Regenerate provisioning profiles
3. Clear Keychain certificates
4. Re-download from Apple Developer

#### Upload Failures
- Check network connection
- Verify App Store Connect status
- Validate archive before upload
- Try Application Loader as alternative

## 📝 10. Release Notes Template

```markdown
## Version X.Y.Z

### What's New
- Feature 1 description
- Feature 2 description

### Improvements
- Performance enhancement details
- UI/UX improvements

### Bug Fixes
- Fixed issue with...
- Resolved crash when...

### Known Issues
- Issue 1 (workaround: ...)

We love hearing from you! Please rate and review.
```

## 🎯 Success Metrics

Track these KPIs post-launch:
- **Downloads**: Target 1000+ in first month
- **Daily Active Users**: 60%+ retention
- **Crash-free rate**: >99.5%
- **App Store rating**: 4.5+ stars
- **User reviews**: Respond within 24 hours

## 📞 Support Contacts

- **Apple Developer Support**: https://developer.apple.com/support/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/
- **Supabase Support**: https://supabase.com/support

---

## ✅ Final Checklist Before Release

- [ ] All features tested on real devices
- [ ] Performance acceptable on older devices
- [ ] Accessibility features work (VoiceOver)
- [ ] All text is spell-checked
- [ ] Screenshots are up-to-date
- [ ] Privacy policy is accessible
- [ ] Support contact is responsive
- [ ] Backend can handle expected load
- [ ] Monitoring is in place
- [ ] Team is ready for launch day

---

**Good luck with your launch! 🚀**

For questions or issues, contact the development team.
