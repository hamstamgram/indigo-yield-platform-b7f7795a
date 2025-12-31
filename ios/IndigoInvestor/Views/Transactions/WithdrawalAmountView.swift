//
//  WithdrawalAmountView.swift
//  IndigoInvestor
//
//  Screen 33/85: Withdrawal request form
//

import SwiftUI

struct WithdrawalAmountView: View {
    @StateObject private var viewModel = WithdrawalAmountViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
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
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 12) {
                            Text("Withdrawal request form")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)

                            Text("Section: Transactions")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.top, 40)

                        // Content
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(1.5)
                        } else if let error = viewModel.errorMessage {
                            ErrorStateView(message: error, onRetry: {
                                Task { await viewModel.loadData() }
                            })
                        } else {
                            // Main content goes here
                            ContentView(viewModel: viewModel)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Withdrawal request form")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Content View
private struct ContentView: View {
    @ObservedObject var viewModel: WithdrawalAmountViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            // Available Balance Card
            AvailableBalanceCard(balance: viewModel.availableBalance)

            // Amount Input Section
            AmountInputSection(
                amount: $viewModel.withdrawalAmount,
                isValid: viewModel.isAmountValid
            )

            // Quick Amount Buttons
            QuickAmountButtons(onSelect: { amount in
                viewModel.withdrawalAmount = "\(amount)"
            })

            Spacer()

            // Error Message
            if let error = viewModel.validationError {
                ErrorBanner(message: error)
            }

            // Continue Button
            ContinueButton(
                isEnabled: viewModel.canProceed,
                action: {
                    Task {
                        await viewModel.proceedToConfirmation()
                        dismiss()
                    }
                }
            )
        }
        .padding()
    }
}

// MARK: - Available Balance Card
private struct AvailableBalanceCard: View {
    let balance: Decimal

    var body: some View {
        VStack(spacing: 12) {
            Text("Available Balance")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))

            Text(balance.formatted(.currency(code: "USD")))
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

// MARK: - Amount Input Section
private struct AmountInputSection: View {
    @Binding var amount: String
    let isValid: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Withdrawal Amount")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)

            HStack {
                Text("$")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.white)

                TextField("0.00", text: $amount)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.white)
                    .keyboardType(.decimalPad)
                    .accentColor(.white)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isValid ? Color.white.opacity(0.2) : Color.red, lineWidth: 1)
            )
        }
    }
}

// MARK: - Quick Amount Buttons
private struct QuickAmountButtons: View {
    let onSelect: (Int) -> Void
    let amounts = [1000, 5000, 10000, 25000]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Select")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.7))

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(amounts, id: \.self) { amount in
                    QuickAmountButton(amount: amount, action: {
                        onSelect(amount)
                    })
                }
            }
        }
    }
}

private struct QuickAmountButton: View {
    let amount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("$\(amount)")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(0.1))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        }
    }
}

// MARK: - Error Banner
private struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)

            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
                .multilineTextAlignment(.leading)

            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.2))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red.opacity(0.4), lineWidth: 1)
        )
    }
}

// MARK: - Continue Button
private struct ContinueButton: View {
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("Continue")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(isEnabled ? Color(hex: "1A1F3A") : .white.opacity(0.5))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isEnabled ? Color.white : Color.white.opacity(0.2))
                )
        }
        .disabled(!isEnabled)
    }
}

// MARK: - Placeholder Card
private struct PlaceholderCard: View {
    let index: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(Color(hex: "4F46E5"))
                    .frame(width: 40, height: 40)

                VStack(alignment: .leading) {
                    Text("Item \(index + 1)")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Text("Description")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Error State View
private struct ErrorStateView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundColor(.red)

            Text(message)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)

            Button(action: onRetry) {
                Text("Retry")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 120, height: 44)
                    .background(Color(hex: "4F46E5"))
                    .cornerRadius(10)
            }
        }
        .padding()
    }
}

// MARK: - Preview
struct WithdrawalAmountView_Previews: PreviewProvider {
    static var previews: some View {
        WithdrawalAmountView()
    }
}
