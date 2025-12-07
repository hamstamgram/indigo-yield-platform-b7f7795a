//
//  BusinessServices.swift
//  IndigoInvestor
//
//  High-level business services
//  Refactored to use shared models and correct table names
//

import Foundation
import Supabase
import Combine

// MARK: - Portfolio Service

class PortfolioService {
    private let repository: PortfolioRepositoryProtocol
    private let realtimeService: RealtimeService
    
    @Published var currentPortfolio: Portfolio?
    @Published var portfolio: Portfolio? // Alias for currentPortfolio to match ViewModels
    
    init(repository: PortfolioRepositoryProtocol, realtimeService: RealtimeService) {
        self.repository = repository
        self.realtimeService = realtimeService
        
        // Bind portfolio to currentPortfolio
        $currentPortfolio
            .assign(to: &$portfolio)
    }
    
    func loadPortfolio(for userId: String) async throws {
        guard let userUUID = UUID(uuidString: userId) else {
            throw AppError.invalidUserId
        }
        
        currentPortfolio = try await repository.fetchPortfolio(for: userUUID)
        
        // Subscribe to real-time updates
        realtimeService.subscribeToChannel("portfolios:\(userId)") { [weak self] event in
            // Handle portfolio updates
            Task { @MainActor in
                if let self = self {
                    self.currentPortfolio = try await self.repository.fetchPortfolio(for: userUUID)
                }
            }
        }
    }
    
    func fetchPortfolio() async throws {
        // Helper for ViewModels that might not pass ID directly (if ServiceLocator handles current user)
        // This assumes ServiceLocator/AuthService provides the ID context,
        // but here we might need to rely on the previously loaded ID or throw.
        // For now, we expect loadPortfolio to be called first.
        if let current = currentPortfolio {
            // Already loaded
            return
        }
        // If not loaded, we can't fetch without ID. 
        // ViewModels should call loadPortfolio(userId)
    }
    
    func refreshPortfolio(for userId: String? = nil) async throws {
        guard let idString = userId ?? currentPortfolio?.investorId.uuidString,
              let userUUID = UUID(uuidString: idString) else {
            return
        }
        currentPortfolio = try await repository.fetchPortfolio(for: userUUID)
    }
}

// MARK: - Transaction Service

class TransactionService {
    private let client: SupabaseClient
    @Published var transactions: [Transaction] = []
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func loadTransactions(for userId: String, limit: Int = 50) async throws {
        let response = try await client.database
            .from("transactions_v2")
            .select()
            .eq("investor_id", value: userId)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        transactions = try decoder.decode([Transaction].self, from: response.data)
    }
    
    func createTransaction(_ transaction: Transaction) async throws {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        let data = try encoder.encode(transaction)
        
        _ = try await client.database
            .from("transactions_v2")
            .insert(data)
            .execute()
        
        // Reload transactions
        try await loadTransactions(for: transaction.investorId.uuidString)
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
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([Document].self, from: response.data)
    }
    
    func uploadDocument(data: Data, metadata: DocumentMetadata) async throws -> Document {
        // Upload to storage
        let path = "documents/\(metadata.userId)/\(UUID().uuidString)"
        let storagePath = try await storageService.uploadDocument(data: data, path: path)
        
        // Create database record
        // Note: Assuming 'documents' table structure matches the Document model
        // We might need a specific DTO if the table columns differ from the model
        
        let documentId = UUID()
        let now = Date()
        
        let document = Document(
            id: documentId,
            investorId: UUID(uuidString: metadata.userId) ?? UUID(),
            name: metadata.title,
            type: .other, // Defaulting or mapping needed
            url: storagePath, // Storing path in url field for now
            createdAt: now,
            size: Int64(data.count)
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        let insertData = try encoder.encode(document)
        
        try await client.database
            .from("documents")
            .insert(insertData)
            .execute()
        
        return document
    }
    
    func getDocumentUrl(for document: Document) async throws -> URL {
        return try await storageService.getSignedUrl(path: document.url)
    }
}

// MARK: - Withdrawal Service

class WithdrawalService {
    private let client: SupabaseClient
    @Published var withdrawals: [WithdrawalRequest] = []
    @Published var pendingWithdrawal: WithdrawalRequest?
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func loadWithdrawals(for userId: String) async throws {
        let response = try await client.database
            .from("withdrawal_requests")
            .select()
            .eq("investor_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        withdrawals = try decoder.decode([WithdrawalRequest].self, from: response.data)
        pendingWithdrawal = withdrawals.first { $0.status == .pending }
    }
    
    func requestWithdrawal(amount: Double, userId: String) async throws {
        let withdrawal = WithdrawalRequest(
            id: UUID(),
            amount: Decimal(amount),
            status: .pending,
            requestedAt: Date(),
            processedAt: nil
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        // Note: We might need a DTO if WithdrawalRequest structure doesn't match insert payload exactly
        // (e.g. investor_id field)
        struct WithdrawalInsert: Codable {
            let id: UUID
            let investor_id: UUID
            let amount: Decimal
            let status: String
            let created_at: Date
        }
        
        let insertData = WithdrawalInsert(
            id: withdrawal.id,
            investor_id: UUID(uuidString: userId) ?? UUID(),
            amount: withdrawal.amount,
            status: withdrawal.status.rawValue,
            created_at: withdrawal.requestedAt
        )
        
        let data = try encoder.encode(insertData)
        
        _ = try await client.database
            .from("withdrawal_requests")
            .insert(data)
            .execute()
        
        // Reload withdrawals
        try await loadWithdrawals(for: userId)
    }
}

// MARK: - Supporting Models

struct DocumentMetadata {
    let userId: String
    let title: String
    let type: String
}

enum AppError: Error {
    case invalidUserId
}
