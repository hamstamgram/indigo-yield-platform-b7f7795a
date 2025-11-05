//
//  RegisterViewModel.swift
//  IndigoInvestor
//

import SwiftUI
import Combine

@MainActor
final class RegisterViewModel: ObservableObject {
    @Published var fullName: String = ""
    @Published var email: String = ""
    @Published var company: String = ""
    @Published var password: String = ""
    @Published var confirmPassword: String = ""
    @Published var showPassword: Bool = false
    @Published var showConfirmPassword: Bool = false
    @Published var acceptedTerms: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var registrationSuccess: Bool = false

    private let authService: AuthenticationServiceProtocol

    var isValidInput: Bool {
        !fullName.isEmpty &&
        !email.isEmpty &&
        email.contains("@") &&
        !company.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword &&
        acceptedTerms &&
        passwordMeetsRequirements
    }

    private var passwordMeetsRequirements: Bool {
        password.count >= 8 &&
        password.contains(where: { $0.isUppercase }) &&
        password.contains(where: { $0.isNumber }) &&
        password.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) })
    }

    init(authService: AuthenticationServiceProtocol = ServiceContainer.shared.authService) {
        self.authService = authService
    }

    func register() async {
        guard isValidInput else {
            errorMessage = "Please fill in all fields correctly"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authService.signUp(
                email: email,
                password: password,
                fullName: fullName,
                company: company
            )

            registrationSuccess = true
            isLoading = false

            // Clear form after success
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.clearForm()
            }
        } catch {
            isLoading = false
            errorMessage = "Registration failed: \(error.localizedDescription)"
        }
    }

    private func clearForm() {
        fullName = ""
        email = ""
        company = ""
        password = ""
        confirmPassword = ""
        acceptedTerms = false
    }
}
