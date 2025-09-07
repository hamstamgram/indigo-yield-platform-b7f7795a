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
        .task {
            await initializeApp()
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
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }
                .tag(0)
            
            PortfolioView()
                .tabItem {
                    Label("Portfolio", systemImage: "briefcase.fill")
                }
                .tag(1)
            
            TransactionsView()
                .tabItem {
                    Label("Transactions", systemImage: "arrow.left.arrow.right")
                }
                .tag(2)
            
            DocumentsView()
                .tabItem {
                    Label("Documents", systemImage: "doc.text.fill")
                }
                .tag(3)
            
            AccountView()
                .tabItem {
                    Label("Account", systemImage: "person.circle.fill")
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
            
            AdminApprovalsView()
                .tabItem {
                    Label("Approvals", systemImage: "checkmark.shield.fill")
                }
                .tag(2)
            
            AdminReportsView()
                .tabItem {
                    Label("Reports", systemImage: "chart.bar.doc.horizontal")
                }
                .tag(3)
            
            AdminSettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
        }
    }
}

// MARK: - Offline Banner

struct OfflineBanner: View {
    var body: some View {
        HStack {
            Image(systemName: "wifi.slash")
                .foregroundColor(.white)
            
            Text("You're offline. Some features may be limited.")
                .font(.caption)
                .foregroundColor(.white)
            
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color.orange)
        .shadow(radius: 2)
    }
}
