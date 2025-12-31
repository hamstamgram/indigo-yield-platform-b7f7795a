//
//  TransactionViewModel.swift
//  IndigoInvestor
//
//  Transaction view model for transaction list and filtering
//

import Foundation
import SwiftUI
import Combine

@MainActor
class TransactionViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var transactions: [Transaction] = []
    @Published var filteredTransactions: [Transaction] = []
    @Published var selectedTransaction: Transaction?
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var searchText = ""
    @Published var selectedFilter: TransactionFilter = .all
    @Published var selectedDateRange: DateRange = .all
    
    // MARK: - Dependencies
    private let transactionService: TransactionServiceProtocol
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var currentInvestorId: UUID?
    private var currentPage = 0
    private let pageSize = 50
    private var hasMoreData = true
    
    // MARK: - Initialization
    
    init(transactionService: TransactionServiceProtocol) {
        self.transactionService = transactionService
        setupSubscriptions()
    }
    
    deinit {
        transactionSubscription?.cancel()
    }
    
    // MARK: - Public Methods
    
    func loadTransactions(for investorId: UUID) async {
        guard !isLoading else { return }
        
        isLoading = true
        currentInvestorId = investorId
        currentPage = 0
        hasMoreData = true
        errorMessage = nil
        
        do {
            let fetchedTransactions = try await transactionService.fetchTransactions(
                for: investorId, 
                limit: pageSize
            )
            
            self.transactions = fetchedTransactions
            self.hasMoreData = fetchedTransactions.count == pageSize
            
            applyFilters()
            setupRealtimeSubscription(for: investorId)
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func loadMoreTransactions() async {
        guard let investorId = currentInvestorId,
              !isLoadingMore,
              hasMoreData else { return }
        
        isLoadingMore = true
        currentPage += 1
        
        do {
            let moreTransactions = try await transactionService.fetchTransactions(
                for: investorId,
                limit: pageSize
            )
            
            // In a real implementation, you'd use offset or cursor-based pagination
            // For now, we'll simulate by not loading duplicates
            let newTransactions = moreTransactions.filter { newTx in
                !transactions.contains { $0.id == newTx.id }
            }
            
            self.transactions.append(contentsOf: newTransactions)
            self.hasMoreData = newTransactions.count == pageSize
            
            applyFilters()
            
        } catch {
            handleError(error)
        }
        
        isLoadingMore = false
    }
    
    func refreshTransactions(for investorId: UUID) async {
        guard !isLoading else { return }
        
        isLoading = true
        currentInvestorId = investorId
        currentPage = 0
        hasMoreData = true
        errorMessage = nil
        
        do {
            let refreshedTransactions = try await transactionService.fetchTransactions(
                for: investorId,
                limit: pageSize
            )
            
            self.transactions = refreshedTransactions
            self.hasMoreData = refreshedTransactions.count == pageSize
            
            applyFilters()
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func selectTransaction(_ transaction: Transaction) {
        selectedTransaction = transaction
    }
    
    func clearSelection() {
        selectedTransaction = nil
    }
    
    func updateFilter(_ filter: TransactionFilter) {
        selectedFilter = filter
        applyFilters()
    }
    
    func updateDateRange(_ dateRange: DateRange) {
        selectedDateRange = dateRange
        applyFilters()
    }
    
    // MARK: - Private Methods
    
    private func setupSubscriptions() {
        // Search text subscription
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] _ in
                self?.applyFilters()
            }
            .store(in: &cancellables)
    }
    
    private func setupRealtimeSubscription(for investorId: UUID) {
        transactionSubscription?.cancel()
        
        transactionSubscription = Task {
            for await newTransaction in transactionService.subscribeToTransactionUpdates(for: investorId) {
                await MainActor.run {
                    // Add new transaction at the beginning
                    self.transactions.insert(newTransaction, at: 0)
                    self.applyFilters()
                }
            }
        }
    }
    
    private func applyFilters() {
        var filtered = transactions
        
        // Apply type filter
        if selectedFilter != .all {
            filtered = filtered.filter { transaction in
                switch selectedFilter {
                case .deposits:
                    return transaction.type == .deposit
                case .withdrawals:
                    return transaction.type == .withdrawal
                case .yield: // Changed from interest
                    return transaction.type == .yield
                case .fees:
                    return transaction.type == .fee
                case .adjustments:
                    return transaction.type == .adjustment
                case .all:
                    return true
                }
            }
        }
        
        // Apply date range filter
        if selectedDateRange != .all {
            let cutoffDate = selectedDateRange.startDate
            filtered = filtered.filter { $0.date >= cutoffDate }
        }
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { transaction in
                transaction.description.localizedCaseInsensitiveContains(searchText) ||
                transaction.reference?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
        
        // Sort by date (newest first)
        filtered.sort { $0.date > $1.date }
        
        filteredTransactions = filtered
    }
    
    private func handleError(_ error: Error) {
        print("❌ Transaction error: \(error)")
        
        errorMessage = error.localizedDescription
        showError = true
        
        // Log error for analytics
        logError(error)
    }
    
    private func logError(_ error: Error) {
        let errorInfo = [
            "error": error.localizedDescription,
            "timestamp": Date().iso8601String,
            "investor_id": currentInvestorId?.uuidString ?? "unknown",
            "screen": "Transactions"
        ]
        
        print("📊 Error logged: \(errorInfo)")
    }
}

// MARK: - Supporting Types

enum TransactionFilter: String, CaseIterable {
    case all = "All"
    case deposits = "Deposits"
    case withdrawals = "Withdrawals"
    case yield = "Yield" // Changed from interest
    case fees = "Fees"
    case adjustments = "Adjustments"
    
    var systemImage: String {
        switch self {
        case .all: return "list.bullet"
        case .deposits: return "arrow.down.circle.fill"
        case .withdrawals: return "arrow.up.circle.fill"
        case .yield: return "percent"
        case .fees: return "dollarsign.circle.fill"
        case .adjustments: return "slider.horizontal.3"
        }
    }
    
    var color: Color {
        switch self {
        case .all: return .primary
        case .deposits: return .green
        case .withdrawals: return .red
        case .yield: return .blue
        case .fees: return .orange
        case .adjustments: return .purple
        }
    }
}

enum DateRange: String, CaseIterable {
    case all = "All Time"
    case today = "Today"
    case week = "Last Week"
    case month = "Last Month"
    case quarter = "Last Quarter"
    case year = "Last Year"
    
    var startDate: Date {
        let calendar = Calendar.current
        let now = Date()
        
        switch self {
        case .all:
            return Date.distantPast
        case .today:
            return calendar.startOfDay(for: now)
        case .week:
            return calendar.date(byAdding: .weekOfYear, value: -1, to: now) ?? now
        case .month:
            return calendar.date(byAdding: .month, value: -1, to: now) ?? now
        case .quarter:
            return calendar.date(byAdding: .month, value: -3, to: now) ?? now
        case .year:
            return calendar.date(byAdding: .year, value: -1, to: now) ?? now
        }
    }
}

// MARK: - Computed Properties

extension TransactionViewModel {
    var transactionSummary: TransactionSummary {
        let deposits = filteredTransactions
            .filter { $0.type == .deposit }
            .reduce(Decimal(0)) { $0 + $1.amount }
        
        let withdrawals = filteredTransactions
            .filter { $0.type == .withdrawal }
            .reduce(Decimal(0)) { $0 + $1.amount }
        
        let yield = filteredTransactions // Changed from interest
            .filter { $0.type == .yield }
            .reduce(Decimal(0)) { $0 + $1.amount }
        
        let fees = filteredTransactions
            .filter { $0.type == .fee }
            .reduce(Decimal(0)) { $0 + $1.amount }
        
        return TransactionSummary(
            totalDeposits: deposits,
            totalWithdrawals: withdrawals,
            totalYield: yield, // Changed from totalInterest
            totalFees: fees,
            netFlow: deposits + yield - withdrawals - fees
        )
    }
    
    var hasData: Bool {
        return !transactions.isEmpty
    }
    
    var isEmpty: Bool {
        return transactions.isEmpty && !isLoading
    }
    
    var canLoadMore: Bool {
        return hasMoreData && !isLoadingMore
    }
}

struct TransactionSummary {
    let totalDeposits: Decimal
    let totalWithdrawals: Decimal
    let totalYield: Decimal // Changed from totalInterest
    let totalFees: Decimal
    let netFlow: Decimal
    
    var formattedTotalDeposits: String {
        return totalDeposits.formatted(.currency(code: "USD"))
    }
    
    var formattedTotalWithdrawals: String {
        return totalWithdrawals.formatted(.currency(code: "USD"))
    }
    
    var formattedTotalYield: String { // Changed from formattedTotalInterest
        return totalYield.formatted(.currency(code: "USD"))
    }
    
    var formattedTotalFees: String {
        return totalFees.formatted(.currency(code: "USD"))
    }
    
    var formattedNetFlow: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.positivePrefix = "+"
        
        return formatter.string(from: netFlow as NSNumber) ?? "$0.00"
    }
    
    var netFlowColor: Color {
        return netFlow >= 0 ? .green : .red
    }
}

// MARK: - Mock Data for Previews

#if DEBUG
extension TransactionViewModel {
    static var preview: TransactionViewModel {
        let mockService = MockTransactionService()
        let viewModel = TransactionViewModel(transactionService: mockService)
        
        // Set up mock data
        let mockTransactions = Transaction.mockTransactions(for: UUID(), limit: 20)
        viewModel.transactions = mockTransactions
        viewModel.filteredTransactions = mockTransactions
        
        return viewModel
    }
}

private class MockTransactionService: TransactionServiceProtocol {
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction] {
        return Transaction.mockTransactions(for: investorId, limit: limit)
    }
    
    func createTransaction(_ transaction: Transaction) async throws {
        // Mock implementation
    }
    
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction> {
        return AsyncStream { _ in }
    }
}
#endif
