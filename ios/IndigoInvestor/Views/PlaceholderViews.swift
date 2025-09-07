//
//  PlaceholderViews.swift
//  IndigoInvestor
//
//  Placeholder views for navigation
//

import SwiftUI

// MARK: - Common Views

struct LoadingView: View {
    var body: some View {
        VStack {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .scaleEffect(1.5)
            Text("Loading...")
                .padding(.top)
                .foregroundColor(.secondary)
        }
    }
}

struct NetworkMonitor: ObservableObject {
    @Published var isConnected = true
}

// MARK: - LP Views

struct PortfolioView: View {
    var body: some View {
        NavigationView {
            Text("Portfolio View")
                .navigationTitle("Portfolio")
        }
    }
}

struct TransactionsView: View {
    var body: some View {
        NavigationView {
            Text("Transactions View")
                .navigationTitle("Transactions")
        }
    }
}

struct DocumentsView: View {
    var body: some View {
        NavigationView {
            Text("Documents View")
                .navigationTitle("Documents")
        }
    }
}

struct AccountView: View {
    var body: some View {
        NavigationView {
            Text("Account View")
                .navigationTitle("Account")
        }
    }
}

struct WithdrawalRequestView: View {
    var body: some View {
        NavigationView {
            Text("Withdrawal Request")
                .navigationTitle("Request Withdrawal")
        }
    }
}

// MARK: - Admin Views

struct AdminDashboardView: View {
    var body: some View {
        NavigationView {
            Text("Admin Dashboard")
                .navigationTitle("Admin Dashboard")
        }
    }
}

struct AdminInvestorsView: View {
    var body: some View {
        NavigationView {
            Text("Investors Management")
                .navigationTitle("Investors")
        }
    }
}

struct AdminApprovalsView: View {
    var body: some View {
        NavigationView {
            Text("Pending Approvals")
                .navigationTitle("Approvals")
        }
    }
}

struct AdminReportsView: View {
    var body: some View {
        NavigationView {
            Text("Reports")
                .navigationTitle("Reports")
        }
    }
}

struct AdminSettingsView: View {
    var body: some View {
        NavigationView {
            Text("Admin Settings")
                .navigationTitle("Settings")
        }
    }
}

// MARK: - Dashboard ViewModel

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var portfolio: Portfolio?
    @Published var isLoading = false
    @Published var performanceData: [PerformanceData]?
    @Published var recentTransactions: [Transaction] = []
    
    func loadData() async {
        isLoading = true
        // Simulate loading
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        isLoading = false
    }
    
    func refreshData() async {
        await loadData()
    }
    
    func loadPerformanceData(for range: DashboardView.TimeRange) async {
        // Load performance data for range
    }
}
