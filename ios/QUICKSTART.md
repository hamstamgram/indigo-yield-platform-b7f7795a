# iOS App - Quick Start Guide

## 🚀 Get Running in 10 Minutes

### Prerequisites Check
- [ ] macOS Ventura 13.0+ installed
- [ ] Xcode 15.0+ installed
- [ ] Active Apple Developer account
- [ ] Supabase account with project created

---

## Step 1: Open the Project (1 min)

```bash
cd /Users/mama/indigo-yield-platform-v01/ios
open IndigoInvestor.xcodeproj
```

---

## Step 2: Configure Supabase (2 mins)

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy your **Project URL** and **anon public** key
4. Update the configuration:

```swift
// File: IndigoInvestor/Config/SupabaseConfig.swift
struct SupabaseConfig {
    static let url = URL(string: "https://YOUR_PROJECT.supabase.co")!
    static let anonKey = "YOUR_ANON_KEY_HERE"
}
```

---

## Step 3: Set Up Signing (2 mins)

1. In Xcode, select the **IndigoInvestor** target
2. Go to **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Select your **Team** from dropdown
5. Xcode will automatically fix bundle identifier if needed

---

## Step 4: Install Dependencies (2 mins)

Dependencies are managed via Swift Package Manager and will resolve automatically:

1. Wait for package resolution (status bar in Xcode)
2. If packages don't resolve: **File** → **Packages** → **Resolve Package Versions**

Expected packages:
- Supabase Swift
- Combine
- Charts (iOS 16+)

---

## Step 5: Build & Run (3 mins)

1. Select a simulator:
   - **Product** → **Destination** → **iPhone 15 Pro**

2. Build and run:
   - Press **⌘+R** or click the Play button

3. Wait for build to complete (first build takes ~2-3 minutes)

---

## 🎉 Success!

You should now see the app launch with the **Splash Screen** followed by the **Login Screen**.

### Test Accounts

Create a test account in Supabase or use:
```
Email: demo@indigoyield.com
Password: DemoPass123!
```

---

## 🐛 Common Issues

### Issue: "No such module 'Supabase'"

**Solution:**
```bash
# In Xcode:
1. File → Packages → Reset Package Caches
2. File → Packages → Update to Latest Package Versions
3. Clean Build Folder (⌘+Shift+K)
4. Build (⌘+B)
```

### Issue: "Failed to create provisioning profile"

**Solution:**
1. Change Bundle Identifier to something unique
2. Go to **Signing & Capabilities**
3. Change **com.indigoyield.investor** to **com.yourname.investor**

### Issue: "Supabase error: Invalid API key"

**Solution:**
- Double-check your Supabase credentials
- Ensure you copied the **anon** key, not the **service_role** key
- Verify the URL has `https://` and ends with `.supabase.co`

### Issue: Build succeeds but app crashes immediately

**Solution:**
```bash
# Check console logs (⌘+Shift+Y)
# Look for error messages
# Common cause: Missing Supabase configuration
```

---

## 📱 Next Steps

### Explore the App

1. **Login** with test credentials
2. **Dashboard** - View portfolio overview
3. **Portfolio** tab - See holdings
4. **Transactions** tab - View transaction history
5. **Account** tab - Manage settings

### Start Development

- **[iOS_IMPLEMENTATION_GUIDE.md](./iOS_IMPLEMENTATION_GUIDE.md)** - Complete implementation roadmap
- **[README.md](./README.md)** - Full documentation
- **Views/** - Explore existing screens
- **ViewModels/** - Business logic layer

### Key Files to Know

```
IndigoInvestor/
├── App/
│   └── IndigoInvestorApp.swift       ← App entry point
│
├── Config/
│   └── SupabaseConfig.swift          ← Update your keys here
│
├── Views/
│   ├── Authentication/
│   │   └── LoginView.swift           ← Login screen
│   ├── Dashboard/
│   │   └── DashboardView.swift       ← Main dashboard
│   └── ...
│
└── ViewModels/
    └── DashboardViewModel.swift       ← Dashboard logic
```

---

## 🔧 Development Tips

### Enable Debug Logging
```swift
// In IndigoInvestorApp.swift init()
#if DEBUG
print("🐛 Debug mode enabled")
#endif
```

### Use Simulator Features
- **Shake to undo**: Hardware → Shake
- **Trigger biometrics**: Features → Face ID/Touch ID
- **Simulate location**: Features → Location
- **Test dark mode**: Settings app → Appearance

### Hot Reload
SwiftUI previews support live preview:
- Add `#Preview` to any view
- Canvas appears on right side
- Changes update in real-time

```swift
#Preview {
    DashboardView()
        .environmentObject(ServiceLocator.shared)
}
```

---

## 📊 Current Implementation Status

### ✅ Complete (75%)
- Authentication flow
- Dashboard with charts
- Portfolio display
- Fund management
- Withdrawal flow
- Core architecture
- Security features
- Theme system

### 🔨 In Progress (25%)
- Profile/Settings screens
- Advanced transactions
- Document management
- Push notifications
- Offline sync
- Tests
- App Store prep

---

## 🎯 Your First Task

Try modifying the dashboard:

1. Open `Views/Dashboard/DashboardView.swift`
2. Find the "Total Portfolio Value" text
3. Change it to "My Portfolio Value"
4. Save (⌘+S)
5. Build and run (⌘+R)
6. See your change in the simulator

Congratulations! You've made your first modification.

---

## 📚 Resources

### Apple Documentation
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Swift Book](https://docs.swift.org/swift-book/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Project Documentation
- [Implementation Guide](./iOS_IMPLEMENTATION_GUIDE.md) - Comprehensive guide
- [README](./README.md) - Full project docs
- [Architecture Docs](../docs/ios-app-design-analysis.md)

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Swift](https://github.com/supabase/supabase-swift)
- [Swift Forums](https://forums.swift.org)

---

## 🆘 Getting Help

### Check These First
1. Console logs (⌘+Shift+Y)
2. Build errors in Xcode
3. [README.md](./README.md) troubleshooting section
4. [iOS_IMPLEMENTATION_GUIDE.md](./iOS_IMPLEMENTATION_GUIDE.md)

### Still Stuck?
- Check GitHub issues
- Review Supabase logs
- Enable verbose logging
- Try clean build (⌘+Shift+K)

---

## ✅ Checklist

Quick reference for setup:

- [ ] Xcode installed and updated
- [ ] Project opened in Xcode
- [ ] Supabase credentials configured
- [ ] Development team selected
- [ ] Packages resolved
- [ ] App builds successfully
- [ ] App runs in simulator
- [ ] Login works
- [ ] Dashboard displays

---

**Time to Complete:** ~10 minutes
**Difficulty:** Beginner-friendly
**Next:** [iOS_IMPLEMENTATION_GUIDE.md](./iOS_IMPLEMENTATION_GUIDE.md)

Happy coding! 🎉
