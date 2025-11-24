//
//  TransactionHistoryView.swift
//  IndigoInvestor
//
//  View for displaying and managing transaction history with filtering and search
//

import SwiftUI
import Combine

struct TransactionHistoryView: View {
    @StateObject private var viewModel = TransactionViewModel(transactionService: ServiceContainer.shared.transactionService)
    @State private var searchText = ""
    @State private var selectedFilter: TransactionFilter = .all
    @State private var showingFilterSheet = false
    @State private var selectedTransaction: Transaction?
    @State private var showingExportOptions = false
    
    enum TransactionFilter: String, CaseIterable {
        case all = "All"
        case deposits = "Deposits"
        case withdrawals = "Withdrawals"
        case yield = "Yield" // Changed from Interest
        case fees = "Fees"
        case adjustments = "Adjustments"
        
        var transactionType: Transaction.TransactionType? {
            switch self {
            case .all: return nil
            case .deposits: return .deposit
            case .withdrawals: return .withdrawal
            case .yield: return .yield
            case .fees: return .fee
            case .adjustments: return .adjustment
            }
        }
        
        var icon: String {
            switch self {
            case .all: return "list.bullet"
            case .deposits: return "arrow.down.circle.fill"
            case .withdrawals: return "arrow.up.circle.fill"
            case .yield: return "dollarsign.arrow.circlepath" // New icon for yield
            case .fees: return "tag.fill"
            case .adjustments: return "slider.horizontal.3"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.transactions.isEmpty && !viewModel.isLoading {
                    EmptyStateView(
                        iconName: "doc.text.magnifyingglass",
                        title: "No Transactions Found",
                        message: "Your transaction history will appear here."
                    )
                } else {
                    transactionsList
                }
                
                if viewModel.isLoading {
                    LoadingOverlay()
                }
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Transactions")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 8) { // Updated spacing for consistency
                        Button(action: { showingFilterSheet = true }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .foregroundColor(DesignTokens.Colors.indigoPrimary)
                        }
                        
                        Button(action: { showingExportOptions = true }) {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(DesignTokens.Colors.indigoPrimary)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search transactions...")
            .onChange(of: searchText) { newValue in
                viewModel.searchTransactions(query: newValue)
            }
            .onChange(of: selectedFilter) { newFilter in
                viewModel.updateFilter(newFilter)
            }
            .sheet(isPresented: $showingFilterSheet) {
                FilterSheet(
                    selectedFilter: $selectedFilter,
                    dateRange: $viewModel.dateRange,
                    minAmount: $viewModel.minAmount,
                    maxAmount: $viewModel.maxAmount
                )
            }
            .sheet(item: $selectedTransaction) { transaction in
                TransactionDetailSheet(transaction: transaction)
                    .presentationDetents([.medium, .large])
            }
            .confirmationDialog("Export Transactions", isPresented: $showingExportOptions) {
                Button("Export as PDF") {
                    viewModel.exportAsPDF()
                }
                Button("Export as CSV") {
                    viewModel.exportAsCSV()
                }
                Button("Cancel", role: .cancel) {}
            }
            .task { // Use .task for async operations
                // Mock ID for now, replace with auth service user ID
                if let id = UUID(uuidString: "00000000-0000-0000-0000-000000000000") {
                    await viewModel.loadTransactions(for: id)
                }
            }
            .refreshable {
                // Mock ID for now, replace with auth service user ID
                if let id = UUID(uuidString: "00000000-0000-0000-0000-000000000000") {
                    await viewModel.refreshTransactions(for: id)
                }
            }
        }
    }
    
    // MARK: - Transactions List
    
    private var transactionsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Filter Pills
                filterPills
                
                // Summary Stats
                if !viewModel.filteredTransactions.isEmpty {
                    TransactionSummaryView(summary: viewModel.transactionSummary) // Extracted to a subview
                        .padding()
                }
                
                // Grouped Transactions
                ForEach(viewModel.groupedTransactions, id: \.key) { month, transactions in
                    Section {
                        ForEach(transactions) { transaction in
                            TransactionListItem(transaction: transaction)
                                .onTapGesture {
                                    selectedTransaction = transaction
                                }
                            
                            if transaction != transactions.last {
                                Divider()
                                    .padding(.leading, DesignTokens.Spacing.xl) // Adjusted padding
                            }
                        }
                    } header: {
                        MonthHeader(month: month, total: viewModel.calculateMonthTotal(transactions)) // Updated
                    }
                    .background(DesignTokens.Colors.backgroundSecondary) // Use DesignTokens
                    .cornerRadius(DesignTokens.CornerRadius.medium) // Use DesignTokens
                    .padding(.horizontal)
                    .padding(.bottom, DesignTokens.Spacing.md)
                }
            }
        }
    }
    
    // MARK: - Filter Pills
    
    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(TransactionFilter.allCases, id: \.self) { filter in
                    FilterPill(
                        title: filter.rawValue,
                        icon: filter.icon,
                        isSelected: selectedFilter == filter,
                        count: viewModel.getCount(for: filter.transactionType)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, IndigoTheme.Spacing.sm)
        }
    }
    

}

