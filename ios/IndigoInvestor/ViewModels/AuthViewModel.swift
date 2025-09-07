//
//  AuthViewModel.swift
//  IndigoInvestor
//
//  Authentication view model
//

import Foundation
import SwiftUI
import Combine
import Supabase

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var user: User?
    @Published var userRole: UserRole = .investor
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var requiresTwoFactor = false
    
    private let serviceLocator = ServiceLocator.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Listen for auth state changes
        NotificationCenter.default.publisher(for: .authStateChanged)
            .sink { [weak self] _ in
                Task {
                    await self?.checkAuthStatus()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Authentication Methods
    
    func login(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            guard let client = serviceLocator.supabaseClient else {
                throw AuthError.clientNotConfigured
            }
            
            let response = try await client.auth.signIn(
                email: email,
                password: password
            )
            
            // Save tokens to keychain
            if let accessToken = response.session?.accessToken {
                try serviceLocator.keychainManager.saveAccessToken(accessToken)
            }
            
            if let refreshToken = response.session?.refreshToken {
                try serviceLocator.keychainManager.saveRefreshToken(refreshToken)
            }
            
            // Check if 2FA is required
            if response.user?.factors?.filter({ $0.status == .verified }).isEmpty == false {
                requiresTwoFactor = true
                return
            }
            
            // Set user data
            await setUserData(from: response.user)
            
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            throw error
        } finally {
            isLoading = false
        }
    }
    
    func verifyTwoFactor(code: String) async throws {
        // Implement 2FA verification
        guard let client = serviceLocator.supabaseClient else {
            throw AuthError.clientNotConfigured
        }
        
        // Verify TOTP code
        try await client.auth.verifyOTP(
            phone: nil,
            token: code,
            type: .totp
        )
        
        requiresTwoFactor = false
        isAuthenticated = true
    }
    
    func logout() async throws {
        do {
            guard let client = serviceLocator.supabaseClient else {
                throw AuthError.clientNotConfigured
            }
            
            try await client.auth.signOut()
            
            // Clear keychain
            try serviceLocator.keychainManager.clearAll()
            
            // Reset state
            isAuthenticated = false
            user = nil
            userRole = .investor
            
            // Reset biometric authentication
            serviceLocator.biometricManager.reset()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            throw error
        }
    }
    
    func restoreSession() async {
        isLoading = true
        
        do {
            // Check if we have valid tokens in keychain
            guard serviceLocator.keychainManager.isSessionValid(),
                  let accessToken = try serviceLocator.keychainManager.getAccessToken() else {
                isLoading = false
                return
            }
            
            guard let client = serviceLocator.supabaseClient else {
                isLoading = false
                return
            }
            
            // Try to restore session
            let response = try await client.auth.session
            
            if let user = response.user {
                await setUserData(from: user)
                isAuthenticated = true
            }
        } catch {
            print("Failed to restore session: \(error)")
            // Session restoration failed, user needs to login again
            try? serviceLocator.keychainManager.clearTokens()
        }
        
        isLoading = false
    }
    
    func refreshSession() async {
        guard let client = serviceLocator.supabaseClient,
              let refreshToken = try? serviceLocator.keychainManager.getRefreshToken() else {
            return
        }
        
        do {
            let response = try await client.auth.refreshSession(refreshToken: refreshToken)
            
            // Update tokens
            if let accessToken = response.session?.accessToken {
                try serviceLocator.keychainManager.saveAccessToken(accessToken)
            }
            
            if let newRefreshToken = response.session?.refreshToken {
                try serviceLocator.keychainManager.saveRefreshToken(newRefreshToken)
            }
        } catch {
            print("Failed to refresh session: \(error)")
        }
    }
    
    // MARK: - Biometric Authentication
    
    func checkBiometricAvailability() async {
        serviceLocator.biometricManager.checkBiometricAvailability()
    }
    
    func authenticateWithBiometrics() async throws {
        do {
            try await serviceLocator.biometricManager.authenticate(
                reason: "Access your portfolio"
            )
            
            // If biometric succeeded, restore session
            await restoreSession()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            throw error
        }
    }
    
    func enableBiometric(_ enabled: Bool) async throws {
        try serviceLocator.keychainManager.setBiometricEnabled(enabled)
    }
    
    // MARK: - Private Methods
    
    private func setUserData(from supabaseUser: Supabase.User?) async {
        guard let supabaseUser = supabaseUser else { return }
        
        // Map Supabase user to our User model
        let role = determineUserRole(from: supabaseUser)
        
        user = User(
            id: UUID(uuidString: supabaseUser.id.uuidString) ?? UUID(),
            email: supabaseUser.email ?? "",
            fullName: supabaseUser.userMetadata?["full_name"] as? String,
            role: role,
            isActive: true,
            createdAt: supabaseUser.createdAt,
            lastLogin: Date(),
            profile: nil
        )
        
        userRole = role
        
        // Save to keychain
        try? serviceLocator.keychainManager.saveUserID(supabaseUser.id.uuidString)
        try? serviceLocator.keychainManager.saveUserRole(role.rawValue)
    }
    
    private func determineUserRole(from user: Supabase.User) -> UserRole {
        // Check user metadata for role
        if let role = user.appMetadata?["role"] as? String {
            return UserRole(rawValue: role) ?? .investor
        }
        
        if let role = user.userMetadata?["role"] as? String {
            return UserRole(rawValue: role) ?? .investor
        }
        
        // Default to investor
        return .investor
    }
    
    private func checkAuthStatus() async {
        guard let client = serviceLocator.supabaseClient else { return }
        
        do {
            let session = try await client.auth.session
            isAuthenticated = session.user != nil
            
            if let user = session.user {
                await setUserData(from: user)
            }
        } catch {
            isAuthenticated = false
        }
    }
}

// MARK: - Auth Error

enum AuthError: LocalizedError {
    case clientNotConfigured
    case invalidCredentials
    case twoFactorRequired
    case sessionExpired
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .clientNotConfigured:
            return "Authentication service is not configured"
        case .invalidCredentials:
            return "Invalid email or password"
        case .twoFactorRequired:
            return "Two-factor authentication is required"
        case .sessionExpired:
            return "Your session has expired. Please login again"
        case .networkError:
            return "Network error. Please check your connection"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let authStateChanged = Notification.Name("authStateChanged")
    static let sessionExpired = Notification.Name("sessionExpired")
}
