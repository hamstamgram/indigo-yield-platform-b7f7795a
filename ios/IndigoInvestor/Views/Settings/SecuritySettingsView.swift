//
//  SecuritySettingsView.swift
//  IndigoInvestor
//
//  Enhanced security controls with session management and audit logs
//

import SwiftUI

struct SecuritySettingsView: View {
    @StateObject private var viewModel = SecuritySettingsViewModel()
    @State private var showingPasswordChange = false
    @State private var showingDeviceDetail: DeviceInfo?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl2) {
                    // Password Section
                    PasswordSection(showingPasswordChange: $showingPasswordChange)

                    // Two-Factor Authentication
                    TwoFactorSection(viewModel: viewModel)

                    // Active Sessions
                    ActiveSessionsSection(viewModel: viewModel)

                    // Devices
                    DevicesSection(
                        viewModel: viewModel,
                        showingDeviceDetail: $showingDeviceDetail
                    )

                    // Login History
                    LoginHistorySection(viewModel: viewModel)

                    // Security Audit Log
                    SecurityAuditSection(viewModel: viewModel)
                }
                .padding(IndigoTheme.Spacing.xl)
                .padding(.bottom, IndigoTheme.Spacing.xl3)
            }

            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay(message: "Loading security settings...")
            }
        }
        .navigationTitle("Security")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showingPasswordChange) {
            NavigationStack {
                PasswordChangeView()
            }
        }
        .sheet(item: $showingDeviceDetail) { device in
            DeviceDetailSheet(device: device) {
                Task {
                    await viewModel.removeDevice(device)
                }
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .task {
            await viewModel.loadSecurityData()
        }
    }
}

// MARK: - Password Section
private struct PasswordSection: View {
    @Binding var showingPasswordChange: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "key.fill",
                title: "Password",
                color: IndigoTheme.Colors.primary
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                InfoRow(
                    label: "Last Changed",
                    value: "30 days ago"
                )

                Button {
                    showingPasswordChange = true
                } label: {
                    HStack {
                        Image(systemName: "lock.rotation")
                            .font(.title3)
                            .foregroundColor(IndigoTheme.Colors.primary)

                        Text("Change Password")
                            .font(IndigoTheme.Typography.callout.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.primaryText)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.tertiaryText)
                    }
                    .padding(IndigoTheme.Spacing.lg)
                    .background(IndigoTheme.Colors.secondaryBackground)
                    .cornerRadius(IndigoTheme.CornerRadius.lg)
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Two-Factor Authentication Section
private struct TwoFactorSection: View {
    @ObservedObject var viewModel: SecuritySettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "lock.shield.fill",
                title: "Two-Factor Authentication",
                color: IndigoTheme.Colors.success
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("Status")
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.secondaryText)

                        HStack(spacing: IndigoTheme.Spacing.sm) {
                            Image(systemName: viewModel.has2FA ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundColor(viewModel.has2FA ? IndigoTheme.Colors.success : IndigoTheme.Colors.error)

                            Text(viewModel.has2FA ? "Enabled" : "Disabled")
                                .font(IndigoTheme.Typography.callout.weight(.medium))
                                .foregroundColor(IndigoTheme.Colors.primaryText)
                        }
                    }

                    Spacer()

