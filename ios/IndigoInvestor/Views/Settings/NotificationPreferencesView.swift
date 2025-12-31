//
//  NotificationPreferencesView.swift
//  IndigoInvestor
//
//  Complete notification preferences screen with push, email, SMS, and quiet hours
//

import SwiftUI
import UserNotifications

struct NotificationPreferencesView: View {
    @StateObject private var viewModel = NotificationPreferencesViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            IndigoTheme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl2) {
                    PushNotificationSection(viewModel: viewModel)
                    EmailNotificationSection(viewModel: viewModel)
                    SMSNotificationSection(viewModel: viewModel)
                    QuietHoursSection(viewModel: viewModel)
                }
                .padding(IndigoTheme.Spacing.xl)
            }

            if viewModel.isLoading {
                LoadingOverlay(message: "Updating settings...")
            }
        }
        .navigationTitle("Notifications")
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.successMessage)
        }
        .task {
            await viewModel.loadSettings()
        }
    }
}

// MARK: - Push Notification Section
private struct PushNotificationSection: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                title: "Push Notifications",
                icon: "bell.fill",
                color: IndigoTheme.Colors.primary
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // System Permission Status
                if viewModel.pushPermissionStatus == .notDetermined {
                    EnablePushButton(viewModel: viewModel)
                } else if viewModel.pushPermissionStatus == .denied {
                    PushDeniedWarning(viewModel: viewModel)
                } else if viewModel.pushPermissionStatus == .authorized {
                    StatusRow(
                        title: "Push Notifications",
                        value: "Enabled",
                        icon: "checkmark.circle.fill",
                        iconColor: IndigoTheme.Colors.success
                    )

                    Divider()
                        .background(IndigoTheme.Colors.textSecondary.opacity(0.3))

                    // Category Toggles
                    ForEach(NotificationCategory.allCases, id: \.self) { category in
                        CategoryToggleRow(
                            category: category,
                            isEnabled: binding(for: category, type: .push),
                            onToggle: { enabled in
                                Task {
                                    await viewModel.updatePushCategory(category, enabled: enabled)
                                }
                            }
                        )
                    }
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMd)
        }
    }

    private func binding(for category: NotificationCategory, type: NotificationType) -> Binding<Bool> {
        switch type {
        case .push:
            switch category {
            case .portfolio:
                return $viewModel.pushPortfolio
            case .transactions:
                return $viewModel.pushTransactions
            case .security:
                return $viewModel.pushSecurity
            case .news:
                return $viewModel.pushNews
            case .marketing:
                return $viewModel.pushMarketing
            }
        case .email:
            switch category {
            case .portfolio:
                return $viewModel.emailPortfolio
            case .transactions:
                return $viewModel.emailTransactions
            case .security:
                return $viewModel.emailSecurity
            case .news:
                return $viewModel.emailNews
            case .marketing:
                return $viewModel.emailMarketing
            }
        case .sms:
            switch category {
            case .portfolio:
                return $viewModel.smsPortfolio
            case .transactions:
                return $viewModel.smsTransactions
            case .security:
                return $viewModel.smsSecurity
            default:
                return .constant(false)
            }
        }
    }
}

