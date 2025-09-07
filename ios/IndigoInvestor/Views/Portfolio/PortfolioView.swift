//
//  PortfolioView.swift
//  IndigoInvestor
//
//  Portfolio view showing positions and allocations
//

import SwiftUI
import Charts

struct PortfolioView: View {
    @StateObject private var viewModel = PortfolioViewModel()
    @State private var selectedPosition: Position?
    @State private var showingAllocationChart = true
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
                    PortfolioSummaryCard(portfolio: viewModel.portfolio)
                        .padding(.horizontal)
                    
                    // Chart Toggle
                    Picker("View", selection: $showingAllocationChart) {
                        Text("Allocation").tag(true)
                        Text("Performance").tag(false)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // Charts Section
                    if showingAllocationChart {
                        AllocationChartView(portfolio: viewModel.portfolio)
                            .frame(height: 300)
                            .padding(.horizontal)
                    } else {
                        PerformanceHistoryChart(
                            data: viewModel.performanceHistory,
                            timeRange: selectedTimeRange
                        )
                        .frame(height: 300)
                        .padding(.horizontal)
                    }
                    
                    // Positions List
                    PositionsListView(
                        positions: viewModel.portfolio?.positions ?? [],
                        selectedPosition: $selectedPosition
                    )
                    .padding(.horizontal)
                    
                    // Investment Metrics
                    InvestmentMetricsView(portfolio: viewModel.portfolio)
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Portfolio")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { viewModel.exportPortfolio() }) {
                            Label("Export PDF", systemImage: "square.and.arrow.up")
                        }
                        Button(action: { viewModel.refreshData() }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshData()
            }
            .sheet(item: $selectedPosition) { position in
                PositionDetailView(position: position)
            }
        }
        .task {
            await viewModel.loadPortfolio()
        }
    }
}

// MARK: - Portfolio Summary Card

struct PortfolioSummaryCard: View {
    let portfolio: Portfolio?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Portfolio Summary")
                .font(.headline)
                .foregroundColor(.secondary)
            
            if let portfolio = portfolio {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Total Value")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(portfolio.formattedTotalValue)
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 8) {
                        Text("Total Return")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        HStack(spacing: 4) {
                            Image(systemName: portfolio.totalGain >= 0 ? "arrow.up.right" : "arrow.down.right")
                                .font(.caption)
                            Text(portfolio.totalGain.formatted(.currency(code: "USD")))
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(portfolio.totalGain >= 0 ? .green : .red)
                        Text("\(String(format: "%.2f", portfolio.totalGainPercent))%")
                            .font(.caption)
                            .foregroundColor(portfolio.totalGain >= 0 ? .green : .red)
                    }
                }
                
                Divider()
                
                HStack {
                    MetricView(
                        title: "Day Change",
                        value: portfolio.formattedDayChange,
                        percentage: portfolio.dayChangePercent,
                        isPositive: portfolio.dayChange >= 0
                    )
                    
                    Spacer()
                    
                    MetricView(
                        title: "Month Change",
                        value: portfolio.monthChange.formatted(.currency(code: "USD")),
                        percentage: portfolio.monthChangePercent,
                        isPositive: portfolio.monthChange >= 0
                    )
                    
                    Spacer()
                    
                    MetricView(
                        title: "Year Change",
                        value: portfolio.yearChange.formatted(.currency(code: "USD")),
                        percentage: portfolio.yearChangePercent,
                        isPositive: portfolio.yearChange >= 0
                    )
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

// MARK: - Metric View

struct MetricView: View {
    let title: String
    let value: String
    let percentage: Double
    let isPositive: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(isPositive ? .green : .red)
            
            Text("\(String(format: "%.2f", percentage))%")
                .font(.caption2)
                .foregroundColor(isPositive ? .green : .red)
        }
    }
}

// MARK: - Allocation Chart

struct AllocationChartView: View {
    let portfolio: Portfolio?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Asset Allocation")
                .font(.headline)
            
