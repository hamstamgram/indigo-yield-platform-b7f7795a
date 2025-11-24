//
//  Services.swift
//  IndigoInvestor
//
//  Core services for the application
//

import Foundation
import Supabase
import Combine
import CoreData

// MARK: - Storage Service

class StorageService {
    private let client: SupabaseClient
    private let bucketName = "documents"
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func uploadDocument(data: Data, path: String) async throws -> String {
        let response = try await client.storage
            .from(bucketName)
            .upload(path: path, data: data)
        
        return response
    }
    
    func downloadDocument(path: String) async throws -> Data {
        let data = try await client.storage
            .from(bucketName)
            .download(path: path)
        
        return data
    }
    
    func createSignedUrl(path: String, bucket: String, expiresIn: Int = 3600) async throws -> URL {
        let url = try await client.storage
            .from(bucket)
            .createSignedURL(path: path, expiresIn: expiresIn)
        
        return url
    }
    
    func deleteDocument(path: String) async throws {
        try await client.storage
            .from(bucketName)
            .remove(paths: [path])
    }
}

// MARK: - Realtime Service

class RealtimeService {
    private let client: SupabaseClient
    private var channels: [String: RealtimeChannel] = [:]
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func subscribeToChannel(_ channelName: String, callback: @escaping (Any) -> Void) {
        let channel = client.channel(channelName)
        channel.on(.all) { message in
            callback(message)
        }
        channel.subscribe()
        channels[channelName] = channel
    }
    
    func unsubscribeFromChannel(_ channelName: String) {
        if let channel = channels[channelName] {
            channel.unsubscribe()
            channels.removeValue(forKey: channelName)
        }
    }
    
    func unsubscribeAll() {
        channels.values.forEach { $0.unsubscribe() }
        channels.removeAll()
    }
}

// MARK: - Offline Manager

class OfflineManager {
    private let coreDataStack: CoreDataStack
    private var syncQueue: [SyncOperation] = []
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
    }
    
    func saveForOffline<T: Codable>(_ data: T, type: String, id: String) {
        // Save to Core Data for offline access
        let context = coreDataStack.context
        // Implementation would save to Core Data
    }
    
    func loadOfflineData<T: Codable>(type: String, as: T.Type) -> [T] {
        // Load from Core Data
        return []
    }
    
    func syncPendingOperations() async throws {
        // Sync pending operations when online
        for operation in syncQueue {
            try await operation.execute()
        }
        syncQueue.removeAll()
    }
    
    func addSyncOperation(_ operation: SyncOperation) {
        syncQueue.append(operation)
    }
}

struct SyncOperation {
    let id: UUID = UUID()
    let type: String
    let data: Data
    let timestamp: Date = Date()
    
    func execute() async throws {
        // Execute sync operation
    }
}

// MARK: - Core Data Stack

class CoreDataStack {
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "IndigoInvestor")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data failed to load: \(error)")
            }
        }
        return container
    }()
    
    var context: NSManagedObjectContext {
        persistentContainer.viewContext
    }
    
    func save() throws {
        if context.hasChanges {
            try context.save()
        }
    }
}

// MARK: - Certificate Pinning Delegate

class CertificatePinningDelegate: NSObject, URLSessionDelegate {
    private let pinnedCertificates: [String] = [
        // Add your certificate hashes here
        "sha256/YourSupabaseCertificateHashHere"
    ]
    
    func urlSession(_ session: URLSession, 
                   didReceive challenge: URLAuthenticationChallenge,
                   completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        // Implement certificate pinning logic
        // For now, accept the certificate
        let credential = URLCredential(trust: serverTrust)
        completionHandler(.useCredential, credential)
    }
}

// MARK: - Repository Protocols Implementation

protocol PortfolioRepository {
    func fetchPortfolio(for userId: String) async throws -> Portfolio
    func updatePortfolio(_ portfolio: Portfolio) async throws
}

