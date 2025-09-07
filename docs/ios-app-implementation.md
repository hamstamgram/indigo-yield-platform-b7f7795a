# 📱 iOS App Implementation Guide
## Indigo Yield Platform - SwiftUI Implementation

### Project Structure
```
IndigoYield/
├── IndigoYieldApp.swift           # App entry point
├── Core/
│   ├── Network/
│   │   ├── SupabaseClient.swift
│   │   ├── APIService.swift
│   │   └── NetworkMonitor.swift
│   ├── Data/
│   │   ├── CoreDataManager.swift
│   │   ├── KeychainManager.swift
│   │   └── UserDefaults+Extensions.swift
│   └── Utils/
│       ├── Constants.swift
│       ├── Extensions/
│       └── Helpers/
├── Models/
│   ├── User.swift
│   ├── Portfolio.swift
│   ├── Transaction.swift
│   ├── Document.swift
│   └── Statement.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── DashboardViewModel.swift
│   ├── PortfolioViewModel.swift
│   └── TransactionViewModel.swift
├── Views/
│   ├── Authentication/
│   │   ├── LoginView.swift
│   │   ├── BiometricAuthView.swift
│   │   └── TwoFactorView.swift
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── PortfolioCardView.swift
│   │   └── YieldMetricsView.swift
│   ├── Portfolio/
│   │   ├── PortfolioDetailView.swift
│   │   ├── AssetAllocationChart.swift
│   │   └── PerformanceChart.swift
│   ├── Transactions/
│   │   ├── TransactionListView.swift
│   │   ├── TransactionDetailView.swift
│   │   └── WithdrawalRequestView.swift
│   ├── Documents/
│   │   ├── DocumentListView.swift
│   │   ├── PDFViewerView.swift
│   │   └── StatementView.swift
│   └── Components/
│       ├── LoadingView.swift
│       ├── ErrorView.swift
│       └── CustomButton.swift
└── Resources/
    ├── Assets.xcassets
    ├── Info.plist
    └── Localizable.strings
```

---

## 🎨 SwiftUI Implementation Examples

### 1. Main App Structure
```swift
// IndigoYieldApp.swift
import SwiftUI
import Supabase

@main
struct IndigoYieldApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()
    
    init() {
        configureSupabase()
        configureSecurity()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .environmentObject(networkMonitor)
                .onAppear {
                    authViewModel.checkBiometricAvailability()
                }
        }
    }
    
    private func configureSupabase() {
        let client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseURL)!,
            supabaseKey: Config.supabaseAnonKey
        )
        SupabaseManager.shared.client = client
    }
    
    private func configureSecurity() {
        // Certificate pinning
        // Jailbreak detection
        // App Transport Security
    }
}
```

### 2. Authentication View
```swift
// Views/Authentication/LoginView.swift
import SwiftUI
import LocalAuthentication

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showBiometric = false
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                // Gradient Background
                LinearGradient(
                    colors: [Color("Primary"), Color("PrimaryDark")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 30) {
                    // Logo
                    Image("AppLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .padding(.top, 50)
                    
                    Text("Indigo Yield Platform")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    VStack(spacing: 20) {
                        // Email Field
                        CustomTextField(
                            placeholder: "Email",
                            text: $email,
                            icon: "envelope.fill",
                            keyboardType: .emailAddress
                        )
                        
                        // Password Field
                        CustomSecureField(
                            placeholder: "Password",
                            text: $password,
                            icon: "lock.fill"
                        )
                        
                        // Login Button
                        Button(action: handleLogin) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Sign In")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.white)
                            .foregroundColor(Color("Primary"))
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)
                        
                        // Biometric Login
                        if authViewModel.isBiometricAvailable {
                            Button(action: handleBiometricLogin) {
                                HStack {
                                    Image(systemName: authViewModel.biometricType == .faceID ? "faceid" : "touchid")
                                    Text("Login with \(authViewModel.biometricType == .faceID ? "Face ID" : "Touch ID")")
                                }
                                .foregroundColor(.white)
                            }
                        }
                    }
                    .padding(.horizontal, 30)
                    
                    Spacer()
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private func handleLogin() {
        Task {
            isLoading = true
            do {
                try await authViewModel.login(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
    
    private func handleBiometricLogin() {
        Task {
            do {
                try await authViewModel.authenticateWithBiometrics()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}
```

