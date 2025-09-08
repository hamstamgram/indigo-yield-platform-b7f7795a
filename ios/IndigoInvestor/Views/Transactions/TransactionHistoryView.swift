//
//  TransactionHistoryView.swift
//  IndigoInvestor
//
//  View for displaying and managing transaction history with filtering and search
//

import SwiftUI
import Combine

struct TransactionHistoryView: View {
    @StateObject private var viewModel = TransactionHistoryViewModel()
    @State private var searchText = ""
    @State private var selectedFilter: TransactionFilter = .all
    @State private var showingFilterSheet = false
    @State private var selectedTransaction: Transaction?
    @State private var showingExportOptions = false
    
    enum TransactionFilter: String, CaseIterable {
        case all = "All"
        case deposits = "Deposits"
        case withdrawals = "Withdrawals"
        case interest = "Interest"
        case fees = "Fees"
        
        var transactionType: Transaction.TransactionType? {
            switch self {
            case .all: return nil
            case .deposits: return .deposit
            case .withdrawals: return .withdrawal
            case .interest: return .interest
            case .fees: return .fee
            }
        }
        
        var icon: String {
            switch self {
            case .all: return "list.bullet"
            case .deposits: return "arrow.down.circle"
            case .withdrawals: return "arrow.up.circle"
            case .interest: return "percent"
            case .fees: return "dollarsign.circle"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.transactions.isEmpty && !viewModel.isLoading {
                    EmptyStateView()
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
                    HStack(spacing: IndigoTheme.Spacing.sm) {
                        Button(action: { showingFilterSheet = true }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                        
                        Button(action: { showingExportOptions = true }) {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search transactions...")
            .onChange(of: searchText) { newValue in
                viewModel.searchTransactions(query: newValue)
            }
            .onChange(of: selectedFilter) { newFilter in
                viewModel.filterTransactions(by: newFilter.transactionType)
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
            .onAppear {
                viewModel.loadTransactions()
            }
            .refreshable {
                await viewModel.refreshTransactions()
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
                    summaryStats
                        .padding()
                }
                
                // Grouped Transactions
                ForEach(viewModel.groupedTransactions, id: \\.key) { month, transactions in
                    Section {
                        ForEach(transactions) { transaction in
                            TransactionListItem(transaction: transaction)
                                .onTapGesture {
                                    selectedTransaction = transaction
                                }
                            
                            if transaction != transactions.last {
                                Divider()
                                    .padding(.leading, 60)
                            }
                        }
                    } header: {
                        MonthHeader(month: month, total: calculateMonthTotal(transactions))
                    }
                    .background(IndigoTheme.Colors.cardBackground)
                    .cornerRadius(IndigoTheme.CornerRadius.md)
                    .padding(.horizontal)
                    .padding(.bottom, IndigoTheme.Spacing.md)
                }
            }
        }
    }
    
    // MARK: - Filter Pills
    
    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(TransactionFilter.allCases, id: \\.self) { filter in
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
    
    // MARK: - Summary Stats
    
    private var summaryStats: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            StatCard(
                title: "Total In",
                value: viewModel.formattedTotalDeposits,
                color: .green
            )
            
            StatCard(
                title: "Total Out",
                value: viewModel.formattedTotalWithdrawals,
                color: .red
            )
            
            StatCard(
                title: "Net",
                value: viewModel.formattedNetAmount,
                color: viewModel.netAmount >= 0 ? .green : .red
            )
        }
    }
    
    // MARK: - Helper Methods
    
    private func calculateMonthTotal(_ transactions: [Transaction]) -> Double {
        transactions.reduce(0) { total, transaction in
            switch transaction.type {
            case .deposit, .interest:
                return total + transaction.amount
            case .withdrawal, .fee:
                return total - transaction.amount
            }
        }
    }
}

// MARK: - Transaction List Item

struct TransactionListItem: View {
    let transaction: Transaction
    
    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            Image(systemName: transaction.iconName)
                .font(.system(size: 20))
                .foregroundColor(transaction.color)
                .frame(width: 40, height: 40)
                .background(transaction.color.opacity(0.1))
                .cornerRadius(IndigoTheme.CornerRadius.sm)
            
            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.description)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.text)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text(transaction.date.formatted(date: .abbreviated, time: .omitted))
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                    
                    if transaction.status != .completed {
                        Text("•")
                            .foregroundColor(IndigoTheme.Colors.textTertiary)
                        
                        StatusBadge(status: transaction.status)
                    }
                }
            }
            
