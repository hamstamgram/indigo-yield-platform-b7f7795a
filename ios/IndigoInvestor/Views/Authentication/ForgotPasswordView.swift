//
//  ForgotPasswordView.swift
//  IndigoInvestor
//
//  Screen 6/85: Password reset request
//

import SwiftUI

struct ForgotPasswordView: View {
    @StateObject private var viewModel = ForgotPasswordViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "1A1F3A"), Color(hex: "2D3561")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer().frame(height: 60)

                    Image(systemName: "key.fill")
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

                    VStack(spacing: 16) {
                        Text("Forgot Password?")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)

                        Text("Enter your email address and we'll send you instructions to reset your password")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }

                    VStack(spacing: 20) {
                        FormFieldView(
                            icon: "envelope.fill",
                            title: "Email Address",
                            placeholder: "your.email@company.com",
                            text: $viewModel.email,
                            keyboardType: .emailAddress
                        )

                        if let error = viewModel.errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(error)
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundColor(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        if viewModel.resetSent {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Reset instructions sent! Check your email.")
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundColor(.green)
                            .padding()
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(8)
                        }

                        Button(action: {
                            Task { await viewModel.sendResetEmail() }
                        }) {
                            HStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Send Reset Link")
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
                        .disabled(viewModel.isLoading || viewModel.email.isEmpty)
                        .opacity(viewModel.email.isEmpty ? 0.6 : 1.0)
                    }
                    .padding(.horizontal, 24)

                    Button(action: { dismiss() }) {
                        HStack {
                            Image(systemName: "arrow.left")
                            Text("Back to Login")
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(hex: "4F46E5"))
                    }
                    .padding(.top, 20)

                    Spacer()
                }
            }
        }
    }
}

struct ForgotPasswordView_Previews: PreviewProvider {
    static var previews: some View {
        ForgotPasswordView()
    }
}
