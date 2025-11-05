//
//  EmailVerificationView.swift
//  IndigoInvestor
//
//  Screen 7/85: Email verification after registration
//

import SwiftUI

struct EmailVerificationView: View {
    @StateObject private var viewModel = EmailVerificationViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "1A1F3A"), Color(hex: "2D3561")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                Image(systemName: "envelope.open.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 100, height: 100)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "4F46E5"), Color(hex: "7C3AED")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                VStack(spacing: 16) {
                    Text("Verify Your Email")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)

                    Text("We've sent a verification link to")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Text(viewModel.email)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)

                    Text("Click the link in the email to verify your account")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }

                if viewModel.verificationComplete {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Email verified successfully!")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.green)
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(12)
                }

                Spacer()

                VStack(spacing: 16) {
                    Button(action: {
                        Task { await viewModel.resendVerificationEmail() }
                    }) {
                        HStack {
                            if viewModel.isResending {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Resend Verification Email")
                            }
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white.opacity(0.1))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.isResending || viewModel.resendCooldown > 0)

                    if viewModel.resendCooldown > 0 {
                        Text("Resend available in \(viewModel.resendCooldown)s")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }

                    Button(action: { dismiss() }) {
                        Text("Back to Login")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Color(hex: "4F46E5"))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .onAppear {
            viewModel.startVerificationCheck()
        }
    }
}

struct EmailVerificationView_Previews: PreviewProvider {
    static var previews: some View {
        EmailVerificationView()
    }
}