            if let allocations = portfolio?.assetAllocation {
                if #available(iOS 16.0, *) {
                    Chart(allocations) { allocation in
                        SectorMark(
                            angle: .value("Value", allocation.value),
                            innerRadius: .ratio(0.5),
                            angularInset: 2
                        )
                        .foregroundStyle(Color(allocation.color))
                        .cornerRadius(4)
                    }
                    .frame(height: 250)
                    
                    // Legend
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(allocations) { allocation in
                            HStack {
                                Circle()
                                    .fill(Color(allocation.color))
                                    .frame(width: 12, height: 12)
                                
                                Text(allocation.assetType)
                                    .font(.caption)
                                
                                Spacer()
                                
                                Text(allocation.formattedPercentage)
                                    .font(.caption)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                } else {
                    // Fallback for iOS 15
                    VStack(spacing: 8) {
                        ForEach(allocations) { allocation in
                            HStack {
                                Circle()
                                    .fill(Color(allocation.color))
                                    .frame(width: 12, height: 12)
                                
                                Text(allocation.assetType)
                                    .font(.subheadline)
                                
                                Spacer()
                                
                                Text(allocation.formattedPercentage)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                
                                Text(allocation.value.formatted(.currency(code: "USD")))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Performance History Chart

struct PerformanceHistoryChart: View {
    let data: [PerformanceData]?
    let timeRange: PortfolioView.TimeRange
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Performance History")
                .font(.headline)
            
            if let data = data, !data.isEmpty {
                if #available(iOS 16.0, *) {
                    Chart(data) { item in
                        LineMark(
                            x: .value("Date", item.date),
                            y: .value("Value", item.value)
                        )
                        .foregroundStyle(Color.accentColor)
                        .interpolationMethod(.catmullRom)
                        
                        AreaMark(
                            x: .value("Date", item.date),
                            y: .value("Value", item.value)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color.accentColor.opacity(0.3),
                                    Color.accentColor.opacity(0.05)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    }
                } else {
                    Text("Charts require iOS 16+")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 200)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Positions List

struct PositionsListView: View {
    let positions: [Position]
    @Binding var selectedPosition: Position?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Positions")
                .font(.headline)
            
            VStack(spacing: 8) {
                ForEach(positions) { position in
                    Button(action: { selectedPosition = position }) {
                        PositionRow(position: position)
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

// MARK: - Position Row

struct PositionRow: View {
    let position: Position
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(position.assetName)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 8) {
                    Text(position.quantity.formatted())
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("@ \(position.currentPrice.formatted(.currency(code: "USD")))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(position.formattedMarketValue)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 4) {
                    Image(systemName: position.totalGain >= 0 ? "arrow.up" : "arrow.down")
                        .font(.caption2)
                    
                    Text("\(String(format: "%.2f", position.totalGainPercent))%")
                        .font(.caption)
                }
                .foregroundColor(position.totalGain >= 0 ? .green : .red)
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

// MARK: - Investment Metrics

struct InvestmentMetricsView: View {
    let portfolio: Portfolio?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Investment Metrics")
                .font(.headline)
            
            if let portfolio = portfolio {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    MetricCard(title: "Total Cost", value: portfolio.totalCost.formatted(.currency(code: "USD")))
                    MetricCard(title: "Market Value", value: portfolio.totalValue.formatted(.currency(code: "USD")))
                    MetricCard(title: "Total Gain", value: portfolio.totalGain.formatted(.currency(code: "USD")))
                    MetricCard(title: "Positions", value: "\(portfolio.positions.count)")
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Metric Card

struct MetricCard: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Position Detail View

struct PositionDetailView: View {
    let position: Position
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Position Header
                    VStack(spacing: 12) {
                        Text(position.assetName)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text(position.assetSymbol)
                            .font(.title3)
                            .foregroundColor(.secondary)
                        
                        Text(position.formattedMarketValue)
                            .font(.title)
                            .fontWeight(.semibold)
                    }
                    .padding()
                    
                    // Position Details
                    VStack(spacing: 16) {
                        DetailRow(label: "Quantity", value: position.quantity.formatted())
                        DetailRow(label: "Average Cost", value: position.averageCost.formatted(.currency(code: "USD")))
                        DetailRow(label: "Current Price", value: position.currentPrice.formatted(.currency(code: "USD")))
                        DetailRow(label: "Total Gain", value: position.formattedGain, color: position.totalGain >= 0 ? .green : .red)
                        DetailRow(label: "Gain %", value: "\(String(format: "%.2f", position.totalGainPercent))%", color: position.totalGain >= 0 ? .green : .red)
                        DetailRow(label: "Day Change", value: position.dayChange.formatted(.currency(code: "USD")), color: position.dayChange >= 0 ? .green : .red)
                        DetailRow(label: "Allocation", value: "\(String(format: "%.2f", position.allocation))%")
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
                    Button("Done") {
                        dismiss()
                    }
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

// MARK: - Portfolio ViewModel

@MainActor
class PortfolioViewModel: ObservableObject {
    @Published var portfolio: Portfolio?
    @Published var performanceHistory: [PerformanceData] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private let serviceLocator = ServiceLocator.shared
    
    func loadPortfolio() async {
        isLoading = true
        
        // Simulate loading portfolio data
        // In real implementation, fetch from Supabase
        do {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            
            // Mock data for demonstration
            portfolio = createMockPortfolio()
            performanceHistory = createMockPerformanceHistory()
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        await loadPortfolio()
    }
    
    func exportPortfolio() {
        // Export portfolio to PDF
    }
    
    private func createMockPortfolio() -> Portfolio {
        let positions = [
            Position(
                id: UUID(),
                portfolioId: UUID(),
                assetSymbol: "BTC",
                assetName: "Bitcoin",
                quantity: 0.5,
                averageCost: 45000,
                currentPrice: 52000,
                marketValue: 26000,
                totalGain: 3500,
                totalGainPercent: 15.56,
                dayChange: 500,
                dayChangePercent: 1.96,
                allocation: 40
            ),
            Position(
                id: UUID(),
                portfolioId: UUID(),
                assetSymbol: "ETH",
                assetName: "Ethereum",
                quantity: 10,
                averageCost: 3000,
                currentPrice: 3200,
                marketValue: 32000,
                totalGain: 2000,
                totalGainPercent: 6.67,
                dayChange: -100,
                dayChangePercent: -0.31,
                allocation: 30
            )
        ]
        
        let allocations = [
            AssetAllocation(assetType: "Bitcoin", value: 26000, percentage: 40, color: "orange"),
            AssetAllocation(assetType: "Ethereum", value: 32000, percentage: 30, color: "blue"),
            AssetAllocation(assetType: "USDC", value: 20000, percentage: 20, color: "green"),
            AssetAllocation(assetType: "Solana", value: 10000, percentage: 10, color: "purple")
        ]
        
        return Portfolio(
            id: UUID(),
            investorId: UUID(),
            totalValue: 88000,
            totalCost: 82000,
            totalGain: 6000,
            totalGainPercent: 7.32,
            dayChange: 400,
            dayChangePercent: 0.46,
            weekChange: 2000,
            weekChangePercent: 2.33,
            monthChange: 5000,
            monthChangePercent: 6.02,
            yearChange: 15000,
            yearChangePercent: 20.55,
            lastUpdated: Date(),
            positions: positions,
            assetAllocation: allocations,
            performanceHistory: []
        )
    }
    
    private func createMockPerformanceHistory() -> [PerformanceData] {
        var history: [PerformanceData] = []
        let baseValue: Decimal = 75000
        
        for i in 0..<30 {
            let date = Calendar.current.date(byAdding: .day, value: -30 + i, to: Date())!
            let randomChange = Decimal(Double.random(in: -2000...3000))
            let value = baseValue + randomChange + Decimal(i * 300)
            
            history.append(PerformanceData(
                date: date,
                value: value,
                gain: value - baseValue,
                gainPercent: Double((value - baseValue) / baseValue * 100)
            ))
        }
        
        return history
    }
}

// MARK: - Preview

#Preview {
    PortfolioView()
}