// MARK: - Email Notification Section
private struct EmailNotificationSection: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                title: "Email Notifications",
                icon: "envelope.fill",
                color: IndigoTheme.Colors.info
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // Master Toggle
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("Email Notifications")
                            .font(IndigoTheme.Typography.body.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.textPrimary)

                        Text("Receive notifications via email")
                            .font(IndigoTheme.Typography.caption)
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }

                    Spacer()

                    Toggle("", isOn: Binding(
                        get: { viewModel.emailEnabled },
                        set: { newValue in
                            Task {
                                await viewModel.toggleEmailEnabled(newValue)
                            }
                        }
                    ))
                    .labelsHidden()
                    .tint(IndigoTheme.Colors.primary)
                    .disabled(viewModel.isLoading)
                }

                if viewModel.emailEnabled {
                    Divider()
                        .background(IndigoTheme.Colors.textSecondary.opacity(0.3))

                    // Category Toggles
                    ForEach(NotificationCategory.allCases, id: \.self) { category in
                        CategoryToggleRow(
                            category: category,
                            isEnabled: emailBinding(for: category),
                            onToggle: { enabled in
                                Task {
                                    await viewModel.updateEmailCategory(category, enabled: enabled)
                                }
                            }
                        )
                    }

                    Divider()
                        .background(IndigoTheme.Colors.textSecondary.opacity(0.3))

                    // Summary Toggles
                    SummaryToggleRow(
                        title: "Weekly Summary",
                        description: "Portfolio performance and activity recap",
                        isEnabled: $viewModel.emailWeeklySummary,
                        onToggle: { enabled in
                            Task {
                                await viewModel.updateEmailSummary(.weekly, enabled: enabled)
                            }
                        }
                    )

                    SummaryToggleRow(
                        title: "Monthly Summary",
                        description: "Monthly portfolio report and analysis",
                        isEnabled: $viewModel.emailMonthlySummary,
                        onToggle: { enabled in
                            Task {
                                await viewModel.updateEmailSummary(.monthly, enabled: enabled)
                            }
                        }
                    )
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMd)
        }
    }

    private func emailBinding(for category: NotificationCategory) -> Binding<Bool> {
        switch category {
        case .portfolio:
            return $viewModel.emailPortfolio
        case .transactions:
            return $viewModel.emailTransactions
        case .security:
            return $viewModel.emailSecurity
        case .news:
            return $viewModel.emailNews
        case .marketing:
            return $viewModel.emailMarketing
        }
    }
}

// MARK: - SMS Notification Section
private struct SMSNotificationSection: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel
    @State private var showPhoneSheet = false
    @State private var phoneInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                title: "SMS Notifications",
                icon: "message.fill",
                color: IndigoTheme.Colors.warning
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // Master Toggle
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("SMS Notifications")
                            .font(IndigoTheme.Typography.body.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.textPrimary)

                        if viewModel.smsPhoneNumber.isEmpty {
                            Text("Add phone number to enable")
                                .font(IndigoTheme.Typography.caption)
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        } else {
                            Text(viewModel.smsPhoneNumber)
                                .font(IndigoTheme.Typography.caption)
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        }
                    }

                    Spacer()

                    Toggle("", isOn: Binding(
                        get: { viewModel.smsEnabled },
                        set: { newValue in
                            Task {
                                await viewModel.toggleSMSEnabled(newValue)
                            }
                        }
                    ))
                    .labelsHidden()
                    .tint(IndigoTheme.Colors.primary)
                    .disabled(viewModel.isLoading)
                }

                // Phone Number Management
                Button {
                    phoneInput = viewModel.smsPhoneNumber
                    showPhoneSheet = true
                } label: {
                    HStack {
                        Image(systemName: viewModel.smsPhoneNumber.isEmpty ? "plus.circle.fill" : "pencil.circle.fill")
                            .foregroundColor(IndigoTheme.Colors.primary)

                        Text(viewModel.smsPhoneNumber.isEmpty ? "Add Phone Number" : "Change Phone Number")
                            .font(IndigoTheme.Typography.callout.weight(.medium))
                            .foregroundColor(IndigoTheme.Colors.primary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }
                }

                if viewModel.smsEnabled {
                    Divider()
                        .background(IndigoTheme.Colors.textSecondary.opacity(0.3))

                    // Category Toggles (only critical categories for SMS)
                    ForEach([NotificationCategory.transactions, .security], id: \.self) { category in
                        CategoryToggleRow(
                            category: category,
                            isEnabled: smsBinding(for: category),
                            onToggle: { enabled in
                                Task {
                                    await viewModel.updateSMSCategory(category, enabled: enabled)
                                }
                            }
                        )
                    }
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMd)
        }
        .sheet(isPresented: $showPhoneSheet) {
            PhoneNumberSheet(
                phoneNumber: $phoneInput,
                onSave: {
                    Task {
                        await viewModel.updateSMSPhoneNumber(phoneInput)
                        showPhoneSheet = false
                    }
                },
                onCancel: {
                    showPhoneSheet = false
                }
            )
        }
    }

    private func smsBinding(for category: NotificationCategory) -> Binding<Bool> {
        switch category {
        case .portfolio:
            return $viewModel.smsPortfolio
        case .transactions:
            return $viewModel.smsTransactions
        case .security:
            return $viewModel.smsSecurity
        default:
            return .constant(false)
        }
    }
}

