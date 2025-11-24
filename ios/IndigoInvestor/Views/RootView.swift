//
//  RootView.swift
//  IndigoInvestor
//
//  Root navigation view
//

import SwiftUI

struct RootView: View {
    @EnvironmentObject var serviceLocator: ServiceLocator
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var networkMonitor: NetworkMonitor
    
    @State private var showBiometricPrompt = false
    @State private var selectedTab = 0
    
    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                authenticatedView
            } else if authViewModel.isLoading {
                LoadingView()
            } else {
                AuthenticationView()
            }
        }
        .overlay(networkBanner, alignment: .top)
        .onAppear {
            Task {
                await initializeApp()
            }
        }
    }
    
    @ViewBuilder
    private var authenticatedView: some View {
        if authViewModel.userRole == .admin {
            AdminTabView(selectedTab: $selectedTab)
        } else {
            InvestorTabView(selectedTab: $selectedTab)
        }
    }
    
    @ViewBuilder
    private var networkBanner: some View {
        if !networkMonitor.isConnected {
            OfflineBanner()
                .transition(.move(edge: .top))
                .animation(.easeInOut, value: networkMonitor.isConnected)
        }
    }
    
    private func initializeApp() async {
        // Check biometric availability
        await authViewModel.checkBiometricAvailability()
        
        // Attempt to restore session
        await authViewModel.restoreSession()
        
        // If session exists and biometric is enabled, prompt for authentication
        if authViewModel.isAuthenticated && 
           serviceLocator.keychainManager.isBiometricEnabled() &&
           serviceLocator.biometricManager.isAvailable {
            showBiometricPrompt = true
        }
    }
}

// MARK: - Investor Tab View

struct InvestorTabView: View {
    @Binding var selectedTab: Int

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }
                .tag(0)

            StatementsView()
                .tabItem {
                    Label("Statements", systemImage: "doc.text.fill")
                }
                .tag(1)

            TransactionsView()
                .tabItem {
                    Label("Transactions", systemImage: "creditcard.fill")
                }
                .tag(2)

            WithdrawalsView()
                .tabItem {
                    Label("Withdrawals", systemImage: "arrow.down.circle.fill")
                }
                .tag(3)

            MoreMenuView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
                .tag(4)
        }
    }
}

// MARK: - Admin Tab View

struct AdminTabView: View {
    @Binding var selectedTab: Int

    var body: some View {
        TabView(selection: $selectedTab) {
            AdminDashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.line.uptrend.xyaxis")
                }
                .tag(0)

            AdminInvestorsView()
                .tabItem {
                    Label("Investors", systemImage: "person.3.fill")
                }
                .tag(1)

            AdminWithdrawalsView()
                .tabItem {
                    Label("Withdrawals", systemImage: "arrow.down.circle.fill")
                }
                .tag(2)

            AdminReportsView()
                .tabItem {
                    Label("Reports", systemImage: "chart.bar.doc.horizontal")
                }
                .tag(3)

            AdminMoreMenuView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
                .tag(4)
        }
    }
}
