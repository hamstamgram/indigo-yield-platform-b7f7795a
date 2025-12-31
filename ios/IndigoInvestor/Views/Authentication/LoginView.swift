//
//  LoginView.swift
//  IndigoInvestor
//
//  Created by Indigo Development Team
//  Screen 2/85: Login with email/password and biometric auth
//

import SwiftUI
import LocalAuthentication

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @State private var showBiometricAuth = false
    @State private var showPasswordReset = false

    var body: some View {
        NavigationStack {
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
                        // Logo and header
                        VStack(spacing: 16) {
                            Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
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
                                Text("Welcome Back")
                                    .font(.system(size: 32, weight: .bold))
                                    .foregroundColor(.white)

                                Text("Sign in to access your portfolio")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                        .padding(.top, 60)

                        // Login form
                        VStack(spacing: 20) {
                            // Email field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.9))

                                HStack {
                                    Image(systemName: "envelope.fill")
                                        .foregroundColor(.white.opacity(0.5))

                                    TextField("", text: $viewModel.email)
                                        .textContentType(.emailAddress)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .foregroundColor(.white)
                                        .placeholder(when: viewModel.email.isEmpty) {
                                            Text("your.email@company.com")
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

                            // Password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.9))

                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(.white.opacity(0.5))

                                    if viewModel.showPassword {
                                        TextField("", text: $viewModel.password)
                                            .textContentType(.password)
                                            .foregroundColor(.white)
                                            .placeholder(when: viewModel.password.isEmpty) {
                                                Text("Enter your password")
                                                    .foregroundColor(.white.opacity(0.4))
                                            }
                                    } else {
                                        SecureField("", text: $viewModel.password)
                                            .textContentType(.password)
                                            .foregroundColor(.white)
                                            .placeholder(when: viewModel.password.isEmpty) {
                                                Text("Enter your password")
                                                    .foregroundColor(.white.opacity(0.4))
                                            }
                                    }

                                    Button(action: {
                                        viewModel.showPassword.toggle()
                                    }) {
                                        Image(systemName: viewModel.showPassword ? "eye.slash.fill" : "eye.fill")
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

                            // Forgot password
                            HStack {
                                Spacer()
                                Button(action: {
                                    showPasswordReset = true
                                }) {
                                    Text("Forgot Password?")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color(hex: "4F46E5"))
                                }
                            }

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

                            // Login button
                            Button(action: {
                                Task {
                                    await viewModel.login()
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Sign In")
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

                            // Biometric auth
                            if viewModel.biometricAuthAvailable {
                                Divider()
                                    .background(Color.white.opacity(0.2))
                                    .padding(.vertical, 8)

                                Button(action: {
                                    Task {
                                        await viewModel.authenticateWithBiometrics()
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: viewModel.biometricType == .faceID ? "faceid" : "touchid")
                                            .font(.system(size: 24))
                                        Text("Sign in with \(viewModel.biometricType == .faceID ? "Face ID" : "Touch ID")")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                                    .background(Color.white.opacity(0.1))
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, 24)

                        // Register link
                        HStack {
                            Text("Don't have an account?")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))

                            NavigationLink(destination: RegisterView()) {
                                Text("Sign Up")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(hex: "4F46E5"))
                            }
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            .sheet(isPresented: $showPasswordReset) {
                PasswordResetView()
            }
        }
    }
}

// MARK: - View Extension
extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

// MARK: - Preview
struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
    }
}
