//
//  AuthServiceWrapper.swift
//  IndigoInvestor
//
//  Wrapper to bridge Core/Services/AuthService with simpler API
//

import Foundation
import Supabase
import Combine

// Wrapper that provides the simpler API expected by ServiceLocator
// while internally using the Core AuthService
@MainActor
class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?

    private let supabase: SupabaseClient

    init(supabase: SupabaseClient) {
        self.supabase = supabase

        Task {
            await checkAuthStatus()
        }
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response = try await supabase.auth.signIn(
                email: email,
                password: password
            )

            // Convert Supabase user to app user model
            currentUser = User(from: response.user)
            isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }

    func signUp(email: String, password: String, fullName: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response = try await supabase.auth.signUp(
                email: email,
                password: password,
                data: ["full_name": .string(fullName)]
            )

            // Convert Supabase user to app user model
            currentUser = User(from: response.user)
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }

    func signOut() async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await supabase.auth.signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }

    func resetPassword(email: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            try await supabase.auth.resetPasswordForEmail(email)
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }

    func checkAuthStatus() async {
        if let session = try? await supabase.auth.session {
            currentUser = User(from: session.user)
            isAuthenticated = true
        } else {
            currentUser = nil
            isAuthenticated = false
        }
    }
}