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

