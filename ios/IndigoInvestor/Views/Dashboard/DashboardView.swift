//
//  DashboardView.swift
//  IndigoInvestor
//
//  Main dashboard view for Limited Partners
//

import SwiftUI
import Charts

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var serviceLocator: ServiceLocator
    @State private var selectedTimeRange = TimeRange.month
    @State private var showWithdrawalSheet = false
    
    enum TimeRange: String, CaseIterable, Identifiable {
        case day = "1D"
        case week = "1W"
        case month = "1M"
        case threeMonths = "3M"
        case year = "1Y"
        case all = "All"
        
        var id: String { rawValue }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Portfolio Value Card
                    PortfolioValueCard(
                        portfolio: viewModel.portfolio,
                        isLoading: viewModel.isLoading
                    )
                    .padding(.horizontal)
                    
                    // Time Range Selector
                    TimeRangePicker(selection: $selectedTimeRange)
                        .padding(.horizontal)
                        .onChange(of: selectedTimeRange) { newValue in
                            Task {
                                await viewModel.loadPerformanceData(for: newValue)
                            }
                        }
                    
                    // Performance Chart
                    if !viewModel.performanceData.isEmpty {
                        PerformanceChartCard(
                            data: viewModel.performanceData,
                            timeRange: selectedTimeRange
                        )
                        .frame(height: 250)
                        .padding(.horizontal)
                    }
                    
                    // Asset Allocation
                    if let portfolio = viewModel.portfolio {
                        AssetAllocationCard(
                            allocations: portfolio.assetAllocation
                        )
                        .padding(.horizontal)
                    }
                    
                    // Quick Actions
                    QuickActionsCard(
                        onWithdrawTapped: {
                            showWithdrawalSheet = true
                        },
                        onStatementsTapped: {
                            // Navigate to statements
                        }
                    )
                    .padding(.horizontal)
                    
                    // Recent Transactions
                    if !viewModel.recentTransactions.isEmpty {
                        RecentTransactionsCard(
                            transactions: viewModel.recentTransactions
                        )
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NotificationButton()
                }
            }
            .refreshable {
                await viewModel.refreshData()
            }
            .sheet(isPresented: $showWithdrawalSheet) {
                WithdrawalRequestView()
            }
        }
        .task {
            await viewModel.loadData()
        }
    }
}

// MARK: - Portfolio Value Card

struct PortfolioValueCard: View {
    let portfolio: Portfolio?
    let isLoading: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Total Portfolio Value")
                .font(Typography.headline)
                .foregroundColor(.secondary)
            
            if isLoading {
                ProgressView()
                    .frame(height: 60)
            } else if let portfolio = portfolio {
                VStack(alignment: .leading, spacing: 8) {
                    Text(portfolio.formattedTotalValue)
                        .font(Typography.largeTitle)
                    
                    HStack(spacing: 12) {
                        ChangeIndicator(
                            value: portfolio.dayChange,
                            percentage: portfolio.dayChangePercent,
                            label: "Today"
                        )
                        
                        Divider()
                            .frame(height: 20)
                        
                        ChangeIndicator(
                            value: portfolio.totalGain,
                            percentage: portfolio.totalGainPercent,
                            label: "Total"
                        )
                    }
                }
            } else {
                Text("Unable to load portfolio")
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Change Indicator

struct ChangeIndicator: View {
    let value: Decimal
    let percentage: Double
    let label: String
    
    var color: Color {
        value >= 0 ? .green : .red
    }
    
    var icon: String {
        value >= 0 ? "arrow.up.right" : "arrow.down.right"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(Typography.caption1)
                .foregroundColor(.secondary)
            
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(Typography.caption1)
                
                Text(value.formatted(.currency(code: "USD")))
                    .font(Typography.bodyMedium)
                
                Text("(\(String(format: "%.2f", percentage))%)")
                    .font(Typography.caption1)
            }
            .foregroundColor(color)
        }
    }
}

// MARK: - Time Range Picker

struct TimeRangePicker: View {
    @Binding var selection: DashboardView.TimeRange
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DashboardView.TimeRange.allCases) { range in
                    TimeRangeButton(
                        title: range.rawValue,
                        isSelected: selection == range
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selection = range
                        }
                    }
                }
            }
        }
    }
}

