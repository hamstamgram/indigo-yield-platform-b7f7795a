//
//  MainTabView.swift
//  IndigoInvestor
//
//  Main tab navigation for the app
//  Modern 4-tab structure: Home, Invest, Activity, Account
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
            // Tab 1: Home (Dashboard)
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
                Label("Home", systemImage: "house.fill")
            }
            .tag(0)

            // Tab 2: Invest (Portfolio + Markets)
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
                Label("Invest", systemImage: "chart.line.uptrend.xyaxis")
            }
            .tag(1)

            // Tab 3: Activity (Transactions)
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
                Label("Activity", systemImage: "clock.arrow.circlepath")
            }
            .tag(2)

            // Tab 4: Account (Profile, Settings, Docs)
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
                        case .documents:
                            DocumentsVaultView() // Moved Documents here
                        }
                    }
            }
            .tabItem {
                Label("Account", systemImage: "person.fill")
            }
            .tag(3)
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
        // Modern minimal tab bar
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.systemBackground
        
        // Remove shadow line for cleaner look
        appearance.shadowImage = UIImage()
        appearance.shadowColor = .clear
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().tintColor = UIColor(DesignTokens.Colors.indigoPrimary)
        UITabBar.appearance().unselectedItemTintColor = UIColor.gray
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
                selectedTab = 3 // Account tab
                navigationState.accountPath.append(.documents)
                // Then navigate to specific statement if possible, or let vault handle it
            }
        case "/transaction":
            if let transactionId = components.queryItems?.first(where: { $0.name == "id" })?.value {
                selectedTab = 2 // Activity tab
                navigationState.transactionsPath.append(.detail(transactionId))
            }
        case "/withdraw":
            showingWithdrawalSheet = true
        case "/invest":
            selectedTab = 1 // Invest tab
        default:
            break
        }
    }
    
    private func trackTabSwitch(to tab: Int) {
        let tabName = ["home", "invest", "activity", "account"][tab]
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
    case documents
}

// MARK: - Notification Extension

extension Notification.Name {
    static let handleDeepLink = Notification.Name("handleDeepLink")
}