                    Toggle("", isOn: $viewModel.has2FA)
                        .labelsHidden()
                        .onChange(of: viewModel.has2FA) { _, newValue in
                            Task {
                                await viewModel.toggle2FA(newValue)
                            }
                        }
                }
                .padding(IndigoTheme.Spacing.lg)
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.lg)

                if viewModel.has2FA {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                        Text("Backup Codes")
                            .font(IndigoTheme.Typography.caption1.weight(.medium))
                            .foregroundColor(IndigoTheme.Colors.primaryText)

                        Text("\(viewModel.backupCodesRemaining) of 10 codes remaining")
                            .font(IndigoTheme.Typography.caption2)
                            .foregroundColor(IndigoTheme.Colors.secondaryText)

                        if viewModel.backupCodesRemaining < 3 {
                            HStack(spacing: IndigoTheme.Spacing.xs) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.caption2)
                                Text("Generate new backup codes soon")
                                    .font(IndigoTheme.Typography.caption2)
                            }
                            .foregroundColor(IndigoTheme.Colors.warning)
                        }
                    }
                    .padding(IndigoTheme.Spacing.md)
                    .background(IndigoTheme.Colors.warning.opacity(IndigoTheme.Opacity.level5))
                    .cornerRadius(IndigoTheme.CornerRadius.md)
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Active Sessions Section
private struct ActiveSessionsSection: View {
    @ObservedObject var viewModel: SecuritySettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "desktopcomputer",
                title: "Active Sessions",
                color: IndigoTheme.Colors.primary
            )

            if viewModel.sessions.isEmpty {
                EmptyStateView(message: "No active sessions")
            } else {
                VStack(spacing: IndigoTheme.Spacing.md) {
                    ForEach(viewModel.sessions) { session in
                        SessionCard(
                            session: session,
                            onRevoke: {
                                Task {
                                    await viewModel.revokeSession(session)
                                }
                            }
                        )
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Devices Section
private struct DevicesSection: View {
    @ObservedObject var viewModel: SecuritySettingsViewModel
    @Binding var showingDeviceDetail: DeviceInfo?

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "iphone.and.ipad",
                title: "Trusted Devices",
                color: IndigoTheme.Colors.primary
            )

            if viewModel.devices.isEmpty {
                EmptyStateView(message: "No trusted devices")
            } else {
                VStack(spacing: IndigoTheme.Spacing.md) {
                    ForEach(viewModel.devices) { device in
                        DeviceCard(device: device) {
                            showingDeviceDetail = device
                        }
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Login History Section
private struct LoginHistorySection: View {
    @ObservedObject var viewModel: SecuritySettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "clock.arrow.circlepath",
                title: "Recent Login Activity",
                color: IndigoTheme.Colors.primary
            )

            if viewModel.loginHistory.isEmpty {
                EmptyStateView(message: "No login history")
            } else {
                VStack(spacing: IndigoTheme.Spacing.md) {
                    ForEach(viewModel.loginHistory.prefix(5)) { login in
                        LoginHistoryCard(login: login)
                    }

                    if viewModel.loginHistory.count > 5 {
                        Button("View All History") {
                            // Navigate to full history
                        }
                        .font(IndigoTheme.Typography.callout.weight(.medium))
                        .foregroundColor(IndigoTheme.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .padding(IndigoTheme.Spacing.md)
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Security Audit Section
private struct SecurityAuditSection: View {
    @ObservedObject var viewModel: SecuritySettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                icon: "chart.bar.doc.horizontal",
                title: "Security Audit Log",
                color: IndigoTheme.Colors.primary
            )

            if viewModel.auditLog.isEmpty {
                EmptyStateView(message: "No security events")
            } else {
                VStack(spacing: IndigoTheme.Spacing.md) {
                    ForEach(viewModel.auditLog.prefix(5)) { event in
                        AuditLogCard(event: event)
                    }

                    if viewModel.auditLog.count > 5 {
                        Button("View Full Audit Log") {
                            // Navigate to full log
                        }
                        .font(IndigoTheme.Typography.callout.weight(.medium))
                        .foregroundColor(IndigoTheme.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .padding(IndigoTheme.Spacing.md)
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Reusable Components

private struct SectionHeader: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(title)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)
        }
    }
}

private struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(IndigoTheme.Typography.callout)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            Spacer()

            Text(value)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.primaryText)
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct SessionCard: View {
    let session: SessionInfo
    let onRevoke: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                    HStack(spacing: IndigoTheme.Spacing.sm) {
                        Image(systemName: session.deviceIcon)
                            .foregroundColor(IndigoTheme.Colors.primary)

                        Text(session.deviceName)
                            .font(IndigoTheme.Typography.callout.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.primaryText)

                        if session.isCurrent {
                            Text("Current")
                                .font(IndigoTheme.Typography.caption2)
                                .foregroundColor(IndigoTheme.Colors.success)
                                .padding(.horizontal, IndigoTheme.Spacing.sm)
                                .padding(.vertical, IndigoTheme.Spacing.xs)
                                .background(IndigoTheme.Colors.success.opacity(IndigoTheme.Opacity.level10))
                                .cornerRadius(IndigoTheme.CornerRadius.sm)
                        }
                    }

                    Text(session.location)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                if !session.isCurrent {
                    Button(action: onRevoke) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundColor(IndigoTheme.Colors.error)
                    }
                }
            }

            HStack {
                Label(session.lastActive, systemImage: "clock")
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)

                Spacer()

                Label(session.ipAddress, systemImage: "network")
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct DeviceCard: View {
    let device: DeviceInfo
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: device.icon)
                    .font(.title2)
                    .foregroundColor(IndigoTheme.Colors.primary)
                    .frame(width: 44, height: 44)
                    .background(IndigoTheme.Colors.primary.opacity(IndigoTheme.Opacity.level10))
                    .cornerRadius(IndigoTheme.CornerRadius.lg)

                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                    Text(device.name)
                        .font(IndigoTheme.Typography.callout.weight(.semibold))
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text(device.addedDate)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.lg)
        }
    }
}

private struct LoginHistoryCard: View {
    let login: LoginHistoryItem

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: login.wasSuccessful ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundColor(login.wasSuccessful ? IndigoTheme.Colors.success : IndigoTheme.Colors.error)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(login.timestamp)
                    .font(IndigoTheme.Typography.callout.weight(.medium))
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text("\(login.device) · \(login.location)")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct AuditLogCard: View {
    let event: AuditEvent

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: event.icon)
                .foregroundColor(event.severity.color)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(event.action)
                    .font(IndigoTheme.Typography.callout.weight(.medium))
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(event.timestamp)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct EmptyStateView: View {
    let message: String

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: "checkmark.shield")
                .font(.largeTitle)
                .foregroundColor(IndigoTheme.Colors.success)

            Text(message)
                .font(IndigoTheme.Typography.callout)
                .foregroundColor(IndigoTheme.Colors.secondaryText)
        }
        .frame(maxWidth: .infinity)
        .padding(IndigoTheme.Spacing.xl3)
    }
}

private struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            Color.black.opacity(IndigoTheme.Opacity.level30)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.lg) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text(message)
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(.white)
            }
            .padding(IndigoTheme.Spacing.xl3)
            .background(IndigoTheme.Colors.primary)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
        }
    }
}

