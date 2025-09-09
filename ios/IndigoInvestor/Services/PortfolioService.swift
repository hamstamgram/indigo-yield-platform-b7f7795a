import Foundation
import Combine
import Supabase

/// Service for handling portfolio operations
class PortfolioService: ObservableObject {
    @Published var portfolio: Portfolio?
    @Published var isLoading = false
    @Published var error: Error?
    
    private let supabase: SupabaseClient
    private let authService: AuthService
    private var cancellables = Set<AnyCancellable>()
    
    init(supabase: SupabaseClient, authService: AuthService) {
        self.supabase = supabase
        self.authService = authService
        
        // Subscribe to auth changes
        authService.$isAuthenticated
            .sink { [weak self] isAuthenticated in
                if isAuthenticated {
                    Task {
                        await self?.fetchPortfolio()
                    }
                } else {
                    self?.portfolio = nil
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Portfolio Operations
    
    @MainActor
    func fetchPortfolio() async {
        guard let userId = authService.currentUser?.id else { return }
        
        isLoading = true
        error = nil
        
        do {
            // Fetch portfolio data
            let response = try await supabase
                .from("portfolios")
                .select("""
                    *,
                    transactions (
                        id,
                        type,
                        amount,
                        status,
                        created_at
                    )
                """)
                .eq("investor_id", value: userId.uuidString)
                .single()
                .execute()
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            
            let portfolioData = try decoder.decode(PortfolioResponse.self, from: response.data)
            
            // Calculate metrics
            let metrics = calculateMetrics(from: portfolioData)
            
            // Map to simplified portfolio for now
            // The actual Portfolio model expects more fields
            // This is a temporary mapping until we align the models
            self.portfolio = nil // Will implement proper mapping later
        } catch {
            self.error = error
            print("Failed to fetch portfolio: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshPortfolio() async {
        await fetchPortfolio()
    }
    
    // MARK: - Real-time Updates
    
    func subscribeToUpdates() {
        // Realtime subscriptions temporarily disabled
        // Will implement when Supabase Realtime types are properly configured
    }
    
    func unsubscribeFromUpdates() {
        Task {
            await supabase.removeAllChannels()
        }
    }
    
    @MainActor
    private func handlePortfolioUpdate(_ payload: PostgresChangePayload) async {
        // Refresh portfolio when changes detected
        await fetchPortfolio()
    }
    
    // MARK: - Portfolio Analytics
    
    func getPerformanceData(for period: TimePeriod) async throws -> [PerformanceDataPoint] {
        guard let portfolioId = portfolio?.id else {
            throw PortfolioError.noPortfolio
        }
        
        let startDate = period.startDate
        let endDate = Date()
        
        let response = try await supabase
            .from("portfolio_performance")
            .select()
            .eq("portfolio_id", value: portfolioId.uuidString)
            .gte("date", value: ISO8601DateFormatter().string(from: startDate))
            .lte("date", value: ISO8601DateFormatter().string(from: endDate))
            .order("date", ascending: true)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode([PerformanceDataPoint].self, from: response.data)
    }
    
    func getYieldHistory() async throws -> [YieldEntry] {
        guard let portfolioId = portfolio?.id else {
            throw PortfolioError.noPortfolio
        }
        
        let response = try await supabase
            .from("transactions")
            .select()
            .eq("portfolio_id", value: portfolioId.uuidString)
            .eq("type", value: "interest")
            .order("created_at", ascending: false)
            .limit(100)
            .execute()
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        let transactions = try decoder.decode([TransactionResponse].self, from: response.data)
        
        return transactions.map { tx in
            YieldEntry(
                id: tx.id,
                amount: tx.amount,
                apy: tx.metadata?["apy"] as? Double ?? 0.0,
                date: tx.createdAt
            )
        }
    }
    
    // MARK: - Helper Methods
    
    private func calculateMetrics(from portfolio: PortfolioResponse) -> PortfolioMetrics {
        // Calculate average APY based on interest earned and time
        let averageAPY = portfolio.currentApy ?? 0.0
        
        return PortfolioMetrics(
            averageAPY: averageAPY,
            totalReturn: portfolio.totalInterestEarned,
            percentageReturn: portfolio.currentBalance > 0 
                ? (portfolio.totalInterestEarned / portfolio.currentBalance) * 100 
                : 0
        )
    }
    
    // MARK: - Helper Types
    
    private struct PortfolioResponse: Codable {
        let id: UUID
        let investorId: UUID
        let currentBalance: Double
        let totalDeposited: Double
        let totalWithdrawn: Double
        let totalInterestEarned: Double
        let currentApy: Double?
        let createdAt: Date
        let updatedAt: Date
        let transactions: [TransactionResponse]?
    }
    
    private struct TransactionResponse: Codable {
        let id: UUID
        let type: String
        let amount: Double
        let status: String
        let createdAt: Date
        let metadata: [String: Any]?
        
        enum CodingKeys: String, CodingKey {
            case id, type, amount, status, createdAt, metadata
        }
        
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decode(UUID.self, forKey: .id)
            type = try container.decode(String.self, forKey: .type)
            amount = try container.decode(Double.self, forKey: .amount)
            status = try container.decode(String.self, forKey: .status)
            createdAt = try container.decode(Date.self, forKey: .createdAt)
            // Skip metadata for now as it causes encoding issues
            metadata = nil
        }
        
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(id, forKey: .id)
            try container.encode(type, forKey: .type)
            try container.encode(amount, forKey: .amount)
            try container.encode(status, forKey: .status)
            try container.encode(createdAt, forKey: .createdAt)
            // Skip metadata encoding
        }
    }
    
    private struct PortfolioMetrics {
        let averageAPY: Double
        let totalReturn: Double
        let percentageReturn: Double
    }
}

// MARK: - Portfolio Errors

enum PortfolioError: LocalizedError {
    case noPortfolio
    case fetchFailed
    case updateFailed
    
    var errorDescription: String? {
        switch self {
        case .noPortfolio:
            return "No portfolio found"
        case .fetchFailed:
            return "Failed to fetch portfolio data"
        case .updateFailed:
            return "Failed to update portfolio"
        }
    }
}

// MARK: - Supporting Types

enum TimePeriod {
    case day
    case week
    case month
    case quarter
    case year
    case all
    
    var startDate: Date {
        let calendar = Calendar.current
        let now = Date()
        
        switch self {
        case .day:
            return calendar.date(byAdding: .day, value: -1, to: now) ?? now
        case .week:
            return calendar.date(byAdding: .weekOfYear, value: -1, to: now) ?? now
        case .month:
            return calendar.date(byAdding: .month, value: -1, to: now) ?? now
        case .quarter:
            return calendar.date(byAdding: .month, value: -3, to: now) ?? now
        case .year:
            return calendar.date(byAdding: .year, value: -1, to: now) ?? now
        case .all:
            return calendar.date(byAdding: .year, value: -10, to: now) ?? now
        }
    }
}

struct PerformanceDataPoint: Codable {
    let date: Date
    let balance: Double
    let apy: Double
}

struct YieldEntry: Identifiable {
    let id: UUID
    let amount: Double
    let apy: Double
    let date: Date
}
