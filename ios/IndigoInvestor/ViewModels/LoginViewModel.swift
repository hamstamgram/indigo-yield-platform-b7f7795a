//
//  LoginViewModel.swift
//  IndigoInvestor
//
//  ViewModel for LoginView
//

import SwiftUI
import LocalAuthentication
import Combine

@MainActor
final class LoginViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var showPassword: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var isAuthenticated: Bool = false
    @Published var biometricAuthAvailable: Bool = false
    @Published var biometricType: LABiometryType = .none

    // MARK: - Dependencies
    private let authService: AuthenticationServiceProtocol
    private let keychainManager: KeychainManagerProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties
    var isValidInput: Bool {
        !email.isEmpty && !password.isEmpty && email.contains("@")
    }

    // MARK: - Initialization
    init(
        authService: AuthenticationServiceProtocol = ServiceContainer.shared.authService,
        keychainManager: KeychainManagerProtocol = ServiceContainer.shared.keychainManager
    ) {
        self.authService = authService
        self.keychainManager = keychainManager
        checkBiometricAvailability()
    }

    // MARK: - Authentication Methods
    func login() async {
        guard isValidInput else {
            errorMessage = "Please enter valid email and password"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            // Authenticate with Supabase
            let session = try await authService.signIn(email: email, password: password)

            // Store credentials in keychain for biometric auth
            try keychainManager.save(email: email, password: password)

            // Update state
            isAuthenticated = true
            isLoading = false

            print("✅ Login successful for user: \(session.user.email ?? "Unknown")")
        } catch {
            isLoading = false
            handleAuthError(error)
        }
    }

    func authenticateWithBiometrics() async {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            errorMessage = "Biometric authentication not available"
            return
        }

        do {
            // Authenticate with biometrics
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Sign in to Indigo Investor"
            )

            if success {
                // Retrieve stored credentials
                guard let credentials = try keychainManager.retrieveCredentials() else {
                    errorMessage = "No saved credentials found"
                    return
                }

                // Sign in with stored credentials
                email = credentials.email
                password = credentials.password
                await login()
            }
        } catch let error as LAError {
            handleBiometricError(error)
        } catch {
            errorMessage = "Biometric authentication failed"
        }
    }

    func logout() async {
        do {
            try await authService.signOut()
            isAuthenticated = false
            email = ""
            password = ""
        } catch {
            errorMessage = "Failed to logout: \(error.localizedDescription)"
        }
    }

    // MARK: - Private Methods
    private func checkBiometricAvailability() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            biometricAuthAvailable = true
            biometricType = context.biometryType
        } else {
            biometricAuthAvailable = false
        }
    }

    private func handleAuthError(_ error: Error) {
        print("❌ Login error: \(error.localizedDescription)")

        if let authError = error as? AuthenticationError {
            switch authError {
            case .invalidCredentials:
                errorMessage = "Invalid email or password"
            case .networkError:
                errorMessage = "Network connection failed"
            case .sessionExpired:
                errorMessage = "Session expired. Please login again"
            case .unauthorized:
                errorMessage = "Unauthorized access"
            default:
                errorMessage = "Authentication failed. Please try again"
            }
        } else {
            errorMessage = "An unexpected error occurred"
        }
    }

    private func handleBiometricError(_ error: LAError) {
        switch error.code {
        case .userCancel:
            errorMessage = "Authentication cancelled"
        case .userFallback:
            errorMessage = "Please use password to sign in"
        case .biometryNotAvailable:
            errorMessage = "Biometric authentication not available"
        case .biometryNotEnrolled:
            errorMessage = "Biometric authentication not set up"
        case .biometryLockout:
            errorMessage = "Too many failed attempts. Please try again later"
        default:
            errorMessage = "Biometric authentication failed"
        }
    }
}

// MARK: - Authentication Error
enum AuthenticationError: Error {
    case invalidCredentials
    case networkError
    case sessionExpired
    case unauthorized
    case unknown
}
