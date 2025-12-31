//
//  AssetDetailView.swift
//  IndigoInvestor
//
//  Detailed view for displaying asset information and performance
//

import SwiftUI
import Charts

struct AssetDetailView: View {
    let asset: Asset
    @StateObject private var viewModel = AssetDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedTimeRange: TimeRange = .oneMonth
    @State private var showingTransactions = false
    @State private var showingDocuments = false
    
    enum TimeRange: String, CaseIterable {
        case oneWeek = "1W"
        case oneMonth = "1M"
        case threeMonths = "3M"
        case sixMonths = "6M"
        case oneYear = "1Y"
        case all = "All"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header with current value
                    headerSection
                    
                    // Performance metrics
                    performanceSection
                    
                    // Chart section
                    chartSection
                    
                    // Details section
                    detailsSection
                    
                    // Allocation breakdown
                    allocationSection
                    
                    // Recent activity
                    recentActivitySection
                    
                    // Actions
                    actionsSection
                }
                .padding()
            }
            .background(IndigoTheme.backgroundColor(for: colorScheme))
            .navigationTitle(asset.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            exportAssetReport()
                        } label: {
                            Label("Export Report", systemImage: "doc.text")
                        }
                        
                        Button {
                            showingDocuments = true
                        } label: {
                            Label("View Documents", systemImage: "folder")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .onAppear {
                viewModel.loadAssetDetails(asset)
            }
        }
        .sheet(isPresented: $showingTransactions) {
            AssetTransactionsView(asset: asset)
        }
        .sheet(isPresented: $showingDocuments) {
            AssetDocumentsView(asset: asset)
        }
    }
    
    // MARK: - View Components
    
    private var headerSection: some View {
        VStack(spacing: 16) {
            // Asset icon and type
            VStack(spacing: 8) {
                Image(systemName: asset.type.icon)
                    .font(.system(size: 44))
                    .foregroundColor(IndigoTheme.primaryColor)
                
                Text(asset.type.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
            }
            
            // Current value
            VStack(spacing: 4) {
                Text(formatCurrency(asset.currentValue))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                
                HStack(spacing: 4) {
                    Image(systemName: asset.changePercent >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption)
                    Text("\(formatPercentage(asset.changePercent)) (\(formatCurrency(asset.changeAmount)))")
                        .font(.subheadline)
                }
                .foregroundColor(asset.changePercent >= 0 ? .green : .red)
            }
        }
    }
    
    private var performanceSection: some View {
        HStack(spacing: 20) {
            PerformanceMetric(
                title: "Total Return",
                value: formatCurrency(asset.totalReturn),
                percentage: formatPercentage(asset.totalReturnPercent),
                isPositive: asset.totalReturn >= 0
            )
            
            PerformanceMetric(
                title: "Yield",
                value: formatPercentage(asset.currentYield),
                subtitle: "Annual",
                isPositive: true
            )
            
            PerformanceMetric(
                title: "Duration",
                value: "\(asset.holdingPeriodDays)",
                subtitle: "Days",
                isPositive: true
            )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.gray.opacity(0.05))
        )
    }
    
    private var chartSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("PERFORMANCE")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                // Time range selector
                HStack(spacing: 8) {
                    ForEach(TimeRange.allCases, id: \.self) { range in
                        Button {
                            selectedTimeRange = range
                            viewModel.updateTimeRange(range)
                        } label: {
                            Text(range.rawValue)
                                .font(.caption)
                                .fontWeight(selectedTimeRange == range ? .semibold : .regular)
                                .foregroundColor(selectedTimeRange == range ? .white : .primary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    selectedTimeRange == range ?
                                    IndigoTheme.primaryColor :
                                    Color.gray.opacity(0.1)
                                )
                                .cornerRadius(8)
                        }
                    }
                }
            }
            
            // Chart
            if !viewModel.chartData.isEmpty {
                Chart(viewModel.chartData) { dataPoint in
                    LineMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Value", dataPoint.value)
                    )
                    .foregroundStyle(IndigoTheme.primaryColor)
                    
                    AreaMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Value", dataPoint.value)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                IndigoTheme.primaryColor.opacity(0.3),
                                IndigoTheme.primaryColor.opacity(0.05)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
                .frame(height: 200)
            } else {
                // Placeholder chart
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.05))
                    .frame(height: 200)
                    .overlay(
                        Text("Chart data loading...")
                            .foregroundColor(.secondary)
                    )
            }
        }
    }
    
    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("ASSET DETAILS")
                .font(.caption)
                .foregroundColor(.secondary)
            
            VStack(spacing: 12) {
                DetailRow(label: "Asset ID", value: asset.id.uuidString.prefix(8).uppercased())
                DetailRow(label: "Purchase Date", value: formatDate(asset.purchaseDate))
                DetailRow(label: "Purchase Price", value: formatCurrency(asset.purchasePrice))
                DetailRow(label: "Quantity", value: formatQuantity(asset.quantity))
                DetailRow(label: "Cost Basis", value: formatCurrency(asset.costBasis))
                
                if let maturityDate = asset.maturityDate {
                    DetailRow(label: "Maturity Date", value: formatDate(maturityDate))
                }
                
                if let interestRate = asset.interestRate {
                    DetailRow(label: "Interest Rate", value: formatPercentage(interestRate))
                }
                
                DetailRow(label: "Status", value: asset.status.capitalized)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.05))
        )
    }
    
    private var allocationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("PORTFOLIO ALLOCATION")
                .font(.caption)
                .foregroundColor(.secondary)
            
            VStack(spacing: 12) {
                AllocationRow(
                    label: "% of Portfolio",
                    value: formatPercentage(asset.portfolioPercentage),
                    progress: asset.portfolioPercentage / 100
                )
                
                AllocationRow(
                    label: "Asset Class Weight",
                    value: formatPercentage(asset.assetClassWeight),
                    progress: asset.assetClassWeight / 100,
                    color: IndigoTheme.secondaryColor
                )
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(IndigoTheme.primaryColor.opacity(0.05))
        )
    }
    
    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("RECENT ACTIVITY")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button {
                    showingTransactions = true
                } label: {
                    Text("View All")
                        .font(.caption)
                        .foregroundColor(IndigoTheme.primaryColor)
                }
            }
            
            // Mock recent transactions
            VStack(spacing: 8) {
                ActivityRow(
                    icon: "arrow.down.circle",
                    title: "Interest Payment",
                    date: Date().addingTimeInterval(-86400),
                    amount: 125.50,
                    isPositive: true
                )
                
                ActivityRow(
                    icon: "arrow.up.arrow.down",
                    title: "Reinvestment",
                    date: Date().addingTimeInterval(-604800),
                    amount: 5000.00,
                    isPositive: false
                )
            }
        }
    }
    
    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                sellAsset()
            } label: {
                Label("Sell Asset", systemImage: "minus.circle")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .foregroundColor(.red)
                    .cornerRadius(12)
            }
            
            Button {
                reinvestDividends()
            } label: {
                Label("Reinvest Dividends", systemImage: "arrow.triangle.2.circlepath")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(IndigoTheme.primaryColor.opacity(0.1))
                    .foregroundColor(IndigoTheme.primaryColor)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Helper Views
    
    private struct PerformanceMetric: View {
        let title: String
        let value: String
        var percentage: String? = nil
        var subtitle: String? = nil
        let isPositive: Bool
        
        var body: some View {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(value)
                    .font(.headline)
                    .foregroundColor(isPositive ? .primary : .red)
                
                if let percentage = percentage {
                    Text(percentage)
                        .font(.caption)
                        .foregroundColor(isPositive ? .green : .red)
                } else if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    
    private struct DetailRow: View {
        let label: String
        let value: String
        
        var body: some View {
            HStack {
                Text(label)
                    .foregroundColor(.secondary)
                Spacer()
                Text(value)
                    .fontWeight(.medium)
            }
        }
    }
    
    private struct AllocationRow: View {
        let label: String
        let value: String
        let progress: Double
        var color: Color = IndigoTheme.primaryColor
        
        var body: some View {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(label)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(value)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.1))
                            .frame(height: 8)
                        
                        RoundedRectangle(cornerRadius: 4)
                            .fill(color)
                            .frame(width: geometry.size.width * progress, height: 8)
                    }
                }
                .frame(height: 8)
            }
        }
    }
    
    private struct ActivityRow: View {
        let icon: String
        let title: String
        let date: Date
        let amount: Double
        let isPositive: Bool
        
        var body: some View {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(isPositive ? .green : .red)
                    .frame(width: 32)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                    Text(formatDate(date))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(formatCurrency(amount))
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(isPositive ? .green : .red)
            }
            .padding(.vertical, 4)
        }
        
        private func formatDate(_ date: Date) -> String {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .short
            return formatter.localizedString(for: date, relativeTo: Date())
        }
        
        private func formatCurrency(_ amount: Double) -> String {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = "USD"
            return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
        }
    }
    
    // MARK: - Helper Methods
    
    private func exportAssetReport() {
        // Implement report export
    }
    
    private func sellAsset() {
        // Navigate to sell flow
    }
    
    private func reinvestDividends() {
        // Implement dividend reinvestment
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
    
    private func formatPercentage(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value / 100)) ?? "0.00%"
    }
    
    private func formatQuantity(_ quantity: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 4
        return formatter.string(from: NSNumber(value: quantity)) ?? "0"
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

// MARK: - Supporting Views

struct AssetTransactionsView: View {
    let asset: Asset
    
    var body: some View {
        NavigationView {
            List {
                // Mock transactions
                Text("Transaction history for \(asset.name)")
            }
            .navigationTitle("Transactions")
        }
    }
}

struct AssetDocumentsView: View {
    let asset: Asset
    
    var body: some View {
        NavigationView {
            List {
                // Mock documents
                Text("Documents for \(asset.name)")
            }
            .navigationTitle("Documents")
        }
    }
}

// MARK: - View Model

@MainActor
class AssetDetailViewModel: ObservableObject {
    @Published var chartData: [ChartDataPoint] = []
    @Published var isLoading = false
    
    struct ChartDataPoint: Identifiable {
        let id = UUID()
        let date: Date
        let value: Double
    }
    
    func loadAssetDetails(_ asset: Asset) {
        // Generate mock chart data
        generateMockChartData()
    }
    
    func updateTimeRange(_ range: AssetDetailView.TimeRange) {
        generateMockChartData()
    }
    
    private func generateMockChartData() {
        var data: [ChartDataPoint] = []
        let baseValue = 10000.0
        
        for i in 0..<30 {
            let date = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
            let randomChange = Double.random(in: -200...300)
            let value = baseValue + (randomChange * Double(30 - i))
            data.append(ChartDataPoint(date: date, value: value))
        }
        
        chartData = data.reversed()
    }
}

// MARK: - Asset Extensions

extension Asset {
    var type: AssetType {
        // Determine asset type based on properties
        .bond
    }
    
    var portfolioPercentage: Double {
        // Calculate percentage of portfolio
        12.5
    }
    
    var assetClassWeight: Double {
        // Calculate weight within asset class
        25.0
    }
    
    var totalReturn: Double {
        currentValue - purchasePrice
    }
    
    var totalReturnPercent: Double {
        (totalReturn / purchasePrice) * 100
    }
    
    var changePercent: Double {
        2.5 // Mock daily change
    }
    
    var changeAmount: Double {
        currentValue * (changePercent / 100)
    }
    
    var currentYield: Double {
        5.25 // Mock yield
    }
    
    var holdingPeriodDays: Int {
        Calendar.current.dateComponents([.day], from: purchaseDate, to: Date()).day ?? 0
    }
    
    enum AssetType {
        case stock
        case bond
        case etf
        case mutualFund
        case commodity
        
        var icon: String {
            switch self {
            case .stock:
                return "chart.line.uptrend.xyaxis"
            case .bond:
                return "doc.text"
            case .etf:
                return "square.stack.3d.up"
            case .mutualFund:
                return "chart.pie"
            case .commodity:
                return "cube"
            }
        }
        
        var displayName: String {
            switch self {
            case .stock:
                return "Stock"
            case .bond:
                return "Bond"
            case .etf:
                return "ETF"
            case .mutualFund:
                return "Mutual Fund"
            case .commodity:
                return "Commodity"
            }
        }
    }
}
