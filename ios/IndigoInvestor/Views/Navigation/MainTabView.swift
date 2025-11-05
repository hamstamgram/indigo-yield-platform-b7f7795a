//
//  MainTabView.swift
//  IndigoInvestor
//
//  Main tab navigation for the app
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var navigationState = NavigationState()
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var serviceLocator: ServiceLocator
    @State private var selectedTab = 0
    @State private var showingWithdrawalSheet = false
    @State private var previousTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Dashboard
            NavigationStack(path: $navigationState.dashboardPath) {
                DashboardView()
                    .navigationDestination(for: DashboardDestination.self) { destination in
                        switch destination {
                        case .assetDetail(let symbol):
                            AssetDetailView(symbol: symbol)
                        case .transactionDetail(let id):
                            TransactionDetailView(transactionId: id)
                        case .notification:
                            NotificationsView()
                        }
                    }
            }
            .tabItem {
                Label("Dashboard", systemImage: "chart.pie.fill")
            }
            .tag(0)

            // Daily Rates
            NavigationView {
                DailyRatesView()
            }
            .tabItem {
                Label("Daily Rates", systemImage: "dollarsign.circle.fill")
            }
            .tag(1)

            // Portfolio
            NavigationStack(path: $navigationState.portfolioPath) {
                PortfolioView()
                    .navigationDestination(for: PortfolioDestination.self) { destination in
                        switch destination {
                        case .assetDetail(let symbol):
                            AssetDetailView(symbol: symbol)
                        case .yieldHistory:
                            YieldHistoryView()
                        }
                    }
            }
            .tabItem {
                Label("Portfolio", systemImage: "briefcase.fill")
            }
            .tag(2)

            // Transactions
            NavigationStack(path: $navigationState.transactionsPath) {
                TransactionsView()
                    .navigationDestination(for: TransactionDestination.self) { destination in
                        switch destination {
                        case .detail(let id):
                            TransactionDetailView(transactionId: id)
                        case .statement(let id):
                            StatementView(statementId: id)
                        case .filter:
                            TransactionFilterView()
                        }
                    }
            }
            .tabItem {
                Label("Transactions", systemImage: "arrow.left.arrow.right")
            }
            .tag(3)

            // Documents
            NavigationStack(path: $navigationState.documentsPath) {
                DocumentsVaultView()
                    .navigationDestination(for: DocumentDestination.self) { destination in
                        switch destination {
                        case .viewer(let id):
                            DocumentViewerView(documentId: id)
                        case .statement(let id):
                            StatementView(statementId: id)
                        }
                    }
            }
            .tabItem {
                Label("Documents", systemImage: "doc.text.fill")
            }
            .tag(4)

            // Account
            NavigationStack(path: $navigationState.accountPath) {
                AccountView()
                    .navigationDestination(for: AccountDestination.self) { destination in
                        switch destination {
                        case .profile:
                            ProfileSettingsView()
                        case .security:
                            SecuritySettingsView()
                        case .notifications:
                            NotificationSettingsView()
                        case .withdrawals:
                            WithdrawalHistoryView()
                        case .support:
                            SupportView()
                        }
                    }
            }
            .tabItem {
                Label("Account", systemImage: "person.circle.fill")
            }
            .tag(5)
        }
        .onChange(of: selectedTab) { newValue in
            handleTabChange(from: previousTab, to: newValue)
            previousTab = newValue
        }
        .sheet(isPresented: $showingWithdrawalSheet) {
            WithdrawalRequestView()
        }
        .onAppear {
            setupAppearance()
            registerForDeepLinks()
        }
        .environmentObject(navigationState)
    }
    
    private func handleTabChange(from: Int, to: Int) {
        // Haptic feedback
        IndigoTheme.HapticFeedback.selection.trigger()
        
        // Analytics tracking
        trackTabSwitch(to: to)
    }
    
    private func setupAppearance() {
        // Tab bar appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.systemBackground
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().tintColor = UIColor(IndigoTheme.Colors.primary)
    }
    
    private func registerForDeepLinks() {
        // Handle universal links
        NotificationCenter.default.addObserver(
            forName: .handleDeepLink,
            object: nil,
            queue: .main
        ) { notification in
            if let url = notification.object as? URL {
                handleDeepLink(url)
            }
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        // Parse and navigate to appropriate destination
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else { return }
        
        switch components.path {
        case "/statement":
            if let statementId = components.queryItems?.first(where: { $0.name == "id" })?.value {
                selectedTab = 4 // Documents tab
                navigationState.documentsPath.append(.statement(statementId))
            }
        case "/transaction":
            if let transactionId = components.queryItems?.first(where: { $0.name == "id" })?.value {
                selectedTab = 3 // Transactions tab
                navigationState.transactionsPath.append(.detail(transactionId))
            }
        case "/withdraw":
            showingWithdrawalSheet = true
        case "/rates":
            selectedTab = 1 // Daily Rates tab
        default:
            break
        }
    }
    
    private func trackTabSwitch(to tab: Int) {
        let tabName = ["dashboard", "daily_rates", "portfolio", "transactions", "documents", "account"][tab]
        // Analytics.track("tab_switched", properties: ["tab": tabName])
    }
}

// MARK: - Navigation State

class NavigationState: ObservableObject {
    @Published var dashboardPath = NavigationPath()
    @Published var portfolioPath = NavigationPath()
    @Published var transactionsPath = NavigationPath()
    @Published var documentsPath = NavigationPath()
    @Published var accountPath = NavigationPath()
    
    func reset() {
        dashboardPath = NavigationPath()
        portfolioPath = NavigationPath()
        transactionsPath = NavigationPath()
        documentsPath = NavigationPath()
        accountPath = NavigationPath()
    }
}

// MARK: - Navigation Destinations

enum DashboardDestination: Hashable {
    case assetDetail(symbol: String)
    case transactionDetail(id: String)
    case notification
}

enum PortfolioDestination: Hashable {
    case assetDetail(symbol: String)
    case yieldHistory
}

enum TransactionDestination: Hashable {
    case detail(id: String)
    case statement(id: String)
    case filter
}

enum DocumentDestination: Hashable {
    case viewer(id: String)
    case statement(id: String)
}

enum AccountDestination: Hashable {
    case profile
    case security
    case notifications
    case withdrawals
    case support
}

// MARK: - Notification Extension

extension Notification.Name {
    static let handleDeepLink = Notification.Name("handleDeepLink")
}