// MARK: - Quiet Hours Section
private struct QuietHoursSection: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(
                title: "Quiet Hours",
                icon: "moon.fill",
                color: IndigoTheme.Colors.purple
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // Master Toggle
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("Quiet Hours")
                            .font(IndigoTheme.Typography.body.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.textPrimary)

                        Text(viewModel.quietHoursDescription)
                            .font(IndigoTheme.Typography.caption)
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }

                    Spacer()

                    Toggle("", isOn: Binding(
                        get: { viewModel.quietHoursEnabled },
                        set: { newValue in
                            Task {
                                await viewModel.toggleQuietHours(newValue)
                            }
                        }
                    ))
                    .labelsHidden()
                    .tint(IndigoTheme.Colors.primary)
                    .disabled(viewModel.isLoading)
                }

                if viewModel.quietHoursEnabled {
                    Divider()
                        .background(IndigoTheme.Colors.textSecondary.opacity(0.3))

                    // Time Pickers
                    TimePickerRow(
                        title: "Start Time",
                        time: $viewModel.quietHoursStart,
                        onUpdate: { time in
                            Task {
                                await viewModel.updateQuietHoursStart(time)
                            }
                        }
                    )

                    TimePickerRow(
                        title: "End Time",
                        time: $viewModel.quietHoursEnd,
                        onUpdate: { time in
                            Task {
                                await viewModel.updateQuietHoursEnd(time)
                            }
                        }
                    )

                    // Info
                    InfoBox(
                        icon: "info.circle.fill",
                        message: "You won't receive notifications during quiet hours, except for critical security alerts.",
                        color: IndigoTheme.Colors.info
                    )
                }
            }
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMd)
        }
    }
}

// MARK: - Supporting Components

private struct SectionHeader: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title3.weight(.semibold))
                .foregroundColor(color)

            Text(title)
                .font(IndigoTheme.Typography.title3.weight(.bold))
                .foregroundColor(IndigoTheme.Colors.textPrimary)
        }
    }
}

private struct StatusRow: View {
    let title: String
    let value: String
    let icon: String
    let iconColor: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(iconColor)

            Text(title)
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            Spacer()

            Text(value)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.textSecondary)
        }
    }
}

private struct CategoryToggleRow: View {
    let category: NotificationCategory
    @Binding var isEnabled: Bool
    let onToggle: (Bool) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: IndigoTheme.Spacing.md) {
            Image(systemName: category.icon)
                .font(.title3)
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(category.rawValue)
                    .font(IndigoTheme.Typography.body.weight(.semibold))
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                Text(category.description)
                    .font(IndigoTheme.Typography.caption)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { isEnabled },
                set: { newValue in
                    isEnabled = newValue
                    onToggle(newValue)
                }
            ))
            .labelsHidden()
            .tint(IndigoTheme.Colors.primary)
        }
    }
}

private struct SummaryToggleRow: View {
    let title: String
    let description: String
    @Binding var isEnabled: Bool
    let onToggle: (Bool) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: IndigoTheme.Spacing.md) {
            Image(systemName: "calendar")
                .font(.title3)
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(title)
                    .font(IndigoTheme.Typography.body.weight(.semibold))
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                Text(description)
                    .font(IndigoTheme.Typography.caption)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { isEnabled },
                set: { newValue in
                    isEnabled = newValue
                    onToggle(newValue)
                }
            ))
            .labelsHidden()
            .tint(IndigoTheme.Colors.primary)
        }
    }
}

private struct TimePickerRow: View {
    let title: String
    @Binding var time: Date
    let onUpdate: (Date) -> Void

