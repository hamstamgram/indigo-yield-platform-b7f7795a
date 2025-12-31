//
//  PasswordResetView.swift
//  IndigoInvestor
//
//  Password reset flow for users
//

import SwiftUI

struct PasswordResetView: View {
    @StateObject private var viewModel = PasswordResetViewModel()
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var currentStep: ResetStep = .requestReset
    
    enum ResetStep {
        case requestReset
        case verifyCode
        case setNewPassword
        case success
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        IndigoTheme.primaryColor.opacity(0.1),
                        IndigoTheme.secondaryColor.opacity(0.05)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Progress indicator
                    ProgressIndicator(currentStep: currentStep)
                        .padding(.top)
                    
                    // Step content
                    Group {
                        switch currentStep {
                        case .requestReset:
                            requestResetView
                        case .verifyCode:
                            verifyCodeView
                        case .setNewPassword:
                            setNewPasswordView
                        case .success:
                            successView
                        }
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK") { }
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
        }
    }
    
    // MARK: - Step Views
    
    private var requestResetView: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "envelope.badge.shield.half.filled")
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.primaryColor)
                
                Text("Reset Your Password")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Enter your email address and we'll send you a verification code")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical)
            
            VStack(spacing: 16) {
                TextField("Email Address", text: $viewModel.email)
                    .textFieldStyle(IndigoTextFieldStyle())
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                
                Button {
                    Task {
                        if await viewModel.requestPasswordReset() {
                            withAnimation {
                                currentStep = .verifyCode
                            }
                        }
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Send Verification Code")
                    }
                }
                .buttonStyle(IndigoPrimaryButtonStyle())
                .disabled(!viewModel.isValidEmail || viewModel.isLoading)
            }
        }
    }
    
    private var verifyCodeView: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "key.fill")
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.primaryColor)
                
                Text("Enter Verification Code")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("We sent a code to \(viewModel.email)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical)
            
            VStack(spacing: 16) {
                // OTP Input
                HStack(spacing: 12) {
                    ForEach(0..<6) { index in
                        OTPDigitField(text: binding(for: index))
                    }
                }
                
                Button {
                    Task {
                        if await viewModel.verifyCode() {
                            withAnimation {
                                currentStep = .setNewPassword
                            }
                        }
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Verify Code")
                    }
                }
                .buttonStyle(IndigoPrimaryButtonStyle())
                .disabled(viewModel.verificationCode.count != 6 || viewModel.isLoading)
                
                Button {
                    Task {
                        await viewModel.resendCode()
                    }
                } label: {
                    Text("Resend Code")
                        .font(.subheadline)
                        .foregroundColor(IndigoTheme.primaryColor)
                }
                .disabled(viewModel.canResendCode == false)
            }
        }
    }
    
    private var setNewPasswordView: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "lock.rotation")
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.primaryColor)
                
                Text("Set New Password")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Choose a strong password for your account")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical)
            
            VStack(spacing: 16) {
                SecureField("New Password", text: $viewModel.newPassword)
                    .textFieldStyle(IndigoTextFieldStyle())
                    .textContentType(.newPassword)
                
                SecureField("Confirm Password", text: $viewModel.confirmPassword)
                    .textFieldStyle(IndigoTextFieldStyle())
                    .textContentType(.newPassword)
                
                // Password strength indicator
                PasswordStrengthIndicator(password: viewModel.newPassword)
                
                // Password requirements
                VStack(alignment: .leading, spacing: 8) {
                    PasswordRequirement(
                        text: "At least 8 characters",
                        isMet: viewModel.newPassword.count >= 8
                    )
                    PasswordRequirement(
                        text: "Contains uppercase letter",
                        isMet: viewModel.newPassword.contains(where: { $0.isUppercase })
                    )
                    PasswordRequirement(
                        text: "Contains lowercase letter",
                        isMet: viewModel.newPassword.contains(where: { $0.isLowercase })
                    )
                    PasswordRequirement(
                        text: "Contains number",
                        isMet: viewModel.newPassword.contains(where: { $0.isNumber })
                    )
                    PasswordRequirement(
                        text: "Contains special character",
                        isMet: viewModel.newPassword.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) })
                    )
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.05))
                )
                
                Button {
                    Task {
                        if await viewModel.resetPassword() {
                            withAnimation {
                                currentStep = .success
                            }
                        }
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Reset Password")
                    }
                }
                .buttonStyle(IndigoPrimaryButtonStyle())
                .disabled(!viewModel.isPasswordValid || viewModel.isLoading)
            }
        }
    }
    
    private var successView: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)
                
                Text("Password Reset Successfully!")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Your password has been updated. You can now login with your new password.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical)
            
            Button {
                dismiss()
            } label: {
                Text("Back to Login")
            }
            .buttonStyle(IndigoPrimaryButtonStyle())
        }
    }
    
    // MARK: - Helper Methods
    
    private func binding(for index: Int) -> Binding<String> {
        Binding<String>(
            get: {
                if index < viewModel.verificationCode.count {
                    return String(viewModel.verificationCode[viewModel.verificationCode.index(viewModel.verificationCode.startIndex, offsetBy: index)])
                }
                return ""
            },
            set: { newValue in
                if newValue.count <= 1 {
                    if index < viewModel.verificationCode.count {
                        let idx = viewModel.verificationCode.index(viewModel.verificationCode.startIndex, offsetBy: index)
                        viewModel.verificationCode.replaceSubrange(idx...idx, with: newValue)
                    } else if index == viewModel.verificationCode.count && !newValue.isEmpty {
                        viewModel.verificationCode.append(newValue)
                    }
                }
            }
        )
    }
}

