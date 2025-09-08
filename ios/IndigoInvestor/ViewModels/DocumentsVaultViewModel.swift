//
//  DocumentsVaultViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing documents vault
//

import Foundation
import SwiftUI
import Combine
import PDFKit

@MainActor
class DocumentsVaultViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var documents: [Document] = []
    @Published var filteredDocuments: [Document] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var dateRange: DateRange?
    
    // Storage metrics
    @Published var usedStorage: Int64 = 0
    @Published var totalStorage: Int64 = 5368709120 // 5GB default
    @Published var documentsSize = "0 MB"
    @Published var statementsSize = "0 MB"
    @Published var taxFormsSize = "0 MB"
    
    // Counts
    @Published var thisMonthCount = 0
    @Published var unreadCount = 0
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private let documentService = DocumentService()
    private var cancellables = Set<AnyCancellable>()
    private var currentCategory: DocumentsVaultView.DocumentCategory = .all
    private var searchQuery = ""
    
    // MARK: - Computed Properties
    
    var storagePercentage: Double {
        guard totalStorage > 0 else { return 0 }
        return Double(usedStorage) / Double(totalStorage)
    }
    
    var formattedUsedStorage: String {
        formatBytes(usedStorage)
    }
    
    var formattedTotalStorage: String {
        formatBytes(totalStorage)
    }
    
    // MARK: - Initialization
    
    init() {
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Subscribe to document updates
        supabaseManager.subscribeToDocumentUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.loadDocuments()
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    func loadDocuments() {
        Task {
            await fetchDocuments()
            calculateMetrics()
        }
    }
    
    func refreshDocuments() async {
        await fetchDocuments()
        calculateMetrics()
    }
    
    private func fetchDocuments() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await supabaseManager.client
                .from("documents")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .order("created_at", ascending: false)
                .execute()
            
            let fetchedDocuments = try JSONDecoder().decode([DocumentDB].self, from: response.data)
            
            await MainActor.run {
                self.documents = fetchedDocuments.map { dbDoc in
                    Document(
                        id: dbDoc.id,
                        name: dbDoc.name,
                        type: Document.DocumentType(rawValue: dbDoc.type) ?? .pdf,
                        category: Document.Category(rawValue: dbDoc.category) ?? .other,
                        fileSize: dbDoc.fileSize,
                        filePath: dbDoc.filePath,
                        isRead: dbDoc.isRead,
                        requiresAuth: dbDoc.requiresAuth,
                        createdAt: dbDoc.createdAt,
                        fileExtension: URL(string: dbDoc.filePath)?.pathExtension ?? "pdf"
                    )
                }
                self.applyCurrentFilters()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                print("Error fetching documents: \(error)")
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    // MARK: - Filtering & Sorting
    
    func filterByCategory(_ category: DocumentsVaultView.DocumentCategory) {
        currentCategory = category
        applyCurrentFilters()
    }
    
    func searchDocuments(query: String) {
        searchQuery = query
        applyCurrentFilters()
    }
    
    func sortDocuments(by order: DocumentsVaultView.SortOrder) {
        switch order {
        case .dateDescending:
            filteredDocuments.sort { $0.createdAt > $1.createdAt }
        case .dateAscending:
            filteredDocuments.sort { $0.createdAt < $1.createdAt }
        case .nameAscending:
            filteredDocuments.sort { $0.name < $1.name }
        case .nameDescending:
            filteredDocuments.sort { $0.name > $1.name }
        case .sizeDescending:
            filteredDocuments.sort { $0.fileSize > $1.fileSize }
        case .sizeAscending:
            filteredDocuments.sort { $0.fileSize < $1.fileSize }
        }
    }
    
    func getCategoryCount(_ category: DocumentsVaultView.DocumentCategory) -> Int {
        switch category {
        case .all:
            return documents.count
        case .statements:
            return documents.filter { $0.category == .statement }.count
        case .tax:
            return documents.filter { $0.category == .tax }.count
        case .agreements:
            return documents.filter { $0.category == .agreement }.count
        case .reports:
            return documents.filter { $0.category == .report }.count
        case .kyc:
            return documents.filter { $0.category == .kyc }.count
        }
    }
    
    private func applyCurrentFilters() {
        var filtered = documents
        
        // Filter by category
        if currentCategory != .all {
            let docCategory: Document.Category
            switch currentCategory {
            case .statements: docCategory = .statement
            case .tax: docCategory = .tax
            case .agreements: docCategory = .agreement
            case .reports: docCategory = .report
            case .kyc: docCategory = .kyc
            default: docCategory = .other
            }
            filtered = filtered.filter { $0.category == docCategory }
        }
        
        // Filter by search query
        if !searchQuery.isEmpty {
            filtered = filtered.filter { document in
                document.name.localizedCaseInsensitiveContains(searchQuery)
            }
        }
        
        // Filter by date range
        if let dateRange = dateRange {
            filtered = filtered.filter { document in
                document.createdAt >= dateRange.start && document.createdAt <= dateRange.end
            }
        }
        
        filteredDocuments = filtered
        sortDocuments(by: .dateDescending)
    }
    
    // MARK: - Document Actions
    
    func markAsRead(_ document: Document) {
        Task {
            do {
                try await supabaseManager.client
                    .from("documents")
                    .update(["is_read": true])
                    .eq("id", document.id.uuidString)
                    .execute()
                
                if let index = documents.firstIndex(where: { $0.id == document.id }) {
                    documents[index].isRead = true
                }
                if let index = filteredDocuments.firstIndex(where: { $0.id == document.id }) {
                    filteredDocuments[index].isRead = true
                }
                
                calculateMetrics()
            } catch {
                print("Error marking document as read: \(error)")
            }
        }
    }
    
    func downloadDocument(_ document: Document) {
        Task {
            do {
                // Get signed URL
                let signedURL = try await supabaseManager.getSignedURL(
                    for: document.filePath,
                    expiresIn: 3600
                )
                
                // Download file
                let (data, _) = try await URLSession.shared.data(from: signedURL)
                
                // Save to documents directory
                let documentsURL = FileManager.default.urls(
                    for: .documentDirectory,
                    in: .userDomainMask
                ).first!
                
                let fileURL = documentsURL.appendingPathComponent(document.name)
                try data.write(to: fileURL)
                
                // Show success message
                await MainActor.run {
                    // Show success toast or alert
                    print("Document downloaded: \(document.name)")
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to download document: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func shareDocument(_ document: Document) {
        Task {
            do {
                // Get signed URL
                let signedURL = try await supabaseManager.getSignedURL(
                    for: document.filePath,
                    expiresIn: 3600
                )
                
                // Download file
                let (data, _) = try await URLSession.shared.data(from: signedURL)
                
                // Share using UIActivityViewController
                await MainActor.run {
                    let activityVC = UIActivityViewController(
                        activityItems: [data],
                        applicationActivities: nil
                    )
                    
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let rootViewController = windowScene.windows.first?.rootViewController {
                        rootViewController.present(activityVC, animated: true)
                    }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to share document: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func deleteDocument(_ document: Document) {
        Task {
            do {
                // Delete from Supabase Storage
                try await supabaseManager.client.storage
                    .from("documents")
                    .remove(paths: [document.filePath])
                
                // Delete from database
                try await supabaseManager.client
                    .from("documents")
                    .delete()
                    .eq("id", document.id.uuidString)
                    .execute()
                
                // Remove from local arrays
                await MainActor.run {
                    documents.removeAll { $0.id == document.id }
                    filteredDocuments.removeAll { $0.id == document.id }
                    calculateMetrics()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to delete document: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func addDocument(_ document: Document) {
        documents.insert(document, at: 0)
        applyCurrentFilters()
        calculateMetrics()
    }
    
    // MARK: - Metrics Calculation
    
    private func calculateMetrics() {
        // Calculate storage usage
        usedStorage = documents.reduce(0) { $0 + $1.fileSize }
        
        // Calculate category sizes
        let statementsBytes = documents
            .filter { $0.category == .statement }
            .reduce(0) { $0 + $1.fileSize }
        statementsSize = formatBytes(statementsBytes)
        
        let taxBytes = documents
            .filter { $0.category == .tax }
            .reduce(0) { $0 + $1.fileSize }
        taxFormsSize = formatBytes(taxBytes)
        
        let otherBytes = documents
            .filter { $0.category != .statement && $0.category != .tax }
            .reduce(0) { $0 + $1.fileSize }
        documentsSize = formatBytes(otherBytes)
        
        // Calculate counts
        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.dateInterval(of: .month, for: now)?.start ?? now
        
        thisMonthCount = documents.filter { $0.createdAt >= startOfMonth }.count
        unreadCount = documents.filter { !$0.isRead }.count
    }
    
    // MARK: - Helper Methods
    
    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}

// MARK: - Supporting Types

struct Document: Identifiable {
    let id: UUID
    var name: String
    let type: DocumentType
    let category: Category
    let fileSize: Int64
    let filePath: String
    var isRead: Bool
    let requiresAuth: Bool
    let createdAt: Date
    let fileExtension: String
    
    var formattedSize: String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: fileSize)
    }
    
    enum DocumentType: String {
        case pdf = "PDF"
        case image = "IMAGE"
        case spreadsheet = "SPREADSHEET"
        case text = "TEXT"
    }
    
    enum Category: String {
        case statement = "STATEMENT"
        case tax = "TAX"
        case agreement = "AGREEMENT"
        case report = "REPORT"
        case kyc = "KYC"
        case other = "OTHER"
    }
}

struct DocumentDB: Codable {
    let id: UUID
    let userId: UUID
    let name: String
    let type: String
    let category: String
    let fileSize: Int64
    let filePath: String
    let isRead: Bool
    let requiresAuth: Bool
    let metadata: [String: String]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case type
        case category
        case fileSize = "file_size"
        case filePath = "file_path"
        case isRead = "is_read"
        case requiresAuth = "requires_auth"
        case metadata
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Document Loader

@MainActor
class DocumentLoader: ObservableObject {
    @Published var documentData: Data?
    @Published var isLoading = false
    @Published var error: Error?
    
    private let supabaseManager = SupabaseManager.shared
    
    func loadDocument(_ document: Document) async {
        isLoading = true
        error = nil
        
        do {
            // Get signed URL
            let signedURL = try await supabaseManager.getSignedURL(
                for: document.filePath,
                expiresIn: 3600
            )
            
            // Download document
            let (data, _) = try await URLSession.shared.data(from: signedURL)
            
            await MainActor.run {
                self.documentData = data
            }
        } catch {
            await MainActor.run {
                self.error = error
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    func downloadDocument(_ document: Document) async {
        // Implementation for downloading document to device
    }
}
