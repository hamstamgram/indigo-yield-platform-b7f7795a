# 📱 IndigoInvestor iOS App

> Native Swift iOS application for Indigo Yield Platform

[← Back to Main Repository](../README.md)

## 🎯 What's Been Completed

### ✅ Core Architecture
- **SwiftUI MVVM architecture** with ServiceLocator pattern
- **Supabase integration** with auth, realtime, storage
- **Security layer** with biometric auth, Keychain, 2FA support
- **Offline support** framework with Core Data
- **Role-based navigation** (LP vs Admin)

### ✅ Key Components Implemented
1. **Authentication System**
   - Email/password login
   - Face ID/Touch ID support
   - Two-factor authentication
   - Session management

2. **Dashboard & Portfolio**
   - Portfolio value display
   - Performance charts
   - Asset allocation
   - Recent transactions
   - Quick actions

3. **Security Features**
   - BiometricAuthManager
   - KeychainManager
   - Certificate pinning framework
   - Secure token storage

4. **Data Models**
   - Complete Codable models
   - Portfolio, Transactions, Statements
   - User roles and permissions
   - RLS-ready structure

## 🚀 Next Steps in Xcode

### 1. Configure Signing & Capabilities
- Select your Apple Developer Team
- Enable required capabilities (already configured in project.yml)
- Configure App Groups for widget data sharing

### 2. Add Supabase Credentials
⚠️ **IMPORTANT**: Follow these steps to configure credentials securely:

1. Copy the template file:
```bash
cd ios/Config
cp Secrets.xcconfig.template Secrets.xcconfig
```

2. Edit `Config/Secrets.xcconfig` with your actual credentials:
   - Get SUPABASE_URL and SUPABASE_ANON_KEY from: [Supabase Dashboard > Settings > API](https://supabase.com/dashboard/project/_/settings/api)
   - Get SENTRY_DSN from: [Sentry Settings](https://sentry.io/settings/projects/)
   - Other keys are optional for initial development

3. **NEVER commit `Secrets.xcconfig` to git** - it's already in `.gitignore`

4. For production deployment, rotate your Supabase anon key if the old one was exposed

### 3. Build & Run
- Select iPhone simulator or device
- Press ⌘+R to build and run
- Test login with your Supabase credentials

## 📂 Project Structure

```
IndigoInvestor/
├── App/                    # App entry & configuration
├── Core/                   # Core services
│   ├── Security/          # Biometric, Keychain, Pinning
│   ├── Network/           # API & Realtime
│   └── Data/              # Core Data & Repositories
├── Models/                # Data models
├── ViewModels/            # Business logic
├── Views/                 # SwiftUI views
│   ├── Authentication/    # Login, 2FA
│   ├── Dashboard/         # Main dashboard
│   ├── Portfolio/         # Portfolio views
│   └── Admin/             # Admin features
└── Config/                # Configuration files
```

## 🔒 Security Features

- **Biometric Authentication**: Face ID, Touch ID, Optic ID support
- **Keychain Storage**: Secure credential management
- **Certificate Pinning**: Man-in-the-middle protection
- **2FA Support**: TOTP-based two-factor authentication
- **RLS Integration**: Row-level security from Supabase

## 📊 Features Ready for Implementation

### Limited Partner (LP) Features
- ✅ Dashboard with portfolio overview
- ✅ Transaction history
- 🔄 Statement downloads
- 🔄 Withdrawal requests
- 🔄 Profile management

### Admin Features
- 🔄 Investor management
- 🔄 Approval workflows
- 🔄 Report generation
- 🔄 System settings

### iOS Enhancements (Phase 2)
- 📅 Widgets
- 📅 Apple Watch app
- 📅 Siri Shortcuts
- 📅 App Clips

## 🧪 Testing

### Unit Tests
- Test targets configured
- Ready for TDD approach

### UI Tests
- UI test target ready
- Snapshot testing support

## 📱 Device Support

- **iOS**: 14.0+ (iPhone & iPad)
- **watchOS**: 9.0+ (ready for Watch app)
- **Orientation**: Portrait & Landscape
- **Dark Mode**: System appearance

## 🔗 Integration Points

### Supabase Services
- Authentication (email/password, 2FA)
- Database (with RLS policies)
- Storage (signed URLs for documents)
- Realtime (portfolio updates)
- Edge Functions (ready to integrate)

### External Services (Optional)
- PostHog (analytics)
- Sentry (error tracking)
- Push notifications (APNS)

## 📝 Development Workflow

1. **Make changes** in Xcode
2. **Test** on simulator/device
3. **Commit** changes to git
4. **TestFlight** for beta testing
5. **App Store** release

## 🆘 Troubleshooting

### Build Errors
- Ensure Secrets.xcconfig exists
- Check package dependencies resolved
- Clean build folder (⌘+Shift+K)

### Runtime Issues
- Check Supabase credentials
- Verify network connectivity
- Check console logs (⌘+Shift+Y)

## 📚 Resources

- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [Project Documentation](../docs/ios-app-design-analysis.md)
- [Web Platform](https://indigo-yield-platform.surge.sh)
- [Apple Developer](https://developer.apple.com)

---

**Status**: ✅ Ready for Development
**Last Updated**: 2025-09-05
**Xcode Version**: 16.4

The iOS app is now ready for continued development in Xcode!