class PortfolioRepositoryImpl: PortfolioRepository {
    private let client: SupabaseClient
    private let coreDataStack: CoreDataStack
    private let offlineManager: OfflineManager
    
    init(client: SupabaseClient, coreDataStack: CoreDataStack, offlineManager: OfflineManager) {
        self.client = client
        self.coreDataStack = coreDataStack
        self.offlineManager = offlineManager
    }
    
    func fetchPortfolio(for userId: String) async throws -> Portfolio {
        // Fetch from Supabase
        let response = try await client.database
            .from("portfolios")
            .select()
            .eq("user_id", value: userId)
            .single()
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let portfolio = try decoder.decode(Portfolio.self, from: response.data)
        
        // Cache for offline
        offlineManager.saveForOffline(portfolio, type: "portfolio", id: userId)
        
        return portfolio
    }
    
    func updatePortfolio(_ portfolio: Portfolio) async throws {
        // Note: Update might require an Encodable struct that matches DB schema (snake_case)
        // Assuming Portfolio encodes to matching keys or using a DTO
        try await client.database
            .from("portfolios")
            .update(portfolio)
            .eq("id", value: portfolio.id)
            .execute()
    }
}

protocol TransactionRepository {
    func fetchTransactions(for userId: String) async throws -> [Transaction]
    func createTransaction(_ transaction: Transaction) async throws
}

class TransactionRepositoryImpl: TransactionRepository {
    private let client: SupabaseClient
    private let coreDataStack: CoreDataStack
    private let offlineManager: OfflineManager
    
    init(client: SupabaseClient, coreDataStack: CoreDataStack, offlineManager: OfflineManager) {
        self.client = client
        self.coreDataStack = coreDataStack
        self.offlineManager = offlineManager
    }
    
    func fetchTransactions(for userId: String) async throws -> [Transaction] {
        let response = try await client.database
            .from("transactions")
            .select()
            .eq("investor_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([Transaction].self, from: response.data)
    }
    
    func createTransaction(_ transaction: Transaction) async throws {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        try await client.database
            .from("transactions")
            .insert(transaction, encoder: encoder)
            .execute()
    }
}

protocol StatementRepository {
    func fetchStatements(for userId: String) async throws -> [Statement]
}

class StatementRepositoryImpl: StatementRepository {
    private let client: SupabaseClient
    private let coreDataStack: CoreDataStack
    private let offlineManager: OfflineManager
    
    init(client: SupabaseClient, coreDataStack: CoreDataStack, offlineManager: OfflineManager) {
        self.client = client
        self.coreDataStack = coreDataStack
        self.offlineManager = offlineManager
    }
    
    func fetchStatements(for userId: String) async throws -> [Statement] {
        let response = try await client.database
            .from("statements")
            .select()
            .eq("investor_id", value: userId)
            .order("period_end", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([Statement].self, from: response.data)
    }
}

protocol WithdrawalRepository {
    func fetchWithdrawals(for userId: String) async throws -> [WithdrawalRequest]
    func createWithdrawal(_ withdrawal: WithdrawalRequest) async throws
}

class WithdrawalRepositoryImpl: WithdrawalRepository {
    private let client: SupabaseClient
    private let coreDataStack: CoreDataStack
    private let offlineManager: OfflineManager
    
    init(client: SupabaseClient, coreDataStack: CoreDataStack, offlineManager: OfflineManager) {
        self.client = client
        self.coreDataStack = coreDataStack
        self.offlineManager = offlineManager
    }
    
    func fetchWithdrawals(for userId: String) async throws -> [WithdrawalRequest] {
        let response = try await client.database
            .from("withdrawal_requests")
            .select()
            .eq("investor_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([WithdrawalRequest].self, from: response.data)
    }
    
    func createWithdrawal(_ withdrawal: WithdrawalRequest) async throws {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        try await client.database
            .from("withdrawal_requests")
            .insert(withdrawal, encoder: encoder)
            .execute()
    }
}
