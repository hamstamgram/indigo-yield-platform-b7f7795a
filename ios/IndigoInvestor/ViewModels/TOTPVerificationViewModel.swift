//
//  TOTPVerificationViewModel.swift
//  IndigoInvestor
//

import SwiftUI
import Combine

@MainActor
final class TOTPVerificationViewModel: ObservableObject {
    @Published var code: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var verificationSuccess = false

    private let authService: AuthenticationServiceProtocol

    init(authService: AuthenticationServiceProtocol = ServiceContainer.shared.authService) {
        self.authService = authService
    }

    func verifyCode() async {
        guard code.count == 6, code.allSatisfy({ $0.isNumber }) else {
            errorMessage = "Please enter a valid 6-digit code"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await authService.verifyTOTP(code: code)
            verificationSuccess = true
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Invalid code. Please try again."
            code = ""
        }
    }
}
