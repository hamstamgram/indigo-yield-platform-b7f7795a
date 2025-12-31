//
//  BiometricSettingsViewModel.swift
//  IndigoInvestor
//
//  ViewModel for BiometricSettingsView with biometric authentication management
//

import SwiftUI
import Combine

@MainActor
final class BiometricSettingsViewModel: ObservableObject {
    // MARK: - Published Properties

    // Biometric Status
    @Published var biometricEnabled: Bool = false
    @Published var biometricAuthManager = BiometricAuthManager()

    // Security Preferences
    @Published var allowPasscodeFallback: Bool = true
    @Published var requireOnLaunch: Bool = true
    @Published var requireForTransactions: Bool = true
    @Published var requireForSettings: Bool = true
    @Published var autoLockTimeout: Int = 300 // seconds (5 minutes)

    // State Management
    @Published var isLoading: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var successMessage: String = ""

    // MARK: - Private Properties
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // Timeout options (in seconds)
    let timeoutOptions: [Int] = [60, 180, 300, 600, 1800, 3600, -1] // 1min, 3min, 5min, 10min, 30min, 1hour, never

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
    }

    // MARK: - Data Loading
    func loadSettings() async {
        isLoading = true

        do {
            // Check biometric availability
            biometricAuthManager.checkBiometricAvailability()

            // TODO: Load settings from Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase query:
            let settings = try await supabase
                .from("user_biometric_settings")
                .select()
                .eq("user_id", userId)
                .single()
                .execute()

            biometricEnabled = settings["biometric_enabled"] as? Bool ?? false
            allowPasscodeFallback = settings["allow_passcode_fallback"] as? Bool ?? true
            requireOnLaunch = settings["require_on_launch"] as? Bool ?? true
            requireForTransactions = settings["require_for_transactions"] as? Bool ?? true
            requireForSettings = settings["require_for_settings"] as? Bool ?? true
            autoLockTimeout = settings["auto_lock_timeout"] as? Int ?? 300
            */

            // Placeholder data
            biometricEnabled = true
            allowPasscodeFallback = true
            requireOnLaunch = true
            requireForTransactions = true
            requireForSettings = true
            autoLockTimeout = 300

            isLoading = false

        } catch {
            isLoading = false
            errorMessage = "Failed to load settings: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Biometric Toggle
    func toggleBiometric(_ enabled: Bool) async {
        guard enabled != biometricEnabled else { return }

        // If enabling, test authentication first
        if enabled {
            do {
                try await biometricAuthManager.authenticate(reason: "Enable biometric authentication")

                // Success - enable biometric
                await updateBiometricEnabled(true)

            } catch {
                errorMessage = "Authentication failed. Please try again."
                showError = true
            }
        } else {
            // Disabling - just update the setting
            await updateBiometricEnabled(false)
        }
    }

    private func updateBiometricEnabled(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_biometric_settings")
                .update(["biometric_enabled": enabled])
                .eq("user_id", userId)
                .execute()
            */

            biometricEnabled = enabled

            isLoading = false

            successMessage = enabled ?
                "Biometric authentication has been enabled" :
                "Biometric authentication has been disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update setting: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Test Authentication
    func testAuthentication() async -> Bool {
        do {
            try await biometricAuthManager.authenticate(reason: "Test biometric authentication")
            return true
        } catch {
            return false
        }
    }

    // MARK: - Passcode Fallback
    func updatePasscodeFallback(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 800_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_biometric_settings")
                .update(["allow_passcode_fallback": enabled])
                .eq("user_id", userId)
                .execute()
            */

            allowPasscodeFallback = enabled

            isLoading = false

            successMessage = enabled ?
                "Passcode fallback has been enabled" :
                "Passcode fallback has been disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update setting: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Security Preferences
    func updateRequireOnLaunch(_ required: Bool) async {
        await updateSecurityPreference(
            key: "require_on_launch",
            value: required,
            successMessage: required ?
                "Authentication will be required on launch" :
                "Authentication will not be required on launch"
        )
    }

    func updateRequireForTransactions(_ required: Bool) async {
        await updateSecurityPreference(
            key: "require_for_transactions",
            value: required,
            successMessage: required ?
                "Authentication will be required for transactions" :
                "Authentication will not be required for transactions"
        )
    }

    func updateRequireForSettings(_ required: Bool) async {
        await updateSecurityPreference(
            key: "require_for_settings",
            value: required,
            successMessage: required ?
                "Authentication will be required for settings changes" :
                "Authentication will not be required for settings changes"
        )
    }

    func updateAutoLockTimeout(_ timeout: Int) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_biometric_settings")
                .update(["auto_lock_timeout": timeout])
                .eq("user_id", userId)
                .execute()
            */

            autoLockTimeout = timeout

            isLoading = false

            successMessage = "Auto-lock timeout updated to \(timeoutLabel(for: timeout))"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update timeout: \(error.localizedDescription)"
            showError = true
        }
    }

    private func updateSecurityPreference(key: String, value: Bool, successMessage: String) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_biometric_settings")
                .update([key: value])
                .eq("user_id", userId)
                .execute()
            */

            // Update local state based on key
            switch key {
            case "require_on_launch":
                requireOnLaunch = value
            case "require_for_transactions":
                requireForTransactions = value
            case "require_for_settings":
                requireForSettings = value
            default:
                break
            }

            isLoading = false

            self.successMessage = successMessage
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update preference: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Helper Methods
    func timeoutLabel(for seconds: Int) -> String {
        switch seconds {
        case 60:
            return "1 minute"
        case 180:
            return "3 minutes"
        case 300:
            return "5 minutes"
        case 600:
            return "10 minutes"
        case 1800:
            return "30 minutes"
        case 3600:
            return "1 hour"
        case -1:
            return "Never"
        default:
            return "\(seconds) seconds"
        }
    }
}