            Spacer()
            
            // Amount
            VStack(alignment: .trailing, spacing: 2) {
                Text(transaction.type == .withdrawal || transaction.type == .fee ? "-" : "+")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(transaction.type == .withdrawal || transaction.type == .fee ? .red : .green)
                +
                Text(transaction.formattedAmount)
                    .font(IndigoTheme.Typography.bodyBold)
                    .foregroundColor(IndigoTheme.Colors.text)
                
                if let reference = transaction.referenceNumber {
                    Text(reference)
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                        .lineLimit(1)
                }
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - Month Header

struct MonthHeader: View {
    let month: String
    let total: Double
    
    private var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        let absTotal = abs(total)
        let sign = total >= 0 ? "+" : "-"
        return sign + (formatter.string(from: NSNumber(value: absTotal)) ?? "$0.00")
    }
    
    var body: some View {
        HStack {
            Text(month)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Spacer()
            
            Text(formattedTotal)
                .font(IndigoTheme.Typography.bodyBold)
                .foregroundColor(total >= 0 ? .green : .red)
        }
        .padding(.horizontal)
        .padding(.vertical, IndigoTheme.Spacing.sm)
        .background(IndigoTheme.Colors.backgroundSecondary)
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
                    .font(IndigoTheme.Typography.caption1)
                
                if count > 0 {
                    Text("\\(count)")
                        .font(IndigoTheme.Typography.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : IndigoTheme.Colors.primary.opacity(0.1))
                        .cornerRadius(IndigoTheme.CornerRadius.xs)
                }
            }
            .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
            .padding(.horizontal, IndigoTheme.Spacing.md)
            .padding(.vertical, IndigoTheme.Spacing.sm)
            .background(isSelected ? IndigoTheme.Colors.primary : IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.pill)
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
                .font(IndigoTheme.Typography.caption2)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
            
            Text(value)
                .font(IndigoTheme.Typography.bodyBold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(IndigoTheme.Spacing.sm)
        .background(color.opacity(0.1))
        .cornerRadius(IndigoTheme.CornerRadius.sm)
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: Transaction.TransactionStatus
    
    private var color: Color {
        switch status {
        case .pending: return .orange
        case .completed: return .green
        case .failed: return .red
        case .cancelled: return .gray
        }
    }
    
    var body: some View {
        Text(status.displayName)
            .font(IndigoTheme.Typography.caption2)
            .foregroundColor(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .cornerRadius(IndigoTheme.CornerRadius.xs)
    }
}

// MARK: - Filter Sheet

struct FilterSheet: View {
    @Binding var selectedFilter: TransactionHistoryView.TransactionFilter
    @Binding var dateRange: DateRange?
    @Binding var minAmount: Double?
    @Binding var maxAmount: Double?
    @Environment(\\.dismiss) private var dismiss
    
    @State private var showingDatePicker = false
    @State private var startDate = Date().addingTimeInterval(-30 * 24 * 60 * 60)
    @State private var endDate = Date()
    @State private var minAmountText = ""
    @State private var maxAmountText = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Transaction Type") {
                    ForEach(TransactionHistoryView.TransactionFilter.allCases, id: \\.self) { filter in
                        HStack {
                            Image(systemName: filter.icon)
                                .foregroundColor(IndigoTheme.Colors.primary)
                                .frame(width: 30)
                            
                            Text(filter.rawValue)
                            
                            Spacer()
                            
                            if selectedFilter == filter {
                                Image(systemName: "checkmark")
                                    .foregroundColor(IndigoTheme.Colors.primary)
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
                        dateRange = nil
                        minAmount = nil
                        maxAmount = nil
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        if showingDatePicker {
                            dateRange = DateRange(start: startDate, end: endDate)
                        }
                        
                        if let min = Double(minAmountText) {
                            minAmount = min
                        }
                        
                        if let max = Double(maxAmountText) {
                            maxAmount = max
                        }
                        
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
                .progressViewStyle(CircularProgressViewStyle(tint: IndigoTheme.Colors.primary))
                .scaleEffect(1.5)
                .padding()
                .background(IndigoTheme.Colors.cardBackground)
                .cornerRadius(IndigoTheme.CornerRadius.md)
        }
    }
}

// MARK: - Supporting Types

struct DateRange {
    let start: Date
    let end: Date
}
