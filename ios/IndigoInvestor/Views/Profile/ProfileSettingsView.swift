import SwiftUI

struct ProfileSettingsView: View {
    @StateObject private var viewModel = ProfileSettingsViewModel()
    @State private var selectedSection = 0
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // Section Selector
                        sectionSelector

                        // Content based on selection
                        if selectedSection == 0 {
                            profileContent
                        } else if selectedSection == 1 {
                            securityContent
                        } else {
                            notificationContent
                        }
                    }
                    .padding(IndigoTheme.Spacing.md)
                    .padding(.top, 100)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .top) {
                customNavigationBar
            }
        }
    }

    // MARK: - Navigation Bar
    private var customNavigationBar: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "arrow.left")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }
            .accessibilityLabel("Back")
            .accessibilityHint("Returns to previous screen")

            Spacer()

            Text("Profile & Settings")
                .font(IndigoTheme.Typography.title3)
                .foregroundColor(IndigoTheme.Colors.primaryText)
                .accessibilityAddTraits(.isHeader)

            Spacer()

            Button(action: {}) {
                Text("Save")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }
            .accessibilityLabel("Save settings")
            .accessibilityHint("Saves all profile and settings changes")
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Section Selector
    private var sectionSelector: some View {
        HStack(spacing: 0) {
            SectionTab(title: "Profile", isSelected: selectedSection == 0) {
                selectedSection = 0
            }

            SectionTab(title: "Security", isSelected: selectedSection == 1) {
                selectedSection = 1
            }

            SectionTab(title: "Notifications", isSelected: selectedSection == 2) {
                selectedSection = 2
            }
        }
        .padding(4)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.medium)
    }

    // MARK: - Profile Content
    private var profileContent: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            // Profile Photo
            VStack(spacing: IndigoTheme.Spacing.md) {
                ZStack {
                    Circle()
                        .fill(IndigoTheme.Colors.primaryGradient)
                        .frame(width: 100, height: 100)

                    Text("JD")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Button(action: {}) {
                        Image(systemName: "camera.fill")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(6)
                            .background(IndigoTheme.Colors.primaryGradientStart)
                            .clipShape(Circle())
                    }
                    .offset(x: 35, y: 35)
                }

                Button(action: {}) {
                    Text("Change Photo")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }

            // Personal Information
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Personal Information")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                ProfileField(label: "Full Name", value: "John Doe", isEditable: true)
                ProfileField(label: "Email", value: "john.doe@example.com", isEditable: false)
                ProfileField(label: "Phone", value: "+1 234 567 890", isEditable: true)
                ProfileField(label: "Date of Birth", value: "01/01/1990", isEditable: false)
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)

            // Account Information
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Account Information")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                ProfileField(label: "Account ID", value: "IND-2024-0001", isEditable: false)
                ProfileField(label: "Account Type", value: "Premium Investor", isEditable: false)
                ProfileField(label: "KYC Status", value: "Verified", isEditable: false, statusColor: IndigoTheme.Colors.success)
                ProfileField(label: "Member Since", value: "January 2024", isEditable: false)
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
        }
    }

    // MARK: - Security Content
    private var securityContent: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            // Password
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Password & Authentication")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                SecurityRow(
                    icon: "lock",
                    title: "Change Password",
                    subtitle: "Last changed 30 days ago",
                    action: {}
                )

                SecurityRow(
                    icon: "faceid",
                    title: "Face ID / Touch ID",
                    subtitle: "Enabled",
                    hasToggle: true,
                    isEnabled: viewModel.biometricEnabled,
                    action: { viewModel.biometricEnabled.toggle() }
                )

                SecurityRow(
                    icon: "shield",
                    title: "Two-Factor Authentication",
                    subtitle: viewModel.twoFactorEnabled ? "Enabled" : "Disabled",
                    hasToggle: true,
                    isEnabled: viewModel.twoFactorEnabled,
                    action: { viewModel.twoFactorEnabled.toggle() }
                )
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)

            // Session Management
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Session Management")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                SecurityRow(
                    icon: "iphone",
                    title: "Active Sessions",
                    subtitle: "3 devices",
                    action: {}
                )

                SecurityRow(
                    icon: "clock",
                    title: "Auto-Logout",
                    subtitle: "After 15 minutes",
                    action: {}
                )
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
        }
    }

    // MARK: - Notification Content
    private var notificationContent: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            // Email Notifications
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Email Notifications")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                NotificationRow(
                    title: "Yield Generated",
                    subtitle: "Daily yield distribution alerts",
                    isEnabled: viewModel.yieldNotifications
                ) {
                    viewModel.yieldNotifications.toggle()
                }

                NotificationRow(
                    title: "Withdrawal Confirmation",
                    subtitle: "Withdrawal request updates",
                    isEnabled: viewModel.withdrawalNotifications
                ) {
                    viewModel.withdrawalNotifications.toggle()
                }

                NotificationRow(
                    title: "Newsletter",
                    subtitle: "Weekly insights and updates",
                    isEnabled: viewModel.newsletterEnabled
                ) {
                    viewModel.newsletterEnabled.toggle()
                }

                NotificationRow(
                    title: "Security Alerts",
                    subtitle: "Login attempts and changes",
                    isEnabled: viewModel.securityAlerts
                ) {
                    viewModel.securityAlerts.toggle()
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)

            // Push Notifications
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                Text("Push Notifications")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                NotificationRow(
                    title: "Enable Push Notifications",
                    subtitle: "Receive instant updates",
                    isEnabled: viewModel.pushEnabled
                ) {
                    viewModel.pushEnabled.toggle()
                }

                NotificationRow(
                    title: "Trading Alerts",
                    subtitle: "Price movements and opportunities",
                    isEnabled: viewModel.tradingAlerts
                ) {
                    viewModel.tradingAlerts.toggle()
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
        }
    }
}

