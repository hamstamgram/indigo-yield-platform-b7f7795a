//
//  OfflineManager.swift
//  IndigoInvestor
//
//  Offline manager for data synchronization and cache management
//

import Foundation
import CoreData
import Network

protocol OfflineManagerProtocol {
    func syncData() async throws
    func cacheData<T: Codable>(_ data: T, for key: String) async throws
    func getCachedData<T: Codable>(_ type: T.Type, for key: String) async throws -> T?
    func clearExpiredCache() async
    var isOffline: Bool { get }
}

@MainActor
class OfflineManager: OfflineManagerProtocol, ObservableObject {
    private let coreDataStack: CoreDataStack
    private let networkMonitor = NWPathMonitor()
    private let networkQueue = DispatchQueue(label: "NetworkMonitor")
    
    @Published var isOffline = false
    @Published var pendingSyncCount = 0
    
    // Cache expiration times
    private let portfolioCacheExpiry: TimeInterval = 5 * 60 // 5 minutes
    private let transactionCacheExpiry: TimeInterval = 10 * 60 // 10 minutes
    private let statementCacheExpiry: TimeInterval = 24 * 60 * 60 // 24 hours
    
    init(coreDataStack: CoreDataStack) {
        self.coreDataStack = coreDataStack
        setupNetworkMonitoring()
    }
    
    func syncData() async throws {
        guard !isOffline else {
            print("⚠️ Cannot sync: device is offline")
            return
        }
        
        print("🔄 Starting offline data synchronization...")
        
        do {
            // Sync cached portfolio data
            try await syncPortfolioData()
            
            // Sync cached transaction data
            try await syncTransactionData()
            
            // Sync pending actions (like withdrawal requests)
            try await syncPendingActions()
            
            // Clear expired cache entries
            await clearExpiredCache()
            
            print("✅ Offline sync completed successfully")
        } catch {
            print("❌ Offline sync failed: \(error)")
            throw OfflineError.syncFailed(error)
        }
    }
    
    func cacheData<T: Codable>(_ data: T, for key: String) async throws {
        let context = coreDataStack.viewContext
        
        // Check if cached entry already exists
        let fetchRequest = NSFetchRequest<CachedData>(entityName: "CachedData")
        fetchRequest.predicate = NSPredicate(format: "key == %@", key)
        
        let existingEntries = try context.fetch(fetchRequest)
        let cachedEntry = existingEntries.first ?? CachedData(context: context)
        
        // Encode data to JSON
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encodedData = try encoder.encode(data)
        
        // Update cache entry
        cachedEntry.key = key
        cachedEntry.data = encodedData
        cachedEntry.timestamp = Date()
        cachedEntry.dataType = String(describing: T.self)
        
        try context.save()
        print("✅ Cached data for key: \(key)")
    }
    
    func getCachedData<T: Codable>(_ type: T.Type, for key: String) async throws -> T? {
        let context = coreDataStack.viewContext
        
        let fetchRequest = NSFetchRequest<CachedData>(entityName: "CachedData")
        fetchRequest.predicate = NSPredicate(format: "key == %@", key)
        
        guard let cachedEntry = try context.fetch(fetchRequest).first else {
            return nil
        }
        
        // Check if cache is expired based on data type
        let expiryTime = getCacheExpiryTime(for: key)
        if Date().timeIntervalSince(cachedEntry.timestamp ?? Date.distantPast) > expiryTime {
            // Remove expired entry
            context.delete(cachedEntry)
            try context.save()
            return nil
        }
        
        // Decode cached data
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        guard let data = cachedEntry.data else { return nil }
        
        return try decoder.decode(type, from: data)
    }
    
