//
//  PasswordChangeViewModel.swift
//  IndigoInvestor
//
//  ViewModel for PasswordChangeView with comprehensive password validation and security
//

import SwiftUI
import Combine

@MainActor
final class PasswordChangeViewModel: ObservableObject {
    // MARK: - Published Properties

    // Password Fields
    @Published var currentPassword: String = ""
    @Published var newPassword: String = ""
    @Published var confirmPassword: String = ""

    // Visibility Toggles
    @Published var showCurrentPassword: Bool = false
    @Published var showNewPassword: Bool = false
    @Published var showConfirmPassword: Bool = false

    // Validation State
    @Published var passwordStrength: PasswordStrength = .none
    @Published var validationErrors: [PasswordValidationError] = []

    // System State
    @Published var isLoading: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var successMessage: String = ""

    // MARK: - Private Properties
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // Password Requirements
    private let minLength = 8
    private let maxLength = 128

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
        setupValidation()
    }

    // MARK: - Setup
    private func setupValidation() {
        // Real-time validation for new password
        $newPassword
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] password in
                self?.validateNewPassword(password)
            }
            .store(in: &cancellables)

        // Real-time validation for password confirmation
        $confirmPassword
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validatePasswordConfirmation()
            }
            .store(in: &cancellables)
    }

    // MARK: - Validation
    private func validateNewPassword(_ password: String) {
        var errors: [PasswordValidationError] = []

        // Check minimum length
        if password.count < minLength {
            errors.append(.tooShort)
        }

        // Check maximum length
        if password.count > maxLength {
            errors.append(.tooLong)
        }

        // Check for uppercase letter
        if !password.contains(where: { $0.isUppercase }) {
            errors.append(.noUppercase)
        }

        // Check for lowercase letter
        if !password.contains(where: { $0.isLowercase }) {
            errors.append(.noLowercase)
        }

        // Check for number
        if !password.contains(where: { $0.isNumber }) {
            errors.append(.noNumber)
        }

        // Check for special character
        let specialCharacters = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;:,.<>?")
        if password.unicodeScalars.allSatisfy({ !specialCharacters.contains($0) }) {
            errors.append(.noSpecialCharacter)
        }

        // Check if same as current password
        if !currentPassword.isEmpty && password == currentPassword {
            errors.append(.sameAsCurrent)
        }

        validationErrors = errors
        passwordStrength = calculatePasswordStrength(password)
    }

    private func validatePasswordConfirmation() {
        // Only validate if both fields have content
        guard !newPassword.isEmpty && !confirmPassword.isEmpty else { return }

        if newPassword != confirmPassword {
            if !validationErrors.contains(.mismatch) {
                validationErrors.append(.mismatch)
            }
        } else {
            validationErrors.removeAll { $0 == .mismatch }
        }
    }

    private func calculatePasswordStrength(_ password: String) -> PasswordStrength {
        guard !password.isEmpty else { return .none }

        var score = 0

        // Length scoring
        if password.count >= minLength { score += 1 }
        if password.count >= 12 { score += 1 }
        if password.count >= 16 { score += 1 }

        // Character variety scoring
        if password.contains(where: { $0.isUppercase }) { score += 1 }
        if password.contains(where: { $0.isLowercase }) { score += 1 }
        if password.contains(where: { $0.isNumber }) { score += 1 }

        let specialCharacters = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;:,.<>?")
        if password.unicodeScalars.contains(where: { specialCharacters.contains($0) }) { score += 1 }

        // Determine strength based on score
        switch score {
        case 0...2:
            return .weak
        case 3...4:
            return .fair
        case 5...6:
            return .good
        case 7...:
            return .strong
        default:
            return .none
        }
    }

    // MARK: - Computed Properties
    var isValidPassword: Bool {
        // Must have no validation errors and passwords must match
        validationErrors.isEmpty &&
        !newPassword.isEmpty &&
        newPassword == confirmPassword &&
        passwordStrength != .none &&
        passwordStrength != .weak
    }

    var canSubmit: Bool {
        !currentPassword.isEmpty &&
        !newPassword.isEmpty &&
        !confirmPassword.isEmpty &&
        isValidPassword &&
        !isLoading
    }

    // Validation requirement checkers for UI
    var hasMinLength: Bool {
        newPassword.count >= minLength
    }

    var hasMaxLength: Bool {
        newPassword.count <= maxLength
    }

    var hasUppercase: Bool {
        newPassword.contains(where: { $0.isUppercase })
    }

    var hasLowercase: Bool {
        newPassword.contains(where: { $0.isLowercase })
    }

    var hasNumber: Bool {
        newPassword.contains(where: { $0.isNumber })
    }

    var hasSpecialCharacter: Bool {
        let specialCharacters = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;:,.<>?")
        return newPassword.unicodeScalars.contains(where: { specialCharacters.contains($0) })
    }

    var passwordsMatch: Bool {
        !newPassword.isEmpty && !confirmPassword.isEmpty && newPassword == confirmPassword
    }

    var isDifferentFromCurrent: Bool {
        !newPassword.isEmpty && newPassword != currentPassword
    }

    // MARK: - Password Update
    func updatePassword() async {
        guard canSubmit else { return }

        isLoading = true

        do {
            // TODO: Verify current password with Supabase
            // Simulate verification delay
            try await Task.sleep(nanoseconds: 800_000_000)

            /*
            // Example Supabase authentication:
            let user = try await supabase.auth.currentUser()

            // Verify current password by attempting sign in
            _ = try await supabase.auth.signIn(
                email: user.email,
                password: currentPassword
            )
            */

            // Verify current password (simulated)
            guard validateCurrentPassword(currentPassword) else {
                isLoading = false
                errorMessage = "Current password is incorrect"
                showError = true
                return
            }

            // TODO: Update password in Supabase
            // Simulate update delay
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase password update:
            try await supabase.auth.updateUser(
                attributes: UserAttributes(password: newPassword)
            )

            // Log security event
            try await supabase
                .from("security_events")
                .insert([
                    "user_id": user.id,
                    "event_type": "password_changed",
                    "timestamp": ISO8601DateFormatter().string(from: Date()),
                    "ip_address": getIPAddress(),
                    "user_agent": getUserAgent()
                ])
                .execute()
            */

            // Clear password fields
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordStrength = .none
            validationErrors = []

            isLoading = false

            successMessage = "Password updated successfully"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update password: \(error.localizedDescription)"
            showError = true
        }
    }

    private func validateCurrentPassword(_ password: String) -> Bool {
        // TODO: Implement actual password verification
        // For now, simulate success (in production, this would verify against stored password)
        return !password.isEmpty && password.count >= minLength
    }

    // MARK: - Helper Methods
    func clearForm() {
        currentPassword = ""
        newPassword = ""
        confirmPassword = ""
        showCurrentPassword = false
        showNewPassword = false
        showConfirmPassword = false
        passwordStrength = .none
        validationErrors = []
    }

    func toggleCurrentPasswordVisibility() {
        showCurrentPassword.toggle()
    }

    func toggleNewPasswordVisibility() {
        showNewPassword.toggle()
    }

    func toggleConfirmPasswordVisibility() {
        showConfirmPassword.toggle()
    }
}

