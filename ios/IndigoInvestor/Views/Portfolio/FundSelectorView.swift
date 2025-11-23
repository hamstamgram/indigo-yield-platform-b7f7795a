//
//  FundSelectorView.swift
//  IndigoInvestor
//
//  Screen 28/85: Fund selection interface
//

import SwiftUI

struct FundSelectorView: View {
    @StateObject private var viewModel = FundSelectorViewModel()
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
                            Text("Fund selection interface")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)

                            Text("Section: Portfolio")
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
            .navigationTitle("Fund selection interface")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Content View
private struct ContentView: View {
    @ObservedObject var viewModel: FundSelectorViewModel

    var body: some View {
        VStack(spacing: 20) {
            // Search Bar
            SearchBarView(searchText: $viewModel.searchText)

            // Filter Pills
            FilterPillsView(selectedCategory: $viewModel.selectedCategory)

            // Fund List
            if viewModel.filteredFunds.isEmpty {
                EmptyStateView()
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.filteredFunds) { fund in
                            FundCardView(fund: fund) {
                                viewModel.selectFund(fund)
                            }
                        }
                    }
                }
            }
        }
        .padding()
    }
}

// MARK: - Search Bar View
private struct SearchBarView: View {
    @Binding var searchText: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.6))

            TextField("Search funds...", text: $searchText)
                .foregroundColor(.white)
                .accentColor(.white)

            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.6))
                }
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

// MARK: - Filter Pills View
private struct FilterPillsView: View {
    @Binding var selectedCategory: String
    let categories = ["All", "Equity", "Fixed Income", "Real Estate", "Alternatives"]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(categories, id: \.self) { category in
                    FilterPill(
                        title: category,
                        isSelected: selectedCategory == category
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }
}

private struct FilterPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: isSelected ? .semibold : .medium))
                .foregroundColor(isSelected ? Color(hex: "1A1F3A") : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ? Color.white : Color.white.opacity(0.1)
                )
                .cornerRadius(20)
        }
    }
}

// MARK: - Fund Card View
private struct FundCardView: View {
    let fund: Fund
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(fund.name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)

                        Text(fund.category)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }

                    Spacer()

                    Circle()
                        .fill(Color(hex: "4F46E5"))
                        .frame(width: 48, height: 48)
                        .overlay(
                            Image(systemName: "chart.line.uptrend.xyaxis")
                                .foregroundColor(.white)
                        )
                }

                Divider()
                    .background(Color.white.opacity(0.2))

                HStack(spacing: 24) {
                    StatView(
                        label: "Min Investment",
                        value: fund.formattedMinInvestment
                    )

                    StatView(
                        label: "Expected Return",
                        value: fund.formattedExpectedReturn,
                        isPositive: true
                    )

                    StatView(
                        label: "Risk Level",
                        value: fund.riskLevel
                    )
                }

                Text(fund.description)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct StatView: View {
    let label: String
    let value: String
    var isPositive: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.6))

            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(isPositive ? Color.green : .white)
        }
    }
}

// MARK: - Empty State View
private struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.4))

            Text("No Funds Found")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.white)

            Text("Try adjusting your search or filters")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }
}

// MARK: - Placeholder Card (Removed)
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
struct FundSelectorView_Previews: PreviewProvider {
    static var previews: some View {
        FundSelectorView()
    }
}
