//
//  DashboardViewModel.swift
//  IndigoInvestor
//
//  Dashboard view model implementing MVVM pattern with proper state management
//

import Foundation
import SwiftUI
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var portfolio: Portfolio?
    @Published var recentTransactions: [Transaction] = []
    @Published var performanceData: [PerformanceData] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showError = false
    
    // MARK: - Dependencies
    // Services will be injected via ServiceLocator
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var portfolioSubscription: Task<Void, Never>?
    private var transactionSubscription: Task<Void, Never>?
    
    // MARK: - Initialization
    
    init() {
        // Services will be accessed via ServiceLocator.shared
        // setupSubscriptions()
    }
    
    deinit {
        portfolioSubscription?.cancel()
        transactionSubscription?.cancel()
    }
    
    // MARK: - Public Methods
    
    func loadData() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            guard let investorId = getCurrentInvestorId() else {
                throw DashboardError.userNotAuthenticated
            }
            
            // Load data concurrently
            async let portfolioTask = loadPortfolio(for: investorId)
            async let transactionsTask = loadRecentTransactions(for: investorId)
            
            let (portfolio, _) = try await (portfolioTask, transactionsTask)
            
            // Update UI on main thread
            self.portfolio = portfolio
            self.recentTransactions = [] // TODO: Fix when transactions are available
            self.performanceData = portfolio?.performanceHistory ?? []
            
            // Setup real-time subscriptions
            setupRealtimeSubscriptions(for: investorId)
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        guard !isRefreshing else { return }
        
        isRefreshing = true
        errorMessage = nil
        
        do {
            guard let investorId = getCurrentInvestorId() else {
                throw DashboardError.userNotAuthenticated
            }
            
            // Force refresh from network
            // TODO: Implement when services are connected
            // let portfolio = try await portfolioService.refreshPortfolioData(for: investorId)
            // let transactions = try await transactionService.fetchRecentTransactions(for: investorId)
            
            // Update UI
            // TODO: Implement when services are connected
            // self.portfolio = portfolio
            // self.recentTransactions = transactions  
            // self.performanceData = portfolio?.performanceHistory ?? []
            
        } catch {
            handleError(error)
        }
        
        isRefreshing = false
    }
    
    func loadPerformanceData(for timeRange: DashboardView.TimeRange) async {
        guard let currentPortfolio = portfolio else { return }
        
        // Filter performance data based on time range
        let filteredData = filterPerformanceData(currentPortfolio.performanceHistory, for: timeRange)
        
        await MainActor.run {
            self.performanceData = filteredData
        }
    }
    
    // MARK: - Private Methods
    
    private func setupSubscriptions() {
        // Listen for authentication changes
        // TODO: Connect to auth view model
        /*authViewModel.$isAuthenticated
            .sink { [weak self] isAuthenticated in
                if isAuthenticated {
                    Task {
                        await self?.loadData()
                    }
                } else {
                    self?.clearData()
                }
            }
            .store(in: &cancellables)*/
    }
    
    private func setupRealtimeSubscriptions(for investorId: UUID) {
        // Cancel existing subscriptions
        portfolioSubscription?.cancel()
        transactionSubscription?.cancel()
        
        // TODO: Implement real-time subscriptions when services are available
        /*
        // Portfolio updates subscription
        portfolioSubscription = Task {
            let portfolioService = ServiceLocator.shared.portfolioService
            for await updatedPortfolio in portfolioService.subscribeToPortfolioUpdates(investorId: investorId) {
                await MainActor.run {
                    self.portfolio = updatedPortfolio
                    self.performanceData = updatedPortfolio.performanceHistory
                }
            }
        }
        
        // Transaction updates subscription
        transactionSubscription = Task {
            let transactionService = ServiceLocator.shared.transactionService
            for await newTransaction in transactionService.subscribeToTransactionUpdates(for: investorId) {
                await MainActor.run {
                    // Add new transaction to the beginning of the list
                    self.recentTransactions.insert(newTransaction, at: 0)
                    
                    // Keep only the most recent 10 transactions
                    if self.recentTransactions.count > 10 {
                        self.recentTransactions = Array(self.recentTransactions.prefix(10))
                    }
                }
            }
        }
        */
    }
    
    private func loadPortfolio(for investorId: UUID) async throws -> Portfolio? {
        // TODO: Implement when services are connected
        // let portfolioService = ServiceLocator.shared.portfolioService
        // return try await portfolioService.fetchPortfolio(for: investorId)
        return nil
    }
    
    private func loadRecentTransactions(for investorId: UUID) async throws -> [Transaction] {
        // TODO: Implement when services are connected
        // let transactionService = ServiceLocator.shared.transactionService
        // return try await transactionService.fetchRecentTransactions(for: investorId)
        return []
    }
    
    private func getCurrentInvestorId() -> UUID? {
        // Get investor ID from authenticated user
        // TODO: Connect to auth service
        return nil // authViewModel.user?.id
    }
    
    private func filterPerformanceData(_ data: [PerformanceData], for timeRange: DashboardView.TimeRange) -> [PerformanceData] {
        let calendar = Calendar.current
        let now = Date()
        
        let cutoffDate: Date
        switch timeRange {
        case .day:
            cutoffDate = calendar.date(byAdding: .day, value: -1, to: now) ?? now
        case .week:
            cutoffDate = calendar.date(byAdding: .weekOfYear, value: -1, to: now) ?? now
        case .month:
            cutoffDate = calendar.date(byAdding: .month, value: -1, to: now) ?? now
        case .threeMonths:
            cutoffDate = calendar.date(byAdding: .month, value: -3, to: now) ?? now
        case .year:
            cutoffDate = calendar.date(byAdding: .year, value: -1, to: now) ?? now
        case .all:
            return data // Return all data
        }
        
        return data.filter { $0.date >= cutoffDate }
    }
    
    private func handleError(_ error: Error) {
        print("❌ Dashboard error: \(error)")
        
        errorMessage = error.localizedDescription
        showError = true
        
        // Log error for analytics/debugging
        logError(error)
    }
    
    private func logError(_ error: Error) {
        // In production, you would send this to your analytics service
        let errorInfo = [
            "error": error.localizedDescription,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "user_id": "unknown", // authViewModel.user?.id.uuidString ?? "unknown",
            "screen": "Dashboard"
        ]
        
        print("📊 Error logged: \(errorInfo)")
    }
    
    private func clearData() {
        portfolio = nil
        recentTransactions = []
        performanceData = []
        errorMessage = nil
        
        // Cancel subscriptions
        portfolioSubscription?.cancel()
        transactionSubscription?.cancel()
    }
}

