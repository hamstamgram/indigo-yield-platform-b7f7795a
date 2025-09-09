import Foundation
import Combine
import Supabase

// MARK: - TransactionService

class TransactionService: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    
    private let supabase: SupabaseClient
    private let authService: AuthService
    
    init(supabase: SupabaseClient, authService: AuthService) {
        self.supabase = supabase
        self.authService = authService
    }
    
    func fetchTransactions(limit: Int = 50) async throws {
        guard let userId = authService.currentUser?.id else { return }
        
        let response = try await supabase
            .from("transactions")
            .select()
            .eq("investor_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let data = try decoder.decode([TransactionData].self, from: response.data)
        
        await MainActor.run {
            self.transactions = data.map { tx in
                Transaction(
                    id: tx.id,
                    type: TransactionType(rawValue: tx.type) ?? .deposit,
                    amount: tx.amount,
                    status: TransactionStatus(rawValue: tx.status) ?? .pending,
                    date: tx.createdAt
                )
            }
        }
    }
    
    private struct TransactionData: Codable {
        let id: UUID
        let type: String
        let amount: Double
        let status: String
        let createdAt: Date
    }
}

// MARK: - DocumentService

class DocumentService: ObservableObject {
    @Published var statements: [Statement] = []
    @Published var isLoading = false
    
    private let supabase: SupabaseClient
    private let authService: AuthService
    
    init(supabase: SupabaseClient, authService: AuthService) {
        self.supabase = supabase
        self.authService = authService
    }
    
    func fetchStatements() async throws {
        guard let userId = authService.currentUser?.id else { return }
        
        let response = try await supabase
            .from("statements")
            .select()
            .eq("investor_id", value: userId.uuidString)
            .order("period_end", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let data = try decoder.decode([StatementData].self, from: response.data)
        
        await MainActor.run {
            self.statements = data.map { stmt in
                Statement(
                    id: stmt.id,
                    periodStart: stmt.periodStart,
                    periodEnd: stmt.periodEnd,
                    fileName: stmt.fileName,
                    fileUrl: stmt.fileUrl,
                    createdAt: stmt.createdAt
                )
            }
        }
    }
    
    func getSignedUrl(for statement: Statement) async throws -> URL {
        // Generate signed URL for secure access
        let response = try await supabase.storage
            .from("statements")
            .createSignedURL(path: statement.fileName, expiresIn: 3600)
        
        return response
    }
    
    private struct StatementData: Codable {
        let id: UUID
        let periodStart: Date
        let periodEnd: Date
        let fileName: String
        let fileUrl: String
        let createdAt: Date
    }
}

// MARK: - WithdrawalService

class WithdrawalService: ObservableObject {
    @Published var withdrawalRequests: [WithdrawalRequest] = []
    @Published var isProcessing = false
    
    private let supabase: SupabaseClient
    private let authService: AuthService
    
    init(supabase: SupabaseClient, authService: AuthService) {
        self.supabase = supabase
        self.authService = authService
    }
    
    func requestWithdrawal(amount: Double, bankAccountId: UUID) async throws {
        guard let userId = authService.currentUser?.id else { return }
        
        let withdrawal = [
            "investor_id": userId.uuidString,
            "amount": amount,
            "bank_account_id": bankAccountId.uuidString,
            "status": "pending",
            "requested_at": ISO8601DateFormatter().string(from: Date())
        ] as [String: Any]
        
        try await supabase
            .from("withdrawal_requests")
            .insert(withdrawal)
            .execute()
    }
    
    func fetchWithdrawalRequests() async throws {
        guard let userId = authService.currentUser?.id else { return }
        
        let response = try await supabase
            .from("withdrawal_requests")
            .select()
            .eq("investor_id", value: userId.uuidString)
            .order("requested_at", ascending: false)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let data = try decoder.decode([WithdrawalData].self, from: response.data)
        
        await MainActor.run {
            self.withdrawalRequests = data.map { wd in
                WithdrawalRequest(
                    id: wd.id,
                    amount: wd.amount,
                    status: WithdrawalStatus(rawValue: wd.status) ?? .pending,
                    requestedAt: wd.requestedAt,
                    processedAt: wd.processedAt
                )
            }
        }
    }
    
    private struct WithdrawalData: Codable {
        let id: UUID
        let amount: Double
        let status: String
        let requestedAt: Date
        let processedAt: Date?
    }
}

// MARK: - AdminService

class AdminService: ObservableObject {
    @Published var investors: [InvestorProfile] = []
    @Published var pendingWithdrawals: [WithdrawalRequest] = []
    @Published var isLoading = false
    
    private let supabase: SupabaseClient
    
    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }
    
    func fetchAllInvestors() async throws {
        let response = try await supabase
            .from("profiles")
            .select("""
                *,
                portfolios (
                    current_balance,
                    total_deposited,
                    total_withdrawn
                )
            """)
            .eq("role", value: "investor")
            .execute()
        
        // Process and update investors
    }
    