// MARK: - Transaction List Item

struct TransactionListItem: View {
    let transaction: Transaction
    
    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Icon - Asset Specific
            AssetIconView(assetCode: transaction.assetCode, size: 40)
            
            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.description)
                    .font(DesignTokens.Typography.body)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text(transaction.date.formatted(date: .abbreviated, time: .omitted))
                        .font(DesignTokens.Typography.caption2)
                        .foregroundColor(DesignTokens.Colors.textTertiary)
                    
                    Text("•")
                        .foregroundColor(DesignTokens.Colors.textTertiary)

                    // Transaction Type Badge instead of just Status
                    TransactionStatusBadge(status: transaction.status)
                }
            }
            
            Spacer()
            
            // Amount
            VStack(alignment: .trailing, spacing: 2) {
                Text(transaction.formattedSign)
                    .font(DesignTokens.Typography.caption1)
                    .foregroundColor(transaction.color)
                +
                Text(transaction.formattedAmount)
                    .font(DesignTokens.Typography.bodyEmphasized)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                
                if let reference = transaction.reference {
                    Text(reference)
                        .font(DesignTokens.Typography.caption2)
                        .foregroundColor(DesignTokens.Colors.textTertiary)
                        .lineLimit(1)
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - Month Header

struct MonthHeader: View {
    let month: String
    let total: Decimal // Change to Decimal
    
    private var formattedTotal: String {
        // Simple number formatting without currency symbol
        return total.formatted(.number.precision(.fractionLength(2)))
    }
    
    var body: some View {
        HStack {
            Text(month)
                .font(DesignTokens.Typography.headline)
                .foregroundColor(DesignTokens.Colors.textPrimary)
            
            Spacer()
            
            // Contextual label? Or just value?
            // If we don't know the unit, just showing number might be ambiguous.
            // But since we can't sum apples and oranges, this total is likely "Net Flow" number.
            // Let's just show the number for now as requested "No fiat value".
            Text(formattedTotal)
                .font(DesignTokens.Typography.bodyEmphasized)
                .foregroundColor(total >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
        }
        .padding(.horizontal)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Colors.backgroundSecondary)
    }
}

// MARK: - Filter Pill

struct FilterPill: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                
                Text(title)
                    .font(DesignTokens.Typography.caption1)
                
                if count > 0 {
                    Text("\(count)")
                        .font(DesignTokens.Typography.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : DesignTokens.Colors.indigoPrimary.opacity(0.1))
                        .cornerRadius(DesignTokens.CornerRadius.small) // Use DesignTokens
                }
            }
            .foregroundColor(isSelected ? .white : DesignTokens.Colors.textSecondary)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(isSelected ? DesignTokens.Colors.indigoPrimary : DesignTokens.Colors.cardGradient.linearGradient) // Use DesignTokens
            .cornerRadius(DesignTokens.CornerRadius.pill) // Use DesignTokens
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(DesignTokens.Typography.caption2)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            
            Text(value)
                .font(DesignTokens.Typography.bodyEmphasized) // Use bodyEmphasized
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)
        .background(color.opacity(0.1))
        .cornerRadius(DesignTokens.CornerRadius.small) // Use DesignTokens
    }
}

