//
//  NotificationPreferencesViewModel.swift
//  IndigoInvestor
//
//  ViewModel for NotificationPreferencesView with comprehensive notification management
//

import SwiftUI
import Combine
import UserNotifications

@MainActor
final class NotificationPreferencesViewModel: ObservableObject {
    // MARK: - Published Properties

    // Push Notifications
    @Published var pushEnabled: Bool = false
    @Published var pushPortfolio: Bool = true
    @Published var pushTransactions: Bool = true
    @Published var pushSecurity: Bool = true
    @Published var pushNews: Bool = false
    @Published var pushMarketing: Bool = false

    // Email Notifications
    @Published var emailEnabled: Bool = true
    @Published var emailPortfolio: Bool = true
    @Published var emailTransactions: Bool = true
    @Published var emailSecurity: Bool = true
    @Published var emailNews: Bool = true
    @Published var emailMarketing: Bool = false
    @Published var emailWeeklySummary: Bool = true
    @Published var emailMonthlySummary: Bool = true

    // SMS Notifications
    @Published var smsEnabled: Bool = false
    @Published var smsPortfolio: Bool = false
    @Published var smsTransactions: Bool = true
    @Published var smsSecurity: Bool = true
    @Published var smsPhoneNumber: String = ""

    // Quiet Hours
    @Published var quietHoursEnabled: Bool = false
    @Published var quietHoursStart: Date = Calendar.current.date(from: DateComponents(hour: 22, minute: 0)) ?? Date()
    @Published var quietHoursEnd: Date = Calendar.current.date(from: DateComponents(hour: 8, minute: 0)) ?? Date()

    // System State
    @Published var pushPermissionStatus: UNAuthorizationStatus = .notDetermined
    @Published var isLoading: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var successMessage: String = ""

