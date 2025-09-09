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
                    investorId: userId,
                    type: Transaction.TransactionType(rawValue: tx.type) ?? .deposit,
                    amount: Decimal(tx.amount),
                    currency: "USD",
                    status: Transaction.TransactionStatus(rawValue: tx.status) ?? .pending,
                    description: tx.description ?? "",
                    date: tx.createdAt,
                    settledDate: tx.settledDate,
                    reference: tx.reference,
                    metadata: nil
                )
            }
        }
    }
    
    private struct TransactionData: Codable {
        let id: UUID
        let type: String
        let amount: Double
        let status: String
        let description: String?
        let createdAt: Date
        let settledDate: Date?
        let reference: String?
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
                    investorId: userId,
                    period: stmt.period ?? "\(stmt.periodStart)-\(stmt.periodEnd)",
                    url: stmt.fileUrl,
                    generatedAt: stmt.createdAt
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
        let period: String?
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
        
        struct WithdrawalInsert: Encodable {
            let investor_id: String
            let amount: Double
            let bank_account_id: String
            let status: String
            let requested_at: String
        }
        
        let withdrawal = WithdrawalInsert(
            investor_id: userId.uuidString,
            amount: amount,
            bank_account_id: bankAccountId.uuidString,
            status: "pending",
            requested_at: ISO8601DateFormatter().string(from: Date())
        )
        
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
        struct WithdrawalUpdate: Encodable {
            let status: String
            let processed_at: String
        }
        
        let update = WithdrawalUpdate(
            status: "approved",
            processed_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await supabase
            .from("withdrawal_requests")
            .update(update)
            .eq("id", value: withdrawalId.uuidString)
            .execute()
    }
    
    func processDeposit(investorId: UUID, amount: Double) async throws {
        struct TransactionInsert: Encodable {
            let investor_id: String
            let type: String
            let amount: Double
            let status: String
            let created_at: String
        }
        
        let transaction = TransactionInsert(
            investor_id: investorId.uuidString,
            type: "deposit",
            amount: amount,
            status: "completed",
            created_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await supabase
            .from("transactions")
            .insert(transaction)
            .execute()
    }
    
    func processInterestPayment(investorId: UUID, amount: Double, apy: Double) async throws {
        struct InterestTransaction: Encodable {
            let investor_id: String
            let type: String
            let amount: Double
            let status: String
            let metadata: [String: Double]
            let created_at: String
        }
        
        let transaction = InterestTransaction(
            investor_id: investorId.uuidString,
            type: "interest",
            amount: amount,
            status: "completed",
            metadata: ["apy": apy],
            created_at: ISO8601DateFormatter().string(from: Date())
        )
        
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
        _ = try await supabase.storage
            .from(bucket)
            .upload(path, data: data)
        
        // Return the path where file was uploaded
        return path
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
    
    func subscribeToPortfolioUpdates(investorId: UUID, handler: @escaping (Any) -> Void) async {
        // TODO: Implement when Supabase Realtime types are available
        // This is a placeholder implementation
        let channelId = "portfolio-\(investorId.uuidString)"
        print("Subscribing to portfolio updates for \(channelId)")
    }
    
    func subscribeToTransactionUpdates(investorId: UUID, handler: @escaping (Any) -> Void) async {
        // TODO: Implement when Supabase Realtime types are available
        // This is a placeholder implementation  
        let channelId = "transactions-\(investorId.uuidString)"
        print("Subscribing to transaction updates for \(channelId)")
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
                    Task { @MainActor in
                        await self?.syncPendingData()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    func saveOfflineData<T: Encodable>(_ data: T, type: String) {
        // Save to Core Data for offline access
        Task {
            do {
                try await coreDataStack.performBackgroundTask { context in
                    // Create entity and save
                    return
                }
            } catch {
                print("Failed to save offline data: \(error)")
            }
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
// Statement is defined in DocumentModels.swift

// WithdrawalRequest and WithdrawalStatus are defined in DocumentModels.swift and Types.swift

// InvestorProfile moved to Models
