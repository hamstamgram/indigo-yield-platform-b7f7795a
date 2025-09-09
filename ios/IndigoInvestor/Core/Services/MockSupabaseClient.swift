//
//  MockSupabaseClient.swift
//  IndigoInvestor
//
//  Mock implementation to bypass Supabase SDK issues
//

import Foundation
import Supabase

// Create a simple wrapper that bypasses the problematic initialization
class MockSupabaseClient {
    let url: URL
    let apiKey: String
    
    init(url: URL, apiKey: String) {
        self.url = url
        self.apiKey = apiKey
    }
    
    // Mock auth service
    func signIn(email: String, password: String) async throws -> AuthResponse {
        // For testing, accept the test credentials
        if (email == "lp@test.com" && password == "TestPass123!") ||
           (email == "admin@test.com" && password == "AdminPass123!") {
            // Return a mock successful response
            return AuthResponse(
                accessToken: "mock-token-\(UUID().uuidString)",
                tokenType: "bearer",
                expiresIn: 3600,
                expiresAt: Int(Date().timeIntervalSince1970) + 3600,
                refreshToken: "mock-refresh-token",
                user: User(
                    id: UUID(),
                    appMetadata: [:],
                    userMetadata: ["email": email, "role": email.contains("admin") ? "admin" : "lp"],
                    aud: "authenticated",
                    confirmationSentAt: nil,
                    recoverySentAt: nil,
                    emailChangeSentAt: nil,
                    newEmail: nil,
                    invitedAt: nil,
                    actionLink: nil,
                    email: email,
                    phone: nil,
                    createdAt: Date(),
                    confirmedAt: Date(),
                    emailConfirmedAt: Date(),
                    phoneConfirmedAt: nil,
                    lastSignInAt: Date(),
                    role: "authenticated",
                    updatedAt: Date()
                )
            )
        } else {
            throw NSError(domain: "MockSupabase", code: 401, userInfo: [NSLocalizedDescriptionKey: "Invalid credentials"])
        }
    }
}

// Mock Auth Response
struct AuthResponse {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int
    let expiresAt: Int
    let refreshToken: String
    let user: User
}

// Mock User
struct User {
    let id: UUID
    let appMetadata: [String: Any]
    let userMetadata: [String: Any]
    let aud: String
    let confirmationSentAt: Date?
    let recoverySentAt: Date?
    let emailChangeSentAt: Date?
    let newEmail: String?
    let invitedAt: Date?
    let actionLink: String?
    let email: String?
    let phone: String?
    let createdAt: Date
    let confirmedAt: Date?
    let emailConfirmedAt: Date?
    let phoneConfirmedAt: Date?
    let lastSignInAt: Date?
    let role: String?
    let updatedAt: Date
}
