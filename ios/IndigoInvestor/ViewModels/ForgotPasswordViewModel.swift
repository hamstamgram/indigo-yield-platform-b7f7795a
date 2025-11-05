//
//  ForgotPasswordViewModel.swift
//  IndigoInvestor
//

import SwiftUI
import Combine

@MainActor
final class ForgotPasswordViewModel: ObservableObject {
    @Published var email: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var resetSent = false

    private let authService: AuthenticationServiceProtocol

    init(authService: AuthenticationServiceProtocol = ServiceContainer.shared.authService) {
        self.authService = authService
    }

    func sendResetEmail() async {
        guard !email.isEmpty, email.contains("@") else {
            errorMessage = "Please enter a valid email address"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authService.resetPassword(email: email)
            resetSent = true
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to send reset email. Please try again."
        }
    }
}
