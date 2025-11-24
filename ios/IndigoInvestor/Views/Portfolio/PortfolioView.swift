//
//  PortfolioView.swift
//  IndigoInvestor
//
//  Portfolio view showing assets and yield performance
//

import SwiftUI
import Charts

struct PortfolioView: View {
    @StateObject private var viewModel = PortfolioViewModel(portfolioService: ServiceContainer.shared.portfolioService)
    @State private var selectedAsset: AssetPosition?
    @State private var selectedTimeRange = TimeRange.month
    
    enum TimeRange: String, CaseIterable {
        case week = "1W"
        case month = "1M"
        case threeMonths = "3M"
        case sixMonths = "6M"
        case year = "1Y"
        case all = "All"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Portfolio Summary Card
                    PortfolioSummaryCard(viewModel: viewModel)
                        .padding(.horizontal)
                    
                    // Performance Chart (Placeholder for now, as history is optional)
                    /*
                    PerformanceHistoryChart(
                        data: viewModel.performanceHistory,
                        timeRange: selectedTimeRange
                    )
                    .frame(height: 300)
                    .padding(.horizontal)
                    */
                    
                    // Assets List
                    AssetsListView(
                        assets: viewModel.assets,
                        selectedAsset: $selectedAsset
                    )
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Portfolio")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await viewModel.refreshPortfolio() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshPortfolio()
            }
            .sheet(item: $selectedAsset) { asset in
                AssetDetailView(asset: asset)
            }
        }
        .task {
            // Mock ID for now, replace with auth service user ID
            if let id = UUID(uuidString: "00000000-0000-0000-0000-000000000000") {
                await viewModel.loadPortfolio(for: id)
            }
        }
    }
}

// MARK: - Portfolio Summary Card

struct PortfolioSummaryCard: View {
    @ObservedObject var viewModel: PortfolioViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Yield Summary")
                .font(.headline)
                .foregroundColor(.secondary)

            if viewModel.hasData {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Total Yield (All Time)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(viewModel.totalYieldDisplay)
                                .font(.title2)
                                .fontWeight(.bold)
                            Text(viewModel.yieldUnit)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 8) {
                        Text("Monthly Yield")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(viewModel.monthlyYieldDisplay)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }
                }
                
                Divider()
                
                HStack {
                    Text("\(viewModel.activePositionsCount) Active Assets")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Assets List

struct AssetsListView: View {
    let assets: [AssetPosition]
    @Binding var selectedAsset: AssetPosition?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Assets")
                .font(.headline)
            
            VStack(spacing: 8) {
                ForEach(assets) { asset in
                    Button(action: { selectedAsset = asset }) {
                        AssetRow(asset: asset)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Asset Row

struct AssetRow: View {
    let asset: AssetPosition
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(asset.fundName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text(asset.assetCode)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(asset.balanceFormatted)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 4) {
                    Text("Yield: \(asset.yieldEarned.formatted())")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Asset Detail View (Simplified)

struct AssetDetailView: View {
    let asset: AssetPosition
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        Text(asset.fundName)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        Text(asset.assetCode)
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    
                    VStack(spacing: 16) {
                        DetailRow(label: "Balance", value: asset.balanceFormatted)
                        DetailRow(label: "Yield Earned", value: asset.yieldEarned.formatted(), color: .green)
                        DetailRow(label: "MTD Yield", value: asset.mtdYieldFormatted)
                        DetailRow(label: "Additions", value: asset.additionsFormatted)
                        DetailRow(label: "Withdrawals", value: asset.withdrawalsFormatted)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String
    var color: Color = .primary
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
    }
}

#Preview {
    PortfolioView()
}