    func approveWithdrawal(_ withdrawalId: UUID) async throws {
        try await supabase
            .from("withdrawal_requests")
            .update([
                "status": "approved",
                "processed_at": ISO8601DateFormatter().string(from: Date())
            ])
            .eq("id", value: withdrawalId.uuidString)
            .execute()
    }
    
    func processDeposit(investorId: UUID, amount: Double) async throws {
        let transaction = [
            "investor_id": investorId.uuidString,
            "type": "deposit",
            "amount": amount,
            "status": "completed",
            "created_at": ISO8601DateFormatter().string(from: Date())
        ] as [String: Any]
        
        try await supabase
            .from("transactions")
            .insert(transaction)
            .execute()
    }
    
    func processInterestPayment(investorId: UUID, amount: Double, apy: Double) async throws {
        let transaction = [
            "investor_id": investorId.uuidString,
            "type": "interest",
            "amount": amount,
            "status": "completed",
            "metadata": ["apy": apy],
            "created_at": ISO8601DateFormatter().string(from: Date())
        ] as [String: Any]
        
        try await supabase
            .from("transactions")
            .insert(transaction)
            .execute()
    }
}

// MARK: - StorageService

class StorageService {
    private let supabase: SupabaseClient
    
    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }
    
    func uploadFile(data: Data, path: String, bucket: String) async throws -> String {
        let response = try await supabase.storage
            .from(bucket)
            .upload(path: path, data: data)
        
        return response
    }
    
    func downloadFile(path: String, bucket: String) async throws -> Data {
        let data = try await supabase.storage
            .from(bucket)
            .download(path: path)
        
        return data
    }
    
    func createSignedUrl(path: String, bucket: String, expiresIn: Int = 3600) async throws -> URL {
        let url = try await supabase.storage
            .from(bucket)
            .createSignedURL(path: path, expiresIn: expiresIn)
        
        return url
    }
    
    func deleteFile(path: String, bucket: String) async throws {
        try await supabase.storage
            .from(bucket)
            .remove(paths: [path])
    }
}

// MARK: - RealtimeService

class RealtimeService {
    private let supabase: SupabaseClient
    private var channels: [String: RealtimeChannel] = [:]
    
    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }
    
    func subscribeToPortfolioUpdates(investorId: UUID, handler: @escaping (PostgresChangePayload) -> Void) async {
        let channel = supabase.channel("portfolio-\(investorId.uuidString)")
        
        await channel
            .onPostgresChange(
                event: .all,
                schema: "public",
                table: "portfolios",
                filter: "investor_id=eq.\(investorId.uuidString)"
            ) { payload in
                handler(payload)
            }
            .subscribe()
        
        channels["portfolio-\(investorId.uuidString)"] = channel
    }
    
    func subscribeToTransactionUpdates(investorId: UUID, handler: @escaping (PostgresChangePayload) -> Void) async {
        let channel = supabase.channel("transactions-\(investorId.uuidString)")
        
        await channel
            .onPostgresChange(
                event: .insert,
                schema: "public",
                table: "transactions",
                filter: "investor_id=eq.\(investorId.uuidString)"
            ) { payload in
                handler(payload)
            }
            .subscribe()
        
        channels["transactions-\(investorId.uuidString)"] = channel
    }
    
    func unsubscribeAll() async {
        await supabase.removeAllChannels()
        channels.removeAll()
    }
}

// MARK: - OfflineManager

class OfflineManager: ObservableObject {
    @Published var isOffline = false
    @Published var pendingSyncCount = 0
    
    private let coreDataStack: CoreDataStack
    private let networkMonitor: NetworkMonitor
    private var cancellables = Set<AnyCancellable>()
    
    init(coreDataStack: CoreDataStack, networkMonitor: NetworkMonitor) {
        self.coreDataStack = coreDataStack
        self.networkMonitor = networkMonitor
        
        // Monitor network status
        networkMonitor.$isConnected
            .sink { [weak self] isConnected in
                self?.isOffline = !isConnected
                if isConnected {
                    Task {
                        await self?.syncPendingData()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    func saveOfflineData<T: Encodable>(_ data: T, type: String) {
        // Save to Core Data for offline access
        coreDataStack.performBackgroundTask { context in
            // Create entity and save
        }
    }
    
    func syncPendingData() async {
        // Sync any pending offline data when connection restored
        guard !isOffline else { return }
        
        // Fetch pending items from Core Data
        // Upload to Supabase
        // Clear local cache on success
    }
    
    func getPendingCount() -> Int {
        // Return count of pending sync items
        return pendingSyncCount
    }
}

// MARK: - Supporting Types

struct Statement: Identifiable {
    let id: UUID
    let periodStart: Date
    let periodEnd: Date
    let fileName: String
    let fileUrl: String
    let createdAt: Date
}

// WithdrawalRequest and WithdrawalStatus are defined in Models/Types.swift

struct WithdrawalRequest: Identifiable {
    let id: UUID
    let amount: Double
    let status: WithdrawalStatus
    let requestedAt: Date
    let processedAt: Date?
}

// InvestorProfile moved to Models
