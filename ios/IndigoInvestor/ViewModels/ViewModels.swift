import Foundation
import Combine
import SwiftUI

// MARK: - TransactionViewModel

class TransactionViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var filteredTransactions: [Transaction] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedFilter: Transaction.TransactionType?
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
        $transactions
            .combineLatest($selectedFilter, $searchText)
            .map { [weak self] transactions, filter, search -> [Transaction] in
                var filtered = transactions
                
                if let filter = filter {
                    filtered = filtered.filter { transaction in
                        transaction.type.rawValue == filter.rawValue
                    }
                }
                
                if !search.isEmpty {
                    filtered = filtered.filter { transaction in
                        transaction.type.rawValue.localizedCaseInsensitiveContains(search) ||
                        String(describing: transaction.amount).contains(search)
                    }
                }
                
                return filtered
            }
            .sink { [weak self] filtered in
                self?.filteredTransactions = filtered
            }
            .store(in: &cancellables)
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
                // TODO: Calculate AUM when InvestorProfile has portfolio property
                self?.totalAUM = 0
            }
            .store(in: &cancellables)
        
        adminService.$pendingWithdrawals
            .sink { [weak self] withdrawals in
                self?.pendingWithdrawals = withdrawals
                self?.pendingWithdrawalCount = withdrawals.filter { $0.status == .pending }.count
            }
            .store(in: &cancellables)
        
        adminService.$isLoading
            .sink { [weak self] loading in
                self?.isLoading = loading
            }
            .store(in: &cancellables)
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
