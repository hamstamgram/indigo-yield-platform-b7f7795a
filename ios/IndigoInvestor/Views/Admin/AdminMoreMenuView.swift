//
//  AdminMoreMenuView.swift
//  IndigoInvestor
//
//  Admin More Menu - Contains additional admin features
//  Implements all 15 menu items from website navigation
//

import SwiftUI

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

// MARK: - Placeholder Views for New Screens

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

// MARK: - Helper Components

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

