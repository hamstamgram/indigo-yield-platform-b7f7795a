//
//  DocumentService.swift
//  IndigoInvestor
//
//  Document service for PDF and statement handling with secure signed URLs
//

import Foundation
import Supabase
import Combine

protocol DocumentServiceProtocol {
    func fetchStatements(for investorId: UUID) async throws -> [Statement]
    func generateSignedURL(for documentPath: String, expiresIn: Int) async throws -> URL
    func downloadDocument(from signedURL: URL) async throws -> Data
    func cacheDocument(_ data: Data, for documentId: UUID) async throws
    func getCachedDocument(for documentId: UUID) async throws -> Data?
}

@MainActor
class DocumentService: DocumentServiceProtocol, ObservableObject {
    private let repository: StatementRepositoryProtocol
    private let storageService: StorageServiceProtocol
    private let cacheManager: DocumentCacheManager
    
    init(repository: StatementRepositoryProtocol, storageService: StorageServiceProtocol) {
        self.repository = repository
        self.storageService = storageService
        self.cacheManager = DocumentCacheManager()
    }
    
    func fetchStatements(for investorId: UUID) async throws -> [Statement] {
        do {
            return try await repository.fetchStatements(for: investorId)
        } catch {
            print("❌ Statement fetch failed for investor \(investorId): \(error)")
            throw DocumentError.fetchFailed(error)
        }
    }
    
    func generateSignedURL(for documentPath: String, expiresIn: Int = 3600) async throws -> URL {
        do {
            // Generate signed URL with 1 hour expiration by default
            let signedURL = try await storageService.createSignedURL(path: documentPath, expiresIn: expiresIn)
            print("✅ Generated signed URL for document: \(documentPath)")
            return signedURL
        } catch {
            print("❌ Failed to generate signed URL for \(documentPath): \(error)")
            throw DocumentError.urlGenerationFailed(error)
        }
    }
    
    func downloadDocument(from signedURL: URL) async throws -> Data {
        do {
            let (data, response) = try await URLSession.shared.data(from: signedURL)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw DocumentError.downloadFailed("Invalid response")
            }
            
            print("✅ Downloaded document from signed URL: \(data.count) bytes")
            return data
        } catch {
            print("❌ Document download failed: \(error)")
            throw DocumentError.downloadFailed(error.localizedDescription)
        }
    }
    
    func cacheDocument(_ data: Data, for documentId: UUID) async throws {
        do {
            try await cacheManager.cacheDocument(data, for: documentId)
            print("✅ Cached document: \(documentId)")
        } catch {
            print("❌ Failed to cache document \(documentId): \(error)")
            throw DocumentError.cachingFailed(error)
        }
    }
    
    func getCachedDocument(for documentId: UUID) async throws -> Data? {
        do {
            return try await cacheManager.getCachedDocument(for: documentId)
        } catch {
            print("❌ Failed to get cached document \(documentId): \(error)")
            return nil // Return nil instead of throwing for cache misses
        }
    }
}

// MARK: - Document Cache Manager

class DocumentCacheManager {
    private let cacheDirectory: URL
    private let maxCacheSize: Int64 = 100 * 1024 * 1024 // 100MB
    private let maxCacheAge: TimeInterval = 7 * 24 * 60 * 60 // 7 days
    
    init() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.cacheDirectory = documentsPath.appendingPathComponent("DocumentCache", isDirectory: true)
        
        // Create cache directory if needed
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    func cacheDocument(_ data: Data, for documentId: UUID) async throws {
        let fileURL = cacheDirectory.appendingPathComponent("\(documentId.uuidString).pdf")
        
        try data.write(to: fileURL)
        
        // Clean up old files if cache is getting too large
        await cleanupCacheIfNeeded()
    }
    
    func getCachedDocument(for documentId: UUID) async throws -> Data? {
        let fileURL = cacheDirectory.appendingPathComponent("\(documentId.uuidString).pdf")
        
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        // Check if file is too old
        let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
        if let modificationDate = attributes[.modificationDate] as? Date,
           Date().timeIntervalSince(modificationDate) > maxCacheAge {
            try? FileManager.default.removeItem(at: fileURL)
            return nil
        }
        
        return try Data(contentsOf: fileURL)
    }
    
    private func cleanupCacheIfNeeded() async {
        do {
            let files = try FileManager.default.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey, .modificationDateKey])
            
            var totalSize: Int64 = 0
            var fileInfo: [(URL, Int64, Date)] = []
            
            for fileURL in files {
                let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
                let size = attributes[.size] as? Int64 ?? 0
                let date = attributes[.modificationDate] as? Date ?? Date.distantPast
                
                totalSize += size
                fileInfo.append((fileURL, size, date))
            }
            
            // Remove oldest files if cache is too large
            if totalSize > maxCacheSize {
                let sortedFiles = fileInfo.sorted { $0.2 < $1.2 } // Sort by date, oldest first
                
                for (fileURL, size, _) in sortedFiles {
                    try? FileManager.default.removeItem(at: fileURL)
                    totalSize -= size
                    
                    if totalSize <= maxCacheSize * 3/4 { // Clean to 75% of max size
                        break
                    }
                }
            }
        } catch {
            print("❌ Cache cleanup failed: \(error)")
        }
    }
}

// MARK: - Document Service Errors

enum DocumentError: LocalizedError {
    case fetchFailed(Error)
    case urlGenerationFailed(Error)
    case downloadFailed(String)
    case cachingFailed(Error)
    case invalidDocument
    case documentNotFound
    
    var errorDescription: String? {
        switch self {
        case .fetchFailed(let error):
            return "Failed to fetch statements: \(error.localizedDescription)"
        case .urlGenerationFailed(let error):
            return "Failed to generate signed URL: \(error.localizedDescription)"
        case .downloadFailed(let message):
            return "Failed to download document: \(message)"
        case .cachingFailed(let error):
            return "Failed to cache document: \(error.localizedDescription)"
        case .invalidDocument:
            return "Invalid document format"
        case .documentNotFound:
            return "Document not found"
        }
    }
}
