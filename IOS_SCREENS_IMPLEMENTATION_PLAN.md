# iOS Screens Implementation Plan
## Indigo Yield Platform - Native iOS App

**Version:** 1.0
**Target Platform:** iOS 17+
**Development Timeline:** 16 Weeks
**Architecture:** MVVM with Clean Architecture Principles

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Screen Inventory by Section](#screen-inventory-by-section)
5. [Architecture & Design Patterns](#architecture--design-patterns)
6. [Implementation Phases](#implementation-phases)
7. [Screen-by-Screen Specifications](#screen-by-screen-specifications)
8. [Code Examples](#code-examples)
9. [Testing Strategy](#testing-strategy)
10. [App Store Submission](#app-store-submission)

---

## Executive Summary

This document outlines the complete implementation plan for the Indigo Yield Platform iOS native application, comprising **85 screens** organized into **10 major sections**. The app will provide institutional-grade portfolio management, real-time analytics, and secure transaction capabilities with native iOS integrations.

### Key Features
- Face ID/Touch ID biometric authentication
- Apple Pay integration for deposits
- Real-time portfolio tracking with push notifications
- Home Screen widgets for portfolio summary
- Document scanning for KYC verification
- Dark mode support throughout
- iPad optimization with adaptive layouts
- Apple Watch companion app (basic functionality)

---

## Technology Stack

### Core Framework
- **Swift 6** with strict concurrency
- **SwiftUI** (primary UI framework)
- **UIKit** (for complex components)
- **Combine** (reactive programming)
- **iOS 17+** minimum deployment target

### Backend & Data
- **Supabase Swift Client** (v2.5+) for backend
- **Core Data** for local persistence
- **Keychain Services** (via KeychainAccess) for secure storage
- **URLSession** with async/await for networking

### Native Integrations
- **LocalAuthentication** (Face ID/Touch ID)
- **PassKit** (Apple Pay)
- **UserNotifications** (Push notifications via APNs)
- **WidgetKit** (Home Screen widgets)
- **VisionKit** (Document scanning)
- **WatchConnectivity** (Apple Watch sync)

### Architecture
- **MVVM** (Model-View-ViewModel)
- **Coordinator Pattern** (Navigation)
- **Repository Pattern** (Data abstraction)
- **Dependency Injection** (Protocol-based)

### Development Tools
- **Xcode 16**
- **Swift Package Manager** (SPM)
- **XCTest** (Unit & UI testing)
- **TestFlight** (Beta distribution)
- **Fastlane** (CI/CD automation)

---

## Project Structure

```
IndigoYieldPlatform/
├── App/
│   ├── IndigoYieldPlatformApp.swift
│   ├── AppDelegate.swift
│   └── SceneDelegate.swift
├── Core/
│   ├── Services/
│   │   ├── Authentication/
│   │   │   ├── AuthenticationService.swift
│   │   │   ├── BiometricAuthService.swift
│   │   │   └── TOTPService.swift
│   │   ├── Network/
│   │   │   ├── SupabaseClient.swift
│   │   │   ├── NetworkService.swift
│   │   │   └── APIEndpoints.swift
│   │   ├── Storage/
│   │   │   ├── CoreDataManager.swift
│   │   │   ├── KeychainManager.swift
│   │   │   └── UserDefaultsManager.swift
│   │   └── Notifications/
│   │       ├── NotificationService.swift
│   │       └── PushNotificationManager.swift
│   ├── Coordinators/
│   │   ├── AppCoordinator.swift
│   │   ├── AuthCoordinator.swift
│   │   ├── MainCoordinator.swift
│   │   └── AdminCoordinator.swift
│   └── Extensions/
│       ├── View+Extensions.swift
│       ├── Color+Extensions.swift
│       └── Date+Extensions.swift
├── Models/
│   ├── Domain/
│   │   ├── User.swift
│   │   ├── Portfolio.swift
│   │   ├── Transaction.swift
│   │   ├── Asset.swift
│   │   ├── Fund.swift
│   │   └── Document.swift
│   ├── DTO/
│   │   ├── LoginRequest.swift
│   │   ├── TransactionResponse.swift
│   │   └── PortfolioResponse.swift
│   └── CoreData/
│       └── IndigoYieldPlatform.xcdatamodeld
├── Features/
│   ├── Authentication/
│   │   ├── Views/
│   │   │   ├── LoginView.swift
│   │   │   ├── BiometricAuthView.swift
│   │   │   ├── TOTPVerificationView.swift
│   │   │   └── ForgotPasswordView.swift
│   │   ├── ViewModels/
│   │   │   └── AuthenticationViewModel.swift
│   │   └── Models/
│   │       └── AuthState.swift
│   ├── Onboarding/
│   │   ├── Views/
│   │   │   ├── OnboardingContainerView.swift
│   │   │   ├── WelcomeView.swift
│   │   │   ├── KYCDocumentScanView.swift
│   │   │   └── OnboardingCompletionView.swift
│   │   └── ViewModels/
│   │       └── OnboardingViewModel.swift
│   ├── Dashboard/
│   │   ├── Views/
│   │   │   ├── DashboardView.swift
│   │   │   ├── PortfolioSummaryCard.swift
│   │   │   └── AssetListView.swift
│   │   └── ViewModels/
│   │       └── DashboardViewModel.swift
│   ├── Portfolio/
│   │   ├── Views/
│   │   ├── ViewModels/
│   │   └── Components/
│   ├── Transactions/
│   │   ├── Views/
│   │   ├── ViewModels/
│   │   └── Components/
│   ├── Documents/
│   ├── Profile/
│   ├── Reports/
│   ├── Notifications/
│   ├── Support/
│   └── Admin/
├── Components/
│   ├── Common/
│   │   ├── LoadingView.swift
│   │   ├── ErrorView.swift
│   │   ├── EmptyStateView.swift
│   │   └── PullToRefreshView.swift
│   ├── Charts/
│   │   ├── LineChartView.swift
│   │   ├── PieChartView.swift
│   │   └── BarChartView.swift
│   └── Forms/
│       ├── SecureTextField.swift
│       ├── CurrencyTextField.swift
│       └── FormValidator.swift
├── Resources/
│   ├── Assets.xcassets
│   ├── Localizable.xcstrings
│   └── Fonts/
├── Utilities/
│   ├── Constants.swift
│   ├── Logger.swift
│   └── Validators.swift
└── Tests/
    ├── UnitTests/
    └── UITests/
```

---

## Screen Inventory by Section

### Total Screens: 85

#### 1. Authentication & Onboarding (9 screens)
1. Splash Screen
2. Login Screen
3. Biometric Auth Screen
4. TOTP Verification Screen
5. Forgot Password Screen
6. Reset Password Screen
7. Onboarding Welcome
8. KYC Document Upload
9. Onboarding Completion

#### 2. Home & Dashboard (8 screens)
10. Dashboard Home
11. Portfolio Summary
12. Asset Detail View
13. Market Overview
14. Quick Actions Panel
15. Recent Activity Feed
16. Performance Chart Detail
17. Asset Allocation View

#### 3. Portfolio Management (12 screens)
18. Portfolio Overview
19. Portfolio Analytics
20. Position Details
21. Holdings List
22. Asset Performance
23. Historical Performance
24. Portfolio Comparison
25. Allocation Breakdown
26. Yield Calculator
27. Rebalancing View
28. Fund Selector
29. Multi-Fund View

#### 4. Transactions (11 screens)
30. Transaction History
31. Transaction Detail
32. Deposit Flow (3 screens)
    - 33. Deposit Method Selection
    - 34. Apple Pay Integration
    - 35. Deposit Confirmation
33. Withdrawal Request (3 screens)
    - 36. Withdrawal Amount
    - 37. Withdrawal Confirmation
    - 38. Withdrawal Status
34. Transaction Filters
35. Transaction Search
36. Transaction Export

#### 5. Documents & Statements (8 screens)
37. Document Vault
38. Statement List
39. Statement Detail/Viewer
40. Tax Documents
41. Account Statements
42. Trade Confirmations
43. Document Upload
44. Document Categories

#### 6. Profile & Settings (14 screens)
45. Profile Overview
46. Personal Information
47. Security Settings
48. Biometric Settings
49. TOTP Management
50. Password Change
51. Session Management
52. Device Management
53. Notification Preferences
54. Language & Region
55. Appearance Settings
56. Privacy Settings
57. Terms & Conditions
58. About App

#### 7. Reports & Analytics (8 screens)
59. Reports Dashboard
60. Performance Report
61. Tax Report
62. Account Activity Report
63. Custom Report Builder
64. Report History
65. Report Export
66. Report Sharing

#### 8. Notifications (5 screens)
67. Notifications Center
68. Notification Detail
69. Notification Settings
70. Alert Configuration
71. Notification History

#### 9. Support & Help (6 screens)
72. Support Hub
73. FAQ
74. Contact Support
75. Ticket Creation
76. Ticket List
77. Ticket Detail/Chat

#### 10. Admin Panel (9 screens)
78. Admin Dashboard
79. Investor Management
80. Investor Detail View
81. Transaction Queue
82. Withdrawal Approvals
83. Document Review
84. System Settings
85. Audit Logs

---

## Architecture & Design Patterns

### MVVM Architecture

```swift
// View Layer (SwiftUI)
struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel

    var body: some View {
        // UI Implementation
    }
}

// ViewModel Layer
@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var portfolioData: PortfolioData?
    @Published var isLoading = false
    @Published var error: Error?

    private let portfolioRepository: PortfolioRepositoryProtocol

    init(portfolioRepository: PortfolioRepositoryProtocol) {
        self.portfolioRepository = portfolioRepository
    }

    func fetchPortfolio() async {
        // Business logic
    }
}

// Repository Layer
protocol PortfolioRepositoryProtocol {
    func fetchPortfolio() async throws -> PortfolioData
}

final class PortfolioRepository: PortfolioRepositoryProtocol {
    private let networkService: NetworkService
    private let cacheService: CacheService

    func fetchPortfolio() async throws -> PortfolioData {
        // Data fetching logic
    }
}
```

### Navigation Pattern - Coordinator

```swift
protocol Coordinator: AnyObject {
    var navigationController: UINavigationController { get set }
    var childCoordinators: [Coordinator] { get set }

    func start()
}

final class MainCoordinator: Coordinator {
    var navigationController: UINavigationController
    var childCoordinators: [Coordinator] = []

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        showDashboard()
    }

    func showDashboard() {
        let viewModel = DashboardViewModel(
            portfolioRepository: PortfolioRepository()
        )
        let view = DashboardView(viewModel: viewModel)
        let hostingController = UIHostingController(rootView: view)
        navigationController.pushViewController(hostingController, animated: true)
    }
}
```

### Dependency Injection

```swift
// Service Container
final class ServiceContainer {
    static let shared = ServiceContainer()

    private init() {}

    // MARK: - Services
    lazy var authService: AuthenticationServiceProtocol = {
        AuthenticationService(
            supabaseClient: supabaseClient,
            keychainManager: keychainManager
        )
    }()

    lazy var networkService: NetworkServiceProtocol = {
        NetworkService(supabaseClient: supabaseClient)
    }()

    lazy var keychainManager: KeychainManagerProtocol = {
        KeychainManager()
    }()

    lazy var supabaseClient: SupabaseClientProtocol = {
        SupabaseClient()
    }()

    // MARK: - Repositories
    lazy var portfolioRepository: PortfolioRepositoryProtocol = {
        PortfolioRepository(
            networkService: networkService,
            cacheService: cacheService
        )
    }()

    lazy var transactionRepository: TransactionRepositoryProtocol = {
        TransactionRepository(networkService: networkService)
    }()

    lazy var cacheService: CacheServiceProtocol = {
        CoreDataCacheService()
    }()
}
```

---

## Implementation Phases

### Phase 1: MVP Core (Weeks 1-4)
**Goal:** Basic authentication and portfolio viewing

#### Week 1: Project Setup & Authentication
- **Days 1-2:** Project initialization, SPM dependencies, folder structure
- **Days 3-4:** Supabase client integration, network layer
- **Days 5-7:** Login, biometric auth, TOTP verification

**Screens:**
- Splash Screen
- Login Screen
- Biometric Auth Screen
- TOTP Verification Screen

**Deliverables:**
- Working authentication flow
- Keychain integration
- Biometric authentication
- Error handling

#### Week 2: Dashboard & Portfolio Viewing
- **Days 1-3:** Dashboard UI, portfolio summary cards
- **Days 4-5:** Asset list, asset detail view
- **Days 6-7:** Real-time data fetching, caching layer

**Screens:**
- Dashboard Home
- Portfolio Summary
- Asset Detail View
- Holdings List

**Deliverables:**
- Dashboard with live data
- Portfolio visualization
- Pull-to-refresh
- Loading states

#### Week 3: Transaction History
- **Days 1-2:** Transaction list view
- **Days 3-4:** Transaction detail, filtering
- **Days 5-7:** Transaction search, export

**Screens:**
- Transaction History
- Transaction Detail
- Transaction Filters

**Deliverables:**
- Transaction viewing
- Date filtering
- Type filtering
- CSV export

#### Week 4: Profile & Settings
- **Days 1-2:** Profile view, personal info
- **Days 3-4:** Security settings, password change
- **Days 5-7:** Session management, device management

**Screens:**
- Profile Overview
- Personal Information
- Security Settings
- Session Management

**Deliverables:**
- Profile editing
- Password change
- Session viewing
- Device management

### Phase 2: Extended Features (Weeks 5-8)

#### Week 5: Transactions & Deposits
- **Days 1-3:** Deposit flow UI
- **Days 4-5:** Apple Pay integration
- **Days 6-7:** Deposit confirmation, status tracking

**Screens:**
- Deposit Method Selection
- Apple Pay Integration
- Deposit Confirmation

**Deliverables:**
- Full deposit flow
- Apple Pay working
- Transaction confirmation

#### Week 6: Withdrawal Flow
- **Days 1-3:** Withdrawal request UI
- **Days 4-5:** Amount validation, confirmation
- **Days 6-7:** Status tracking, notifications

**Screens:**
- Withdrawal Amount
- Withdrawal Confirmation
- Withdrawal Status

**Deliverables:**
- Withdrawal request
- Amount validation
- Status updates

#### Week 7: Documents & Statements
- **Days 1-2:** Document vault, list view
- **Days 3-4:** PDF viewer, document detail
- **Days 5-7:** Document upload, categorization

**Screens:**
- Document Vault
- Statement List
- Statement Detail/Viewer
- Document Upload

**Deliverables:**
- Document viewing
- PDF rendering
- Document upload
- File management

#### Week 8: Notifications & Support
- **Days 1-2:** Notifications center
- **Days 3-4:** Push notifications setup
- **Days 5-7:** Support ticket system

**Screens:**
- Notifications Center
- Notification Detail
- Support Hub
- Ticket Creation

**Deliverables:**
- Push notifications
- Notification center
- Support tickets
- In-app messaging

### Phase 3: Native Features (Weeks 9-12)

#### Week 9: Onboarding & KYC
- **Days 1-2:** Onboarding flow
- **Days 3-4:** Document scanning (VisionKit)
- **Days 5-7:** KYC completion

**Screens:**
- Onboarding Welcome
- KYC Document Upload
- Onboarding Completion

**Deliverables:**
- Onboarding wizard
- Document scanner
- KYC workflow

#### Week 10: Advanced Portfolio Features
- **Days 1-2:** Portfolio analytics
- **Days 3-4:** Performance charts
- **Days 5-7:** Allocation breakdown

**Screens:**
- Portfolio Analytics
- Performance Chart Detail
- Asset Allocation View
- Yield Calculator

**Deliverables:**
- Advanced analytics
- Interactive charts
- Performance metrics

#### Week 11: Widgets & Watch App
- **Days 1-3:** Home Screen widget
- **Days 4-5:** Lock Screen widget
- **Days 6-7:** Apple Watch app basics

**Deliverables:**
- Portfolio widget
- Watch app
- Widget configuration

#### Week 12: Reports & Analytics
- **Days 1-3:** Reports dashboard
- **Days 4-5:** Custom report builder
- **Days 6-7:** Report export

**Screens:**
- Reports Dashboard
- Performance Report
- Tax Report
- Report Export

**Deliverables:**
- Report generation
- PDF export
- Email sharing

### Phase 4: Polish & App Store (Weeks 13-16)

#### Week 13: Admin Features
- **Days 1-3:** Admin dashboard
- **Days 4-5:** Investor management
- **Days 6-7:** Approval workflows

**Screens:**
- Admin Dashboard
- Investor Management
- Investor Detail View
- Transaction Queue
- Withdrawal Approvals

**Deliverables:**
- Admin panel
- Approval system
- Audit logs

#### Week 14: iPad Optimization
- **Days 1-3:** iPad layouts
- **Days 4-5:** Split view support
- **Days 6-7:** Multi-window support

**Deliverables:**
- iPad UI
- Adaptive layouts
- Multi-tasking

#### Week 15: Testing & Bug Fixes
- **Days 1-2:** Unit test coverage
- **Days 3-4:** UI test automation
- **Days 5-7:** Bug fixing, performance optimization

**Deliverables:**
- 80% test coverage
- Performance optimizations
- Bug fixes

#### Week 16: App Store Preparation
- **Days 1-2:** App Store assets
- **Days 3-4:** TestFlight beta
- **Days 5-7:** Final polish, submission

**Deliverables:**
- App Store listing
- TestFlight build
- App Store submission

---

## Screen-by-Screen Specifications

### Section 1: Authentication & Onboarding

#### Screen 1: Splash Screen
**File:** `SplashView.swift`
**Purpose:** App initialization and branding
**Navigation:** Auto-navigates to Login or Dashboard based on auth state

```swift
struct SplashView: View {
    @StateObject private var viewModel: SplashViewModel

    var body: some View {
        ZStack {
            Color.indigo.ignoresSafeArea()

            VStack(spacing: 20) {
                Image("app-logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 150, height: 150)

                ProgressView()
                    .tint(.white)
            }
        }
        .task {
            await viewModel.initialize()
        }
    }
}
```

**ViewModel Requirements:**
- Check authentication state
- Load cached data
- Initialize services
- Navigate to appropriate screen

**API Endpoints:** None
**Local Storage:** Read keychain for tokens
**Permissions:** None
**iPad Support:** Centered layout

---

#### Screen 2: Login Screen
**File:** `LoginView.swift`
**Purpose:** User authentication
**Navigation:** Navigate to TOTP or Dashboard

**Features:**
- Email/password input
- "Remember me" toggle
- Forgot password link
- Biometric quick login option
- Error handling

```swift
struct LoginView: View {
    @StateObject private var viewModel: AuthenticationViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var rememberMe = false
    @State private var showPassword = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo
                    Image("indigo-logo")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 60)
                        .padding(.top, 40)

                    // Title
                    VStack(spacing: 8) {
                        Text("Investor Access")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        Text("Welcome back")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    // Form
                    VStack(spacing: 16) {
                        // Email Field
                        HStack {
                            Image(systemName: "envelope")
                                .foregroundColor(.secondary)
                            TextField("Email", text: $email)
                                .textContentType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                        // Password Field
                        HStack {
                            Image(systemName: "lock")
                                .foregroundColor(.secondary)
                            if showPassword {
                                TextField("Password", text: $password)
                            } else {
                                SecureField("Password", text: $password)
                            }
                            Button(action: { showPassword.toggle() }) {
                                Image(systemName: showPassword ? "eye.slash" : "eye")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(10)

                        // Remember Me
                        Toggle("Remember me", isOn: $rememberMe)
                            .tint(.indigo)
                    }
                    .padding(.horizontal)

                    // Biometric Login
                    if viewModel.biometricAuthAvailable {
                        Button(action: { viewModel.authenticateWithBiometric() }) {
                            HStack {
                                Image(systemName: viewModel.biometricType == .faceID ? "faceid" : "touchid")
                                Text("Sign in with \(viewModel.biometricType == .faceID ? "Face ID" : "Touch ID")")
                            }
                            .font(.headline)
                            .foregroundColor(.indigo)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.indigo.opacity(0.1))
                            .cornerRadius(10)
                        }
                        .padding(.horizontal)
                    }

                    // Sign In Button
                    Button(action: { viewModel.signIn(email: email, password: password, rememberMe: rememberMe) }) {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Sign In")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.indigo)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .disabled(viewModel.isLoading || email.isEmpty || password.isEmpty)
                    .padding(.horizontal)

                    // Forgot Password
                    Button("Forgot password?") {
                        viewModel.showForgotPassword()
                    }
                    .font(.subheadline)
                    .foregroundColor(.indigo)

                    Spacer()
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
        }
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class AuthenticationViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String?
    @Published var biometricAuthAvailable = false
    @Published var biometricType: LABiometryType = .none

    private let authService: AuthenticationServiceProtocol
    private let biometricService: BiometricAuthServiceProtocol

    init(
        authService: AuthenticationServiceProtocol,
        biometricService: BiometricAuthServiceProtocol
    ) {
        self.authService = authService
        self.biometricService = biometricService
        checkBiometricAvailability()
    }

    func signIn(email: String, password: String, rememberMe: Bool) {
        Task {
            isLoading = true
            defer { isLoading = false }

            do {
                let session = try await authService.signIn(
                    email: email,
                    password: password
                )

                if rememberMe {
                    try await biometricService.saveCredentials(
                        email: email,
                        password: password
                    )
                }

                // Navigate to TOTP or Dashboard
                if session.requiresTOTP {
                    // Navigate to TOTP
                } else {
                    // Navigate to Dashboard
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    func authenticateWithBiometric() {
        Task {
            do {
                let credentials = try await biometricService.retrieveCredentials()
                await signIn(
                    email: credentials.email,
                    password: credentials.password,
                    rememberMe: true
                )
            } catch {
                errorMessage = "Biometric authentication failed"
                showError = true
            }
        }
    }

    private func checkBiometricAvailability() {
        biometricAuthAvailable = biometricService.isAvailable()
        biometricType = biometricService.biometricType()
    }
}
```

**API Endpoints:**
- `POST /auth/v1/token` - Sign in with password
- `POST /auth/v1/user` - Get user profile

**Local Storage:**
- Keychain: Store credentials if "Remember me" enabled
- UserDefaults: Store email for quick access

**Permissions:**
- Biometric authentication (LocalAuthentication)

**Accessibility:**
- VoiceOver labels for all inputs
- Dynamic Type support
- Keyboard navigation

**iPad Support:**
- Centered form with max width 500pt
- Side-by-side layout for landscape

---

#### Screen 3: Biometric Auth Screen
**File:** `BiometricAuthView.swift`
**Purpose:** Quick login with Face ID/Touch ID
**Navigation:** Navigate to Dashboard

**Features:**
- Biometric prompt
- Fallback to password
- Error handling

```swift
struct BiometricAuthView: View {
    @StateObject private var viewModel: BiometricAuthViewModel

    var body: some View {
        VStack(spacing: 30) {
            Image(systemName: viewModel.biometricIcon)
                .font(.system(size: 80))
                .foregroundColor(.indigo)

            Text("Authenticate")
                .font(.title)
                .fontWeight(.bold)

            Text("Use \(viewModel.biometricName) to access your account")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button(action: { viewModel.authenticate() }) {
                Text("Authenticate")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .padding(.horizontal)

            Button("Use Password Instead") {
                viewModel.useFallback()
            }
            .font(.subheadline)
            .foregroundColor(.indigo)
        }
        .padding()
        .onAppear {
            viewModel.authenticate()
        }
    }
}
```

**ViewModel Requirements:**
- Handle biometric authentication
- Fallback to password
- Error handling

**API Endpoints:** None (local authentication)
**Local Storage:** Read keychain for credentials
**Permissions:** LocalAuthentication framework

---

#### Screen 4: TOTP Verification Screen
**File:** `TOTPVerificationView.swift`
**Purpose:** Two-factor authentication
**Navigation:** Navigate to Dashboard after verification

**Features:**
- 6-digit code input
- Auto-submit when complete
- Resend code option
- Countdown timer

```swift
struct TOTPVerificationView: View {
    @StateObject private var viewModel: TOTPViewModel
    @FocusState private var isCodeFocused: Bool
    @State private var code = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 30) {
                Image(systemName: "shield.checkmark")
                    .font(.system(size: 60))
                    .foregroundColor(.indigo)

                VStack(spacing: 8) {
                    Text("Two-Factor Authentication")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Enter the 6-digit code from your authenticator app")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                // TOTP Code Input
                HStack(spacing: 12) {
                    ForEach(0..<6, id: \.self) { index in
                        CodeDigitView(
                            digit: code.count > index ? String(code[code.index(code.startIndex, offsetBy: index)]) : "",
                            isFocused: isCodeFocused && code.count == index
                        )
                    }
                }
                .padding(.horizontal)

                // Hidden TextField for keyboard input
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .focused($isCodeFocused)
                    .opacity(0)
                    .frame(height: 0)
                    .onChange(of: code) { newValue in
                        if newValue.count > 6 {
                            code = String(newValue.prefix(6))
                        }
                        if code.count == 6 {
                            viewModel.verifyCode(code)
                        }
                    }

                if viewModel.isLoading {
                    ProgressView()
                }

                if let timeRemaining = viewModel.timeRemaining, timeRemaining > 0 {
                    Text("Resend code in \(timeRemaining)s")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    Button("Resend Code") {
                        viewModel.resendCode()
                        code = ""
                    }
                    .font(.subheadline)
                    .foregroundColor(.indigo)
                }

                Spacer()
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.cancel()
                    }
                }
            }
            .onAppear {
                isCodeFocused = true
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {
                    code = ""
                    isCodeFocused = true
                }
            } message: {
                Text(viewModel.errorMessage ?? "Invalid code")
            }
        }
    }
}

struct CodeDigitView: View {
    let digit: String
    let isFocused: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .stroke(isFocused ? Color.indigo : Color.gray.opacity(0.3), lineWidth: 2)
                .frame(width: 50, height: 60)

            Text(digit)
                .font(.title)
                .fontWeight(.bold)
        }
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class TOTPViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String?
    @Published var timeRemaining: Int?

    private let totpService: TOTPServiceProtocol
    private var timer: Timer?

    func verifyCode(_ code: String) {
        Task {
            isLoading = true
            defer { isLoading = false }

            do {
                try await totpService.verify(code: code)
                // Navigate to Dashboard
            } catch {
                errorMessage = "Invalid verification code"
                showError = true
            }
        }
    }

    func resendCode() {
        Task {
            do {
                try await totpService.resend()
                startTimer()
            } catch {
                errorMessage = "Failed to resend code"
                showError = true
            }
        }
    }

    private func startTimer() {
        timeRemaining = 60
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            if let remaining = self.timeRemaining, remaining > 0 {
                self.timeRemaining = remaining - 1
            } else {
                self.timer?.invalidate()
            }
        }
    }
}
```

**API Endpoints:**
- `POST /auth/v1/verify` - Verify TOTP code
- `POST /auth/v1/totp/resend` - Resend TOTP code

**Local Storage:** None
**Permissions:** None

---

### Section 2: Home & Dashboard

#### Screen 10: Dashboard Home
**File:** `DashboardView.swift`
**Purpose:** Main portfolio overview
**Navigation:** Tab bar root

**Features:**
- Portfolio summary cards
- Asset allocation chart
- Recent transactions
- Quick actions
- Pull-to-refresh
- Real-time updates

```swift
struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Welcome Header
                    WelcomeHeaderView(userName: viewModel.userName)

                    // Portfolio Summary Cards
                    PortfolioSummaryCardsView(data: viewModel.portfolioSummary)

                    // Asset Allocation Chart
                    if let allocation = viewModel.assetAllocation {
                        AssetAllocationChartView(data: allocation)
                    }

                    // Quick Actions
                    QuickActionsView(
                        onDeposit: { viewModel.showDeposit() },
                        onWithdraw: { viewModel.showWithdraw() }
                    )

                    // Recent Transactions
                    RecentTransactionsView(transactions: viewModel.recentTransactions)
                        .onTapGesture {
                            viewModel.showAllTransactions()
                        }

                    // Performance Chart
                    if let performance = viewModel.performanceData {
                        PerformanceChartView(data: performance)
                    }
                }
                .padding()
            }
            .refreshable {
                await viewModel.refresh()
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.showNotifications() }) {
                        Image(systemName: "bell")
                        if viewModel.unreadNotificationsCount > 0 {
                            Badge(count: viewModel.unreadNotificationsCount)
                        }
                    }
                }
            }
            .task {
                await viewModel.loadInitialData()
            }
            .overlay {
                if viewModel.isLoading && viewModel.portfolioSummary == nil {
                    LoadingView()
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("Retry") {
                    Task { await viewModel.loadInitialData() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "Failed to load data")
            }
        }
    }
}

struct WelcomeHeaderView: View {
    let userName: String?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Welcome back\(userName.map { ", \($0)" } ?? "")!")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Here's your portfolio overview")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
    }
}

struct PortfolioSummaryCardsView: View {
    let data: PortfolioSummary?

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            SummaryCard(
                title: "Total Value",
                value: data?.totalValue.formatted(.currency(code: "USD")) ?? "-",
                icon: "dollarsign.circle.fill",
                color: .indigo
            )

            SummaryCard(
                title: "Total Gain",
                value: data?.totalGain.formatted(.percent.precision(.fractionLength(2))) ?? "-",
                icon: data?.totalGain ?? 0 >= 0 ? "arrow.up.circle.fill" : "arrow.down.circle.fill",
                color: data?.totalGain ?? 0 >= 0 ? .green : .red
            )

            SummaryCard(
                title: "Active Assets",
                value: "\(data?.activeAssets ?? 0)",
                icon: "chart.pie.fill",
                color: .blue
            )

            SummaryCard(
                title: "24h Change",
                value: data?.dailyChange.formatted(.percent.precision(.fractionLength(2))) ?? "-",
                icon: data?.dailyChange ?? 0 >= 0 ? "arrow.up.right" : "arrow.down.right",
                color: data?.dailyChange ?? 0 >= 0 ? .green : .red
            )
        }
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.title3)
                    .fontWeight(.semibold)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var portfolioSummary: PortfolioSummary?
    @Published var assetAllocation: AssetAllocation?
    @Published var recentTransactions: [Transaction] = []
    @Published var performanceData: PerformanceData?
    @Published var unreadNotificationsCount = 0
    @Published var userName: String?
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String?

    private let portfolioRepository: PortfolioRepositoryProtocol
    private let transactionRepository: TransactionRepositoryProtocol
    private let notificationService: NotificationServiceProtocol
    private var refreshTimer: Timer?

    init(
        portfolioRepository: PortfolioRepositoryProtocol,
        transactionRepository: TransactionRepositoryProtocol,
        notificationService: NotificationServiceProtocol
    ) {
        self.portfolioRepository = portfolioRepository
        self.transactionRepository = transactionRepository
        self.notificationService = notificationService
    }

    func loadInitialData() async {
        isLoading = true
        defer { isLoading = false }

        async let summaryTask = portfolioRepository.fetchPortfolioSummary()
        async let allocationTask = portfolioRepository.fetchAssetAllocation()
        async let transactionsTask = transactionRepository.fetchRecentTransactions(limit: 5)
        async let performanceTask = portfolioRepository.fetchPerformanceData(period: .month)
        async let notificationsTask = notificationService.fetchUnreadCount()

        do {
            let (summary, allocation, transactions, performance, notifCount) = try await (
                summaryTask,
                allocationTask,
                transactionsTask,
                performanceTask,
                notificationsTask
            )

            self.portfolioSummary = summary
            self.assetAllocation = allocation
            self.recentTransactions = transactions
            self.performanceData = performance
            self.unreadNotificationsCount = notifCount
            self.userName = summary.userName

            startAutoRefresh()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func refresh() async {
        await loadInitialData()
    }

    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.refreshSilently()
            }
        }
    }

    private func refreshSilently() async {
        // Refresh without showing loading indicator
        do {
            let summary = try await portfolioRepository.fetchPortfolioSummary()
            self.portfolioSummary = summary
        } catch {
            // Silent failure for background refresh
        }
    }

    deinit {
        refreshTimer?.invalidate()
    }
}
```

**API Endpoints:**
- `GET /rest/v1/portfolio_summary` - Get portfolio summary
- `GET /rest/v1/asset_allocation` - Get asset allocation
- `GET /rest/v1/transactions?limit=5&order=created_at.desc` - Recent transactions
- `GET /rest/v1/performance_history` - Performance data
- `GET /rest/v1/notifications?read=false&count=true` - Unread notifications

**Local Storage:**
- Cache portfolio data in Core Data
- Cache last update timestamp
- Cache user preferences

**Permissions:** None
**Accessibility:** Full VoiceOver support for all cards
**iPad Support:** 3-column grid for summary cards

---

### Section 3: Portfolio Management

#### Screen 18: Portfolio Overview
**File:** `PortfolioOverviewView.swift`
**Purpose:** Detailed portfolio breakdown
**Navigation:** Tab bar item

**Features:**
- Holdings list with current values
- Sortable columns
- Search functionality
- Filter by asset type
- Performance indicators

```swift
struct PortfolioOverviewView: View {
    @StateObject private var viewModel: PortfolioViewModel
    @State private var searchText = ""
    @State private var sortOption: SortOption = .value
    @State private var showFilters = false

    var body: some View {
        NavigationStack {
            List {
                // Summary Section
                Section {
                    PortfolioTotalValueView(totalValue: viewModel.totalValue)
                }

                // Holdings Section
                Section("Holdings") {
                    ForEach(viewModel.filteredHoldings) { holding in
                        NavigationLink(destination: AssetDetailView(assetId: holding.id)) {
                            HoldingRowView(holding: holding)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search assets")
            .navigationTitle("Portfolio")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Picker("Sort By", selection: $sortOption) {
                            Text("Value").tag(SortOption.value)
                            Text("Gain/Loss").tag(SortOption.gainLoss)
                            Text("Name").tag(SortOption.name)
                        }

                        Button(action: { showFilters = true }) {
                            Label("Filters", systemImage: "line.3.horizontal.decrease.circle")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showFilters) {
                PortfolioFiltersView(filters: $viewModel.filters)
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadHoldings()
            }
        }
    }
}

struct HoldingRowView: View {
    let holding: Holding

    var body: some View {
        HStack {
            // Asset Icon
            AsyncImage(url: URL(string: holding.iconUrl)) { image in
                image
                    .resizable()
                    .scaledToFit()
            } placeholder: {
                Circle()
                    .fill(Color.gray.opacity(0.3))
            }
            .frame(width: 40, height: 40)

            // Asset Info
            VStack(alignment: .leading, spacing: 4) {
                Text(holding.symbol)
                    .font(.headline)
                Text(holding.name)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Values
            VStack(alignment: .trailing, spacing: 4) {
                Text(holding.value.formatted(.currency(code: "USD")))
                    .font(.headline)
                HStack(spacing: 4) {
                    Image(systemName: holding.change >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption2)
                    Text(holding.change.formatted(.percent.precision(.fractionLength(2))))
                        .font(.caption)
                }
                .foregroundColor(holding.change >= 0 ? .green : .red)
            }
        }
        .padding(.vertical, 4)
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class PortfolioViewModel: ObservableObject {
    @Published var holdings: [Holding] = []
    @Published var totalValue: Decimal = 0
    @Published var filters: PortfolioFilters = .default
    @Published var isLoading = false

    var filteredHoldings: [Holding] {
        holdings.filter { holding in
            // Apply filters
            true
        }
    }

    func loadHoldings() async {
        // Implementation
    }
}
```

**API Endpoints:**
- `GET /rest/v1/holdings` - Get all holdings
- `GET /rest/v1/asset_prices` - Get current prices

---

### Section 4: Transactions

#### Screen 30: Transaction History
**File:** `TransactionHistoryView.swift`
**Purpose:** View all transactions
**Navigation:** Tab bar or dashboard link

**Features:**
- Filterable transaction list
- Date range picker
- Transaction type filter
- Status badges
- Export to CSV
- Search functionality

```swift
struct TransactionHistoryView: View {
    @StateObject private var viewModel: TransactionHistoryViewModel
    @State private var showFilters = false
    @State private var showExportSheet = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.groupedTransactions.keys.sorted(by: >), id: \.self) { date in
                    Section(header: Text(date.formatted(date: .long, time: .omitted))) {
                        ForEach(viewModel.groupedTransactions[date] ?? []) { transaction in
                            NavigationLink(destination: TransactionDetailView(transaction: transaction)) {
                                TransactionRowView(transaction: transaction)
                            }
                        }
                    }
                }

                if viewModel.hasMore {
                    Button("Load More") {
                        Task {
                            await viewModel.loadMore()
                        }
                    }
                }
            }
            .navigationTitle("Transactions")
            .searchable(text: $viewModel.searchText)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button(action: { showFilters = true }) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }

                    Button(action: { showExportSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
            .sheet(isPresented: $showFilters) {
                TransactionFiltersView(filters: $viewModel.filters)
            }
            .sheet(isPresented: $showExportSheet) {
                TransactionExportView(transactions: viewModel.transactions)
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadTransactions()
            }
            .overlay {
                if viewModel.transactions.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        icon: "doc.text",
                        title: "No Transactions",
                        message: "Your transaction history will appear here"
                    )
                }
            }
        }
    }
}

struct TransactionRowView: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            // Transaction Type Icon
            Image(systemName: transaction.typeIcon)
                .font(.title3)
                .foregroundColor(transaction.typeColor)
                .frame(width: 40, height: 40)
                .background(transaction.typeColor.opacity(0.1))
                .clipShape(Circle())

            // Transaction Info
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.title)
                    .font(.headline)
                HStack(spacing: 8) {
                    Text(transaction.formattedDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    StatusBadge(status: transaction.status)
                }
            }

            Spacer()

            // Amount
            VStack(alignment: .trailing, spacing: 4) {
                Text(transaction.formattedAmount)
                    .font(.headline)
                    .foregroundColor(transaction.amountColor)
                if let fee = transaction.fee {
                    Text("Fee: \(fee.formatted(.currency(code: "USD")))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class TransactionHistoryViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var groupedTransactions: [Date: [Transaction]] = [:]
    @Published var filters: TransactionFilters = .default
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var hasMore = false

    private let transactionRepository: TransactionRepositoryProtocol
    private var currentPage = 0
    private let pageSize = 20

    func loadTransactions() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let result = try await transactionRepository.fetchTransactions(
                page: currentPage,
                pageSize: pageSize,
                filters: filters
            )

            transactions = result.items
            hasMore = result.hasMore
            groupTransactions()
        } catch {
            // Handle error
        }
    }

    func loadMore() async {
        guard !isLoading && hasMore else { return }
        currentPage += 1
        // Load more implementation
    }

    private func groupTransactions() {
        groupedTransactions = Dictionary(grouping: transactions) { transaction in
            Calendar.current.startOfDay(for: transaction.date)
        }
    }
}
```

**API Endpoints:**
- `GET /rest/v1/transactions?order=created_at.desc&limit=20&offset=0` - Get transactions
- `POST /rest/v1/rpc/export_transactions` - Export to CSV

---

#### Screen 33-35: Deposit Flow

**Screen 33: Deposit Method Selection**
```swift
struct DepositMethodSelectionView: View {
    @StateObject private var viewModel: DepositViewModel

    var body: some View {
        NavigationStack {
            List {
                Section("Payment Methods") {
                    Button(action: { viewModel.selectApplePay() }) {
                        HStack {
                            Image(systemName: "apple.logo")
                                .font(.title2)
                            Text("Apple Pay")
                                .font(.headline)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)

                    Button(action: { viewModel.selectBankTransfer() }) {
                        HStack {
                            Image(systemName: "building.columns")
                                .font(.title2)
                            Text("Bank Transfer")
                                .font(.headline)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)

                    Button(action: { viewModel.selectCrypto() }) {
                        HStack {
                            Image(systemName: "bitcoinsign.circle")
                                .font(.title2)
                            Text("Crypto Transfer")
                                .font(.headline)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Processing Times")
                            .font(.headline)
                        Text("Apple Pay: Instant")
                        Text("Bank Transfer: 1-3 business days")
                        Text("Crypto: 10-30 minutes")
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Funds")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
```

**Screen 34: Apple Pay Integration**
```swift
struct ApplePayDepositView: View {
    @StateObject private var viewModel: ApplePayViewModel
    @State private var amount: Decimal = 0
    @State private var selectedCurrency = "USD"

    var body: some View {
        Form {
            Section("Amount") {
                HStack {
                    TextField("0.00", value: $amount, format: .currency(code: selectedCurrency))
                        .keyboardType(.decimalPad)
                        .font(.system(size: 32, weight: .bold))

                    Picker("Currency", selection: $selectedCurrency) {
                        Text("USD").tag("USD")
                        Text("EUR").tag("EUR")
                        Text("GBP").tag("GBP")
                    }
                    .pickerStyle(.menu)
                }
            }

            Section("Payment Method") {
                HStack {
                    Image(systemName: "apple.logo")
                    Text("Apple Pay")
                    Spacer()
                    Image("visa-card")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 20)
                    Text("••••1234")
                        .font(.caption)
                }
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Subtotal")
                        Spacer()
                        Text(amount.formatted(.currency(code: selectedCurrency)))
                    }
                    HStack {
                        Text("Processing Fee")
                        Spacer()
                        Text((amount * 0.029).formatted(.currency(code: selectedCurrency)))
                    }
                    .foregroundColor(.secondary)
                    Divider()
                    HStack {
                        Text("Total")
                            .fontWeight(.bold)
                        Spacer()
                        Text((amount * 1.029).formatted(.currency(code: selectedCurrency)))
                            .fontWeight(.bold)
                    }
                }
            }

            Section {
                Button(action: { viewModel.processApplePayment(amount: amount) }) {
                    HStack {
                        Image(systemName: "apple.logo")
                        Text("Pay with Apple Pay")
                    }
                    .frame(maxWidth: .infinity)
                    .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .disabled(amount <= 0)
            }
        }
        .navigationTitle("Deposit")
        .alert("Payment Successful", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                viewModel.navigateToDashboard()
            }
        } message: {
            Text("Your deposit of \(amount.formatted(.currency(code: selectedCurrency))) is being processed")
        }
    }
}
```

**Apple Pay Implementation:**
```swift
import PassKit

final class ApplePayViewModel: NSObject, ObservableObject {
    @Published var showSuccess = false

    func processApplePayment(amount: Decimal) {
        let request = PKPaymentRequest()
        request.merchantIdentifier = "merchant.com.indigoyield"
        request.supportedNetworks = [.visa, .masterCard, .amex]
        request.merchantCapabilities = .capability3DS
        request.countryCode = "US"
        request.currencyCode = "USD"

        let paymentItem = PKPaymentSummaryItem(
            label: "Deposit",
            amount: NSDecimalNumber(decimal: amount)
        )

        request.paymentSummaryItems = [paymentItem]

        let controller = PKPaymentAuthorizationViewController(paymentRequest: request)
        controller?.delegate = self

        // Present controller
    }
}

extension ApplePayViewModel: PKPaymentAuthorizationViewControllerDelegate {
    func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        // Process payment with backend
        Task {
            do {
                try await processPayment(payment: payment)
                completion(PKPaymentAuthorizationResult(status: .success, errors: nil))
                await MainActor.run {
                    showSuccess = true
                }
            } catch {
                completion(PKPaymentAuthorizationResult(status: .failure, errors: [error]))
            }
        }
    }

    func paymentAuthorizationViewControllerDidFinish(
        _ controller: PKPaymentAuthorizationViewController
    ) {
        controller.dismiss(animated: true)
    }

    private func processPayment(payment: PKPayment) async throws {
        // Send payment token to backend
    }
}
```

**API Endpoints:**
- `POST /rest/v1/deposits` - Create deposit request
- `POST /rest/v1/rpc/process_apple_pay` - Process Apple Pay payment

---

### Section 5: Documents & Statements

#### Screen 37: Document Vault
**File:** `DocumentVaultView.swift`
**Purpose:** Manage and view all documents
**Navigation:** Tab bar or profile menu

**Features:**
- Document categories
- Search and filter
- PDF viewer
- Download documents
- Upload documents
- Document scanning

```swift
struct DocumentVaultView: View {
    @StateObject private var viewModel: DocumentVaultViewModel
    @State private var showUploadSheet = false
    @State private var showScannerSheet = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.categories) { category in
                    Section(category.name) {
                        ForEach(viewModel.documents(for: category)) { document in
                            NavigationLink(destination: DocumentDetailView(document: document)) {
                                DocumentRowView(document: document)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Documents")
            .searchable(text: $viewModel.searchText)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button(action: { showScannerSheet = true }) {
                        Image(systemName: "doc.viewfinder")
                    }

                    Button(action: { showUploadSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
            .sheet(isPresented: $showUploadSheet) {
                DocumentUploadView()
            }
            .sheet(isPresented: $showScannerSheet) {
                DocumentScannerView()
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

struct DocumentRowView: View {
    let document: Document

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: document.icon)
                .font(.title2)
                .foregroundColor(.indigo)
                .frame(width: 40, height: 40)
                .background(Color.indigo.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(document.name)
                    .font(.headline)
                HStack {
                    Text(document.date.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("•")
                        .foregroundColor(.secondary)
                    Text(document.size)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            if document.isNew {
                Circle()
                    .fill(Color.red)
                    .frame(width: 8, height: 8)
            }
        }
    }
}
```

**Document Scanner Integration:**
```swift
import VisionKit

struct DocumentScannerView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onScanComplete: (UIImage) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let parent: DocumentScannerView

        init(_ parent: DocumentScannerView) {
            self.parent = parent
        }

        func documentCameraViewController(
            _ controller: VNDocumentCameraViewController,
            didFinishWith scan: VNDocumentCameraScan
        ) {
            for pageIndex in 0..<scan.pageCount {
                let image = scan.imageOfPage(at: pageIndex)
                parent.onScanComplete(image)
            }
            parent.dismiss()
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            parent.dismiss()
        }
    }
}
```

**API Endpoints:**
- `GET /rest/v1/documents` - Get all documents
- `POST /storage/v1/object/documents` - Upload document
- `GET /storage/v1/object/documents/{id}` - Download document

---

### Section 6: Profile & Settings

#### Screen 45: Profile Overview
**File:** `ProfileView.swift`
**Purpose:** User profile and settings hub
**Navigation:** Tab bar root

```swift
struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel

    var body: some View {
        NavigationStack {
            List {
                // Profile Header
                Section {
                    HStack(spacing: 16) {
                        ProfileImageView(imageUrl: viewModel.profileImageUrl)
                            .frame(width: 80, height: 80)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.fullName)
                                .font(.title2)
                                .fontWeight(.bold)
                            Text(viewModel.email)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            StatusBadge(status: viewModel.verificationStatus)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Account Section
                Section("Account") {
                    NavigationLink(destination: PersonalInformationView()) {
                        SettingsRow(icon: "person", title: "Personal Information", color: .blue)
                    }

                    NavigationLink(destination: SecuritySettingsView()) {
                        SettingsRow(icon: "lock.shield", title: "Security", color: .red)
                    }

                    NavigationLink(destination: SessionManagementView()) {
                        SettingsRow(icon: "laptopcomputer", title: "Sessions & Devices", color: .purple)
                    }
                }

                // Preferences Section
                Section("Preferences") {
                    NavigationLink(destination: NotificationSettingsView()) {
                        SettingsRow(icon: "bell", title: "Notifications", color: .orange)
                    }

                    NavigationLink(destination: AppearanceSettingsView()) {
                        SettingsRow(icon: "paintbrush", title: "Appearance", color: .pink)
                    }

                    NavigationLink(destination: LanguageSettingsView()) {
                        SettingsRow(icon: "globe", title: "Language & Region", color: .green)
                    }
                }

                // Support Section
                Section("Support") {
                    NavigationLink(destination: SupportView()) {
                        SettingsRow(icon: "questionmark.circle", title: "Help & Support", color: .cyan)
                    }

                    NavigationLink(destination: AboutView()) {
                        SettingsRow(icon: "info.circle", title: "About", color: .gray)
                    }
                }

                // Logout
                Section {
                    Button(action: { viewModel.signOut() }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(.red)
                            Text("Sign Out")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            Text(title)
                .font(.body)
        }
    }
}
```

**ViewModel Requirements:**
```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var fullName: String = ""
    @Published var email: String = ""
    @Published var profileImageUrl: String?
    @Published var verificationStatus: VerificationStatus = .pending

    private let authService: AuthenticationServiceProtocol
    private let userRepository: UserRepositoryProtocol

    func loadProfile() async {
        // Load user profile
    }

    func signOut() {
        Task {
            try? await authService.signOut()
            // Navigate to login
        }
    }
}
```

---

### Section 7: Reports & Analytics

#### Screen 59: Reports Dashboard
**File:** `ReportsDashboardView.swift`
**Purpose:** Access all reports
**Navigation:** From dashboard or menu

```swift
struct ReportsDashboardView: View {
    @StateObject private var viewModel: ReportsViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    // Quick Actions
                    QuickReportActionsView()

                    // Recent Reports
                    RecentReportsSection(reports: viewModel.recentReports)

                    // Report Categories
                    ReportCategoriesGrid()
                }
                .padding()
            }
            .navigationTitle("Reports")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.showCustomReportBuilder() }) {
                        Image(systemName: "plus.circle")
                    }
                }
            }
        }
    }
}

struct QuickReportActionsView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                QuickActionCard(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Performance",
                    color: .blue
                )

                QuickActionCard(
                    icon: "doc.text",
                    title: "Tax Summary",
                    color: .green
                )

                QuickActionCard(
                    icon: "dollarsign.circle",
                    title: "P&L Statement",
                    color: .purple
                )

                QuickActionCard(
                    icon: "calendar",
                    title: "Activity Log",
                    color: .orange
                )
            }
        }
    }
}
```

**API Endpoints:**
- `GET /rest/v1/reports` - Get available reports
- `POST /rest/v1/rpc/generate_report` - Generate report
- `GET /rest/v1/rpc/report_pdf` - Download PDF

---

### Section 8: Notifications

#### Screen 67: Notifications Center
**File:** `NotificationsCenterView.swift`
**Purpose:** View all notifications
**Navigation:** From toolbar icon

```swift
struct NotificationsCenterView: View {
    @StateObject private var viewModel: NotificationsViewModel

    var body: some View {
        NavigationStack {
            List {
                if viewModel.hasUnread {
                    Section {
                        Button("Mark All as Read") {
                            viewModel.markAllAsRead()
                        }
                    }
                }

                ForEach(viewModel.groupedNotifications.keys.sorted(by: >), id: \.self) { date in
                    Section(date.formatted(.dateTime.month().day())) {
                        ForEach(viewModel.groupedNotifications[date] ?? []) { notification in
                            NavigationLink(destination: NotificationDetailView(notification: notification)) {
                                NotificationRowView(notification: notification)
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    viewModel.delete(notification)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                Button {
                                    viewModel.toggleRead(notification)
                                } label: {
                                    Label(
                                        notification.isRead ? "Mark Unread" : "Mark Read",
                                        systemImage: notification.isRead ? "envelope.badge" : "envelope.open"
                                    )
                                }
                                .tint(.blue)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Notifications")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.showSettings() }) {
                        Image(systemName: "gear")
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

struct NotificationRowView: View {
    let notification: AppNotification

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: notification.icon)
                .font(.title2)
                .foregroundColor(notification.color)
                .frame(width: 40, height: 40)
                .background(notification.color.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.headline)
                    .foregroundColor(notification.isRead ? .secondary : .primary)

                Text(notification.body)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                Text(notification.timestamp.formatted(.relative(presentation: .named)))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if !notification.isRead {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
    }
}
```

**Push Notifications Setup:**
```swift
// AppDelegate.swift
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        registerForPushNotifications()
        return true
    }

    func registerForPushNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        Task {
            await ServiceContainer.shared.notificationService.registerDevice(token: token)
        }
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        // Handle notification tap
        completionHandler()
    }
}
```

**API Endpoints:**
- `GET /rest/v1/notifications` - Get notifications
- `PATCH /rest/v1/notifications/{id}` - Mark as read
- `POST /rest/v1/device_tokens` - Register push token

---

### Section 9: Support & Help

#### Screen 72: Support Hub
**File:** `SupportHubView.swift`
**Purpose:** Access help and support resources
**Navigation:** From profile or menu

```swift
struct SupportHubView: View {
    @StateObject private var viewModel: SupportViewModel

    var body: some View {
        NavigationStack {
            List {
                // Quick Help
                Section("Quick Help") {
                    NavigationLink(destination: FAQView()) {
                        SettingsRow(icon: "questionmark.circle", title: "FAQ", color: .blue)
                    }

                    NavigationLink(destination: GuidesView()) {
                        SettingsRow(icon: "book", title: "User Guides", color: .green)
                    }
                }

                // Contact Support
                Section("Contact Support") {
                    NavigationLink(destination: CreateTicketView()) {
                        SettingsRow(icon: "envelope", title: "Submit a Ticket", color: .orange)
                    }

                    Button(action: { viewModel.startChat() }) {
                        SettingsRow(icon: "message", title: "Live Chat", color: .purple)
                    }

                    Button(action: { viewModel.callSupport() }) {
                        SettingsRow(icon: "phone", title: "Call Support", color: .red)
                    }
                }

                // My Tickets
                Section("My Tickets") {
                    NavigationLink(destination: TicketListView()) {
                        HStack {
                            SettingsRow(icon: "list.bullet", title: "View All Tickets", color: .gray)
                            Spacer()
                            if viewModel.activeTicketsCount > 0 {
                                Badge(count: viewModel.activeTicketsCount)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Support")
        }
    }
}
```

#### Screen 75: Ticket Creation
**File:** `CreateTicketView.swift`
**Purpose:** Submit support ticket

```swift
struct CreateTicketView: View {
    @StateObject private var viewModel: CreateTicketViewModel
    @State private var subject = ""
    @State private var category: TicketCategory = .general
    @State private var message = ""
    @State private var attachments: [UIImage] = []
    @State private var showImagePicker = false

    var body: some View {
        Form {
            Section("Subject") {
                TextField("Brief description", text: $subject)
            }

            Section("Category") {
                Picker("Select category", selection: $category) {
                    ForEach(TicketCategory.allCases, id: \.self) { category in
                        Text(category.rawValue).tag(category)
                    }
                }
            }

            Section("Message") {
                TextEditor(text: $message)
                    .frame(minHeight: 150)
            }

            Section("Attachments") {
                ForEach(attachments.indices, id: \.self) { index in
                    Image(uiImage: attachments[index])
                        .resizable()
                        .scaledToFit()
                        .frame(height: 100)
                }

                Button(action: { showImagePicker = true }) {
                    Label("Add Attachment", systemImage: "photo")
                }
            }

            Section {
                Button(action: { viewModel.submitTicket(
                    subject: subject,
                    category: category,
                    message: message,
                    attachments: attachments
                )}) {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                        }
                        Text("Submit Ticket")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(subject.isEmpty || message.isEmpty || viewModel.isLoading)
            }
        }
        .navigationTitle("New Ticket")
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(images: $attachments)
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                viewModel.dismiss()
            }
        } message: {
            Text("Your support ticket has been submitted")
        }
    }
}
```

**API Endpoints:**
- `POST /rest/v1/support_tickets` - Create ticket
- `POST /storage/v1/object/ticket-attachments` - Upload attachment

---

### Section 10: Admin Panel

#### Screen 78: Admin Dashboard
**File:** `AdminDashboardView.swift`
**Purpose:** Admin overview and operations
**Navigation:** Tab bar for admin users

```swift
struct AdminDashboardView: View {
    @StateObject private var viewModel: AdminDashboardViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // KPIs
                    AdminKPIsView(kpis: viewModel.kpis)

                    // Pending Actions
                    PendingActionsView(
                        pendingWithdrawals: viewModel.pendingWithdrawals,
                        pendingDocuments: viewModel.pendingDocuments,
                        openTickets: viewModel.openTickets
                    )

                    // Quick Actions
                    AdminQuickActionsView()

                    // Recent Activity
                    RecentActivityView(activities: viewModel.recentActivities)
                }
                .padding()
            }
            .navigationTitle("Admin Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { viewModel.exportData() }) {
                            Label("Export Data", systemImage: "square.and.arrow.up")
                        }

                        Button(action: { viewModel.viewAuditLogs() }) {
                            Label("Audit Logs", systemImage: "list.bullet.clipboard")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

struct AdminKPIsView: View {
    let kpis: AdminKPIs?

    var body: some View {
        VStack(spacing: 12) {
            Text("Platform Overview")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                KPICard(
                    title: "Total AUM",
                    value: kpis?.totalAUM.formatted(.currency(code: "USD")) ?? "-",
                    icon: "dollarsign.circle.fill",
                    color: .green
                )

                KPICard(
                    title: "Total Investors",
                    value: "\(kpis?.totalInvestors ?? 0)",
                    icon: "person.3.fill",
                    color: .blue
                )

                KPICard(
                    title: "Pending Withdrawals",
                    value: "\(kpis?.pendingWithdrawals ?? 0)",
                    icon: "exclamationmark.triangle.fill",
                    color: .orange
                )

                KPICard(
                    title: "24h Interest",
                    value: kpis?.dailyInterest.formatted(.currency(code: "USD")) ?? "-",
                    icon: "chart.line.uptrend.xyaxis",
                    color: .purple
                )
            }
        }
    }
}
```

**API Endpoints:**
- `GET /rest/v1/rpc/admin_kpis` - Get admin KPIs
- `GET /rest/v1/withdrawal_requests?status=pending` - Pending withdrawals
- `GET /rest/v1/documents?status=pending_review` - Pending documents
- `GET /rest/v1/support_tickets?status=open` - Open tickets

---

## Code Examples

### Core Services

#### Supabase Client Setup
```swift
import Supabase

final class SupabaseClientManager {
    static let shared = SupabaseClientManager()

    let client: SupabaseClient

    private init() {
        self.client = SupabaseClient(
            supabaseURL: URL(string: Configuration.supabaseURL)!,
            supabaseKey: Configuration.supabaseAnonKey
        )
    }
}

// Configuration.swift
enum Configuration {
    static let supabaseURL = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
    static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
}
```

#### Authentication Service
```swift
protocol AuthenticationServiceProtocol {
    func signIn(email: String, password: String) async throws -> Session
    func signOut() async throws
    func currentSession() async throws -> Session?
    func refreshSession() async throws -> Session
}

final class AuthenticationService: AuthenticationServiceProtocol {
    private let supabaseClient: SupabaseClient
    private let keychainManager: KeychainManagerProtocol

    init(
        supabaseClient: SupabaseClient,
        keychainManager: KeychainManagerProtocol
    ) {
        self.supabaseClient = supabaseClient
        self.keychainManager = keychainManager
    }

    func signIn(email: String, password: String) async throws -> Session {
        let response = try await supabaseClient.auth.signIn(
            email: email,
            password: password
        )

        // Store tokens
        try await keychainManager.saveAccessToken(response.session.accessToken)
        try await keychainManager.saveRefreshToken(response.session.refreshToken)

        return response.session
    }

    func signOut() async throws {
        try await supabaseClient.auth.signOut()
        try await keychainManager.deleteAccessToken()
        try await keychainManager.deleteRefreshToken()
    }

    func currentSession() async throws -> Session? {
        return try await supabaseClient.auth.session
    }

    func refreshSession() async throws -> Session {
        let response = try await supabaseClient.auth.refreshSession()

        try await keychainManager.saveAccessToken(response.session.accessToken)
        try await keychainManager.saveRefreshToken(response.session.refreshToken)

        return response.session
    }
}
```

#### Network Service
```swift
protocol NetworkServiceProtocol {
    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        method: HTTPMethod,
        body: Encodable?
    ) async throws -> T
}

final class NetworkService: NetworkServiceProtocol {
    private let supabaseClient: SupabaseClient

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        method: HTTPMethod = .get,
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: endpoint.url)
        request.httpMethod = method.rawValue

        // Add auth header
        if let token = try? await supabaseClient.auth.session?.accessToken {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body if present
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
            request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }
}
```

#### Keychain Manager
```swift
import KeychainAccess

protocol KeychainManagerProtocol {
    func saveAccessToken(_ token: String) async throws
    func saveRefreshToken(_ token: String) async throws
    func getAccessToken() async throws -> String?
    func getRefreshToken() async throws -> String?
    func deleteAccessToken() async throws
    func deleteRefreshToken() async throws
}

final class KeychainManager: KeychainManagerProtocol {
    private let keychain = Keychain(service: "com.indigoyield.platform")

    private enum Keys {
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
    }

    func saveAccessToken(_ token: String) async throws {
        try keychain.set(token, key: Keys.accessToken)
    }

    func saveRefreshToken(_ token: String) async throws {
        try keychain.set(token, key: Keys.refreshToken)
    }

    func getAccessToken() async throws -> String? {
        try keychain.get(Keys.accessToken)
    }

    func getRefreshToken() async throws -> String? {
        try keychain.get(Keys.refreshToken)
    }

    func deleteAccessToken() async throws {
        try keychain.remove(Keys.accessToken)
    }

    func deleteRefreshToken() async throws {
        try keychain.remove(Keys.refreshToken)
    }
}
```

### Repositories

#### Portfolio Repository
```swift
protocol PortfolioRepositoryProtocol {
    func fetchPortfolioSummary() async throws -> PortfolioSummary
    func fetchAssetAllocation() async throws -> AssetAllocation
    func fetchHoldings() async throws -> [Holding]
    func fetchPerformanceData(period: TimePeriod) async throws -> PerformanceData
}

final class PortfolioRepository: PortfolioRepositoryProtocol {
    private let networkService: NetworkServiceProtocol
    private let cacheService: CacheServiceProtocol

    init(
        networkService: NetworkServiceProtocol,
        cacheService: CacheServiceProtocol
    ) {
        self.networkService = networkService
        self.cacheService = cacheService
    }

    func fetchPortfolioSummary() async throws -> PortfolioSummary {
        // Try cache first
        if let cached = try? await cacheService.getPortfolioSummary() {
            if cached.isValid {
                return cached.data
            }
        }

        // Fetch from network
        let summary: PortfolioSummary = try await networkService.request(
            .portfolioSummary,
            method: .get,
            body: nil as String?
        )

        // Cache result
        try? await cacheService.savePortfolioSummary(summary)

        return summary
    }

    func fetchAssetAllocation() async throws -> AssetAllocation {
        try await networkService.request(
            .assetAllocation,
            method: .get,
            body: nil as String?
        )
    }

    func fetchHoldings() async throws -> [Holding] {
        let response: HoldingsResponse = try await networkService.request(
            .holdings,
            method: .get,
            body: nil as String?
        )
        return response.holdings
    }

    func fetchPerformanceData(period: TimePeriod) async throws -> PerformanceData {
        try await networkService.request(
            .performance(period: period),
            method: .get,
            body: nil as String?
        )
    }
}
```

### Core Data Setup

```swift
import CoreData

final class CoreDataManager {
    static let shared = CoreDataManager()

    private init() {}

    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "IndigoYieldPlatform")
        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Unable to load persistent stores: \(error)")
            }
        }
        return container
    }()

    var viewContext: NSManagedObjectContext {
        persistentContainer.viewContext
    }

    func saveContext() {
        let context = viewContext
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nsError = error as NSError
                fatalError("Unresolved error \(nsError), \(nsError.userInfo)")
            }
        }
    }
}

// Cache Service
protocol CacheServiceProtocol {
    func savePortfolioSummary(_ summary: PortfolioSummary) async throws
    func getPortfolioSummary() async throws -> CachedData<PortfolioSummary>?
}

final class CoreDataCacheService: CacheServiceProtocol {
    private let context: NSManagedObjectContext

    init(context: NSManagedObjectContext = CoreDataManager.shared.viewContext) {
        self.context = context
    }

    func savePortfolioSummary(_ summary: PortfolioSummary) async throws {
        try await context.perform {
            let entity = CachedPortfolioSummary(context: self.context)
            entity.id = UUID()
            entity.data = try JSONEncoder().encode(summary)
            entity.timestamp = Date()

            try self.context.save()
        }
    }

    func getPortfolioSummary() async throws -> CachedData<PortfolioSummary>? {
        try await context.perform {
            let request = CachedPortfolioSummary.fetchRequest()
            request.sortDescriptors = [NSSortDescriptor(keyPath: \CachedPortfolioSummary.timestamp, ascending: false)]
            request.fetchLimit = 1

            guard let cached = try self.context.fetch(request).first else {
                return nil
            }

            let summary = try JSONDecoder().decode(PortfolioSummary.self, from: cached.data!)
            return CachedData(data: summary, timestamp: cached.timestamp!)
        }
    }
}

struct CachedData<T> {
    let data: T
    let timestamp: Date

    var isValid: Bool {
        // Cache valid for 5 minutes
        Date().timeIntervalSince(timestamp) < 300
    }
}
```

### Widgets

#### Portfolio Widget
```swift
import WidgetKit
import SwiftUI

struct PortfolioWidget: Widget {
    let kind: String = "PortfolioWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PortfolioProvider()) { entry in
            PortfolioWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Portfolio Summary")
        .description("View your portfolio at a glance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct PortfolioEntry: TimelineEntry {
    let date: Date
    let totalValue: Decimal
    let dailyChange: Decimal
    let assets: [AssetSummary]
}

struct PortfolioProvider: TimelineProvider {
    func placeholder(in context: Context) -> PortfolioEntry {
        PortfolioEntry(
            date: Date(),
            totalValue: 100000,
            dailyChange: 0.025,
            assets: []
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (PortfolioEntry) -> Void) {
        // Return cached data for preview
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PortfolioEntry>) -> Void) {
        Task {
            do {
                let summary = try await PortfolioRepository().fetchPortfolioSummary()
                let entry = PortfolioEntry(
                    date: Date(),
                    totalValue: summary.totalValue,
                    dailyChange: summary.dailyChange,
                    assets: summary.topAssets
                )

                // Update every 15 minutes
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            } catch {
                // Return placeholder on error
                let entry = placeholder(in: context)
                let timeline = Timeline(entries: [entry], policy: .never)
                completion(timeline)
            }
        }
    }
}

struct PortfolioWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: PortfolioEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: PortfolioEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Portfolio")
                .font(.caption)
                .foregroundColor(.secondary)

            Text(entry.totalValue.formatted(.currency(code: "USD")))
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 4) {
                Image(systemName: entry.dailyChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption)
                Text(entry.dailyChange.formatted(.percent.precision(.fractionLength(2))))
                    .font(.caption)
            }
            .foregroundColor(entry.dailyChange >= 0 ? .green : .red)

            Spacer()
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}
```

---

## Testing Strategy

### Unit Testing

```swift
import XCTest
@testable import IndigoYieldPlatform

final class AuthenticationViewModelTests: XCTestCase {
    var sut: AuthenticationViewModel!
    var mockAuthService: MockAuthenticationService!
    var mockBiometricService: MockBiometricAuthService!

    override func setUp() {
        super.setUp()
        mockAuthService = MockAuthenticationService()
        mockBiometricService = MockBiometricAuthService()
        sut = AuthenticationViewModel(
            authService: mockAuthService,
            biometricService: mockBiometricService
        )
    }

    override func tearDown() {
        sut = nil
        mockAuthService = nil
        mockBiometricService = nil
        super.tearDown()
    }

    func testSignInSuccess() async {
        // Given
        let email = "test@example.com"
        let password = "password123"
        mockAuthService.signInResult = .success(Session.mock)

        // When
        await sut.signIn(email: email, password: password, rememberMe: false)

        // Then
        XCTAssertFalse(sut.isLoading)
        XCTAssertFalse(sut.showError)
        XCTAssertNil(sut.errorMessage)
    }

    func testSignInFailure() async {
        // Given
        let email = "test@example.com"
        let password = "wrongpassword"
        mockAuthService.signInResult = .failure(AuthError.invalidCredentials)

        // When
        await sut.signIn(email: email, password: password, rememberMe: false)

        // Then
        XCTAssertFalse(sut.isLoading)
        XCTAssertTrue(sut.showError)
        XCTAssertNotNil(sut.errorMessage)
    }

    func testBiometricAuthAvailability() {
        // Given
        mockBiometricService.isAvailableResult = true
        mockBiometricService.biometricTypeResult = .faceID

        // When
        sut = AuthenticationViewModel(
            authService: mockAuthService,
            biometricService: mockBiometricService
        )

        // Then
        XCTAssertTrue(sut.biometricAuthAvailable)
        XCTAssertEqual(sut.biometricType, .faceID)
    }
}

// Mock Services
final class MockAuthenticationService: AuthenticationServiceProtocol {
    var signInResult: Result<Session, Error> = .success(.mock)

    func signIn(email: String, password: String) async throws -> Session {
        try signInResult.get()
    }

    func signOut() async throws {}

    func currentSession() async throws -> Session? {
        nil
    }

    func refreshSession() async throws -> Session {
        .mock
    }
}
```

### UI Testing

```swift
import XCTest

final class LoginFlowUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginWithValidCredentials() {
        // Given
        let emailField = app.textFields["Email"]
        let passwordField = app.secureTextFields["Password"]
        let signInButton = app.buttons["Sign In"]

        // When
        emailField.tap()
        emailField.typeText("test@example.com")

        passwordField.tap()
        passwordField.typeText("password123")

        signInButton.tap()

        // Then
        let dashboardTitle = app.navigationBars["Dashboard"]
        XCTAssertTrue(dashboardTitle.waitForExistence(timeout: 5))
    }

    func testLoginWithInvalidCredentials() {
        // Given
        let emailField = app.textFields["Email"]
        let passwordField = app.secureTextFields["Password"]
        let signInButton = app.buttons["Sign In"]

        // When
        emailField.tap()
        emailField.typeText("invalid@example.com")

        passwordField.tap()
        passwordField.typeText("wrongpassword")

        signInButton.tap()

        // Then
        let errorAlert = app.alerts["Error"]
        XCTAssertTrue(errorAlert.waitForExistence(timeout: 5))
    }

    func testTogglePasswordVisibility() {
        // Given
        let passwordField = app.secureTextFields["Password"]
        let showPasswordButton = app.buttons["Show password"]

        // When
        passwordField.tap()
        passwordField.typeText("secret")
        showPasswordButton.tap()

        // Then
        let visiblePasswordField = app.textFields["Password"]
        XCTAssertTrue(visiblePasswordField.exists)
    }
}
```

### Performance Testing

```swift
final class DashboardPerformanceTests: XCTestCase {
    func testDashboardLoadTime() {
        let app = XCUIApplication()
        app.launch()

        // Login
        // ...

        measure(metrics: [XCTClockMetric()]) {
            // Navigate to dashboard
            app.tabBars.buttons["Dashboard"].tap()

            // Wait for content to load
            let portfolioCard = app.otherElements["PortfolioSummaryCard"]
            _ = portfolioCard.waitForExistence(timeout: 5)
        }
    }

    func testScrollingPerformance() {
        let app = XCUIApplication()
        app.launch()

        // Navigate to transaction history
        // ...

        let transactionsList = app.tables.firstMatch

        measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
            transactionsList.swipeUp(velocity: .fast)
            transactionsList.swipeDown(velocity: .fast)
        }
    }
}
```

---

## App Store Submission

### Pre-Submission Checklist

#### App Information
- [ ] App name: "Indigo Yield Platform"
- [ ] Bundle ID: com.indigoyield.platform
- [ ] Version: 1.0.0
- [ ] Category: Finance
- [ ] Age rating: 17+ (Unrestricted Web Access)

#### App Store Assets
- [ ] App icon (1024x1024px)
- [ ] iPhone screenshots (6.7", 6.5", 5.5")
  - [ ] Dashboard
  - [ ] Portfolio view
  - [ ] Transaction history
  - [ ] Deposit flow
  - [ ] Profile settings
- [ ] iPad screenshots (12.9", 11")
- [ ] App preview video (optional, 30 seconds)

#### Marketing Materials
- [ ] App description (up to 4000 characters)
- [ ] Keywords (up to 100 characters)
- [ ] Promotional text (170 characters)
- [ ] Support URL
- [ ] Marketing URL
- [ ] Privacy policy URL

#### Technical Requirements
- [ ] Test on physical devices (iPhone, iPad)
- [ ] Test on iOS 17, 18
- [ ] Verify all features work
- [ ] Check memory usage
- [ ] Profile performance with Instruments
- [ ] Test in poor network conditions
- [ ] Verify accessibility features
- [ ] Test Dark Mode support
- [ ] Verify push notifications
- [ ] Test biometric authentication
- [ ] Test Apple Pay integration

#### Privacy & Security
- [ ] Privacy manifest (PrivacyInfo.xcprivacy)
- [ ] App Tracking Transparency implementation
- [ ] Data encryption verification
- [ ] Third-party SDK declarations
- [ ] API endpoint security
- [ ] Certificate pinning

#### Compliance
- [ ] Export compliance documentation
- [ ] Financial regulations compliance
- [ ] KYC/AML procedures
- [ ] Terms of service
- [ ] Privacy policy

### Privacy Manifest

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeName</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeFinancialInfo</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

### Info.plist Configuration

```xml
<!-- Face ID / Touch ID -->
<key>NSFaceIDUsageDescription</key>
<string>Indigo Yield uses Face ID to securely authenticate you into your account</string>

<!-- Camera for Document Scanning -->
<key>NSCameraUsageDescription</key>
<string>Indigo Yield needs camera access to scan KYC documents</string>

<!-- Photo Library for Document Upload -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Indigo Yield needs access to your photo library to upload documents</string>

<!-- Push Notifications -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>

<!-- Minimum iOS Version -->
<key>MinimumOSVersion</key>
<string>17.0</string>
```

### TestFlight Beta Testing

#### Beta Test Plan
1. **Internal Testing (Week 15)**
   - Development team testing
   - QA team validation
   - Bug fixes

2. **External Beta (Week 16)**
   - Invite 50 investors
   - Collect feedback via TestFlight
   - Monitor crash reports
   - Performance monitoring

3. **Release Candidate**
   - Final bug fixes
   - Performance optimizations
   - Final approval from stakeholders

### App Store Review Guidelines Compliance

#### 2.1 App Completeness
- [ ] All features functional
- [ ] No placeholder content
- [ ] Demo account for reviewer
- [ ] Clear onboarding flow

#### 2.3 Accurate Metadata
- [ ] Screenshots match app
- [ ] Description is accurate
- [ ] No misleading content

#### 3.1.1 In-App Purchase
- [ ] Not applicable (no in-app purchases)

#### 4.0 Design
- [ ] Follows Human Interface Guidelines
- [ ] Works on all iOS devices
- [ ] Supports Dark Mode
- [ ] Accessibility features

#### 5.1.1 Data Collection & Storage
- [ ] Privacy policy provided
- [ ] Data collection disclosed
- [ ] Secure data handling

---

## Additional Resources

### Swift Package Dependencies

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.5.0"),
    .package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.2"),
    .package(url: "https://github.com/onevcat/Kingfisher", from: "7.0.0"),
    .package(url: "https://github.com/groue/GRDB.swift", from: "6.0.0")
]
```

### Fastlane Setup

```ruby
# Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and run tests"
  lane :test do
    run_tests(
      scheme: "IndigoYieldPlatform",
      devices: ["iPhone 15 Pro", "iPad Pro (12.9-inch)"]
    )
  end

  desc "Build for TestFlight"
  lane :beta do
    increment_build_number
    build_app(
      scheme: "IndigoYieldPlatform",
      export_method: "app-store"
    )
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Release to App Store"
  lane :release do
    increment_version_number(
      bump_type: "patch"
    )
    build_app(
      scheme: "IndigoYieldPlatform",
      export_method: "app-store"
    )
    upload_to_app_store(
      force: true,
      skip_metadata: false,
      skip_screenshots: false
    )
  end
end
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for developing the Indigo Yield Platform iOS native application. The 16-week timeline is structured to deliver a production-ready app with all 85 screens implemented, tested, and optimized for the App Store.

### Key Success Factors

1. **Modular Architecture**: MVVM with clean separation of concerns ensures maintainability
2. **Native iOS Features**: Full integration with Face ID, Apple Pay, and platform features
3. **Performance First**: Caching, optimization, and smooth animations throughout
4. **Security Focused**: Keychain storage, biometric auth, and secure networking
5. **Accessibility**: VoiceOver support and Dynamic Type across all screens
6. **Testing Coverage**: Comprehensive unit, integration, and UI tests

### Next Steps

1. **Week 1**: Initialize Xcode project, set up CI/CD pipeline
2. **Week 2**: Implement authentication flow and core services
3. **Follow timeline**: Proceed with phased implementation
4. **Week 16**: Submit to App Store

For questions or clarifications, refer to the detailed screen specifications above or contact the development team lead.

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Author:** iOS Development Team
