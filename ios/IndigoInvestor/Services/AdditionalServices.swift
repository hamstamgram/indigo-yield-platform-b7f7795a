import Foundation
import Combine
import Supabase

// MARK: - Unified Application Services
// Used by ViewModels to access data repositories

// MARK: - TransactionService

@MainActor
class TransactionService: ObservableObject, TransactionServiceProtocol {
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let repository: TransactionRepository
    
    init(repository: TransactionRepository) {
        self.repository = repository
    }
    
    func fetchTransactions(for investorId: UUID, limit: Int = 50) async throws -> [Transaction] {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            // Using uuidString for now as repository might expect String or UUID depending on implementation
            // We updated repository to expect String in previous step?
            // TransactionRepositoryImpl.fetchTransactions(for: String)
            let items = try await repository.fetchTransactions(for: investorId.uuidString)
            let result = Array(items.prefix(limit))
            self.transactions = result
            return result
        } catch {
            self.error = error.localizedDescription
            print("Error fetching transactions: \(error)")
            throw error
        }
    }
    
    func createTransaction(_ transaction: Transaction) async throws {
        isLoading = true
        defer { isLoading = false }
        
        do {
            try await repository.createTransaction(transaction)
            // Refresh list
            let _ = try await fetchTransactions(for: transaction.investorId)
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction> {
        // Placeholder for realtime updates
        return AsyncStream { _ in }
    }
}

// MARK: - DocumentService

@MainActor
class DocumentService: ObservableObject, DocumentServiceProtocol {
    @Published var statements: [Statement] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let repository: StatementRepository
    private let storageService: StorageService
    
    init(repository: StatementRepository, storageService: StorageService) {
        self.repository = repository
        self.storageService = storageService
    }
    
    func fetchStatements(for userId: UUID) async throws -> [Statement] {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            let items = try await repository.fetchStatements(for: userId.uuidString)
            self.statements = items
            return items
        } catch {
            self.error = error.localizedDescription
            print("Error fetching statements: \(error)")
            throw error
        }
    }
    
    func getSignedUrl(for statement: Statement) async throws -> URL {
        return try await storageService.createSignedUrl(path: statement.fileName, bucket: "statements", expiresIn: 3600)
    }
}

// MARK: - WithdrawalService

@MainActor
class WithdrawalService: ObservableObject, WithdrawalServiceProtocol {
    @Published var withdrawalRequests: [WithdrawalRequest] = []
    @Published var isProcessing = false
    @Published var error: String?
    
    private let repository: WithdrawalRepository
    
    init(repository: WithdrawalRepository) {
        self.repository = repository
    }
    
    func fetchWithdrawalRequests(for userId: UUID) async throws -> [WithdrawalRequest] {
        do {
            let items = try await repository.fetchWithdrawals(for: userId.uuidString)
            self.withdrawalRequests = items
            return items
        } catch {
            self.error = error.localizedDescription
            print("Error fetching withdrawals: \(error)")
            throw error
        }
    }
    
    func requestWithdrawal(amount: Decimal, bankAccountId: UUID, userId: UUID) async throws {
        isProcessing = true
        defer { isProcessing = false }
        
        let withdrawal = WithdrawalRequest(
            id: UUID(),
            amount: amount,
            status: .pending,
            requestedAt: Date(),
            processedAt: nil
        )
        
        do {
            try await repository.createWithdrawal(withdrawal)
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
}

// MARK: - AdminService

class AdminService: ObservableObject {
    @Published var investors: [InvestorProfile] = []
    @Published var pendingWithdrawals: [WithdrawalRequest] = []
    @Published var isLoading = false
    
    private let supabase: SupabaseClient
    
    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }
    
    func fetchAllInvestors() async throws {
        // ...
    }
    // ... (rest of AdminService)
}