// MARK: - Supporting Views

struct ProgressIndicator: View {
    let currentStep: PasswordResetView.ResetStep
    
    var body: some View {
        HStack(spacing: 20) {
            StepCircle(
                number: 1,
                isActive: currentStep == .requestReset,
                isCompleted: currentStep.rawValue > PasswordResetView.ResetStep.requestReset.rawValue
            )
            
            Rectangle()
                .fill(currentStep.rawValue > PasswordResetView.ResetStep.requestReset.rawValue ? IndigoTheme.primaryColor : Color.gray.opacity(0.3))
                .frame(height: 2)
            
            StepCircle(
                number: 2,
                isActive: currentStep == .verifyCode,
                isCompleted: currentStep.rawValue > PasswordResetView.ResetStep.verifyCode.rawValue
            )
            
            Rectangle()
                .fill(currentStep.rawValue > PasswordResetView.ResetStep.verifyCode.rawValue ? IndigoTheme.primaryColor : Color.gray.opacity(0.3))
                .frame(height: 2)
            
            StepCircle(
                number: 3,
                isActive: currentStep == .setNewPassword,
                isCompleted: currentStep == .success
            )
        }
        .frame(maxWidth: 300)
    }
}

struct StepCircle: View {
    let number: Int
    let isActive: Bool
    let isCompleted: Bool
    
    var body: some View {
        ZStack {
            Circle()
                .fill(isActive || isCompleted ? IndigoTheme.primaryColor : Color.gray.opacity(0.3))
                .frame(width: 30, height: 30)
            
            if isCompleted {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
            } else {
                Text("\(number)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(isActive ? .white : .gray)
            }
        }
    }
}

struct OTPDigitField: View {
    @Binding var text: String
    @FocusState private var isFocused: Bool
    
    var body: some View {
        TextField("", text: $text)
            .frame(width: 45, height: 55)
            .multilineTextAlignment(.center)
            .font(.title2)
            .fontWeight(.semibold)
            .keyboardType(.numberPad)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isFocused ? IndigoTheme.primaryColor : Color.gray.opacity(0.3), lineWidth: 2)
            )
            .focused($isFocused)
            .onChange(of: text) { newValue in
                if newValue.count > 1 {
                    text = String(newValue.prefix(1))
                }
            }
    }
}

struct PasswordStrengthIndicator: View {
    let password: String
    
    var strength: PasswordStrength {
        if password.isEmpty { return .none }
        if password.count < 8 { return .weak }
        
        var score = 0
        if password.contains(where: { $0.isUppercase }) { score += 1 }
        if password.contains(where: { $0.isLowercase }) { score += 1 }
        if password.contains(where: { $0.isNumber }) { score += 1 }
        if password.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) }) { score += 1 }
        
        switch score {
        case 0...1: return .weak
        case 2: return .fair
        case 3: return .good
        case 4: return .strong
        default: return .weak
        }
    }
    
    enum PasswordStrength {
        case none, weak, fair, good, strong
        
        var color: Color {
            switch self {
            case .none: return .gray
            case .weak: return .red
            case .fair: return .orange
            case .good: return .yellow
            case .strong: return .green
            }
        }
        
        var text: String {
            switch self {
            case .none: return ""
            case .weak: return "Weak"
            case .fair: return "Fair"
            case .good: return "Good"
            case .strong: return "Strong"
            }
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Password Strength")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(strength.text)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(strength.color)
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(strength.color)
                        .frame(width: geometry.size.width * strengthPercentage)
                }
            }
            .frame(height: 4)
        }
    }
    
    private var strengthPercentage: CGFloat {
        switch strength {
        case .none: return 0
        case .weak: return 0.25
        case .fair: return 0.5
        case .good: return 0.75
        case .strong: return 1.0
        }
    }
}

struct PasswordRequirement: View {
    let text: String
    let isMet: Bool
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.caption)
                .foregroundColor(isMet ? .green : .gray)
            
            Text(text)
                .font(.caption)
                .foregroundColor(isMet ? .primary : .secondary)
            
            Spacer()
        }
    }
}

// MARK: - ResetStep Extension

extension PasswordResetView.ResetStep: Comparable {
    var rawValue: Int {
        switch self {
        case .requestReset: return 0
        case .verifyCode: return 1
        case .setNewPassword: return 2
        case .success: return 3
        }
    }
    
    static func < (lhs: Self, rhs: Self) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}
