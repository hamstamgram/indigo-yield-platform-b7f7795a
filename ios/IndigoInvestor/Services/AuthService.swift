import Foundation
import Combine
import Supabase

/// Service for handling authentication operations
class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var userRole: UserRole = .investor
    
    private let supabase: SupabaseClient
    private var cancellables = Set<AnyCancellable>()
    
    init(supabase: SupabaseClient) {
        self.supabase = supabase
        setupAuthListener()
    }
    
    // MARK: - Auth State Management
    
    private func setupAuthListener() {
        Task {
            for await state in supabase.auth.authStateChanges {
                await MainActor.run {
                    switch state.event {
                    case .signedIn:
                        self.handleSignIn(session: state.session)
                    case .signedOut:
                        self.handleSignOut()
                    case .tokenRefreshed:
                        self.handleTokenRefresh(session: state.session)
                    default:
                        break
                    }
                }
            }
        }
    }
    
    private func handleSignIn(session: Session?) {
        guard let session = session else { return }
        
        Task {
            do {
                let user = try await fetchUserProfile(userId: session.user.id)
                await MainActor.run {
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.userRole = user.role
                }
            } catch {
                print("Failed to fetch user profile: \(error)")
            }
        }
    }
    
    private func handleSignOut() {
        currentUser = nil
        isAuthenticated = false
        userRole = .investor
    }
    
    private func handleTokenRefresh(session: Session?) {
        // Token refreshed, update if needed
        if session != nil {
            isAuthenticated = true
        }
    }
    
    // MARK: - Authentication Methods
    
    func signIn(email: String, password: String) async throws {
        _ = try await supabase.auth.signIn(
            email: email,
            password: password
        )
    }
    
    func signUp(email: String, password: String, fullName: String) async throws {
        let response = try await supabase.auth.signUp(
            email: email,
            password: password,
            data: ["full_name": .string(fullName)]
        )
        
        if response.user != nil {
            // User created successfully
            // Profile will be created via database trigger
        }
    }
    
    func signOut() async throws {
        try await supabase.auth.signOut()
    }
    
    func resetPassword(email: String) async throws {
        try await supabase.auth.resetPasswordForEmail(email)
    }
    
    func updatePassword(newPassword: String) async throws {
        try await supabase.auth.update(user: UserAttributes(password: newPassword))
    }
    
    // MARK: - Two-Factor Authentication
    
    func enable2FA() async throws -> String {
        // This would integrate with TOTP setup
        // Return QR code URL or secret
        return ""
    }
    
    func verify2FA(code: String) async throws {
        // Verify TOTP code
    }
    
    func disable2FA() async throws {
        // Disable 2FA for user
    }
    
    // MARK: - User Profile
    
    private func fetchUserProfile(userId: UUID) async throws -> User {
        let response = try await supabase
            .from("profiles")
            .select()
            .eq("id", value: userId.uuidString)
            .single()
            .execute()
        
        let data = response.data
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let profile = try decoder.decode(UserProfile.self, from: data)
        
        return User(
            id: userId,
            email: profile.email,
            fullName: profile.fullName,
            role: UserRole(rawValue: profile.role) ?? .investor,
            isVerified: profile.emailVerifiedAt != nil,
            createdAt: profile.createdAt
        )
    }
    
    func updateProfile(fullName: String?, phoneNumber: String?) async throws {
        guard let userId = currentUser?.id else { throw AuthError.notAuthenticated }
        
        var updates: [String: Any] = [:]
        if let fullName = fullName {
            updates["full_name"] = fullName
        }
        if let phoneNumber = phoneNumber {
            updates["phone_number"] = phoneNumber
        }
        updates["updated_at"] = ISO8601DateFormatter().string(from: Date())
        
        try await supabase
            .from("profiles")
            .update(updates)
            .eq("id", value: userId.uuidString)
            .execute()
        
        // Refresh user profile
        let user = try await fetchUserProfile(userId: userId)
        await MainActor.run {
            self.currentUser = user
        }
    }
    
    // MARK: - Session Management
    
    func refreshSession() async throws {
        _ = try await supabase.auth.refreshSession()
    }
    
    func getSession() async -> Session? {
        try? await supabase.auth.session
    }
    
    // MARK: - Helper Types
    
    private struct UserProfile: Codable {
        let id: UUID
        let email: String
        let fullName: String
        let role: String
        let phoneNumber: String?
        let emailVerifiedAt: Date?
        let createdAt: Date
        let updatedAt: Date
    }
}

// MARK: - Auth Errors
// Using AuthError from AuthViewModel.swift