    func clearExpiredCache() async {
        let context = coreDataStack.viewContext
        
        let fetchRequest = NSFetchRequest<CachedData>(entityName: "CachedData")
        let allCachedData = try? context.fetch(fetchRequest)
        
        var expiredCount = 0
        
        for cachedEntry in allCachedData ?? [] {
            let expiryTime = getCacheExpiryTime(for: cachedEntry.key ?? "")
            
            if Date().timeIntervalSince(cachedEntry.timestamp ?? Date.distantPast) > expiryTime {
                context.delete(cachedEntry)
                expiredCount += 1
            }
        }
        
        if expiredCount > 0 {
            try? context.save()
            print("✅ Cleared \(expiredCount) expired cache entries")
        }
    }
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOffline = path.status != .satisfied
                
                // Trigger sync when network becomes available
                if path.status == .satisfied {
                    Task {
                        try? await self?.syncData()
                    }
                }
            }
        }
        
        networkMonitor.start(queue: networkQueue)
    }
    
    private func syncPortfolioData() async throws {
        // Implementation would sync cached portfolio data with server
        print("🔄 Syncing portfolio data...")
        // This would typically call portfolio service to fetch latest data
        // and update local cache
    }
    
    private func syncTransactionData() async throws {
        // Implementation would sync cached transaction data with server
        print("🔄 Syncing transaction data...")
        // This would typically call transaction service to fetch latest data
        // and update local cache
    }
    
    private func syncPendingActions() async throws {
        // Implementation would sync pending actions (withdrawal requests, etc.)
        print("🔄 Syncing pending actions...")
        
        let context = coreDataStack.viewContext
        let fetchRequest = NSFetchRequest<PendingAction>(entityName: "PendingAction")
        
        let pendingActions = try context.fetch(fetchRequest)
        pendingSyncCount = pendingActions.count
        
        for action in pendingActions {
            do {
                // Process pending action based on type
                try await processPendingAction(action)
                
                // Remove successful action
                context.delete(action)
                pendingSyncCount -= 1
            } catch {
                print("❌ Failed to sync pending action: \(action.actionType ?? "unknown")")
                // Keep failed actions for retry
            }
        }
        
        try context.save()
    }
    
    private func processPendingAction(_ action: PendingAction) async throws {
        // Process different types of pending actions
        switch action.actionType {
        case "withdrawal_request":
            // Submit pending withdrawal request
            print("🔄 Processing pending withdrawal request")
        case "profile_update":
            // Submit pending profile update
            print("🔄 Processing pending profile update")
        default:
            print("⚠️ Unknown pending action type: \(action.actionType ?? "nil")")
        }
    }
    
    private func getCacheExpiryTime(for key: String) -> TimeInterval {
        if key.contains("portfolio") {
            return portfolioCacheExpiry
        } else if key.contains("transaction") {
            return transactionCacheExpiry
        } else if key.contains("statement") {
            return statementCacheExpiry
        } else {
            return 60 * 60 // Default 1 hour
        }
    }
}

// MARK: - Core Data Entities

// Note: These would typically be defined in the Core Data model file (.xcdatamodeld)
// but are included here for reference

@objc(CachedData)
class CachedData: NSManagedObject {
    @NSManaged var key: String?
    @NSManaged var data: Data?
    @NSManaged var timestamp: Date?
    @NSManaged var dataType: String?
}

@objc(PendingAction)
class PendingAction: NSManagedObject {
    @NSManaged var actionType: String?
    @NSManaged var actionData: Data?
    @NSManaged var createdAt: Date?
    @NSManaged var retryCount: Int32
}

// MARK: - Offline Manager Errors

enum OfflineError: LocalizedError {
    case syncFailed(Error)
    case cacheWriteFailed(Error)
    case cacheReadFailed(Error)
    case networkUnavailable
    case dataCorrupted
    
    var errorDescription: String? {
        switch self {
        case .syncFailed(let error):
            return "Offline sync failed: \(error.localizedDescription)"
        case .cacheWriteFailed(let error):
            return "Failed to write to cache: \(error.localizedDescription)"
        case .cacheReadFailed(let error):
            return "Failed to read from cache: \(error.localizedDescription)"
        case .networkUnavailable:
            return "Network is unavailable for sync"
        case .dataCorrupted:
            return "Cached data is corrupted"
        }
    }
}