    // MARK: - Private Properties
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
    }

    // MARK: - Data Loading
    func loadSettings() async {
        isLoading = true

        do {
            // Check push notification permission
            await checkPushPermission()

            // TODO: Load settings from Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase query:
            let settings = try await supabase
                .from("user_notification_preferences")
                .select()
                .eq("user_id", userId)
                .single()
                .execute()

            // Push notifications
            pushPortfolio = settings["push_portfolio"] as? Bool ?? true
            pushTransactions = settings["push_transactions"] as? Bool ?? true
            pushSecurity = settings["push_security"] as? Bool ?? true
            pushNews = settings["push_news"] as? Bool ?? false
            pushMarketing = settings["push_marketing"] as? Bool ?? false

            // Email notifications
            emailEnabled = settings["email_enabled"] as? Bool ?? true
            emailPortfolio = settings["email_portfolio"] as? Bool ?? true
            emailTransactions = settings["email_transactions"] as? Bool ?? true
            emailSecurity = settings["email_security"] as? Bool ?? true
            emailNews = settings["email_news"] as? Bool ?? true
            emailMarketing = settings["email_marketing"] as? Bool ?? false
            emailWeeklySummary = settings["email_weekly_summary"] as? Bool ?? true
            emailMonthlySummary = settings["email_monthly_summary"] as? Bool ?? true

            // SMS notifications
            smsEnabled = settings["sms_enabled"] as? Bool ?? false
            smsPortfolio = settings["sms_portfolio"] as? Bool ?? false
            smsTransactions = settings["sms_transactions"] as? Bool ?? true
            smsSecurity = settings["sms_security"] as? Bool ?? true
            smsPhoneNumber = settings["sms_phone_number"] as? String ?? ""

            // Quiet hours
            quietHoursEnabled = settings["quiet_hours_enabled"] as? Bool ?? false
            if let startTime = settings["quiet_hours_start"] as? String {
                quietHoursStart = ISO8601DateFormatter().date(from: startTime) ?? quietHoursStart
            }
            if let endTime = settings["quiet_hours_end"] as? String {
                quietHoursEnd = ISO8601DateFormatter().date(from: endTime) ?? quietHoursEnd
            }
            */

            // Placeholder data
            pushPortfolio = true
            pushTransactions = true
            pushSecurity = true
            pushNews = false
            pushMarketing = false

            emailEnabled = true
            emailPortfolio = true
            emailTransactions = true
            emailSecurity = true
            emailNews = true
            emailMarketing = false
            emailWeeklySummary = true
            emailMonthlySummary = true

            smsEnabled = false
            smsPortfolio = false
            smsTransactions = true
            smsSecurity = true
            smsPhoneNumber = ""

            quietHoursEnabled = false

            isLoading = false

        } catch {
            isLoading = false
            errorMessage = "Failed to load settings: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Push Notification Permission
    private func checkPushPermission() async {
        let settings = await notificationCenter.notificationSettings()
        pushPermissionStatus = settings.authorizationStatus
        pushEnabled = settings.authorizationStatus == .authorized
    }

    func requestPushPermission() async {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .badge, .sound])

            if granted {
                await MainActor.run {
                    pushEnabled = true
                    pushPermissionStatus = .authorized
                    successMessage = "Push notifications enabled"
                    showSuccess = true
                }

                // Register for remote notifications
                await UIApplication.shared.registerForRemoteNotifications()

            } else {
                await MainActor.run {
                    pushEnabled = false
                    pushPermissionStatus = .denied
                    errorMessage = "Push notification permission denied"
                    showError = true
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to request permission: \(error.localizedDescription)"
                showError = true
            }
        }
    }

    func openSystemSettings() {
        if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settingsUrl)
        }
    }

    // MARK: - Push Notification Toggles
    func updatePushCategory(_ category: NotificationCategory, enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update([category.pushKey: enabled])
                .eq("user_id", userId)
                .execute()
            */

            // Update local state
            switch category {
            case .portfolio:
                pushPortfolio = enabled
            case .transactions:
                pushTransactions = enabled
            case .security:
                pushSecurity = enabled
            case .news:
                pushNews = enabled
            case .marketing:
                pushMarketing = enabled
            }

            isLoading = false

            successMessage = "Push notification preference updated"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update setting: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Email Notification Toggles
    func toggleEmailEnabled(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 800_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["email_enabled": enabled])
                .eq("user_id", userId)
                .execute()
            */

            emailEnabled = enabled

            isLoading = false

            successMessage = enabled ? "Email notifications enabled" : "Email notifications disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update email settings: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateEmailCategory(_ category: NotificationCategory, enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update([category.emailKey: enabled])
                .eq("user_id", userId)
                .execute()
            */

            // Update local state
            switch category {
            case .portfolio:
                emailPortfolio = enabled
            case .transactions:
                emailTransactions = enabled
            case .security:
                emailSecurity = enabled
            case .news:
                emailNews = enabled
            case .marketing:
                emailMarketing = enabled
            }

            isLoading = false

            successMessage = "Email preference updated"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update setting: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateEmailSummary(_ type: SummaryType, enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update([type.key: enabled])
                .eq("user_id", userId)
                .execute()
            */

            switch type {
            case .weekly:
                emailWeeklySummary = enabled
            case .monthly:
                emailMonthlySummary = enabled
            }

            isLoading = false

            successMessage = "\(type.rawValue) summary \(enabled ? "enabled" : "disabled")"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update summary preference: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - SMS Notification Toggles
    func toggleSMSEnabled(_ enabled: Bool) async {
        guard !smsPhoneNumber.isEmpty || !enabled else {
            errorMessage = "Please add a phone number before enabling SMS notifications"
            showError = true
            return
        }

        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 800_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["sms_enabled": enabled])
                .eq("user_id", userId)
                .execute()
            */

            smsEnabled = enabled

            isLoading = false

            successMessage = enabled ? "SMS notifications enabled" : "SMS notifications disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update SMS settings: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateSMSCategory(_ category: NotificationCategory, enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update([category.smsKey: enabled])
                .eq("user_id", userId)
                .execute()
            */

            // Update local state
            switch category {
            case .portfolio:
                smsPortfolio = enabled
            case .transactions:
                smsTransactions = enabled
            case .security:
                smsSecurity = enabled
            default:
                break
            }

            isLoading = false

            successMessage = "SMS preference updated"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update setting: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateSMSPhoneNumber(_ phoneNumber: String) async {
        isLoading = true

        do {
            // TODO: Validate and update phone number in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["sms_phone_number": phoneNumber])
                .eq("user_id", userId)
                .execute()

            // Send verification SMS
            try await supabase.rpc(
                "send_sms_verification",
                params: ["phone_number": phoneNumber]
            ).execute()
            */

            smsPhoneNumber = phoneNumber

            isLoading = false

            successMessage = "Phone number updated successfully"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update phone number: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Quiet Hours
    func toggleQuietHours(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["quiet_hours_enabled": enabled])
                .eq("user_id", userId)
                .execute()
            */

            quietHoursEnabled = enabled

            isLoading = false

            successMessage = enabled ?
                "Quiet hours enabled (\(formattedTime(quietHoursStart)) - \(formattedTime(quietHoursEnd)))" :
                "Quiet hours disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update quiet hours: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateQuietHoursStart(_ time: Date) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["quiet_hours_start": ISO8601DateFormatter().string(from: time)])
                .eq("user_id", userId)
                .execute()
            */

            quietHoursStart = time

            isLoading = false

            successMessage = "Quiet hours start time updated to \(formattedTime(time))"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update start time: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateQuietHoursEnd(_ time: Date) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_notification_preferences")
                .update(["quiet_hours_end": ISO8601DateFormatter().string(from: time)])
                .eq("user_id", userId)
                .execute()
            */

            quietHoursEnd = time

            isLoading = false

            successMessage = "Quiet hours end time updated to \(formattedTime(time))"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update end time: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Helper Methods
    private func formattedTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    var quietHoursDescription: String {
        guard quietHoursEnabled else { return "Not enabled" }
        return "\(formattedTime(quietHoursStart)) - \(formattedTime(quietHoursEnd))"
    }
}

// MARK: - Supporting Types

enum NotificationCategory: String, CaseIterable {
    case portfolio = "Portfolio Updates"
    case transactions = "Transaction Alerts"
    case security = "Security Alerts"
    case news = "News & Insights"
    case marketing = "Marketing"

    var icon: String {
        switch self {
        case .portfolio:
            return "chart.line.uptrend.xyaxis"
        case .transactions:
            return "dollarsign.circle"
        case .security:
            return "shield.fill"
        case .news:
            return "newspaper.fill"
        case .marketing:
            return "megaphone.fill"
        }
    }

    var description: String {
        switch self {
        case .portfolio:
            return "Changes in your portfolio value and performance"
        case .transactions:
            return "Deposits, withdrawals, and investment updates"
        case .security:
            return "Login attempts, security warnings, and account changes"
        case .news:
            return "Market news and investment insights"
        case .marketing:
            return "Product updates and promotional offers"
        }
    }

    var pushKey: String {
        "push_\(rawValue.lowercased().replacingOccurrences(of: " ", with: "_"))"
    }

    var emailKey: String {
        "email_\(rawValue.lowercased().replacingOccurrences(of: " ", with: "_"))"
    }

    var smsKey: String {
        "sms_\(rawValue.lowercased().replacingOccurrences(of: " ", with: "_"))"
    }
}

enum SummaryType: String {
    case weekly = "Weekly"
    case monthly = "Monthly"

    var key: String {
        "email_\(rawValue.lowercased())_summary"
    }
}
