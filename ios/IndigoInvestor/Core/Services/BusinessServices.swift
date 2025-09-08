//
//  BusinessServices.swift
//  IndigoInvestor
//
//  High-level business services
//

import Foundation
import Supabase
import Combine

// MARK: - Portfolio Service

class PortfolioService {
    private let repository: PortfolioRepository
    private let realtimeService: RealtimeService
    @Published var currentPortfolio: Portfolio?
    
    init(repository: PortfolioRepository, realtimeService: RealtimeService) {
        self.repository = repository
        self.realtimeService = realtimeService
    }
    
    func loadPortfolio(for userId: String) async throws {
        currentPortfolio = try await repository.fetchPortfolio(for: userId)
        
        // Subscribe to real-time updates
        realtimeService.subscribeToChannel("portfolios:\(userId)") { [weak self] event in
            // Handle portfolio updates
            Task { @MainActor in
                self?.currentPortfolio = try await self?.repository.fetchPortfolio(for: userId)
            }
        }
    }
    
    func refreshPortfolio(for userId: String) async throws {
        currentPortfolio = try await repository.fetchPortfolio(for: userId)
    }
}

// MARK: - Transaction Service

class TransactionService {
    private let repository: TransactionRepository
    @Published var transactions: [Transaction] = []
    
    init(repository: TransactionRepository) {
        self.repository = repository
    }
    
    func loadTransactions(for userId: String) async throws {
        transactions = try await repository.fetchTransactions(for: userId)
    }
    
    func createTransaction(_ transaction: Transaction) async throws {
        try await repository.createTransaction(transaction)
        // Reload transactions
        transactions = try await repository.fetchTransactions(for: transaction.investor_id)
    }
}

// MARK: - Document Service

class DocumentService {
    private let client: SupabaseClient
    private let storageService: StorageService
    
    init(client: SupabaseClient, storageService: StorageService) {
        self.client = client
        self.storageService = storageService
    }
    
    func fetchDocuments(for userId: String) async throws -> [Document] {
        let response = try await client.database
            .from("documents")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
        
        return try JSONDecoder().decode([Document].self, from: response.data)
    }
    
    func uploadDocument(data: Data, metadata: DocumentMetadata) async throws -> Document {
        // Upload to storage
        let path = "documents/\(metadata.userId)/\(UUID().uuidString)"
        let storagePath = try await storageService.uploadDocument(data: data, path: path)
        
        // Create database record
        let document = Document(
            id: UUID().uuidString,
            user_id: metadata.userId,
            title: metadata.title,
            type: metadata.type,
            storage_path: storagePath,
            file_size: data.count,
            created_at: Date()
        )
        
        try await client.database
            .from("documents")
            .insert(document)
            .execute()
        
        return document
    }
    
    func getDocumentUrl(for document: Document) async throws -> URL {
        return try await storageService.getSignedUrl(path: document.storage_path)
    }
}

// MARK: - Withdrawal Service

class WithdrawalService {
    private let repository: WithdrawalRepository
    @Published var withdrawals: [Withdrawal] = []
    @Published var pendingWithdrawal: Withdrawal?
    
    init(repository: WithdrawalRepository) {
        self.repository = repository
    }
    
    func loadWithdrawals(for userId: String) async throws {
        withdrawals = try await repository.fetchWithdrawals(for: userId)
        pendingWithdrawal = withdrawals.first { $0.status == "pending" }
    }
    
    func requestWithdrawal(amount: Double, userId: String) async throws {
        let withdrawal = Withdrawal(
            id: UUID().uuidString,
            investor_id: userId,
            amount: amount,
            status: "pending",
            created_at: Date()
        )
        
        try await repository.createWithdrawal(withdrawal)
        // Reload withdrawals
        try await loadWithdrawals(for: userId)
    }
}

// MARK: - Admin Service

class AdminService {
    private let client: SupabaseClient
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func fetchAllInvestors() async throws -> [InvestorProfile] {
        let response = try await client.database
            .from("profiles")
            .select()
            .eq("role", value: "investor")
            .execute()
        
        return try JSONDecoder().decode([InvestorProfile].self, from: response.data)
    }
    
    func approveWithdrawal(withdrawalId: String) async throws {
        try await client.database
            .from("withdrawal_requests")
            .update(["status": "approved", "approved_at": Date().ISO8601Format()])
            .eq("id", value: withdrawalId)
            .execute()
    }
    
    func rejectWithdrawal(withdrawalId: String, reason: String) async throws {
        try await client.database
            .from("withdrawal_requests")
            .update([
                "status": "rejected",
                "rejection_reason": reason,
                "rejected_at": Date().ISO8601Format()
            ])
            .eq("id", value: withdrawalId)
            .execute()
    }
    
    func uploadStatement(for userId: String, data: Data, period: DateInterval) async throws {
        // Upload PDF to storage
        let path = "statements/\(userId)/\(UUID().uuidString).pdf"
        let storageService = StorageService(client: client)
        let storagePath = try await storageService.uploadDocument(data: data, path: path)
        
        // Create statement record
        let statement = [
            "investor_id": userId,
            "period_start": period.start.ISO8601Format(),
            "period_end": period.end.ISO8601Format(),
            "file_path": storagePath,
            "created_at": Date().ISO8601Format()
        ]
        
        try await client.database
            .from("statements")
            .insert(statement)
            .execute()
    }
}

// MARK: - Supporting Models

struct Document: Codable {
    let id: String
    let user_id: String
    let title: String
    let type: String
    let storage_path: String
    let file_size: Int
    let created_at: Date
}

struct DocumentMetadata {
    let userId: String
    let title: String
    let type: String
}

struct InvestorProfile: Codable {
    let id: String
    let email: String
    let full_name: String
    let role: String
    let created_at: Date
    let kyc_status: String?
    let total_invested: Double?
    let current_balance: Double?
}