### 3. Dashboard View
```swift
// Views/Dashboard/DashboardView.swift
import SwiftUI
import Charts

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedTimeRange = TimeRange.month
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Portfolio Value Card
                    PortfolioValueCard(portfolio: viewModel.portfolio)
                        .padding(.horizontal)
                    
                    // Time Range Picker
                    Picker("Time Range", selection: $selectedTimeRange) {
                        ForEach(TimeRange.allCases) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // Performance Chart
                    PerformanceChartView(
                        data: viewModel.performanceData,
                        timeRange: selectedTimeRange
                    )
                    .frame(height: 250)
                    .padding(.horizontal)
                    
                    // Asset Allocation
                    AssetAllocationView(assets: viewModel.assets)
                        .padding(.horizontal)
                    
                    // Recent Transactions
                    RecentTransactionsView(transactions: viewModel.recentTransactions)
                        .padding(.horizontal)
                    
                    // Quick Actions
                    QuickActionsView()
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NotificationButton()
                }
            }
            .refreshable {
                await viewModel.refreshData()
            }
        }
        .task {
            await viewModel.loadData()
        }
    }
}

struct PortfolioValueCard: View {
    let portfolio: Portfolio?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Total Portfolio Value")
                .font(.headline)
                .foregroundColor(.secondary)
            
            if let portfolio = portfolio {
                HStack(alignment: .firstTextBaseline) {
                    Text("$")
                        .font(.title2)
                    Text(portfolio.totalValue.formatted())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                }
                
                HStack {
                    Image(systemName: portfolio.dayChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .foregroundColor(portfolio.dayChange >= 0 ? .green : .red)
                    
                    Text("\(portfolio.dayChange.formatted(.percent))")
                        .foregroundColor(portfolio.dayChange >= 0 ? .green : .red)
                        .fontWeight(.semibold)
                    
                    Text("Today")
                        .foregroundColor(.secondary)
                }
            } else {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 2)
    }
}
```

### 4. Portfolio Chart View
```swift
// Views/Portfolio/PerformanceChart.swift
import SwiftUI
import Charts

struct PerformanceChartView: View {
    let data: [PerformanceData]
    let timeRange: TimeRange
    
    var body: some View {
        Chart(data) { item in
            LineMark(
                x: .value("Date", item.date),
                y: .value("Value", item.value)
            )
            .foregroundStyle(Color("Primary"))
            .interpolationMethod(.catmullRom)
            
            AreaMark(
                x: .value("Date", item.date),
                y: .value("Value", item.value)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color("Primary").opacity(0.3), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: timeRange.strideCount)) { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel(format: .dateTime.month().day())
            }
        }
        .chartYAxis {
            AxisMarks { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel(format: .currency(code: "USD"))
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }
}
```

### 5. Transaction List View
```swift
// Views/Transactions/TransactionListView.swift
import SwiftUI

struct TransactionListView: View {
    @StateObject private var viewModel = TransactionViewModel()
    @State private var searchText = ""
    @State private var selectedFilter = TransactionFilter.all
    
    var filteredTransactions: [Transaction] {
        viewModel.transactions
            .filter { transaction in
                (selectedFilter == .all || transaction.type == selectedFilter.transactionType) &&
                (searchText.isEmpty || transaction.description.localizedCaseInsensitiveContains(searchText))
            }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Search Bar
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                // Filter Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(TransactionFilter.allCases) { filter in
                            FilterPill(
                                title: filter.rawValue,
                                isSelected: selectedFilter == filter
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                
                // Transaction List
                List {
                    ForEach(groupedTransactions, id: \.key) { date, transactions in
                        Section(header: Text(date.formatted(date: .abbreviated, time: .omitted))) {
                            ForEach(transactions) { transaction in
                                TransactionRow(transaction: transaction)
                                    .listRowInsets(EdgeInsets())
                                    .listRowBackground(Color.clear)
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .refreshable {
                    await viewModel.refreshTransactions()
                }
            }
            .navigationTitle("Transactions")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { /* Export */ }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .task {
            await viewModel.loadTransactions()
        }
    }
    
    private var groupedTransactions: [(key: Date, transactions: [Transaction])] {
        Dictionary(grouping: filteredTransactions) { transaction in
            Calendar.current.startOfDay(for: transaction.date)
        }
        .sorted { $0.key > $1.key }
        .map { (key: $0.key, transactions: $0.value) }
    }
}

struct TransactionRow: View {
    let transaction: Transaction
    
    var body: some View {
        HStack {
            // Icon
            Circle()
                .fill(transaction.type == .deposit ? Color.green.opacity(0.2) : Color.red.opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: transaction.type == .deposit ? "arrow.down" : "arrow.up")
                        .foregroundColor(transaction.type == .deposit ? .green : .red)
                )
            
            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.description)
                    .font(.headline)
                Text(transaction.date.formatted(date: .omitted, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Amount
            Text(transaction.amount.formatted(.currency(code: "USD")))
                .font(.headline)
                .foregroundColor(transaction.type == .deposit ? .green : .primary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.vertical, 4)
    }
}
```

