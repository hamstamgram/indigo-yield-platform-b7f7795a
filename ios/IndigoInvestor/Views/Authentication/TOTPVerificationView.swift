//
//  TOTPVerificationView.swift
//  IndigoInvestor
//
//  Screen 5/85: TOTP 2FA verification
//

import SwiftUI

struct TOTPVerificationView: View {
    @StateObject private var viewModel = TOTPVerificationViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Int?

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

                // Icon
                Image(systemName: "lock.shield.fill")
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
                    Text("Two-Factor Authentication")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)

                    Text("Enter the 6-digit code from your authenticator app")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                // TOTP code input
                HStack(spacing: 12) {
                    ForEach(0..<6) { index in
                        TOTPDigitField(
                            digit: index < viewModel.code.count ? String(Array(viewModel.code)[index]) : "",
                            isFocused: focusedField == index
                        )
                        .focused($focusedField, equals: index)
                    }
                }
                .padding(.horizontal, 24)

                // Hidden text field for input handling
                TextField("", text: $viewModel.code)
                    .keyboardType(.numberPad)
                    .opacity(0)
                    .frame(height: 0)
                    .onChange(of: viewModel.code) { oldValue, newValue in
                        if newValue.count <= 6 {
                            focusedField = min(newValue.count, 5)
                        }
                        if newValue.count == 6 {
                            Task {
                                await viewModel.verifyCode()
                            }
                        }
                    }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }

                // Resend button
                Button(action: {
                    viewModel.code = ""
                    focusedField = 0
                }) {
                    Text("Clear Code")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(hex: "4F46E5"))
                }

                Spacer()

                // Help text
                VStack(spacing: 8) {
                    Text("Having trouble?")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    Button(action: {
                        // Show backup codes or contact support
                    }) {
                        Text("Use backup code")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Color(hex: "4F46E5"))
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .onAppear {
            focusedField = 0
        }
    }
}

struct TOTPDigitField: View {
    let digit: String
    let isFocused: Bool

    var body: some View {
        Text(digit)
            .font(.system(size: 32, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 50, height: 60)
            .background(Color.white.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isFocused ? Color(hex: "4F46E5") : Color.white.opacity(0.2),
                        lineWidth: 2
                    )
            )
    }
}

struct TOTPVerificationView_Previews: PreviewProvider {
    static var previews: some View {
        TOTPVerificationView()
    }
}
