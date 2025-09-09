//
//  CoreDataStack.swift
//  IndigoInvestor
//
//  Core Data stack for offline storage
//

import Foundation
import CoreData

class CoreDataStack {
    static let shared = CoreDataStack()
    
    lazy var persistentContainer: NSPersistentContainer = {
        // Use programmatic model instead of .xcdatamodeld file
        let model = CoreDataStack.createModel()
        let container = NSPersistentContainer(name: "IndigoInvestor", managedObjectModel: model)
        
        // Configure for CloudKit sync if needed
        let storeDescription = container.persistentStoreDescriptions.first
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        
        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                // In production, report this error properly
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }
        
        container.viewContext.automaticallyMergesChangesFromParent = true
        return container
    }()
    
    var viewContext: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
    
    func save() {
        let context = persistentContainer.viewContext
        
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nsError = error as NSError
                print("CoreData save error: \(nsError), \(nsError.userInfo)")
            }
        }
    }
    
    func performBackgroundTask<T>(_ block: @escaping (NSManagedObjectContext) throws -> T) async throws -> T {
        return try await withCheckedThrowingContinuation { continuation in
            persistentContainer.performBackgroundTask { context in
                do {
                    let result = try block(context)
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Delete All Data
    
    func deleteAllData() {
        let entities = persistentContainer.managedObjectModel.entities
        
        for entity in entities {
            guard let entityName = entity.name else { continue }
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
            let deleteRequest = NSBatchDeleteRequest(fetchRequest: fetchRequest)
            
            do {
                try persistentContainer.viewContext.execute(deleteRequest)
                try persistentContainer.viewContext.save()
            } catch {
                print("Failed to delete entity \(entityName): \(error)")
            }
        }
    }
    
    // MARK: - Migration Support
    
    func migrateStoreIfNeeded() {
        // Implement lightweight migration if needed
        let storeURL = persistentContainer.persistentStoreDescriptions.first?.url
        
        if let url = storeURL, FileManager.default.fileExists(atPath: url.path) {
            // Check if migration is needed
            do {
                let metadata = try NSPersistentStoreCoordinator.metadataForPersistentStore(
                    ofType: NSSQLiteStoreType,
                    at: url,
                    options: nil
                )
                
                let isCompatible = persistentContainer.managedObjectModel.isConfiguration(
                    withName: nil,
                    compatibleWithStoreMetadata: metadata
                )
                
                if !isCompatible {
                    print("Core Data migration needed")
                    // Perform migration
                }
            } catch {
                print("Failed to check store compatibility: \(error)")
            }
        }
    }
}