// MARK: - Status Badge

struct TransactionStatusBadge: View {
    let status: Transaction.TransactionStatus
    
    private var color: Color {
        switch status {
        case .pending: return DesignTokens.Colors.warningOrange
        case .completed: return DesignTokens.Colors.successGreen
        case .failed: return DesignTokens.Colors.errorRed
        case .cancelled: return DesignTokens.Colors.neutralGray
        }
    }
    
    var body: some View {
        Text(status.displayName) // Now from Transaction.TransactionStatus extension
            .font(DesignTokens.Typography.caption2)
            .foregroundColor(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .cornerRadius(DesignTokens.CornerRadius.small) // Use DesignTokens
    }
}

// MARK: - Filter Sheet

struct FilterSheet: View {
    @Binding var selectedFilter: TransactionFilter
    @Binding var dateRange: DateRange // This should be updated to use the full DateRange struct
    @Binding var minAmount: Decimal? // Changed to Decimal
    @Binding var maxAmount: Decimal? // Changed to Decimal
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingDatePicker = false
    @State private var startDate = Date().addingTimeInterval(-30 * 24 * 60 * 60)
    @State private var endDate = Date()
    @State private var minAmountText = ""
    @State private var maxAmountText = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Transaction Type") {
                    ForEach(TransactionFilter.allCases, id: \.self) { filter in
                        HStack {
                            Image(systemName: filter.icon)
                                .foregroundColor(DesignTokens.Colors.indigoPrimary)
                                .frame(width: 30)
                            
                            Text(filter.rawValue)
                            
                            Spacer()
                            
                            if selectedFilter == filter {
                                Image(systemName: "checkmark")
                                    .foregroundColor(DesignTokens.Colors.indigoPrimary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedFilter = filter
                        }
                    }
                }
                
                Section("Date Range") {
                    Toggle("Custom Date Range", isOn: $showingDatePicker)
                    
                    if showingDatePicker {
                        DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                        DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                    }
                }
                
                Section("Amount Range") {
                    HStack {
                        Text("Min")
                        TextField("$0", text: $minAmountText)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                    
                    HStack {
                        Text("Max")
                        TextField("$0", text: $maxAmountText)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                }
            }
            .navigationTitle("Filter Transactions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Reset") {
                        selectedFilter = .all
                        dateRange = .all // Reset to All Time
                        minAmount = nil
                        maxAmount = nil
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        if showingDatePicker {
                            // Update dateRange only if custom is selected
                            // For simplicity, TransactionViewModel will use selectedDateRange.startDate logic
                        } else {
                            // Reset to all if custom date picker is not shown
                            // But viewModel uses selectedDateRange directly, so it will handle it
                        }
                        
                        minAmount = Decimal(string: minAmountText)
                        maxAmount = Decimal(string: maxAmountText)
                        
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(IndigoTheme.Colors.textTertiary)
            
            Text("No Transactions Found")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text("Your transaction history will appear here")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: DesignTokens.Colors.indigoPrimary))
                .scaleEffect(1.5)
                .padding()
                .background(DesignTokens.Colors.cardGradient.linearGradient) // Use DesignTokens
                .cornerRadius(DesignTokens.CornerRadius.medium) // Use DesignTokens
        }
    }
}

// MARK: - Supporting Types

struct DateRange {
    let start: Date
    let end: Date
}

// MARK: - Transaction Summary View (New Component)