// MARK: - Supporting Views
struct SectionTab: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(isSelected ? .white : IndigoTheme.Colors.secondaryText)
                .frame(maxWidth: .infinity)
                .padding(.vertical, IndigoTheme.Spacing.sm)
                .background(
                    isSelected ? IndigoTheme.Colors.primaryGradient : Color.clear
                )
                .cornerRadius(IndigoTheme.CornerRadius.small)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ProfileField: View {
    let label: String
    let value: String
    let isEditable: Bool
    var statusColor: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            HStack {
                if let statusColor = statusColor {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 6, height: 6)

                        Text(value)
                            .font(IndigoTheme.Typography.body)
                            .foregroundColor(statusColor)
                    }
                } else {
                    Text(value)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.primaryText)
                }

                Spacer()

                if isEditable {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }
            .padding(.vertical, IndigoTheme.Spacing.sm)
        }
        .padding(.vertical, IndigoTheme.Spacing.xs)
    }
}

struct SecurityRow: View {
    let icon: String
    let title: String
    let subtitle: String
    var hasToggle: Bool = false
    var isEnabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: hasToggle ? {} : action) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                    .frame(width: 30)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text(subtitle)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                if hasToggle {
                    Toggle("", isOn: .constant(isEnabled))
                        .labelsHidden()
                        .scaleEffect(0.8)
                        .onTapGesture { action() }
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(IndigoTheme.Colors.tertiaryText)
                }
            }
            .padding(.vertical, IndigoTheme.Spacing.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct NotificationRow: View {
    let title: String
    let subtitle: String
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(subtitle)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()

            Toggle("", isOn: .constant(isEnabled))
                .labelsHidden()
                .scaleEffect(0.8)
                .onTapGesture { action() }
        }
        .padding(.vertical, IndigoTheme.Spacing.sm)
    }
}

// MARK: - View Model
class ProfileSettingsViewModel: ObservableObject {
    @Published var biometricEnabled = true
    @Published var twoFactorEnabled = false
    @Published var yieldNotifications = true
    @Published var withdrawalNotifications = true
    @Published var newsletterEnabled = true
    @Published var securityAlerts = true
    @Published var pushEnabled = false
    @Published var tradingAlerts = false
}