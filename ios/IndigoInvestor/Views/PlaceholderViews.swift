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

// NetworkMonitor moved to Core/Network/NetworkMonitor.swift

// MARK: - LP Views
// These are temporary placeholders - real implementations exist in separate files
// Will be removed once all views are properly wired up

struct DocumentsView: View {
    var body: some View {
        NavigationView {
            Text("Documents View")
                .navigationTitle("Documents")
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

// MARK: - Temporary View Placeholders
// These are temporary until the project file is fixed

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

struct AccountView: View {
    var body: some View {
        NavigationView {
            Text("Account View")
                .navigationTitle("Account")
        }
    }
}

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

// MARK: - Additional Investor Views

struct StatementsView: View {
    var body: some View {
        NavigationView {
            Text("Statements View")
                .navigationTitle("Statements")
        }
    }
}

struct WithdrawalsView: View {
    var body: some View {
        NavigationView {
            Text("Withdrawals View")
                .navigationTitle("Withdrawals")
        }
    }
}

struct MoreMenuView: View {
    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    NavigationLink(destination: DocumentsView()) {
                        Label("Documents", systemImage: "folder")
                    }
                    NavigationLink(destination: SupportView()) {
                        Label("Support", systemImage: "questionmark.circle")
                    }
                    NavigationLink(destination: NotificationsView()) {
                        Label("Notifications", systemImage: "bell")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

// MARK: - Additional Admin Views

struct AdminWithdrawalsView: View {
    var body: some View {
        NavigationView {
            Text("Admin Withdrawals Management")
                .navigationTitle("Withdrawals")
        }
    }
}

// AdminMoreMenuView - full implementation (copied from Views/Admin/AdminMoreMenuView.swift)
struct AdminMoreMenuView: View {
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
                    // Sign out action would go here
                    print("Sign out tapped")
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

// Menu Row Component
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

// Supporting Admin Views
struct AdminHistoricalReportsView: View {
    var body: some View {
        Text("Historical Reports")
            .navigationTitle("Historical Reports")
    }
}

struct AdminPortfolioView: View {
    var body: some View {
        Text("Portfolio Management")
            .navigationTitle("Portfolio")
    }
}

struct AdminFundManagementView: View {
    var body: some View {
        Text("Fund Management")
            .navigationTitle("Fund Management")
    }
}

struct AdminYieldManagementView: View {
    var body: some View {
        Text("Yield Management")
            .navigationTitle("Yield Management")
    }
}

struct AdminSetupAUMView: View {
    var body: some View {
        Text("Setup AUM")
            .navigationTitle("Setup AUM")
    }
}

struct AdminTestYieldView: View {
    var body: some View {
        Text("Test Yield")
            .navigationTitle("Test Yield")
    }
}

struct AdminSupportQueueView: View {
    var body: some View {
        Text("Support Queue")
            .navigationTitle("Support Queue")
    }
}

struct AdminRequestsView: View {
    var body: some View {
        Text("Requests")
            .navigationTitle("Requests")
    }
}

struct AdminDocumentsView: View {
    var body: some View {
        Text("Documents Management")
            .navigationTitle("Documents")
    }
}

struct AdminExcelImportView: View {
    var body: some View {
        Text("Excel Import")
            .navigationTitle("Excel Import")
    }
}

struct AdminAuditView: View {
    var body: some View {
        Text("Audit")
            .navigationTitle("Audit")
    }
}

// These are commented out as they're now defined above
/*
struct AdminYieldSettingsView: View {
    var body: some View {
        Text("Yield Settings")
            .navigationTitle("Yield Settings")
    }
}

struct AdminHistoricalReportsView: View {
    var body: some View {
        Text("Historical Reports")
            .navigationTitle("Historical Reports")
    }
}

struct AdminSupportQueueView: View {
    var body: some View {
        Text("Support Queue")
            .navigationTitle("Support Queue")
    }
}

struct AdminRequestsView: View {
    var body: some View {
        Text("Requests")
            .navigationTitle("Requests")
    }
}

struct AdminDocumentsView: View {
    var body: some View {
        Text("Documents Management")
            .navigationTitle("Documents")
    }
}

struct AdminPortfolioView: View {
    var body: some View {
        Text("Portfolio Management")
            .navigationTitle("Portfolio")
    }
}

struct AdminExcelImportView: View {
    var body: some View {
        Text("Excel Import")
            .navigationTitle("Excel Import")
    }
}

struct AdminAuditView: View {
    var body: some View {
        Text("Audit")
            .navigationTitle("Audit")
    }
}
*/

// Supporting Views
struct SupportView: View {
    var body: some View {
        Text("Support")
            .navigationTitle("Support")
    }
}

struct NotificationsView: View {
    var body: some View {
        Text("Notifications")
            .navigationTitle("Notifications")
    }
}

// MARK: - Dashboard ViewModel moved to ViewModels/DashboardViewModel.swift
