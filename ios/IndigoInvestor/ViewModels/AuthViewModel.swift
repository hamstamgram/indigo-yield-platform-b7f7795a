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

    var currentUser: User? {
        return user
    }
    
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
            if !response.accessToken.isEmpty {
                try serviceLocator.keychainManager.saveAccessToken(response.accessToken)
            }
            
            if !response.refreshToken.isEmpty {
                try serviceLocator.keychainManager.saveRefreshToken(response.refreshToken)
            }
            
            // Check if 2FA is required (TODO: implement when available)
            // For now, skip 2FA check
            /*
            if response.user?.factors?.filter({ $0.status == .verified }).isEmpty == false {
                requiresTwoFactor = true
                isLoading = false
                return
            }
            */
            
            // Set user data
            await setUserData(from: response.user)
            
            isAuthenticated = true
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            isLoading = false
            throw error
        }
    }
    
    func verifyTwoFactor(code: String) async throws {
        // Implement 2FA verification
        guard let client = serviceLocator.supabaseClient else {
            throw AuthError.clientNotConfigured
        }
        
        // TODO: Implement 2FA verification when Supabase Swift SDK supports it
        // For now, just mark as verified
        requiresTwoFactor = false
        isAuthenticated = true
        
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
            
            if response.user != nil {
                await setUserData(from: response.user)
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
            if !response.accessToken.isEmpty {
                try serviceLocator.keychainManager.saveAccessToken(response.accessToken)
            }
            
            if !response.refreshToken.isEmpty {
                try serviceLocator.keychainManager.saveRefreshToken(response.refreshToken)
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

    // MARK: - Demo Login (for testing)

    #if DEBUG
    func loginAsDemo(role: UserRole) async {
        isLoading = true
        errorMessage = nil

        // Create demo user
        let demoUser = User(
            id: UUID(),
            email: role == .admin ? "admin@demo.com" : "investor@demo.com",
            fullName: role == .admin ? "Demo Admin" : "Demo Investor",
            role: role,
            isActive: true,
            createdAt: Date(),
            lastLogin: Date(),
            profile: nil
        )

        // Set user data
        self.user = demoUser
        self.userRole = role
        self.isAuthenticated = true
        self.isLoading = false

        // Save to keychain for session persistence
        try? serviceLocator.keychainManager.saveUserID(demoUser.id.uuidString)
        try? serviceLocator.keychainManager.saveUserRole(role.rawValue)
    }
    #endif
    
    // MARK: - Private Methods
    
    private func setUserData(from supabaseUser: Supabase.User?) async {
        guard let supabaseUser = supabaseUser else {
            print("❌ No Supabase user provided")
            return
        }

        print("✅ Setting user data for: \(supabaseUser.email ?? "unknown email")")

        // Map Supabase user to our User model
        let role = determineUserRole(from: supabaseUser)

        user = User(
            id: UUID(uuidString: supabaseUser.id.uuidString) ?? UUID(),
            email: supabaseUser.email ?? "",
            fullName: supabaseUser.userMetadata["full_name"]?.stringValue,
            role: role,
            isActive: true,
            createdAt: supabaseUser.createdAt,
            lastLogin: Date(),
            profile: nil
        )

        userRole = role

        // Save to keychain
        do {
            try serviceLocator.keychainManager.saveUserID(supabaseUser.id.uuidString)
            try serviceLocator.keychainManager.saveUserRole(role.rawValue)
            print("✅ User data saved to keychain")
        } catch {
            print("❌ Failed to save user data to keychain: \(error)")
        }

        // Post authentication state change notification
        NotificationCenter.default.post(name: .authStateChanged, object: self)
    }
    
    private func determineUserRole(from user: Supabase.User) -> UserRole {
        // Check user metadata for role
        if let roleValue = user.appMetadata["role"],
           let role = roleValue.stringValue {
            return UserRole(rawValue: role) ?? .investor
        }
        
        if let roleValue = user.userMetadata["role"],
           let role = roleValue.stringValue {
            return UserRole(rawValue: role) ?? .investor
        }
        
        // Default to investor
        return .investor
    }
    
    private func checkAuthStatus() async {
        guard let client = serviceLocator.supabaseClient else { return }
        
        do {
            let session = try await client.auth.session
            isAuthenticated = true // session.user is non-optional
            
            if session.user != nil {
                await setUserData(from: session.user)
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
