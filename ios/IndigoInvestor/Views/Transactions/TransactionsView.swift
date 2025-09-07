//
//  TransactionsView.swift
//  IndigoInvestor
//
//  Transaction history view
//

import SwiftUI

struct TransactionsView: View {
    @StateObject private var viewModel = TransactionsViewModel()
    @State private var searchText = ""
    @State private var selectedFilter = TransactionFilter.all
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
    }
    
    var filteredTransactions: [Transaction] {
        viewModel.transactions
            .filter { transaction in
                let matchesFilter = selectedFilter == .all || transaction.type == selectedFilter.transactionType
                let matchesSearch = searchText.isEmpty || 
                                  transaction.description.localizedCaseInsensitiveContains(searchText) ||
                                  transaction.reference?.localizedCaseInsensitiveContains(searchText) == true
                return matchesFilter && matchesSearch
            }
    }
    
    var groupedTransactions: [(key: Date, transactions: [Transaction])] {
        Dictionary(grouping: filteredTransactions) { transaction in
            Calendar.current.startOfDay(for: transaction.date)
        }
        .sorted { $0.key > $1.key }
        .map { (key: $0.key, transactions: $0.value.sorted { $0.date > $1.date }) }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search and Filter Header
                VStack(spacing: 12) {
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("Search transactions...", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                        
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(12)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(10)
                    
                    // Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(TransactionFilter.allCases, id: \.self) { filter in
                                FilterPill(
                                    title: filter.rawValue,
                                    count: countTransactions(for: filter),
                                    isSelected: selectedFilter == filter
                                ) {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedFilter = filter
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                
                // Transactions List
                if filteredTransactions.isEmpty {
                    EmptyTransactionsView(filter: selectedFilter, searchText: searchText)
                } else {
                    List {
                        ForEach(groupedTransactions, id: \.key) { date, transactions in
                            Section {
                                ForEach(transactions) { transaction in
                                    TransactionListRow(transaction: transaction)
                                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                                        .listRowBackground(Color.clear)
                                        .onTapGesture {
                                            selectedTransaction = transaction
                                        }
                                }
                            } header: {
                                HStack {
                                    Text(date, style: .date)
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                    
                                    Text(dayTotal(for: transactions))
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.bottom, 4)
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Transactions")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { showingExportOptions = true }) {
                            Label("Export", systemImage: "square.and.arrow.up")
                        }
                        
                        Button(action: { Task { await viewModel.refreshTransactions() } }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(item: $selectedTransaction) { transaction in
                TransactionDetailView(transaction: transaction)
            }
            .sheet(isPresented: $showingExportOptions) {
                ExportOptionsView(transactions: filteredTransactions)
            }
            .refreshable {
                await viewModel.refreshTransactions()
            }
        }
        .task {
            await viewModel.loadTransactions()
        }
    }
    
    private func countTransactions(for filter: TransactionFilter) -> Int {
        if filter == .all {
            return viewModel.transactions.count
        }
        return viewModel.transactions.filter { $0.type == filter.transactionType }.count
    }
    
    private func dayTotal(for transactions: [Transaction]) -> String {
        let total = transactions.reduce(Decimal.zero) { sum, transaction in
            switch transaction.type {
            case .deposit, .interest:
                return sum + transaction.amount
            case .withdrawal, .fee:
                return sum - transaction.amount
            case .adjustment:
                return sum + transaction.amount
            }
        }
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        if total > 0 {
            formatter.positivePrefix = "+"
        }
        
        return formatter.string(from: total as NSNumber) ?? "$0.00"
    }
}

// MARK: - Filter Pill

struct FilterPill: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : Color.secondary.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(isSelected ? Color.accentColor : Color(.secondarySystemFill))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Transaction List Row

struct TransactionListRow: View {
    let transaction: Transaction
    
    var body: some View {
        HStack {
            // Icon
            Circle()
                .fill(iconBackgroundColor)
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: iconName)
                        .foregroundColor(iconColor)
                        .font(.system(size: 18))
                )
            
            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.description)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                HStack(spacing: 8) {
                    Text(transaction.date, style: .time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let reference = transaction.reference {
                        Text("• \(reference)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    StatusBadge(status: transaction.status)
                }
            }
            
            Spacer()
            
            // Amount
            VStack(alignment: .trailing, spacing: 2) {
                Text(amountText)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(amountColor)
                
                Text(transaction.currency)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
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
    
    private var iconBackgroundColor: Color {
        iconColor.opacity(0.15)
    }
    
    private var amountText: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = transaction.currency
        
        switch transaction.type {
        case .deposit, .interest:
            formatter.positivePrefix = "+"
        case .withdrawal, .fee:
            formatter.positivePrefix = "-"
        case .adjustment:
            formatter.positivePrefix = transaction.amount >= 0 ? "+" : ""
        }
        
        return formatter.string(from: abs(transaction.amount) as NSNumber) ?? "$0.00"
    }
    
    private var amountColor: Color {
        switch transaction.type {
        case .deposit, .interest:
            return .green
        case .withdrawal, .fee:
            return .primary
        case .adjustment:
            return transaction.amount >= 0 ? .green : .red
        }
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: Transaction.TransactionStatus
    
    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(textColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(backgroundColor)
            .cornerRadius(4)
    }
    
    private var textColor: Color {
        switch status {
        case .completed:
            return .green
        case .pending, .processing:
            return .orange
        case .failed, .cancelled:
            return .red
        }
    }
    
    private var backgroundColor: Color {
        textColor.opacity(0.15)
    }
}

// MARK: - Empty Transactions View

struct EmptyTransactionsView: View {
    let filter: TransactionsView.TransactionFilter
    let searchText: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text(emptyMessage)
                .font(.headline)
                .foregroundColor(.primary)
            
            Text(emptyDescription)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
    
    private var emptyMessage: String {
        if !searchText.isEmpty {
            return "No Results Found"
        }
        
        switch filter {
        case .all:
            return "No Transactions Yet"
        case .deposits:
            return "No Deposits"
        case .withdrawals:
            return "No Withdrawals"
        case .interest:
            return "No Interest Payments"
        case .fees:
            return "No Fees"
        }
    }
    
    private var emptyDescription: String {
        if !searchText.isEmpty {
            return "Try adjusting your search or filters"
        }
        
        switch filter {
        case .all:
            return "Your transaction history will appear here"
        case .deposits:
            return "Deposit transactions will appear here"
        case .withdrawals:
            return "Withdrawal transactions will appear here"
        case .interest:
            return "Interest payments will appear here"
        case .fees:
            return "Fee transactions will appear here"
        }
    }
}

// MARK: - Transaction Detail View

struct TransactionDetailView: View {
    let transaction: Transaction
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Circle()
                            .fill(iconColor.opacity(0.15))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Image(systemName: iconName)
                                    .foregroundColor(iconColor)
                                    .font(.system(size: 36))
                            )
                        
                        Text(transaction.formattedAmount)
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        StatusBadge(status: transaction.status)
                            .scaleEffect(1.2)
                    }
                    .padding(.top)
                    
                    // Details
                    VStack(spacing: 16) {
                        DetailRow(label: "Type", value: transaction.type.rawValue.capitalized)
                        DetailRow(label: "Description", value: transaction.description)
                        DetailRow(label: "Date", value: transaction.date.formatted(date: .complete, time: .shortened))
                        
                        if let settledDate = transaction.settledDate {
                            DetailRow(label: "Settled", value: settledDate.formatted(date: .abbreviated, time: .shortened))
                        }
                        
                        if let reference = transaction.reference {
                            DetailRow(label: "Reference", value: reference)
                        }
                        
                        DetailRow(label: "Currency", value: transaction.currency)
                        
                        if let metadata = transaction.metadata {
                            ForEach(Array(metadata.keys.sorted()), id: \.self) { key in
                                DetailRow(label: key.capitalized, value: metadata[key] ?? "")
                            }
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    
                    // Actions
                    if transaction.status == .pending || transaction.status == .processing {
                        VStack(spacing: 12) {
                            Button(action: { /* Contact support */ }) {
                                Label("Contact Support", systemImage: "questionmark.circle")
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.orange)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }
                            
                            if transaction.type == .withdrawal && transaction.status == .pending {
                                Button(action: { /* Cancel withdrawal */ }) {
                                    Label("Cancel Withdrawal", systemImage: "xmark.circle")
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.red.opacity(0.1))
                                        .foregroundColor(.red)
                                        .cornerRadius(12)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Transaction Details")
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
    
    private var iconName: String {
        switch transaction.type {
        case .deposit:
            return "arrow.down.circle.fill"
        case .withdrawal:
            return "arrow.up.circle.fill"
        case .interest:
            return "percent"
        case .fee:
            return "dollarsign.circle.fill"
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
}

// MARK: - Export Options View

struct ExportOptionsView: View {
    let transactions: [Transaction]
    @Environment(\.dismiss) private var dismiss
    @State private var selectedFormat = ExportFormat.pdf
    @State private var dateRange = DateRange.all
    @State private var isExporting = false
    
    enum ExportFormat: String, CaseIterable {
        case pdf = "PDF"
        case csv = "CSV"
        case excel = "Excel"
    }
    
    enum DateRange: String, CaseIterable {
        case all = "All Time"
        case thisMonth = "This Month"
        case lastMonth = "Last Month"
        case thisYear = "This Year"
        case custom = "Custom Range"
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Export Format") {
                    Picker("Format", selection: $selectedFormat) {
                        ForEach(ExportFormat.allCases, id: \.self) { format in
                            Text(format.rawValue).tag(format)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section("Date Range") {
                    Picker("Range", selection: $dateRange) {
                        ForEach(DateRange.allCases, id: \.self) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                }
                
                Section {
                    Text("\(filteredTransactionCount) transactions will be exported")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section {
                    Button(action: exportTransactions) {
                        if isExporting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Export")
                                .frame(maxWidth: .infinity)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isExporting)
                }
            }
            .navigationTitle("Export Transactions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var filteredTransactionCount: Int {
        // Filter transactions based on date range
        transactions.count
    }
    
    private func exportTransactions() {
        isExporting = true
        
        Task {
            try await Task.sleep(nanoseconds: 2_000_000_000)
            isExporting = false
            dismiss()
        }
    }
}

// MARK: - Transactions ViewModel

@MainActor
class TransactionsViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private let serviceLocator = ServiceLocator.shared
    
    func loadTransactions() async {
        isLoading = true
        
        // Simulate loading transactions
        do {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            transactions = createMockTransactions()
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func refreshTransactions() async {
        await loadTransactions()
    }
    
    private func createMockTransactions() -> [Transaction] {
        var transactions: [Transaction] = []
        let types: [Transaction.TransactionType] = [.deposit, .withdrawal, .interest, .fee]
        let descriptions = [
            "Monthly deposit",
            "Withdrawal request",
            "Interest payment",
            "Management fee",
            "Quarterly deposit",
            "Performance fee",
            "Dividend payment"
        ]
        
        for i in 0..<50 {
            let type = types.randomElement()!
            let date = Calendar.current.date(byAdding: .day, value: -i * 2, to: Date())!
            let amount = Decimal(Double.random(in: 100...10000))
            
            transactions.append(Transaction(
                id: UUID(),
                investorId: UUID(),
                type: type,
                amount: amount,
                currency: "USD",
                status: i < 5 ? .pending : .completed,
                description: descriptions.randomElement()!,
                date: date,
                settledDate: i < 5 ? nil : date,
                reference: "TXN-\(String(format: "%06d", i + 1000))",
                metadata: nil
            ))
        }
        
        return transactions.sorted { $0.date > $1.date }
    }
}

// MARK: - Preview

#Preview {
    TransactionsView()
}
