//
//  AuthService.swift
//  IndigoInvestor
//
//  Authentication service for managing user sessions
//

import Foundation
import Supabase
import Combine

@MainActor
class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?
    
    private let client: SupabaseClient
    private let keychainManager: KeychainManager
    private let biometricManager: BiometricAuthManager
    private var cancellables = Set<AnyCancellable>()
    
    init(client: SupabaseClient, keychainManager: KeychainManager, biometricManager: BiometricAuthManager) {
        self.client = client
        self.keychainManager = keychainManager
        self.biometricManager = biometricManager
        
        Task {
            await checkAuthStatus()
        }
    }
    
    // MARK: - Authentication Methods
    
    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil
        
        do {
            let response = try await client.auth.signIn(
                email: email,
                password: password
            )
            
            currentUser = response.user
            isAuthenticated = true
            
            // Store credentials securely
            try keychainManager.store(email, for: "user_email")
            
            // Enable biometric auth if available
            if biometricManager.canUseBiometrics() {
                await enableBiometricAuth()
            }
        } catch {
            self.error = error.localizedDescription
            throw error
        } finally {
            isLoading = false
        }
    }
    
    func signUp(email: String, password: String, fullName: String) async throws {
        isLoading = true
        error = nil
        
        do {
            let response = try await client.auth.signUp(
                email: email,
                password: password,
                data: ["full_name": .string(fullName)]
            )
            
            currentUser = response.user
            // Note: User needs to verify email before full authentication
        } catch {
            self.error = error.localizedDescription
            throw error
        } finally {
            isLoading = false
        }
    }
    
    func signOut() async throws {
        isLoading = true
        error = nil
        
        do {
            try await client.auth.signOut()
            currentUser = nil
            isAuthenticated = false
            
            // Clear stored credentials
            try keychainManager.delete("user_email")
            try keychainManager.delete("refresh_token")
        } catch {
            self.error = error.localizedDescription
            throw error
        } finally {
            isLoading = false
        }
    }
    
    func resetPassword(email: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await client.auth.resetPasswordForEmail(email)
        } catch {
            self.error = error.localizedDescription
            throw error
        } finally {
            isLoading = false
        }
    }
    
    func updatePassword(newPassword: String) async throws {
        isLoading = true
        error = nil
        
        do {
            try await client.auth.update(user: UserAttributes(password: newPassword))
        } catch {
            self.error = error.localizedDescription
            throw error
        } finally {
            isLoading = false
        }
    }
    
    // MARK: - Biometric Authentication
    
    func signInWithBiometrics() async throws {
        guard biometricManager.canUseBiometrics() else {
            throw AuthError.biometricsNotAvailable
        }
        
        let authenticated = await biometricManager.authenticate(
            reason: "Access your portfolio"
        )
        
        if authenticated {
            // Retrieve stored credentials and sign in
            if let email = try? keychainManager.retrieve("user_email"),
               let refreshToken = try? keychainManager.retrieve("refresh_token") {
                try await refreshSession(refreshToken)
            } else {
                throw AuthError.noStoredCredentials
            }
        } else {
            throw AuthError.biometricsFailed
        }
    }
    
    private func enableBiometricAuth() async {
        // Store refresh token for biometric auth
        if let session = client.auth.session {
            try? keychainManager.store(session.refreshToken, for: "refresh_token")
        }
    }
    
    // MARK: - Session Management
    
    func checkAuthStatus() async {
        if let session = client.auth.session {
            currentUser = session.user
            isAuthenticated = true
        } else {
            currentUser = nil
            isAuthenticated = false
        }
    }
    
    private func refreshSession(_ refreshToken: String) async throws {
        let response = try await client.auth.refreshSession(refreshToken: refreshToken)
        currentUser = response.user
        isAuthenticated = true
    }
    
    // MARK: - Two-Factor Authentication
    
    func enableTwoFactor() async throws {
        // Implementation for 2FA setup
        isLoading = true
        defer { isLoading = false }
        
        // This would integrate with Supabase's MFA features
        // when they become available
    }
    
    func verifyTwoFactor(code: String) async throws -> Bool {
        // Verify 2FA code
        return true // Placeholder
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case biometricsNotAvailable
    case biometricsFailed
    case noStoredCredentials
    case invalidCredentials
    case emailNotVerified
    case twoFactorRequired
    
    var errorDescription: String? {
        switch self {
        case .biometricsNotAvailable:
            return "Biometric authentication is not available on this device"
        case .biometricsFailed:
            return "Biometric authentication failed"
        case .noStoredCredentials:
            return "No stored credentials found"
        case .invalidCredentials:
            return "Invalid email or password"
        case .emailNotVerified:
            return "Please verify your email address"
        case .twoFactorRequired:
            return "Two-factor authentication is required"
        }
    }
}
