//
//  PasswordResetViewModel.swift
//  IndigoInvestor
//
//  ViewModel for password reset functionality
//

import Foundation
import Combine

@MainActor
class PasswordResetViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var email = ""
    @Published var verificationCode = ""
    @Published var newPassword = ""
    @Published var confirmPassword = ""
    
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String?
    @Published var canResendCode = true
    
    // MARK: - Private Properties

    private let supabaseManager = SupabaseService.shared
    private var resendTimer: Timer?
    private var resendCountdown = 60
    
    // MARK: - Computed Properties
    
    var isValidEmail: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    var isPasswordValid: Bool {
        guard newPassword.count >= 8 else { return false }
        guard newPassword == confirmPassword else { return false }
        
        let hasUppercase = newPassword.contains(where: { $0.isUppercase })
        let hasLowercase = newPassword.contains(where: { $0.isLowercase })
        let hasNumber = newPassword.contains(where: { $0.isNumber })
        let hasSpecialChar = newPassword.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) })
        
        return hasUppercase && hasLowercase && hasNumber && hasSpecialChar
    }
    
    // MARK: - Methods
    
    func requestPasswordReset() async -> Bool {
        guard isValidEmail else {
            errorMessage = "Please enter a valid email address"
            showError = true
            return false
        }
        
        isLoading = true
        
        do {
            _ = try await supabaseManager.client.auth.resetPasswordForEmail(email)
            
            isLoading = false
            startResendTimer()
            return true
        } catch {
            isLoading = false
            errorMessage = "Failed to send reset email: \(error.localizedDescription)"
            showError = true
            return false
        }
    }
    
    func verifyCode() async -> Bool {
        guard verificationCode.count == 6 else {
            errorMessage = "Please enter a valid 6-digit code"
            showError = true
            return false
        }
        
        isLoading = true
        
        // Simulate verification (implement actual verification with your backend)
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        isLoading = false
        return true
    }
    
    func resetPassword() async -> Bool {
        guard isPasswordValid else {
            errorMessage = "Please ensure your password meets all requirements"
            showError = true
            return false
        }
        
        isLoading = true
        
        do {
            // Update password via Supabase
            _ = try await supabaseManager.client.auth.update(
                user: UpdateUserParams(password: newPassword)
            )
            
            isLoading = false
            return true
        } catch {
            isLoading = false
            errorMessage = "Failed to reset password: \(error.localizedDescription)"
            showError = true
            return false
        }
    }
    
    func resendCode() async {
        guard canResendCode else { return }
        
        canResendCode = false
        startResendTimer()
        
        // Resend the code
        _ = await requestPasswordReset()
    }
    
    private func startResendTimer() {
        resendCountdown = 60
        canResendCode = false
        
        resendTimer?.invalidate()
        resendTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                self.resendCountdown -= 1
                
                if self.resendCountdown <= 0 {
                    self.canResendCode = true
                    self.resendTimer?.invalidate()
                    self.resendTimer = nil
                }
            }
        }
    }
    
    deinit {
        resendTimer?.invalidate()
    }
}

// MARK: - Mock Update User Params

struct UpdateUserParams: Encodable {
    let password: String?
    let email: String?
    let phone: String?
    let data: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case password
        case email
        case phone
        case data
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(password, forKey: .password)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(phone, forKey: .phone)
    }
}