### 6. Document Viewer
```swift
// Views/Documents/PDFViewerView.swift
import SwiftUI
import PDFKit

struct PDFViewerView: View {
    let document: Document
    @State private var isShareSheetPresented = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            PDFKitRepresentedView(url: document.url)
                .navigationTitle(document.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Close") {
                            dismiss()
                        }
                    }
                    
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: shareDocument) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
        }
        .sheet(isPresented: $isShareSheetPresented) {
            ShareSheet(activityItems: [document.url])
        }
    }
    
    private func shareDocument() {
        isShareSheetPresented = true
    }
}

struct PDFKitRepresentedView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        
        if let document = PDFDocument(url: url) {
            pdfView.document = document
        }
        
        return pdfView
    }
    
    func updateUIView(_ uiView: PDFView, context: Context) {}
}
```

### 7. Biometric Authentication
```swift
// Core/Security/BiometricAuthManager.swift
import LocalAuthentication
import SwiftUI

class BiometricAuthManager: ObservableObject {
    enum BiometricType {
        case none
        case touchID
        case faceID
    }
    
    @Published var isAuthenticated = false
    
    func biometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        
        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        default:
            return .none
        }
    }
    
    func authenticate() async throws {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            throw AuthenticationError.biometricNotAvailable
        }
        
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Access your portfolio"
            )
            
            await MainActor.run {
                self.isAuthenticated = success
            }
            
            if !success {
                throw AuthenticationError.biometricFailed
            }
        } catch {
            throw AuthenticationError.biometricFailed
        }
    }
}
```

---

## 📱 Widget Implementation

### Portfolio Widget
```swift
// Widget/PortfolioWidget.swift
import WidgetKit
import SwiftUI

struct PortfolioEntry: TimelineEntry {
    let date: Date
    let portfolioValue: Double
    let dayChange: Double
    let assets: [AssetAllocation]
}

struct PortfolioWidgetView: View {
    var entry: PortfolioEntry
    @Environment(\.widgetFamily) var family
    
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
            HStack {
                Image("AppIcon")
                    .resizable()
                    .frame(width: 20, height: 20)
                Spacer()
            }
            
            Text("Portfolio")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text("$\(entry.portfolioValue.formatted())")
                .font(.title2)
                .fontWeight(.bold)
            
            HStack(spacing: 4) {
                Image(systemName: entry.dayChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption)
                    .foregroundColor(entry.dayChange >= 0 ? .green : .red)
                
                Text("\(entry.dayChange.formatted(.percent))")
                    .font(.caption)
                    .foregroundColor(entry.dayChange >= 0 ? .green : .red)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(.systemBackground)
        }
    }
}

struct PortfolioWidget: Widget {
    let kind: String = "PortfolioWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PortfolioProvider()) { entry in
            PortfolioWidgetView(entry: entry)
        }
        .configurationDisplayName("Portfolio")
        .description("Track your portfolio value and performance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

---

## 🔒 Security Implementation

### Keychain Manager
```swift
// Core/Security/KeychainManager.swift
import Security
import Foundation

class KeychainManager {
    static let shared = KeychainManager()
    
    private init() {}
    
    func save(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.invalidData
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed
        }
    }
    
    func retrieve(key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
```

---

## 🎯 Next Steps

1. **Set up Xcode project** with proper bundle ID and provisioning profiles
2. **Install dependencies** via Swift Package Manager
3. **Configure Supabase** connection with proper API keys
4. **Implement core views** starting with authentication
5. **Add offline support** with Core Data
6. **Test on physical devices** for biometric authentication
7. **Set up TestFlight** for beta testing
8. **Prepare for App Store** submission

---

*This implementation guide provides a solid foundation for building the iOS app with SwiftUI, following best practices and maintaining consistency with the existing web platform.*
