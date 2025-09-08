# TestFlight Deployment Guide for IndigoInvestor

## Prerequisites

1. **Apple Developer Account**
   - Active Apple Developer Program membership ($99/year)
   - App Store Connect access

2. **Xcode Configuration**
   - Xcode 15.0 or later
   - Valid signing certificate
   - Provisioning profiles configured

3. **App Configuration**
   - Bundle ID: `com.indigo.investor`
   - Version: 1.0.0
   - Build: 1

## Step 1: Configure Signing & Capabilities

1. Open `IndigoInvestor.xcodeproj` in Xcode
2. Select the IndigoInvestor target
3. Go to "Signing & Capabilities" tab
4. Enable "Automatically manage signing"
5. Select your Team from the dropdown
6. Verify capabilities:
   - Push Notifications
   - Background Modes (fetch, processing, remote-notification)
   - Keychain Sharing (if needed)

## Step 2: Configure Secrets

1. Create `Config/Secrets.xcconfig` file:
```
SUPABASE_URL = https://nkfimvovosdehmyyjubn.supabase.co
SUPABASE_ANON_KEY = your_anon_key_here
SUPABASE_SERVICE_KEY = your_service_key_here
SENTRY_DSN = https://68cc458c375acde5d6657ed8a36f1e43@o4509944393629696.ingest.de.sentry.io/4509949717643344
```

2. Add to `.gitignore` if not already present:
```
Config/Secrets.xcconfig
*.xcconfig
```

## Step 3: Fix Build Issues

Before archiving, ensure the app builds successfully:

1. Create missing service files (temporary stubs):
```swift
// Create these files in Core/Services/
- AuthService.swift
- StorageService.swift
- Add other missing services as needed
```

2. Clean build folder: `Shift + Cmd + K`
3. Build the project: `Cmd + B`

## Step 4: Create App Store Connect Record

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - Platform: iOS
   - Name: IndigoInvestor
   - Primary Language: English (U.S.)
   - Bundle ID: com.indigo.investor
   - SKU: INDIGO-INVESTOR-001
   - User Access: Full Access

## Step 5: Archive and Upload

1. In Xcode:
   - Select "Any iOS Device (arm64)" as destination
   - Product → Archive
   - Wait for archive to complete

2. In Organizer window:
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Select "Upload"
   - Follow prompts (keep default options)

3. Wait for processing (5-15 minutes)

## Step 6: Configure TestFlight

1. In App Store Connect:
   - Go to your app
   - Click "TestFlight" tab
   - Wait for build to appear (may take 30 minutes)

2. Complete compliance:
   - Export Compliance: No (app uses only exempt encryption)
   - Missing Compliance: Add export compliance information

3. Add test information:
   - What to Test: "Full app functionality including authentication, portfolio viewing, and document access"
   - Test Information → Contact Email
   - Test Information → Contact Phone

## Step 7: Internal Testing

1. Create Internal Group:
   - TestFlight → Internal Testing → Create Group
   - Name: "Development Team"
   - Add testers (up to 100 Apple IDs)

2. Enable build for testing:
   - Select your build
   - Add to internal group
   - Save

## Step 8: External Testing

1. Create External Group:
   - TestFlight → External Testing → "+" 
   - Group Name: "Beta Testers"
   - Add testers (up to 10,000)

2. Submit for Beta Review:
   - Select build
   - Add to external group
   - Complete Beta App Information:
     - Beta App Description
     - Feedback Email
     - Marketing URL (optional)
     - Privacy Policy URL
   - Submit for Review

3. Wait for approval (24-48 hours)

## Step 9: Distribute TestFlight Links

Once approved:
1. Get public link from TestFlight
2. Share with testers
3. Monitor feedback in App Store Connect

## Important Security Considerations

1. **Never commit secrets to Git**
   - Use environment variables
   - Use .xcconfig files (gitignored)

2. **Certificate Pinning**
   - Implement for Supabase connections
   - Update pins when certificates rotate

3. **API Keys**
   - Use separate keys for dev/staging/prod
   - Rotate keys regularly
   - Monitor usage in Supabase dashboard

## Troubleshooting

### Common Issues:

1. **"No eligible devices"**
   - Ensure provisioning profile includes test devices
   - Refresh profiles in Xcode preferences

2. **"Missing Push Notification Entitlement"**
   - Enable Push Notifications in Capabilities
   - Regenerate provisioning profiles

3. **"Invalid Bundle ID"**
   - Verify Bundle ID matches App Store Connect
   - Check for typos in Info.plist

4. **Archive not appearing in Organizer**
   - Ensure scheme is set to Release
   - Check build settings for valid architectures

## Production Release Checklist

- [ ] All features tested on physical devices
- [ ] Crash-free for 48 hours in TestFlight
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Accessibility features verified
- [ ] App Store screenshots prepared
- [ ] App Store description finalized
- [ ] Privacy policy URL active
- [ ] Support URL active
- [ ] Marketing materials ready

## Contact Support

For deployment issues:
- Apple Developer Support: https://developer.apple.com/support/
- Supabase Support: https://supabase.com/support

## Next Steps

After successful TestFlight deployment:
1. Gather feedback from beta testers
2. Fix critical bugs
3. Prepare for App Store submission
4. Create App Store listing
5. Submit for App Review