// MARK: - Supporting Types

enum PasswordStrength {
    case none
    case weak
    case fair
    case good
    case strong

    var color: Color {
        switch self {
        case .none:
            return Color.gray
        case .weak:
            return Color.red
        case .fair:
            return Color.orange
        case .good:
            return Color.yellow
        case .strong:
            return Color.green
        }
    }

    var displayName: String {
        switch self {
        case .none:
            return "None"
        case .weak:
            return "Weak"
        case .fair:
            return "Fair"
        case .good:
            return "Good"
        case .strong:
            return "Strong"
        }
    }

    var progress: Double {
        switch self {
        case .none:
            return 0.0
        case .weak:
            return 0.25
        case .fair:
            return 0.5
        case .good:
            return 0.75
        case .strong:
            return 1.0
        }
    }
}

enum PasswordValidationError: Equatable {
    case tooShort
    case tooLong
    case noUppercase
    case noLowercase
    case noNumber
    case noSpecialCharacter
    case sameAsCurrent
    case mismatch

    var message: String {
        switch self {
        case .tooShort:
            return "Password must be at least 8 characters"
        case .tooLong:
            return "Password must be less than 128 characters"
        case .noUppercase:
            return "Password must contain an uppercase letter"
        case .noLowercase:
            return "Password must contain a lowercase letter"
        case .noNumber:
            return "Password must contain a number"
        case .noSpecialCharacter:
            return "Password must contain a special character"
        case .sameAsCurrent:
            return "New password must be different from current password"
        case .mismatch:
            return "Passwords do not match"
        }
    }
}
