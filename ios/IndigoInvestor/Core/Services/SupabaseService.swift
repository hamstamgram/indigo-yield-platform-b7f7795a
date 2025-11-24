//
//  SupabaseService.swift
//  IndigoInvestor
//
//  Core service for Supabase backend integration
//

import Foundation
import Supabase

/// Main service for interacting with Supabase backend
@MainActor
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()
    
    private var client: SupabaseClient?
    
    // MARK: - Configuration
    
    private struct Config {
        static let supabaseURL = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? ""
        static let supabaseAnonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? ""
    }
    
    // MARK: - Initialization
    
    private init() {
        setupClient()
    }
    
    private func setupClient() {
        guard !Config.supabaseURL.isEmpty && !Config.supabaseAnonKey.isEmpty else {
            print("⚠️ Supabase credentials not configured")
            return
        }
        
        client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseURL)!,
            supabaseKey: Config.supabaseAnonKey
        )
    }
    
    // MARK: - Authentication
    
    /// Get current authenticated user
    var currentUser: User? {
        client?.auth.currentUser
    }
    
    /// Check if user is authenticated
    var isAuthenticated: Bool {
        currentUser != nil
    }
    
    /// Sign in with email and password
    func signIn(email: String, password: String) async throws -> User {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.auth.signIn(
            email: email,
            password: password
        )
        
        return response.user
    }
    
    /// Sign up new user
    func signUp(email: String, password: String, metadata: [String: Any]? = nil) async throws -> User {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.auth.signUp(
            email: email,
            password: password,
            data: metadata
        )
        
        guard let user = response.user else {
            throw SupabaseError.signUpFailed
        }
        
        return user
    }
    
    /// Sign out current user
    func signOut() async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        try await client.auth.signOut()
    }
    
    /// Reset password
    func resetPassword(email: String) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        try await client.auth.resetPasswordForEmail(email)
    }
    
    // MARK: - Database Operations
    
    /// Fetch investor profile
    func fetchInvestorProfile(userId: UUID) async throws -> InvestorProfile {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.database
            .from("investors")
            .select()
            .eq("user_id", value: userId.uuidString)
            .single()
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode(InvestorProfile.self, from: response.data)
    }
    
    /// Fetch portfolio data
    func fetchPortfolio(investorId: UUID) async throws -> Portfolio {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        // Fetch portfolio summary
        let portfolioResponse = try await client.database
            .from("portfolios")
            .select()
            .eq("investor_id", value: investorId.uuidString)
            .single()
            .execute()
        
        // Fetch positions
        let positionsResponse = try await client.database
            .from("positions")
            .select()
            .eq("investor_id", value: investorId.uuidString)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let portfolio = try decoder.decode(Portfolio.self, from: portfolioResponse.data)
        let positions = try decoder.decode([Position].self, from: positionsResponse.data)
        
        return Portfolio(
            id: portfolio.id,
            investorId: portfolio.investorId,
            totalInvested: portfolio.totalInvested,
            currentValue: portfolio.currentValue,
            totalReturn: portfolio.totalReturn,
            positions: positions,
            lastUpdated: portfolio.lastUpdated
        )
    }
    
    /// Fetch transactions
    func fetchTransactions(investorId: UUID, limit: Int = 50) async throws -> [Transaction] {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.database
            .from("transactions")
            .select()
            .eq("investor_id", value: investorId.uuidString)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([Transaction].self, from: response.data)
    }
    
    /// Fetch statements
    func fetchStatements(investorId: UUID) async throws -> [Statement] {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.database
            .from("statements")
            .select()
            .eq("investor_id", value: investorId.uuidString)
            .order("statement_date", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([Statement].self, from: response.data)
    }
    
    /// Submit withdrawal request
    func submitWithdrawalRequest(investorId: UUID, amount: Decimal, reason: String?) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let request = WithdrawalRequest(
            investorId: investorId,
            amount: amount,
            reason: reason,
            status: .pending,
            requestedAt: Date()
        )
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        
        let data = try encoder.encode(request)
        
        _ = try await client.database
            .from("withdrawal_requests")
            .insert(data)
            .execute()
    }
    
    // MARK: - Admin Operations
    
    /// Fetch all investors (admin only)
    func fetchAllInvestors() async throws -> [InvestorProfile] {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.database
            .from("investors")
            .select()
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([InvestorProfile].self, from: response.data)
    }
    
    /// Fetch pending approvals (admin only)
    func fetchPendingApprovals() async throws -> [ApprovalRequest] {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let response = try await client.database
            .from("approval_requests")
            .select()
            .eq("status", value: "pending")
            .order("created_at", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([ApprovalRequest].self, from: response.data)
    }
    
    /// Approve request (admin only)
    func approveRequest(requestId: UUID, adminNotes: String?) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let update = [
            "status": "approved",
            "admin_notes": adminNotes ?? "",
            "processed_at": ISO8601DateFormatter().string(from: Date()),
            "processed_by": currentUser?.id.uuidString ?? ""
        ]
        
        _ = try await client.database
            .from("approval_requests")
            .update(update)
            .eq("id", value: requestId.uuidString)
            .execute()
    }
    
    /// Reject request (admin only)
    func rejectRequest(requestId: UUID, reason: String) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let update = [
            "status": "rejected",
            "rejection_reason": reason,
            "processed_at": ISO8601DateFormatter().string(from: Date()),
            "processed_by": currentUser?.id.uuidString ?? ""
        ]
        
        _ = try await client.database
            .from("approval_requests")
            .update(update)
            .eq("id", value: requestId.uuidString)
            .execute()
    }
    
    // MARK: - Storage Operations
    
    /// Upload document
    func uploadDocument(investorId: UUID, fileName: String, fileData: Data) async throws -> String {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        let path = "\(investorId.uuidString)/\(fileName)"
        
        try await client.storage
            .from("documents")
            .upload(path: path, file: fileData)
        
        return path
    }
    
    /// Download document
    func downloadDocument(path: String) async throws -> Data {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        return try await client.storage
            .from("documents")
            .download(path: path)
    }
    
    /// Get signed URL for document
    func getSignedDocumentURL(path: String, expiresIn: Int = 3600) async throws -> URL {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }
        
        return try await client.storage
            .from("documents")
            .createSignedURL(path: path, expiresIn: expiresIn)
    }
    
    // MARK: - Real-time Subscriptions
    
    /// Subscribe to portfolio updates
    func subscribeToPortfolioUpdates(investorId: UUID, onUpdate: @escaping (Portfolio) -> Void) {
        guard let client = client else { return }
        
        Task {
            let channel = await client.channel("portfolio:\(investorId.uuidString)")
            
            await channel.on("postgres_changes", filter: ChannelFilter(
                event: "UPDATE",
                schema: "public",
                table: "portfolios",
                filter: "investor_id=eq.\(investorId.uuidString)"
            )) { payload in
                if let data = try? JSONSerialization.data(withJSONObject: payload["new"] ?? [:]),
                   let portfolio = try? JSONDecoder().decode(Portfolio.self, from: data) {
                    onUpdate(portfolio)
                }
            }
            
            await channel.subscribe()
        }
    }
    
    /// Subscribe to transaction updates
    func subscribeToTransactions(investorId: UUID, onNew: @escaping (Transaction) -> Void) {
        guard let client = client else { return }
        
        Task {
            let channel = await client.channel("transactions:\(investorId.uuidString)")
            
            await channel.on("postgres_changes", filter: ChannelFilter(
                event: "INSERT",
                schema: "public",
                table: "transactions",
                filter: "investor_id=eq.\(investorId.uuidString)"
            )) { payload in
                if let data = try? JSONSerialization.data(withJSONObject: payload["new"] ?? [:]),
                   let transaction = try? JSONDecoder().decode(Transaction.self, from: data) {
                    onNew(transaction)
                }
            }
            
            await channel.subscribe()
        }
    }
}

// MARK: - Error Types

enum SupabaseError: LocalizedError {
    case clientNotConfigured
    case signUpFailed
    case authenticationRequired
    case networkError(String)
    case decodingError(String)
    case unknown(String)
    
    var errorDescription: String? {
        switch self {
        case .clientNotConfigured:
            return "Supabase client is not configured. Please check your environment variables."
        case .signUpFailed:
            return "Sign up failed. Please try again."
        case .authenticationRequired:
            return "Authentication required. Please sign in."
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Data decoding error: \(message)"
        case .unknown(let message):
            return "An error occurred: \(message)"
        }
    }
}

// MARK: - Data Models

struct InvestorProfile: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let email: String
    let fullName: String
    let phoneNumber: String?
    let dateOfBirth: Date?
    let address: String?
    let kycStatus: String
    let investorType: String
    let riskProfile: String?
    let createdAt: Date
    let updatedAt: Date
}


// MARK: - Channel Filter Extension

extension ChannelFilter {
    init(event: String, schema: String, table: String, filter: String) {
        self.init(
            event: event,
            schema: schema,
            table: table,
            filter: filter
        )
    }
}