// MARK: - Computed Properties

extension DashboardViewModel {
    var portfolioValueFormatted: String {
        return portfolio?.formattedTotalValue ?? "$0.00"
    }
    
    var dayChangeFormatted: String {
        return portfolio?.formattedDayChange ?? "$0.00"
    }
    
    var dayChangeColor: Color {
        guard let portfolio = portfolio else { return .primary }
        return portfolio.dayChange >= 0 ? .green : .red
    }
    
    var hasData: Bool {
        return portfolio != nil && !recentTransactions.isEmpty
    }
    
    var isEmpty: Bool {
        return portfolio == nil && recentTransactions.isEmpty && !isLoading
    }
}

// MARK: - Dashboard Errors

enum DashboardError: LocalizedError {
    case userNotAuthenticated
    case dataLoadFailed(Error)
    case networkUnavailable
    
    var errorDescription: String? {
        switch self {
        case .userNotAuthenticated:
            return "User is not authenticated"
        case .dataLoadFailed(let error):
            return "Failed to load dashboard data: \(error.localizedDescription)"
        case .networkUnavailable:
            return "Network is unavailable. Please check your connection."
        }
    }
}

// MARK: - Mock Data for Previews

#if DEBUG
/*
extension DashboardViewModel {
    static var preview: DashboardViewModel {
        // Create mock services for SwiftUI previews
        let mockPortfolioService = MockPortfolioService()
        let mockTransactionService = MockTransactionService()
        let mockAuthViewModel = AuthViewModel()
        
        let viewModel = DashboardViewModel(
            portfolioService: mockPortfolioService,
            transactionService: mockTransactionService,
            authViewModel: mockAuthViewModel
        )
        
        // Set up mock data
        viewModel.portfolio = Portfolio.mockPortfolio(for: UUID())
        viewModel.recentTransactions = Transaction.mockTransactions(for: UUID(), limit: 5)
        viewModel.performanceData = viewModel.portfolio?.performanceHistory ?? []
        
        return viewModel
    }
}

// Mock services for previews
private class MockPortfolioService: PortfolioServiceProtocol {
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        return Portfolio.mockPortfolio(for: investorId)
    }
    
    func subscribeToPortfolioUpdates(investorId: UUID) -> AsyncStream<Portfolio> {
        return AsyncStream { _ in }
    }
    
    func refreshPortfolioData(for investorId: UUID) async throws -> Portfolio {
        return Portfolio.mockPortfolio(for: investorId)
    }
}

private class MockTransactionService: TransactionServiceProtocol {
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction] {
        return Transaction.mockTransactions(for: investorId, limit: limit)
    }
    
    func fetchTransaction(id: UUID) async throws -> Transaction {
        return Transaction.mockTransaction(id: id)
    }
    
    func fetchRecentTransactions(for investorId: UUID) async throws -> [Transaction] {
        return Transaction.mockTransactions(for: investorId, limit: 5)
    }
    
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction> {
        return AsyncStream { _ in }
    }
}
*/
#endif