struct TransactionSummaryView: View {
    let summary: TransactionSummary
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Summary for Filtered Transactions")
                .font(DesignTokens.Typography.headline)
                .foregroundColor(DesignTokens.Colors.textPrimary)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                StatCard(title: "Deposits", value: summary.formattedTotalDeposits, color: DesignTokens.Colors.positiveGreen)
                StatCard(title: "Withdrawals", value: summary.formattedTotalWithdrawals, color: DesignTokens.Colors.negativeRed)
                StatCard(title: "Yield", value: summary.formattedTotalYield, color: DesignTokens.Colors.indigoPrimary)
                StatCard(title: "Fees", value: summary.formattedTotalFees, color: DesignTokens.Colors.warningOrange)
            }
            
            HStack {
                Text("Net Flow")
                    .font(DesignTokens.Typography.bodyEmphasized)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                Spacer()
                Text(summary.formattedNetFlow)
                    .font(DesignTokens.Typography.financialMedium)
                    .foregroundColor(summary.netFlowColor)
            }
            .padding(.top, 8)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.backgroundPrimary)
        .cornerRadius(DesignTokens.CornerRadius.medium)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Extensions for Transaction Model

extension Transaction {
    var iconName: String {
        switch type {
        case .deposit: return "arrow.down.circle.fill"
        case .withdrawal: return "arrow.up.circle.fill"
        case .yield: return "dollarsign.arrow.circlepath"
        case .fee: return "tag.fill"
        case .adjustment: return "slider.horizontal.3"
        }
    }
    
    var color: Color {
        switch type {
        case .deposit: return DesignTokens.Colors.positiveGreen
        case .withdrawal: return DesignTokens.Colors.negativeRed
        case .yield: return DesignTokens.Colors.indigoPrimary
        case .fee: return DesignTokens.Colors.warningOrange
        case .adjustment: return DesignTokens.Colors.neutralGray
        }
    }
    
    var formattedSign: String {
        switch type {
        case .deposit, .yield: return "+"
        case .withdrawal, .fee, .adjustment: return "-"
        }
    }
}

extension Transaction.TransactionStatus {
    var displayName: String {
        return rawValue.capitalized
    }
}

// MARK: - Extensions for DateRange

extension DateRange {
    var displayName: String {
        switch self {
        case .all: return "All Time"
        case .today: return "Today"
        case .week: return "Last Week"
        case .month: return "Last Month"
        case .quarter: return "Last Quarter"
        case .year: return "Last Year"
        }
    }
}

// MARK: - Export Functionality (Placeholder)

extension TransactionViewModel {
    func exportAsPDF() {
        print("Exporting transactions as PDF...")
        errorMessage = "PDF Export feature is not yet implemented."
        showError = true
    }
    
    func exportAsCSV() {
        print("Exporting transactions as CSV...")
        errorMessage = "CSV Export feature is not yet implemented."
        showError = true
    }
    
    func getCount(for type: Transaction.TransactionType?) -> Int {
        if let type = type {
            return transactions.filter { $0.type == type }.count
        }
        return transactions.count
    }
}

// MARK: - Transaction Detail Sheet (Placeholder)

struct TransactionDetailSheet: View {
    let transaction: Transaction
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Transaction Details")
                        .font(DesignTokens.Typography.title1)
                        .foregroundColor(DesignTokens.Colors.textPrimary)
                    
                    // Display details using DetailRow
                    DetailRow(label: "Type", value: transaction.type.rawValue.capitalized)
                    DetailRow(label: "Amount", value: transaction.formattedAmount)
                    DetailRow(label: "Asset Code", value: transaction.assetCode)
                    DetailRow(label: "Date", value: transaction.formattedDate)
                    DetailRow(label: "Status", value: transaction.status.displayName, color: transaction.color)
                    DetailRow(label: "Description", value: transaction.description)
                    if let ref = transaction.reference {
                        DetailRow(label: "Reference", value: ref)
                    }
                    
                }
                .padding()
            }
            .navigationTitle(transaction.description)
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

// Assuming DetailRow exists elsewhere or is defined locally as it was in PortfolioView
struct DetailRow: View {
    let label: String
    let value: String
    var color: Color = .primary
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
    }
}