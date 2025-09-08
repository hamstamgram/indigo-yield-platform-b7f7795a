//
//  CoreDataManager.swift
//  IndigoInvestor
//
//  Core Data stack management and sync operations
//

import Foundation
import CoreData
import CloudKit
import Combine

class CoreDataManager: ObservableObject {
    static let shared = CoreDataManager()
    
    // MARK: - Published Properties
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var syncError: Error?
    
    // MARK: - Core Data Stack
    
    lazy var persistentContainer: NSPersistentCloudKitContainer = {
        let container = NSPersistentCloudKitContainer(name: "IndigoInvestor")
        
        // Configure for CloudKit sync
        let storeURL = URL.storeURL(for: "com.indigoyield.investor", databaseName: "IndigoInvestor")
        let storeDescription = NSPersistentStoreDescription(url: storeURL)
        
        // Enable CloudKit sync
        storeDescription.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        storeDescription.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        storeDescription.cloudKitContainerOptions = NSPersistentCloudKitContainerOptions(
            containerIdentifier: "iCloud.com.indigoyield.investor"
        )
        
        container.persistentStoreDescriptions = [storeDescription]
        
        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                print("Core Data failed to load: \(error.localizedDescription)")
                self.syncError = error
            }
        }
        
        container.viewContext.automaticallyMergesChangesFromParent = true
        
        // Setup merge policy
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        
        return container
    }()
    
    var context: NSManagedObjectContext {
        persistentContainer.viewContext
    }
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    private init() {
        setupNotifications()
        setupAutoSync()
    }
    
    // MARK: - Setup
    
    private func setupNotifications() {
        NotificationCenter.default.publisher(for: .NSPersistentStoreRemoteChange)
            .sink { [weak self] _ in
                self?.handleRemoteChange()
            }
            .store(in: &cancellables)
    }
    
    private func setupAutoSync() {
        // Auto-sync every 5 minutes when app is active
        Timer.publish(every: 300, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                Task {
                    await self?.syncWithSupabase()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Core Data Operations
    
    func save() {
        guard context.hasChanges else { return }
        
        do {
            try context.save()
        } catch {
            print("Failed to save Core Data context: \(error)")
            self.syncError = error
        }
    }
    
    func fetch<T: NSManagedObject>(_ type: T.Type, 
                                   predicate: NSPredicate? = nil,
                                   sortDescriptors: [NSSortDescriptor]? = nil) -> [T] {
        let request = T.fetchRequest() as! NSFetchRequest<T>
        request.predicate = predicate
        request.sortDescriptors = sortDescriptors
        
        do {
            return try context.fetch(request)
        } catch {
            print("Failed to fetch \(T.self): \(error)")
            return []
        }
    }
    
    func delete(_ object: NSManagedObject) {
        context.delete(object)
        save()
    }
    
    func deleteAll<T: NSManagedObject>(_ type: T.Type) {
        let request = NSFetchRequest<NSFetchRequestResult>(entityName: String(describing: T.self))
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
        
        do {
            try context.execute(deleteRequest)
            save()
        } catch {
            print("Failed to delete all \(T.self): \(error)")
        }
    }
    
    // MARK: - Sync Operations
    
    @MainActor
    func syncWithSupabase() async {
        guard !isSyncing else { return }
        
        isSyncing = true
        syncError = nil
        
        do {
            // Sync each entity type
            try await syncPortfolios()
            try await syncAssets()
            try await syncTransactions()
            try await syncStatements()
            try await syncBankAccounts()
            try await syncNotifications()
            
            lastSyncDate = Date()
            updateSyncMetadata()
        } catch {
            syncError = error
            print("Sync failed: \(error)")
        }
        
        isSyncing = false
    }
    
    private func syncPortfolios() async throws {
        let supabase = SupabaseManager.shared
        
        // Fetch from Supabase
        let response = try await supabase.client
            .from("portfolios")
            .select("*")
            .eq("user_id", value: supabase.currentUserId ?? "")
            .execute()
        
        let serverPortfolios = try JSONDecoder().decode([Portfolio].self, from: response.data)
        
        // Update local cache
        await MainActor.run {
            // Clear existing
            let existing = fetch(CachedPortfolio.self)
            existing.forEach { delete($0) }
            
            // Insert new
            serverPortfolios.forEach { portfolio in
                let cached = CachedPortfolio(context: context)
                cached.id = portfolio.id
                cached.totalValue = portfolio.totalValue
                cached.totalCost = portfolio.totalCost
                cached.totalReturn = portfolio.totalReturn
                cached.returnPercentage = portfolio.returnPercentage
                cached.dailyChange = portfolio.dailyChange
                cached.dailyChangePercent = portfolio.dailyChangePercent
                cached.ytdReturn = portfolio.ytdReturn
                cached.lastUpdated = Date()
                cached.syncStatus = "synced"
            }
            
            save()
        }
    }
    
    private func syncAssets() async throws {
        let supabase = SupabaseManager.shared
        
        let response = try await supabase.client
            .from("assets")
            .select("*")
            .eq("user_id", value: supabase.currentUserId ?? "")
            .execute()
        
        let serverAssets = try JSONDecoder().decode([Asset].self, from: response.data)
        
        await MainActor.run {
            let existing = fetch(CachedAsset.self)
            existing.forEach { delete($0) }
            
            serverAssets.forEach { asset in
                let cached = CachedAsset(context: context)
                cached.id = asset.id
                cached.name = asset.name
                cached.symbol = asset.symbol
                cached.assetType = asset.assetType
                cached.quantity = asset.quantity
                cached.purchasePrice = asset.purchasePrice
                cached.currentValue = asset.currentValue
                cached.costBasis = asset.costBasis
                cached.purchaseDate = asset.purchaseDate
                cached.maturityDate = asset.maturityDate
                cached.interestRate = asset.interestRate
                cached.status = asset.status
                cached.lastUpdated = Date()
                cached.syncStatus = "synced"
            }
            
            save()
        }
    }
    
    private func syncTransactions() async throws {
        let supabase = SupabaseManager.shared
        
        let response = try await supabase.client
            .from("transactions")
            .select("*")
            .eq("user_id", value: supabase.currentUserId ?? "")
            .order("created_at", ascending: false)
            .limit(100)
            .execute()
        
        let serverTransactions = try JSONDecoder().decode([Transaction].self, from: response.data)
        
        await MainActor.run {
            // Only update recent transactions
            let thirtyDaysAgo = Date().addingTimeInterval(-30 * 24 * 60 * 60)
            let predicate = NSPredicate(format: "createdAt < %@", thirtyDaysAgo as NSDate)
            let oldTransactions = fetch(CachedTransaction.self, predicate: predicate)
            oldTransactions.forEach { delete($0) }
            
            serverTransactions.forEach { transaction in
                // Check if exists
                let predicate = NSPredicate(format: "id == %@", transaction.id as CVarArg)
                let existing = fetch(CachedTransaction.self, predicate: predicate).first
                
                let cached = existing ?? CachedTransaction(context: context)
                cached.id = transaction.id
                cached.transactionType = transaction.type.rawValue
                cached.amount = transaction.amount
                cached.transactionDescription = transaction.description
                cached.status = transaction.status.rawValue
                cached.referenceNumber = transaction.referenceNumber
                cached.balanceAfter = transaction.balanceAfter
                cached.bankAccountLast4 = transaction.bankAccountLast4
                cached.paymentMethod = transaction.paymentMethod
                cached.createdAt = transaction.createdAt
                cached.completedAt = transaction.completedAt
                cached.lastUpdated = Date()
                cached.syncStatus = "synced"
            }
            
            save()
        }
    }
    
    private func syncStatements() async throws {
        let supabase = SupabaseManager.shared
        
        let response = try await supabase.client
            .from("statements")
            .select("*")
            .eq("user_id", value: supabase.currentUserId ?? "")
            .order("statement_date", ascending: false)
            .limit(24) // Last 2 years of monthly statements
            .execute()
        
        let serverStatements = try JSONDecoder().decode([Statement].self, from: response.data)
        
        await MainActor.run {
            serverStatements.forEach { statement in
                let predicate = NSPredicate(format: "id == %@", statement.id as CVarArg)
                let existing = fetch(CachedStatement.self, predicate: predicate).first
                
                let cached = existing ?? CachedStatement(context: context)
                cached.id = statement.id
                cached.statementType = statement.type.rawValue
                cached.statementDate = statement.statementDate
                cached.year = Int16(statement.year)
                cached.month = Int16(statement.month ?? 0)
                cached.fileUrl = statement.fileUrl
                cached.fileName = statement.fileName
                cached.fileSize = statement.fileSize ?? 0
                cached.createdAt = statement.createdAt
                cached.lastUpdated = Date()
                cached.syncStatus = "synced"
            }
            
            save()
        }
    }
    
    private func syncBankAccounts() async throws {
        let supabase = SupabaseManager.shared
        
        let response = try await supabase.client
            .from("bank_accounts")
            .select("*")
            .eq("user_id", value: supabase.currentUserId ?? "")
            .execute()
        
        let serverAccounts = try JSONDecoder().decode([BankAccount].self, from: response.data)
        
        await MainActor.run {
            let existing = fetch(CachedBankAccount.self)
            existing.forEach { delete($0) }
            
            serverAccounts.forEach { account in
                let cached = CachedBankAccount(context: context)
                cached.id = account.id
                cached.bankName = account.bankName
                cached.accountType = account.accountType
                cached.last4 = account.last4
                cached.routingNumber = account.routingNumber
                cached.accountHolderName = account.accountHolderName
                cached.isVerified = account.isVerified
                cached.isPrimary = account.isPrimary
                cached.verifiedAt = account.verifiedAt
                cached.createdAt = account.createdAt
                cached.lastUpdated = Date()
                cached.syncStatus = "synced"
            }
            
            save()
        }
    }
    
    private func syncNotifications() async throws {
        // Implement notification sync
        // This would typically sync unread notifications from the server
    }
    
    private func updateSyncMetadata() {
        let metadata = SyncMetadata(context: context)
        metadata.id = UUID()
        metadata.entityName = "all"
        metadata.lastSyncDate = Date()
        metadata.syncDirection = "pull"
        metadata.syncStatus = "success"
        metadata.recordsUpdated = 0
        save()
    }
    
    private func handleRemoteChange() {
        // Handle CloudKit remote changes
        Task {
            await syncWithSupabase()
        }
    }
    
    // MARK: - Cache Management
    
    func clearCache() {
        deleteAll(CachedPortfolio.self)
        deleteAll(CachedAsset.self)
        deleteAll(CachedTransaction.self)
        deleteAll(CachedStatement.self)
        deleteAll(CachedBankAccount.self)
        deleteAll(CachedNotification.self)
        deleteAll(SyncMetadata.self)
    }
    
    func getCacheSize() -> String {
        let storeURL = URL.storeURL(for: "com.indigoyield.investor", databaseName: "IndigoInvestor")
        
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: storeURL.path)
            let fileSize = attributes[.size] as? UInt64 ?? 0
            return ByteCountFormatter.string(fromByteCount: Int64(fileSize), countStyle: .file)
        } catch {
            return "Unknown"
        }
    }
}

// MARK: - URL Extension

extension URL {
    static func storeURL(for appGroup: String, databaseName: String) -> URL {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroup
        ) else {
            fatalError("Unable to create URL for App Group: \(appGroup)")
        }
        
        return containerURL.appendingPathComponent("\(databaseName).sqlite")
    }
}
