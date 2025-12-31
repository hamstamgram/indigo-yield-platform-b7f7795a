//
//  BiometricSetupViewModel.swift
//  IndigoInvestor
//

import SwiftUI
import LocalAuthentication
import Combine

@MainActor
final class BiometricSetupViewModel: ObservableObject {
    @Published var biometricAvailable = false
    @Published var biometricType: LABiometryType = .none
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var setupComplete = false

    private let keychainManager: KeychainManagerProtocol

    init(keychainManager: KeychainManagerProtocol = ServiceContainer.shared.keychainManager) {
        self.keychainManager = keychainManager
    }

    func checkBiometricAvailability() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            biometricAvailable = true
            biometricType = context.biometryType
        } else {
            biometricAvailable = false
            errorMessage = error?.localizedDescription ?? "Biometric authentication not available"
        }
    }

    func enableBiometric() async {
        guard biometricAvailable else {
            errorMessage = "Biometric authentication not available on this device"
            return
        }

        isLoading = true
        errorMessage = nil

        let context = LAContext()
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Enable biometric authentication for Indigo Investor"
            )

            if success {
                // Store biometric preference
                try keychainManager.setBiometricEnabled(true)
                setupComplete = true
                isLoading = false
            }
        } catch let error as LAError {
            isLoading = false
            handleBiometricError(error)
        } catch {
            isLoading = false
            errorMessage = "Failed to enable biometric authentication"
        }
    }

    private func handleBiometricError(_ error: LAError) {
        switch error.code {
        case .userCancel:
            errorMessage = "Setup cancelled"
        case .biometryNotAvailable:
            errorMessage = "Biometric authentication not available"
        case .biometryNotEnrolled:
            errorMessage = "Please set up Face ID or Touch ID in Settings"
        case .biometryLockout:
            errorMessage = "Too many failed attempts"
        default:
            errorMessage = "Biometric setup failed"
        }
    }
}
