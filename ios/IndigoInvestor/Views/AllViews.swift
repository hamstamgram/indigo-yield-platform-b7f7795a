//
//  AllViews.swift
//  IndigoInvestor
//
//  Consolidated view imports
//

import SwiftUI

// Import all views from their respective files
// This is a temporary workaround until project file is updated

// MARK: - Portfolio View
struct PortfolioView: View {
    @EnvironmentObject var serviceLocator: ServiceLocator
    @StateObject private var viewModel = PortfolioViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Portfolio Overview Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Total Portfolio Value")
                            .font(.headline)
                            .foregroundColor(.secondary)

                        Text("$\(viewModel.totalValue, specifier: "%.2f")")
                            .font(.system(size: 34, weight: .bold))

                        HStack {
                            Label("\(viewModel.percentageChange >= 0 ? "+" : "")\(viewModel.percentageChange, specifier: "%.2f")%",
                                  systemImage: viewModel.percentageChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                                .foregroundColor(viewModel.percentageChange >= 0 ? .green : .red)
                                .font(.callout)

                            Spacer()

                            Text("Last 30 Days")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)

                    // Asset Allocation
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Asset Allocation")
                            .font(.headline)

                        ForEach(viewModel.assets) { asset in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(asset.name)
                                        .font(.subheadline)
                                    Text("\(asset.percentage, specifier: "%.1f")%")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                Text("$\(asset.value, specifier: "%.2f")")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.vertical, 8)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Portfolio")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Transactions View
struct TransactionsView: View {
    @StateObject private var viewModel = TransactionsViewModel()

    var body: some View {
        NavigationView {
            List {
                ForEach(viewModel.groupedTransactions, id: \.key) { section in
                    Section(header: Text(section.key)) {
                        ForEach(section.value) { transaction in
                            TransactionRowView(transaction: transaction)
                        }
                    }
                }
            }
            .navigationTitle("Transactions")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.refreshTransactions()
            }
        }
    }
}

// MARK: - Account View
struct AccountView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var serviceLocator: ServiceLocator

