//
//  AdminSettingsView.swift
//  IndigoInvestor
//
//  Admin settings and configuration view
//

import SwiftUI

struct AdminSettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingLogoutAlert = false
    @State private var selectedSection = 0

    var body: some View {
        List {
                // Platform Settings
                Section("Platform Settings") {
                    NavigationLink(destination: PlatformConfigView()) {
                        SettingRow(icon: "gearshape.2.fill", title: "Platform Configuration", color: .blue)
                    }

                    NavigationLink(destination: FeatureFlagsView()) {
                        SettingRow(icon: "flag.fill", title: "Feature Flags", color: .orange)
                    }

                    NavigationLink(destination: MaintenanceModeView()) {
                        SettingRow(icon: "wrench.and.screwdriver.fill", title: "Maintenance Mode", color: .red)
                    }
                }

                // Content Management
                Section("Content Management") {
                    NavigationLink(destination: EventsManagementView()) {
                        SettingRow(icon: "calendar", title: "Events", color: .purple)
                    }

                    NavigationLink(destination: NewsletterManagementView()) {
                        SettingRow(icon: "envelope.fill", title: "Newsletters", color: .green)
                    }

                    NavigationLink(destination: NotificationsManagementView()) {
                        SettingRow(icon: "bell.fill", title: "Push Notifications", color: .orange)
                    }
                }

                // Security & Compliance
                Section("Security & Compliance") {
                    NavigationLink(destination: SecuritySettingsAdminView()) {
                        SettingRow(icon: "lock.shield.fill", title: "Security Settings", color: .red)
                    }

                    NavigationLink(destination: AuditLogView()) {
                        SettingRow(icon: "doc.text.magnifyingglass", title: "Audit Log", color: .gray)
                    }

                    NavigationLink(destination: ComplianceView()) {
                        SettingRow(icon: "checkmark.seal.fill", title: "Compliance", color: .green)
                    }
                }

                // User Management
                Section("User Management") {
                    NavigationLink(destination: RolesPermissionsView()) {
                        SettingRow(icon: "person.2.badge.key.fill", title: "Roles & Permissions", color: .indigo)
                    }

                    NavigationLink(destination: AccessControlView()) {
                        SettingRow(icon: "person.crop.circle.badge.checkmark", title: "Access Control", color: .blue)
                    }
                }

                // System
                Section("System") {
                    NavigationLink(destination: BackupRestoreView()) {
                        SettingRow(icon: "externaldrive.fill", title: "Backup & Restore", color: .gray)
                    }

                    NavigationLink(destination: IntegrationsView()) {
                        SettingRow(icon: "app.connected.to.app.below.fill", title: "Integrations", color: .purple)
                    }

                    NavigationLink(destination: APISettingsView()) {
                        SettingRow(icon: "network", title: "API Settings", color: .orange)
                    }
                }

                // Account
                Section("Account") {
                    NavigationLink(destination: AdminProfileView()) {
                        SettingRow(icon: "person.circle.fill", title: "Admin Profile", color: .blue)
                    }

                    Button(action: { showingLogoutAlert = true }) {
                        SettingRow(icon: "arrow.right.square.fill", title: "Sign Out", color: .red)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .alert("Sign Out", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task {
                        try? await authViewModel.logout()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
    }
}

struct SettingRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(color)
                .frame(width: 28, height: 28)
                .background(color.opacity(0.1))
                .cornerRadius(6)

            Text(title)
                .font(.body)

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Placeholder Views for Navigation Destinations

struct PlatformConfigView: View {
    var body: some View {
        Text("Platform Configuration")
            .navigationTitle("Platform Config")
    }
}

struct FeatureFlagsView: View {
    var body: some View {
        Text("Feature Flags Management")
            .navigationTitle("Feature Flags")
    }
}

struct MaintenanceModeView: View {
    @State private var isMaintenanceEnabled = false

    var body: some View {
        Form {
            Toggle("Enable Maintenance Mode", isOn: $isMaintenanceEnabled)

            if isMaintenanceEnabled {
                Section("Maintenance Message") {
                    TextEditor(text: .constant("The platform is currently under maintenance. Please check back later."))
                        .frame(height: 100)
                }
            }
        }
        .navigationTitle("Maintenance Mode")
    }
}

struct EventsManagementView: View {
    var body: some View {
        List {
            ForEach(0..<5) { index in
                VStack(alignment: .leading, spacing: 8) {
                    Text("Investor Webinar \(index + 1)")
                        .font(.headline)
                    Text("Date: March \(15 + index), 2024")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Status: Upcoming")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.2))
                        .cornerRadius(4)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Events")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {}) {
                    Image(systemName: "plus")
                }
            }
        }
    }
}

struct NewsletterManagementView: View {
    var body: some View {
        List {
            ForEach(0..<3) { index in
                VStack(alignment: .leading, spacing: 8) {
                    Text("Monthly Newsletter - Q\(index + 1) 2024")
                        .font(.headline)
                    Text("Subscribers: 1,234")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Status: Sent")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(4)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Newsletters")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {}) {
                    Text("Compose")
                }
            }
        }
    }
}

struct NotificationsManagementView: View {
    var body: some View {
        Text("Push Notifications Management")
            .navigationTitle("Notifications")
    }
}

struct SecuritySettingsAdminView: View {
    var body: some View {
        Text("Security Settings")
            .navigationTitle("Security")
    }
}

struct AuditLogView: View {
    var body: some View {
        Text("Audit Log")
            .navigationTitle("Audit Log")
    }
}

struct ComplianceView: View {
    var body: some View {
        Text("Compliance Management")
            .navigationTitle("Compliance")
    }
}

struct RolesPermissionsView: View {
    var body: some View {
        Text("Roles & Permissions")
            .navigationTitle("Roles & Permissions")
    }
}

struct AccessControlView: View {
    var body: some View {
        Text("Access Control")
            .navigationTitle("Access Control")
    }
}

struct BackupRestoreView: View {
    var body: some View {
        Text("Backup & Restore")
            .navigationTitle("Backup & Restore")
    }
}

struct IntegrationsView: View {
    var body: some View {
        Text("Integrations")
            .navigationTitle("Integrations")
    }
}

struct APISettingsView: View {
    var body: some View {
        Text("API Settings")
            .navigationTitle("API Settings")
    }
}

struct AdminProfileView: View {
    var body: some View {
        Text("Admin Profile")
            .navigationTitle("Admin Profile")
    }
}

#Preview {
    AdminSettingsView()
        .environmentObject(AuthViewModel())
}