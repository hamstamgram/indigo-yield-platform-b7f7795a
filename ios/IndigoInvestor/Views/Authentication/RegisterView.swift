//
//  RegisterView.swift
//  IndigoInvestor
//
//  Created by Indigo Development Team
//  Screen 3/85: Account creation with validation
//

import SwiftUI

struct RegisterView: View {
    @StateObject private var viewModel = RegisterViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "1A1F3A"),
                    Color(hex: "2D3561")
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 80, height: 80)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color(hex: "4F46E5"), Color(hex: "7C3AED")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )

                        VStack(spacing: 8) {
                            Text("Create Account")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.white)

                            Text("Join Indigo institutional platform")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    .padding(.top, 40)

                    // Registration form
                    VStack(spacing: 20) {
                        // Full Name
                        FormFieldView(
                            icon: "person.fill",
                            title: "Full Name",
                            placeholder: "John Doe",
                            text: $viewModel.fullName
                        )

                        // Email
                        FormFieldView(
                            icon: "envelope.fill",
                            title: "Email",
                            placeholder: "your.email@company.com",
                            text: $viewModel.email,
                            keyboardType: .emailAddress
                        )

                        // Company
                        FormFieldView(
                            icon: "building.2.fill",
                            title: "Company",
                            placeholder: "Your Company Name",
                            text: $viewModel.company
                        )

                        // Password
                        SecureFormFieldView(
                            icon: "lock.fill",
                            title: "Password",
                            placeholder: "Create a strong password",
                            text: $viewModel.password,
                            showText: $viewModel.showPassword
                        )

                        // Password requirements
                        VStack(alignment: .leading, spacing: 8) {
                            PasswordRequirementView(
                                text: "At least 8 characters",
                                isMet: viewModel.password.count >= 8
                            )
                            PasswordRequirementView(
                                text: "Contains uppercase letter",
                                isMet: viewModel.password.contains(where: { $0.isUppercase })
                            )
                            PasswordRequirementView(
                                text: "Contains number",
                                isMet: viewModel.password.contains(where: { $0.isNumber })
                            )
                            PasswordRequirementView(
                                text: "Contains special character",
                                isMet: viewModel.password.contains(where: { "!@#$%^&*()_+-=[]{}|;:,.<>?".contains($0) })
                            )
                        }
                        .padding(.horizontal, 4)

                        // Confirm Password
                        SecureFormFieldView(
                            icon: "lock.fill",
                            title: "Confirm Password",
                            placeholder: "Re-enter your password",
                            text: $viewModel.confirmPassword,
                            showText: $viewModel.showConfirmPassword
                        )

                        // Terms and conditions
                        HStack(alignment: .top, spacing: 12) {
                            Button(action: {
                                viewModel.acceptedTerms.toggle()
                            }) {
                                Image(systemName: viewModel.acceptedTerms ? "checkmark.square.fill" : "square")
                                    .font(.system(size: 24))
                                    .foregroundColor(viewModel.acceptedTerms ? Color(hex: "4F46E5") : .white.opacity(0.5))
                            }

                            Text("I agree to the ")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            +
                            Text("Terms & Conditions")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "4F46E5"))
                            +
                            Text(" and ")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                            +
                            Text("Privacy Policy")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "4F46E5"))
                        }
                        .padding(.vertical, 8)

                        // Error message
                        if let error = viewModel.errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.red)
                            }
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // Success message
                        if viewModel.registrationSuccess {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Account created! Check your email to verify.")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.green)
                            }
                            .padding()
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // Register button
                        Button(action: {
                            Task {
                                await viewModel.register()
                            }
                        }) {
                            HStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Create Account")
                                        .font(.system(size: 18, weight: .semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(
                                LinearGradient(
                                    colors: [Color(hex: "4F46E5"), Color(hex: "7C3AED")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(viewModel.isLoading || !viewModel.isValidInput)
                        .opacity(viewModel.isValidInput ? 1.0 : 0.6)
                    }
                    .padding(.horizontal, 24)

                    // Login link
                    HStack {
                        Text("Already have an account?")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))

                        Button(action: {
                            dismiss()
                        }) {
                            Text("Sign In")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "4F46E5"))
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Form Field View
struct FormFieldView: View {
    let icon: String
    let title: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.9))

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.white.opacity(0.5))

                TextField("", text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(keyboardType == .emailAddress ? .none : .words)
                    .foregroundColor(.white)
                    .placeholder(when: text.isEmpty) {
                        Text(placeholder)
                            .foregroundColor(.white.opacity(0.4))
                    }
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

// MARK: - Secure Form Field View
struct SecureFormFieldView: View {
    let icon: String
    let title: String
    let placeholder: String
    @Binding var text: String
    @Binding var showText: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white.opacity(0.9))

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.white.opacity(0.5))

                if showText {
                    TextField("", text: $text)
                        .foregroundColor(.white)
                        .placeholder(when: text.isEmpty) {
                            Text(placeholder)
                                .foregroundColor(.white.opacity(0.4))
                        }
                } else {
                    SecureField("", text: $text)
                        .foregroundColor(.white)
                        .placeholder(when: text.isEmpty) {
                            Text(placeholder)
                                .foregroundColor(.white.opacity(0.4))
                        }
                }

                Button(action: {
                    showText.toggle()
                }) {
                    Image(systemName: showText ? "eye.slash.fill" : "eye.fill")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

// MARK: - Password Requirement View
struct PasswordRequirementView: View {
    let text: String
    let isMet: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 14))
                .foregroundColor(isMet ? .green : .white.opacity(0.4))

            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(isMet ? .white.opacity(0.9) : .white.opacity(0.6))
        }
    }
}

// MARK: - Preview
struct RegisterView_Previews: PreviewProvider {
    static var previews: some View {
        RegisterView()
    }
}
