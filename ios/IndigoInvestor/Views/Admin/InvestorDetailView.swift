//
//  InvestorDetailView.swift
//  IndigoInvestor
//
//  Screen 81/85: Individual investor admin
//

import SwiftUI

struct InvestorDetailView: View {
    @StateObject private var viewModel = InvestorDetailViewModel()
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
                            Text("Individual investor admin")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)

                            Text("Section: Admin")
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
            .navigationTitle("Individual investor admin")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Content View
private struct ContentView: View {
    @ObservedObject var viewModel: InvestorDetailViewModel

    var body: some View {
        VStack(spacing: 20) {
            // TODO: Implement screen-specific content
            Text("Content for InvestorDetailView")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)

            // Placeholder cards
            ForEach(0..<3) { index in
                PlaceholderCard(index: index)
            }
        }
        .padding()
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
struct InvestorDetailView_Previews: PreviewProvider {
    static var previews: some View {
        InvestorDetailView()
    }
}
