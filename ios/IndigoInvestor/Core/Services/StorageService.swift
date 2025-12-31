//
//  StorageService.swift
//  IndigoInvestor
//
//  Storage service for document and file management
//

import Foundation
import Supabase

class StorageService {
    private let client: SupabaseClient
    private let bucketName = "documents"

    init(client: SupabaseClient) {
        self.client = client
    }

    /// Upload a document to storage
    func uploadDocument(data: Data, path: String) async throws -> String {
        try await client.storage
            .from(bucketName)
            .upload(path: path, file: data)

        return path
    }

    /// Download a document from storage
    func downloadDocument(path: String) async throws -> Data {
        return try await client.storage
            .from(bucketName)
            .download(path: path)
    }

    /// Get a signed URL for accessing a document
    func getSignedUrl(path: String, expiresIn: Int = 3600) async throws -> URL {
        return try await client.storage
            .from(bucketName)
            .createSignedURL(path: path, expiresIn: expiresIn)
    }

    /// Delete a document from storage
    func deleteDocument(path: String) async throws {
        try await client.storage
            .from(bucketName)
            .remove(paths: [path])
    }

    /// List files in a directory
    func listFiles(path: String) async throws -> [FileObject] {
        return try await client.storage
            .from(bucketName)
            .list(path: path)
    }
}

// MARK: - Supporting Types

struct FileObject: Codable {
    let name: String
    let id: String?
    let updatedAt: Date?
    let createdAt: Date?
    let lastAccessedAt: Date?
    let metadata: [String: String]?

    enum CodingKeys: String, CodingKey {
        case name
        case id
        case updatedAt = "updated_at"
        case createdAt = "created_at"
        case lastAccessedAt = "last_accessed_at"
        case metadata
    }
}