    var body: some View {
        HStack {
            Text(title)
                .font(IndigoTheme.Typography.body.weight(.semibold))
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            Spacer()

            DatePicker(
                "",
                selection: Binding(
                    get: { time },
                    set: { newValue in
                        time = newValue
                        onUpdate(newValue)
                    }
                ),
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .tint(IndigoTheme.Colors.primary)
        }
    }
}

private struct EnablePushButton: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            InfoBox(
                icon: "bell.badge.fill",
                message: "Enable push notifications to receive real-time updates about your portfolio, transactions, and security alerts.",
                color: IndigoTheme.Colors.primary
            )

            Button {
                Task {
                    await viewModel.requestPushPermission()
                }
            } label: {
                HStack {
                    Image(systemName: "bell.fill")

                    Text("Enable Push Notifications")
                        .font(IndigoTheme.Typography.body.weight(.semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(IndigoTheme.Spacing.md)
                .background(IndigoTheme.Colors.primary)
                .cornerRadius(IndigoTheme.Layout.cornerRadiusSm)
            }
        }
    }
}

private struct PushDeniedWarning: View {
    @ObservedObject var viewModel: NotificationPreferencesViewModel

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            InfoBox(
                icon: "exclamationmark.triangle.fill",
                message: "Push notifications are disabled in Settings. To enable them, go to Settings > Indigo Investor > Notifications.",
                color: IndigoTheme.Colors.warning
            )

            Button {
                viewModel.openSystemSettings()
            } label: {
                HStack {
                    Image(systemName: "gear")

                    Text("Open Settings")
                        .font(IndigoTheme.Typography.body.weight(.semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(IndigoTheme.Spacing.md)
                .background(IndigoTheme.Colors.warning)
                .cornerRadius(IndigoTheme.Layout.cornerRadiusSm)
            }
        }
    }
}

private struct InfoBox: View {
    let icon: String
    let message: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: IndigoTheme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(message)
                .font(IndigoTheme.Typography.caption)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(IndigoTheme.Spacing.md)
        .background(color.opacity(0.1))
        .cornerRadius(IndigoTheme.Layout.cornerRadiusSm)
    }
}

private struct PhoneNumberSheet: View {
    @Binding var phoneNumber: String
    let onSave: () -> Void
    let onCancel: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: IndigoTheme.Spacing.xl) {
                // Header
                VStack(spacing: IndigoTheme.Spacing.sm) {
                    Image(systemName: "phone.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(IndigoTheme.Colors.primary)

                    Text("SMS Phone Number")
                        .font(IndigoTheme.Typography.title2.weight(.bold))
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text("Enter your phone number to receive SMS notifications")
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, IndigoTheme.Spacing.xl2)

                // Input
                TextField("Phone Number", text: $phoneNumber)
                    .font(IndigoTheme.Typography.body)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .padding(IndigoTheme.Spacing.md)
                    .background(IndigoTheme.Colors.surface)
                    .cornerRadius(IndigoTheme.Layout.cornerRadiusSm)
                    .padding(.horizontal, IndigoTheme.Spacing.xl)

                Spacer()

                // Buttons
                VStack(spacing: IndigoTheme.Spacing.md) {
                    Button {
                        onSave()
                    } label: {
                        Text("Save")
                            .font(IndigoTheme.Typography.body.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(IndigoTheme.Spacing.md)
                            .background(IndigoTheme.Colors.primary)
                            .cornerRadius(IndigoTheme.Layout.cornerRadiusSm)
                    }
                    .disabled(phoneNumber.isEmpty)

                    Button {
                        onCancel()
                    } label: {
                        Text("Cancel")
                            .font(IndigoTheme.Typography.body.weight(.medium))
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(IndigoTheme.Spacing.md)
                    }
                }
                .padding(.horizontal, IndigoTheme.Spacing.xl)
                .padding(.bottom, IndigoTheme.Spacing.xl)
            }
            .background(IndigoTheme.Colors.background)
        }
    }
}

private struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            IndigoTheme.Colors.background.opacity(0.9)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.lg) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: IndigoTheme.Colors.primary))
                    .scaleEffect(1.5)

                Text(message)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)
            }
            .padding(IndigoTheme.Spacing.xl2)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMd)
        }
    }
}

// MARK: - Supporting Types

private enum NotificationType {
    case push, email, sms
}

// MARK: - Preview
struct NotificationPreferencesView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            NotificationPreferencesView()
        }
    }
}