    var body: some View {
        NavigationView {
            List {
                // User Info Section
                Section {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.accentColor)

                        VStack(alignment: .leading) {
                            Text(authViewModel.currentUser?.fullName ?? "User")
                                .font(.headline)
                            Text(authViewModel.currentUser?.email ?? "")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Account Settings
                Section("Settings") {
                    NavigationLink(destination: Text("Profile Settings")) {
                        Label("Profile", systemImage: "person")
                    }

                    NavigationLink(destination: Text("Security Settings")) {
                        Label("Security", systemImage: "lock")
                    }

                    NavigationLink(destination: Text("Notifications")) {
                        Label("Notifications", systemImage: "bell")
                    }

                    NavigationLink(destination: Text("Privacy")) {
                        Label("Privacy", systemImage: "hand.raised")
                    }
                }

                // Support Section
                Section("Support") {
                    NavigationLink(destination: Text("Help Center")) {
                        Label("Help Center", systemImage: "questionmark.circle")
                    }

                    NavigationLink(destination: Text("Contact Support")) {
                        Label("Contact Support", systemImage: "message")
                    }

                    NavigationLink(destination: Text("About")) {
                        Label("About", systemImage: "info.circle")
                    }
                }

                // Sign Out
                Section {
                    Button(action: {
                        Task {
                            await authViewModel.signOut()
                        }
                    }) {
                        Label("Sign Out", systemImage: "arrow.right.square")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Admin Dashboard View
struct AdminDashboardView: View {
    @StateObject private var viewModel = AdminDashboardViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Key Metrics
                    HStack(spacing: 16) {
                        MetricCard(title: "Total AUM", value: "$\(viewModel.totalAUM)M", change: "+5.2%")
                        MetricCard(title: "Active Investors", value: "\(viewModel.activeInvestors)", change: "+12")
                    }

                    HStack(spacing: 16) {
                        MetricCard(title: "Avg Yield", value: "\(viewModel.averageYield)%", change: "+0.3%")
                        MetricCard(title: "Pending Requests", value: "\(viewModel.pendingRequests)", change: nil)
                    }

                    // Recent Activity
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Activity")
                            .font(.headline)

                        ForEach(viewModel.recentActivities) { activity in
                            HStack {
                                Image(systemName: activity.icon)
                                    .foregroundColor(.accentColor)
                                VStack(alignment: .leading) {
                                    Text(activity.title)
                                        .font(.subheadline)
                                    Text(activity.time)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Admin Dashboard")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Admin Investors View
struct AdminInvestorsView: View {
    @StateObject private var viewModel = AdminInvestorsViewModel()
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            List {
                ForEach(viewModel.filteredInvestors(searchText: searchText)) { investor in
                    NavigationLink(destination: InvestorDetailView(investor: investor)) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(investor.name)
                                    .font(.headline)
                                Text(investor.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("$\(investor.portfolioValue, specifier: "%.0f")")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(investor.status)
                                    .font(.caption)
                                    .foregroundColor(investor.isActive ? .green : .orange)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search investors")
            .navigationTitle("Investors")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Admin Approvals View
struct AdminApprovalsView: View {
    @StateObject private var viewModel = AdminApprovalsViewModel()

    var body: some View {
        NavigationView {
            List {
                if viewModel.pendingApprovals.isEmpty {
                    ContentUnavailableView("No Pending Approvals",
                                          systemImage: "checkmark.circle",
                                          description: Text("All requests have been processed"))
                } else {
                    ForEach(viewModel.pendingApprovals) { approval in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(approval.type)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.accentColor.opacity(0.2))
                                    .cornerRadius(4)

                                Spacer()

                                Text(approval.date, style: .relative)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Text(approval.title)
                                .font(.headline)

                            Text(approval.description)
                                .font(.subheadline)
                                .foregroundColor(.secondary)

                            HStack(spacing: 12) {
                                Button("Approve") {
                                    Task {
                                        await viewModel.approve(approval)
                                    }
                                }
                                .buttonStyle(.borderedProminent)

                                Button("Reject") {
                                    Task {
                                        await viewModel.reject(approval)
                                    }
                                }
                                .buttonStyle(.bordered)
                                .foregroundColor(.red)
                            }
                            .padding(.top, 4)
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Approvals")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.refresh()
            }
        }
    }
}

// MARK: - Admin Reports View
struct AdminReportsView: View {
    @StateObject private var viewModel = AdminReportsViewModel()

    var body: some View {
        NavigationView {
            List {
                Section("Quick Reports") {
                    NavigationLink(destination: Text("Monthly Performance")) {
                        Label("Monthly Performance", systemImage: "chart.line.uptrend.xyaxis")
                    }
                    NavigationLink(destination: Text("Investor Summary")) {
                        Label("Investor Summary", systemImage: "person.3")
                    }
                    NavigationLink(destination: Text("Transaction Report")) {
                        Label("Transaction Report", systemImage: "list.bullet.rectangle")
                    }
                    NavigationLink(destination: Text("Yield Analysis")) {
                        Label("Yield Analysis", systemImage: "percent")
                    }
                }

                Section("Custom Reports") {
                    NavigationLink(destination: Text("Report Builder")) {
                        Label("Create Custom Report", systemImage: "plus.circle")
                    }

                    ForEach(viewModel.savedReports) { report in
                        NavigationLink(destination: Text(report.name)) {
                            HStack {
                                Label(report.name, systemImage: "doc.text")
                                Spacer()
                                Text(report.lastRun, style: .date)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Reports")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Admin Settings View
struct AdminSettingsView: View {
    @StateObject private var viewModel = AdminSettingsViewModel()

    var body: some View {
        NavigationView {
            Form {
                Section("Platform Settings") {
                    Toggle("Maintenance Mode", isOn: $viewModel.maintenanceMode)
                    Toggle("New Registrations", isOn: $viewModel.allowRegistrations)
                    Toggle("Withdrawals Enabled", isOn: $viewModel.withdrawalsEnabled)
                }

                Section("Yield Settings") {
                    HStack {
                        Text("Default Yield Rate")
                        Spacer()
                        TextField("Rate", value: $viewModel.defaultYieldRate, format: .percent)
                            .multilineTextAlignment(.trailing)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 80)
                    }

                    HStack {
                        Text("Max Withdrawal")
                        Spacer()
                        TextField("Amount", value: $viewModel.maxWithdrawal, format: .currency(code: "USD"))
                            .multilineTextAlignment(.trailing)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 120)
                    }
                }

                Section("Notifications") {
                    Toggle("Email Notifications", isOn: $viewModel.emailNotifications)
                    Toggle("Push Notifications", isOn: $viewModel.pushNotifications)
                    Toggle("SMS Alerts", isOn: $viewModel.smsAlerts)
                }

                Section {
                    Button("Save Settings") {
                        Task {
                            await viewModel.saveSettings()
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.accentColor)
                    .cornerRadius(8)
                }
            }
            .navigationTitle("Admin Settings")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Supporting Views
struct MetricCard: View {
    let title: String
    let value: String
    let change: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            if let change = change {
                Text(change)
                    .font(.caption)
                    .foregroundColor(change.starts(with: "+") ? .green : .red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct TransactionRowView: View {
    let transaction: Transaction

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(transaction.description)
                    .font(.subheadline)
                Text(transaction.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text("$\(transaction.amount, specifier: "%.2f")")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(transaction.type == .credit ? .green : .primary)
        }
    }
}

struct InvestorDetailView: View {
    let investor: Investor

    var body: some View {
        Text("Investor Details: \(investor.name)")
            .navigationTitle(investor.name)
            .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - View Models (Temporary)
class PortfolioViewModel: ObservableObject {
    @Published var totalValue: Double = 250000
    @Published var percentageChange: Double = 5.2
    @Published var assets: [AssetAllocation] = []

    struct AssetAllocation: Identifiable {
        let id = UUID()
        let name: String
        let value: Double
        let percentage: Double
    }
}

class TransactionsViewModel: ObservableObject {
    @Published var groupedTransactions: [(key: String, value: [Transaction])] = []

    func refreshTransactions() async {
        // Refresh logic
    }
}

struct Transaction: Identifiable {
    let id = UUID()
    let description: String
    let amount: Double
    let date: Date
    let type: TransactionType

    enum TransactionType {
        case credit, debit
    }
}

struct Investor: Identifiable {
    let id = UUID()
    let name: String
    let email: String
    let portfolioValue: Double
    let status: String
    let isActive: Bool
}

class AdminDashboardViewModel: ObservableObject {
    @Published var totalAUM: Int = 125
    @Published var activeInvestors: Int = 342
    @Published var averageYield: Double = 8.5
    @Published var pendingRequests: Int = 7
    @Published var recentActivities: [Activity] = []

    struct Activity: Identifiable {
        let id = UUID()
        let title: String
        let time: String
        let icon: String
    }
}

class AdminInvestorsViewModel: ObservableObject {
    @Published var investors: [Investor] = []

    func filteredInvestors(searchText: String) -> [Investor] {
        if searchText.isEmpty {
            return investors
        }
        return investors.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText)
        }
    }
}

class AdminApprovalsViewModel: ObservableObject {
    @Published var pendingApprovals: [Approval] = []

    struct Approval: Identifiable {
        let id = UUID()
        let type: String
        let title: String
        let description: String
        let date: Date
    }

    func approve(_ approval: Approval) async {
        // Approve logic
    }

    func reject(_ approval: Approval) async {
        // Reject logic
    }

    func refresh() async {
        // Refresh logic
    }
}

class AdminReportsViewModel: ObservableObject {
    @Published var savedReports: [SavedReport] = []

    struct SavedReport: Identifiable {
        let id = UUID()
        let name: String
        let lastRun: Date
    }
}

class AdminSettingsViewModel: ObservableObject {
    @Published var maintenanceMode = false
    @Published var allowRegistrations = true
    @Published var withdrawalsEnabled = true
    @Published var defaultYieldRate = 0.085
    @Published var maxWithdrawal = 50000.0
    @Published var emailNotifications = true
    @Published var pushNotifications = true
    @Published var smsAlerts = false

    func saveSettings() async {
        // Save logic
    }
}
// MARK: - Admin More Menu View with All 15 Items

struct AdminMoreMenuView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var serviceLocator: ServiceLocator
    @State private var showingLogoutAlert = false

    var body: some View {
        NavigationView {
            List {
                Section("Reports & Analytics") {
                    NavigationLink(destination: AdminHistoricalReportsView()) {
                        MenuRow(
                            icon: "chart.bar.xaxis",
                            title: "Historical Reports",
                            color: .blue
                        )
                    }

                    NavigationLink(destination: AdminAuditView()) {
                        MenuRow(
                            icon: "shield.checkered",
                            title: "Audit",
                            color: .purple
                        )
                    }
                }

                Section("Fund Management") {
                    NavigationLink(destination: AdminPortfolioView()) {
                        MenuRow(
                            icon: "chart.pie",
                            title: "Portfolio",
                            color: .green
                        )
                    }

                    NavigationLink(destination: AdminFundManagementView()) {
                        MenuRow(
                            icon: "chart.line.uptrend.xyaxis",
                            title: "Fund Management",
                            color: .orange
                        )
                    }

                    NavigationLink(destination: AdminYieldManagementView()) {
                        MenuRow(
                            icon: "target",
                            title: "Yield Management",
                            color: .red
                        )
                    }

                    NavigationLink(destination: AdminSetupAUMView()) {
                        MenuRow(
                            icon: "cylinder.split.1x2",
                            title: "Setup AUM",
                            color: .indigo
                        )
                    }

                    NavigationLink(destination: AdminTestYieldView()) {
                        MenuRow(
                            icon: "flask",
                            title: "Test Yield",
                            color: .yellow
                        )
                    }
                }

                Section("Operations") {
                    NavigationLink(destination: AdminSupportQueueView()) {
                        MenuRow(
                            icon: "message.badge",
                            title: "Support Queue",
                            color: .teal
                        )
                    }

                    NavigationLink(destination: AdminRequestsView()) {
                        MenuRow(
                            icon: "list.clipboard",
                            title: "Requests",
                            color: .cyan
                        )
                    }

                    NavigationLink(destination: AdminDocumentsView()) {
                        MenuRow(
                            icon: "folder.badge.plus",
                            title: "Documents",
                            color: .brown
                        )
                    }

                    NavigationLink(destination: AdminExcelImportView()) {
                        MenuRow(
                            icon: "square.and.arrow.up",
                            title: "Excel Import",
                            color: .mint
                        )
                    }
                }

                Section("Account") {
                    NavigationLink(destination: AdminSettingsView()) {
                        MenuRow(
                            icon: "gearshape",
                            title: "Settings",
                            color: .gray
                        )
                    }

                    Button(action: { showingLogoutAlert = true }) {
                        MenuRow(
                            icon: "arrow.right.square",
                            title: "Sign Out",
                            color: .red
                        )
                    }
                }
            }
            .navigationTitle("More")
            .listStyle(InsetGroupedListStyle())
            .alert("Sign Out", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    Task {
                        await authViewModel.signOut()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

// MARK: - Menu Row Component

struct MenuRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24, height: 24)
                .padding(.trailing, 8)

            Text(title)
                .foregroundColor(.primary)

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Placeholder Views for New Admin Screens

struct AdminHistoricalReportsView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Historical Reports",
            icon: "chart.bar.xaxis",
            description: "View historical performance reports and analytics"
        )
    }
}

struct AdminPortfolioView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Portfolio",
            icon: "chart.pie",
            description: "Manage portfolio allocations and positions"
        )
    }
}

struct AdminFundManagementView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Fund Management",
            icon: "chart.line.uptrend.xyaxis",
            description: "Manage funds and investor allocations"
        )
    }
}

struct AdminYieldManagementView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Yield Management",
            icon: "target",
            description: "Manage yield distributions and calculations"
        )
    }
}

struct AdminSetupAUMView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Setup AUM",
            icon: "cylinder.split.1x2",
            description: "Configure Assets Under Management"
        )
    }
}

struct AdminTestYieldView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Test Yield",
            icon: "flask",
            description: "Test yield calculations and distributions"
        )
    }
}

struct AdminSupportQueueView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Support Queue",
            icon: "message.badge",
            description: "Manage customer support requests"
        )
    }
}

struct AdminRequestsView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Requests",
            icon: "list.clipboard",
            description: "View and manage investor requests"
        )
    }
}

struct AdminDocumentsView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Documents",
            icon: "folder.badge.plus",
            description: "Manage investor documents and agreements"
        )
    }
}

struct AdminExcelImportView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Excel Import",
            icon: "square.and.arrow.up",
            description: "Import data from Excel spreadsheets"
        )
    }
}

struct AdminAuditView: View {
    var body: some View {
        AdminPlaceholderView(
            title: "Audit",
            icon: "shield.checkered",
            description: "View audit logs and system activities"
        )
    }
}

// MARK: - Admin Placeholder View Helper

struct AdminPlaceholderView: View {
    let title: String
    let icon: String
    let description: String

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.accentColor)

            Text(title)
                .font(.title)
                .bold()

            Text(description)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()
        }
        .padding(.top, 100)
        .navigationBarTitleDisplayMode(.inline)
    }
}