private struct DeviceDetailSheet: View {
    let device: DeviceInfo
    let onRemove: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: IndigoTheme.Spacing.xl2) {
                Image(systemName: device.icon)
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.Colors.primary)

                VStack(spacing: IndigoTheme.Spacing.lg) {
                    InfoRow(label: "Device Name", value: device.name)
                    InfoRow(label: "Added", value: device.addedDate)
                    InfoRow(label: "Last Active", value: device.lastActive)
                }

                Spacer()

                Button(action: {
                    onRemove()
                    dismiss()
                }) {
                    Text("Remove Device")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(IndigoTheme.Spacing.lg)
                        .background(IndigoTheme.Colors.error)
                        .cornerRadius(IndigoTheme.CornerRadius.xl)
                }
            }
            .padding(IndigoTheme.Spacing.xl)
            .navigationTitle("Device Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Card Style Modifier
private extension View {
    func cardStyle() -> some View {
        self
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
            .shadow(
                color: IndigoTheme.Shadow.sm.color,
                radius: IndigoTheme.Shadow.sm.radius,
                x: IndigoTheme.Shadow.sm.x,
                y: IndigoTheme.Shadow.sm.y
            )
    }
}

// MARK: - Preview
#Preview {
    NavigationStack {
        SecuritySettingsView()
    }
}
