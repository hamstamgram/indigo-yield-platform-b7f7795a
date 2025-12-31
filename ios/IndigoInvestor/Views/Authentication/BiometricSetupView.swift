//
//  BiometricSetupView.swift
//  IndigoInvestor
//
//  Screen 4/85: Face ID/Touch ID setup and configuration
//

import SwiftUI
import LocalAuthentication

struct BiometricSetupView: View {
    @StateObject private var viewModel = BiometricSetupViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
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
                    Spacer()
                        .frame(height: 60)

                    // Icon
                    Image(systemName: viewModel.biometricType == .faceID ? "faceid" : "touchid")
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

                    // Title and description
                    VStack(spacing: 16) {
                        Text("Enable \(viewModel.biometricType == .faceID ? "Face ID" : "Touch ID")")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)

                        Text("Secure and quick access to your account with biometric authentication")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }

                    // Benefits
                    VStack(spacing: 20) {
                        BenefitRow(
                            icon: "lock.shield.fill",
                            title: "Enhanced Security",
                            description: "Your biometric data never leaves your device"
                        )

                        BenefitRow(
                            icon: "bolt.fill",
                            title: "Quick Access",
                            description: "Sign in instantly without typing passwords"
                        )

                        BenefitRow(
                            icon: "hand.raised.fill",
                            title: "Privacy First",
                            description: "Complete control over your authentication"
                        )
                    }
                    .padding(.horizontal, 24)

                    Spacer()
                        .frame(height: 40)

                    // Action buttons
                    VStack(spacing: 16) {
                        Button(action: {
                            Task {
                                await viewModel.enableBiometric()
                            }
                        }) {
                            HStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Enable \(viewModel.biometricType == .faceID ? "Face ID" : "Touch ID")")
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
                        .disabled(viewModel.isLoading || !viewModel.biometricAvailable)

                        Button(action: {
                            dismiss()
                        }) {
                            Text("Skip for Now")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white.opacity(0.7))
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                        }
                    }
                    .padding(.horizontal, 24)

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                            .padding(.horizontal, 24)
                    }

                    Spacer()
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.checkBiometricAvailability()
        }
    }
}

// MARK: - Benefit Row
struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(Color(hex: "4F46E5"))
                .frame(width: 40, height: 40)
                .background(Color.white.opacity(0.1))
                .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                Text(description)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.7))
            }

            Spacer()
        }
    }
}

// MARK: - Preview
struct BiometricSetupView_Previews: PreviewProvider {
    static var previews: some View {
        BiometricSetupView()
    }
}
