import Foundation
import Combine
import SwiftUI

// MARK: - PortfolioViewModel

class PortfolioViewModel: ObservableObject {
    @Published var portfolio: Portfolio?
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedTimeRange: TimePeriod = .month
    @Published var performanceData: [PerformanceDataPoint] = []
    
    private let portfolioService: PortfolioService
    private let transactionService: TransactionService
    private var cancellables = Set<AnyCancellable>()
    
    init(portfolioService: PortfolioService, transactionService: TransactionService) {
        self.portfolioService = portfolioService
        self.transactionService = transactionService
        
        // Subscribe to portfolio updates
        portfolioService.$portfolio
            .assign(to: &$portfolio)
        
        portfolioService.$isLoading
            .assign(to: &$isLoading)
        
        portfolioService.$error
            .assign(to: &$error)
    }
    
    func loadPortfolio() {
        Task {
            await portfolioService.fetchPortfolio()
            await loadPerformanceData()
        }
    }
    
    func refreshPortfolio() {
        Task {
            await portfolioService.refreshPortfolio()
            await loadPerformanceData()
        }
    }
    
    func loadPerformanceData() async {
        do {
            let data = try await portfolioService.getPerformanceData(for: selectedTimeRange)
            await MainActor.run {
                self.performanceData = data
            }
        } catch {
            await MainActor.run {
                self.error = error
            }
        }
    }
    
    func subscribeToUpdates() {
        portfolioService.subscribeToUpdates()
    }
    
    func unsubscribeFromUpdates() {
        portfolioService.unsubscribeFromUpdates()
    }
}

// MARK: - TransactionViewModel

class TransactionViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var filteredTransactions: [Transaction] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedFilter: TransactionType?
    @Published var searchText = ""
    
    private let transactionService: TransactionService
    private var cancellables = Set<AnyCancellable>()
    
    init(transactionService: TransactionService) {
        self.transactionService = transactionService
        
        // Subscribe to service updates
        transactionService.$transactions
            .assign(to: &$transactions)
        
        transactionService.$isLoading
            .assign(to: &$isLoading)
        
        // Setup filtering
        Publishers.CombineLatest3($transactions, $selectedFilter, $searchText)
            .map { transactions, filter, search in
                var filtered = transactions
                
                if let filter = filter {
                    filtered = filtered.filter { $0.type == filter }
                }
                
                if !search.isEmpty {
                    filtered = filtered.filter { transaction in
                        transaction.type.rawValue.localizedCaseInsensitiveContains(search) ||
                        String(transaction.amount).contains(search)
                    }
                }
                
                return filtered
            }
            .assign(to: &$filteredTransactions)
    }
    
    func loadTransactions() {
        Task {
            do {
                try await transactionService.fetchTransactions()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func refreshTransactions() {
        Task {
            do {
                try await transactionService.fetchTransactions(limit: 100)
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
}

// MARK: - AdminDashboardViewModel

class AdminDashboardViewModel: ObservableObject {
    @Published var investors: [InvestorProfile] = []
    @Published var pendingWithdrawals: [WithdrawalRequest] = []
    @Published var totalAUM: Double = 0
    @Published var totalInvestors: Int = 0
    @Published var pendingWithdrawalCount: Int = 0
    @Published var isLoading = false
    @Published var error: Error?
    
    private let adminService: AdminService
    private var cancellables = Set<AnyCancellable>()
    
    init(adminService: AdminService) {
        self.adminService = adminService
        
        // Subscribe to admin service updates
        adminService.$investors
            .sink { [weak self] investors in
                self?.investors = investors
                self?.totalInvestors = investors.count
                self?.totalAUM = investors.reduce(0) { $0 + ($1.portfolio?.currentBalance ?? 0) }
            }
            .store(in: &cancellables)
        
        adminService.$pendingWithdrawals
            .sink { [weak self] withdrawals in
                self?.pendingWithdrawals = withdrawals
                self?.pendingWithdrawalCount = withdrawals.filter { $0.status == .pending }.count
            }
            .store(in: &cancellables)
        
        adminService.$isLoading
            .assign(to: &$isLoading)
    }
    
    func loadDashboard() {
        Task {
            do {
                try await adminService.fetchAllInvestors()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func approveWithdrawal(_ withdrawalId: UUID) {
        Task {
            do {
                try await adminService.approveWithdrawal(withdrawalId)
                // Refresh data
                await loadDashboard()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func processDeposit(for investorId: UUID, amount: Double) {
        Task {
            do {
                try await adminService.processDeposit(investorId: investorId, amount: amount)
                // Refresh data
                await loadDashboard()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func processInterestPayment(for investorId: UUID, amount: Double, apy: Double) {
        Task {
            do {
                try await adminService.processInterestPayment(
                    investorId: investorId,
                    amount: amount,
                    apy: apy
                )
                // Refresh data
                await loadDashboard()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
}

// MARK: - WithdrawalViewModel

class WithdrawalViewModel: ObservableObject {
    @Published var withdrawalRequests: [WithdrawalRequest] = []
    @Published var withdrawalAmount = ""
    @Published var selectedBankAccount: BankAccount?
    @Published var bankAccounts: [BankAccount] = []
    @Published var isProcessing = false
    @Published var error: Error?
    @Published var showConfirmation = false
    
    private let withdrawalService: WithdrawalService
    private var cancellables = Set<AnyCancellable>()
    
    init(withdrawalService: WithdrawalService) {
        self.withdrawalService = withdrawalService
        
        // Subscribe to service updates
        withdrawalService.$withdrawalRequests
            .assign(to: &$withdrawalRequests)
        
        withdrawalService.$isProcessing
            .assign(to: &$isProcessing)
    }
    
    func loadWithdrawalHistory() {
        Task {
            do {
                try await withdrawalService.fetchWithdrawalRequests()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func requestWithdrawal() {
        guard let amount = Double(withdrawalAmount),
              amount > 0,
              let bankAccount = selectedBankAccount else {
            error = WithdrawalError.invalidInput
            return
        }
        
        Task {
            do {
                try await withdrawalService.requestWithdrawal(
                    amount: amount,
                    bankAccountId: bankAccount.id
                )
                
                await MainActor.run {
                    self.withdrawalAmount = ""
                    self.showConfirmation = true
                }
                
                // Refresh withdrawal history
                await loadWithdrawalHistory()
            } catch {
                await MainActor.run {
                    self.error = error
                }
            }
        }
    }
    
    func canRequestWithdrawal(portfolioBalance: Double) -> Bool {
        guard let amount = Double(withdrawalAmount), amount > 0 else {
            return false
        }
        
        return amount <= portfolioBalance && selectedBankAccount != nil
    }
}

// MARK: - Supporting Types

struct BankAccount: Identifiable {
    let id: UUID
    let accountName: String
    let accountNumber: String
    let bankName: String
    let isVerified: Bool
}

enum WithdrawalError: LocalizedError {
    case invalidInput
    case insufficientFunds
    case accountNotVerified
    
    var errorDescription: String? {
        switch self {
        case .invalidInput:
            return "Please enter a valid withdrawal amount and select a bank account"
        case .insufficientFunds:
            return "Insufficient funds in your portfolio"
        case .accountNotVerified:
            return "Please verify your bank account before requesting a withdrawal"
        }
    }
}
