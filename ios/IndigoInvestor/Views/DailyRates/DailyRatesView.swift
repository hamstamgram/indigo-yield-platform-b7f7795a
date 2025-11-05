//
//  DailyRatesView.swift
//  IndigoInvestor
//
//  View for displaying daily cryptocurrency rates
//

import SwiftUI

struct DailyRatesView: View {
    @StateObject private var viewModel = DailyRatesViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else if let error = viewModel.errorMessage {
                        ErrorView(message: error) {
                            viewModel.fetchTodayRate()
                        }
                    } else if let todayRate = viewModel.todayRate {
                        DailyRatesCard(rate: todayRate, previousRate: viewModel.dailyRates.count > 1 ? viewModel.dailyRates[1] : nil)
                    } else {
                        EmptyRatesView()
                    }
                }
                .padding()
            }
            .navigationTitle("Daily Rates")
            .refreshable {
                viewModel.fetchTodayRate()
            }
        }
        .onAppear {
            viewModel.fetchTodayRate()
            viewModel.fetchRecentRates(days: 7)
        }
    }
}

struct DailyRatesCard: View {
    let rate: DailyRate
    let previousRate: DailyRate?

    private let assets: [(code: String, name: String, color: Color)] = [
        ("BTC", "Bitcoin", .orange),
        ("ETH", "Ethereum", .blue),
        ("SOL", "Solana", .purple),
        ("USDT", "Tether", .green),
        ("USDC", "USD Coin", .blue),
        ("EURC", "Euro Coin", .blue)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Today's Rates")
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                Text(rate.rateDate.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Rates
            ForEach(assets, id: \.code) { asset in
                let currentRate = rate.rate(for: asset.code)
                let change = rate.calculateChange(from: previousRate, for: asset.code)

                HStack {
                    Circle()
                        .fill(asset.color)
                        .frame(width: 8, height: 8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(asset.code)
                            .font(.headline)
                        Text(asset.name)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(formatRate(currentRate))")
                            .font(.headline)
                            .monospacedDigit()

                        if let change = change {
                            HStack(spacing: 2) {
                                Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                                    .font(.caption2)
                                Text("\(formatPercentage(change))%")
                                    .font(.caption)
                            }
                            .foregroundColor(change >= 0 ? .green : .red)
                        }
                    }
                }
                .padding(.vertical, 4)
            }

            // Notes
            if let notes = rate.notes, !notes.isEmpty {
                Divider()
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func formatRate(_ rate: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: rate as NSNumber) ?? "0.00"
    }

    private func formatPercentage(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.positivePrefix = "+"
        return formatter.string(from: value as NSNumber) ?? "0.00"
    }
}

struct EmptyRatesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Rates Available")
                .font(.headline)

            Text("Daily rates will appear here when published by the admin")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
}

struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.red)

            Text("Error Loading Rates")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(action: retry) {
                Text("Try Again")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
    }
}

#Preview {
    DailyRatesView()
}