struct TimeRangeButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isSelected ? Color.accentColor : Color(.secondarySystemFill))
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Performance Chart Card

struct PerformanceChartCard: View {
    let data: [PerformanceData]
    let timeRange: DashboardView.TimeRange
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Performance")
                .font(.headline)
            
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
                .chartXAxis {
                    AxisMarks(values: .automatic) { _ in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel(format: dateFormat(for: timeRange))
                    }
                }
                .chartYAxis {
                    AxisMarks { _ in
                        AxisGridLine()
                        AxisValueLabel(format: .currency(code: "USD"))
                    }
                }
            } else {
                // Fallback for iOS 15
                Text("Chart requires iOS 16+")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
    
    private func dateFormat(for range: DashboardView.TimeRange) -> Date.FormatStyle {
        switch range {
        case .day:
            return .dateTime.hour()
        case .week, .month:
            return .dateTime.month(.abbreviated).day()
        case .threeMonths, .year, .all:
            return .dateTime.month(.abbreviated)
        }
    }
}

// MARK: - Asset Allocation Card

struct AssetAllocationCard: View {
    let allocations: [AssetAllocation]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Asset Allocation")
                .font(.headline)
            
            VStack(spacing: 12) {
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
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Quick Actions Card

struct QuickActionsCard: View {
    let onWithdrawTapped: () -> Void
    let onStatementsTapped: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
            
            HStack(spacing: 12) {
                QuickActionButton(
                    icon: "arrow.up.circle.fill",
                    title: "Withdraw",
                    color: .blue,
                    action: onWithdrawTapped
                )
                
                QuickActionButton(
                    icon: "doc.text.fill",
                    title: "Statements",
                    color: .green,
                    action: onStatementsTapped
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                    .frame(width: 48, height: 48)
                    .background(color)
                    .cornerRadius(12)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Recent Transactions Card

struct RecentTransactionsCard: View {
    let transactions: [Transaction]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Transactions")
                    .font(.headline)
                
                Spacer()
                
                // NavigationLink(destination: TransactionsView()) {
                    Text("View All")
                        .font(.caption)
                        .foregroundColor(.accentColor)
                // }
            }
            
            VStack(spacing: 8) {
                ForEach(transactions.prefix(5)) { transaction in
                    TransactionRow(transaction: transaction)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct TransactionRow: View {
    let transaction: Transaction
    
    var body: some View {
        HStack {
            Circle()
                .fill(iconColor.opacity(0.15))
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: iconName)
                        .foregroundColor(iconColor)
                        .font(.system(size: 16))
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(.subheadline)
                    .lineLimit(1)
                
                Text(transaction.formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(transaction.formattedAmount)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(amountColor)
        }
        .padding(.vertical, 4)
    }
    
    private var iconName: String {
        switch transaction.type {
        case .deposit:
            return "arrow.down.circle"
        case .withdrawal:
            return "arrow.up.circle"
        case .interest:
            return "percent"
        case .fee:
            return "dollarsign.circle"
        case .adjustment:
            return "slider.horizontal.3"
        }
    }
    
    private var iconColor: Color {
        switch transaction.type {
        case .deposit, .interest:
            return .green
        case .withdrawal, .fee:
            return .red
        case .adjustment:
            return .orange
        }
    }
    
    private var amountColor: Color {
        switch transaction.type {
        case .deposit, .interest:
            return .green
        case .withdrawal, .fee:
            return .primary
        case .adjustment:
            return .orange
        }
    }
}

// MARK: - Notification Button

struct NotificationButton: View {
    @State private var hasUnread = true
    
    var body: some View {
        Button(action: {
            // Navigate to notifications
        }) {
            Image(systemName: "bell.fill")
                .overlay(
                    hasUnread ?
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                        .offset(x: 8, y: -8)
                    : nil
                )
        }
    }
}

// MARK: - Preview

#Preview {
    DashboardView()
            .environmentObject(ServiceLocator.shared)
}

// MARK: - Typography
private struct Typography {
    static let largeTitle = Font.system(size: 34, weight: .bold)
    static let headline = Font.system(size: 17, weight: .semibold)
    static let bodyMedium = Font.system(size: 17, weight: .medium)
    static let caption1 = Font.system(size: 12, weight: .regular)
}
