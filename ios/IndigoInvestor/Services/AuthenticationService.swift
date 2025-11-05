//
//  AuthenticationService.swift
//  IndigoInvestor
//
//  Core authentication service with Supabase integration
//

import Foundation
import Supabase
import AuthenticationServices

final class AuthenticationService: AuthenticationServiceProtocol {
    private let supabaseClient: SupabaseClient
    private let keychainManager: KeychainManagerProtocol

    init(supabaseClient: SupabaseClient, keychainManager: KeychainManagerProtocol) {
        self.supabaseClient = supabaseClient
        self.keychainManager = keychainManager
    }

    func signIn(email: String, password: String) async throws -> Session {
        do {
            let session = try await supabaseClient.auth.signIn(
                email: email,
                password: password
            )

            print("✅ Authentication successful: \(session.user.email ?? "Unknown")")
            return session
        } catch {
            print("❌ Authentication failed: \(error.localizedDescription)")
            throw AuthenticationError.invalidCredentials
        }
    }

    func signUp(email: String, password: String, fullName: String, company: String) async throws {
        do {
            let response = try await supabaseClient.auth.signUp(
                email: email,
                password: password,
                data: [
                    "full_name": .string(fullName),
                    "company": .string(company)
                ]
            )

            print("✅ Sign up successful: \(response.user.email ?? "Unknown")")

            // Create investor profile in database
            try await createInvestorProfile(userId: response.user.id, fullName: fullName, company: company)
        } catch {
            print("❌ Sign up failed: \(error.localizedDescription)")
            throw error
        }
    }

    func signOut() async throws {
        do {
            try await supabaseClient.auth.signOut()
            try keychainManager.deleteCredentials()
            print("✅ Sign out successful")
        } catch {
            print("❌ Sign out failed: \(error.localizedDescription)")
            throw error
        }
    }

    func verifyTOTP(code: String) async throws {
        do {
            // Implement TOTP verification with Supabase
            let response = try await supabaseClient.auth.verifyOTP(
                type: .totp,
                token: code
            )
            print("✅ TOTP verification successful")
        } catch {
            print("❌ TOTP verification failed: \(error.localizedDescription)")
            throw error
        }
    }

    func resetPassword(email: String) async throws {
        do {
            try await supabaseClient.auth.resetPasswordForEmail(email)
            print("✅ Password reset email sent to: \(email)")
        } catch {
            print("❌ Password reset failed: \(error.localizedDescription)")
            throw error
        }
    }

    // MARK: - Private Methods

    private func createInvestorProfile(userId: UUID, fullName: String, company: String) async throws {
        struct InvestorProfile: Codable {
            let id: UUID
            let full_name: String
            let company: String
            let role: String
            let status: String
            let created_at: Date
        }

        let profile = InvestorProfile(
            id: userId,
            full_name: fullName,
            company: company,
            role: "investor",
            status: "pending_kyc",
            created_at: Date()
        )

        try await supabaseClient
            .from("investors")
            .insert(profile)
            .execute()

        print("✅ Investor profile created")
    }
}

// MARK: - Authentication Error

enum AuthenticationError: LocalizedError {
    case invalidCredentials
    case networkError
    case sessionExpired
    case unauthorized
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .networkError:
            return "Network connection failed"
        case .sessionExpired:
            return "Session expired. Please login again"
        case .unauthorized:
            return "Unauthorized access"
        case .unknown:
            return "An unexpected error occurred"
        }
    }
}
