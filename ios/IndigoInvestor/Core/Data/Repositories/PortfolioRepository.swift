//
//  PortfolioRepository.swift
//  IndigoInvestor
//
//  Portfolio repository with Supabase integration and offline caching
//  Aligned with Web Platform: Uses investor_positions and investor_monthly_reports
//

import Foundation
import Supabase
import CoreData

class PortfolioRepository: PortfolioRepositoryProtocol {
    private let supabaseClient: SupabaseClient
    private let coreDataStack: CoreDataStack
    private let offlineManager: OfflineManagerProtocol
    
    private let cacheKey = "portfolio_cache"
    private let cacheExpiryMinutes: TimeInterval = 5 * 60 // 5 minutes
    
    init(supabase: SupabaseClient, coreData: CoreDataStack, offlineManager: OfflineManagerProtocol) {
        self.supabaseClient = supabase
        self.coreDataStack = coreData
        self.offlineManager = offlineManager
    }
    
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        // Try cache first for fast loading
        if let cachedPortfolio = try await getCachedPortfolio(for: investorId),
           !isCacheExpired(cachedPortfolio) {
            print("✅ Returning cached portfolio for investor: \(investorId)")
            return cachedPortfolio
        }
        
        // Fetch from network if cache miss or expired
        do {
            let portfolio = try await fetchFromNetwork(investorId: investorId)
            try await cachePortfolio(portfolio)
            return portfolio
        } catch {
            print("❌ Network fetch failed: \(error)")
            // If network fails, return stale cache if available
            if let stalePortfolio = try await getCachedPortfolio(for: investorId) {
                print("⚠️ Using stale cache due to network error")
                return stalePortfolio
            }
            throw error
        }
    }
    
    func refreshPortfolioFromNetwork(for investorId: UUID) async throws -> Portfolio {
        let portfolio = try await fetchFromNetwork(investorId: investorId)
        try await cachePortfolio(portfolio)
        return portfolio
    }
    
    func cachePortfolio(_ portfolio: Portfolio) async throws {
        // Cache in memory/persistent storage via OfflineManager
        try await offlineManager.cacheData(portfolio, for: "\(cacheKey)_\(portfolio.investorId)")
        
        // Note: CoreData caching logic for the new model structure needs to be updated
        // For now, we rely on OfflineManager (which uses Codable/JSON likely)
        // Future: Update CoreData entities to match new Portfolio structure
    }
    
    // MARK: - Private Methods
    
    private func fetchFromNetwork(investorId: UUID) async throws -> Portfolio {
        print("🌐 Fetching portfolio from network for investor: \(investorId)")

        // 1. Fetch Investor Positions
        // Corresponds to web: .from("investor_positions").select(...)
        let positionsResponse = try await supabaseClient.database
            .from("investor_positions")
            .select("""
                fund_id,
                shares,
                realized_pnl,
                current_value,
                cost_basis,
                funds ( name, asset, code )
            """)
            .eq("investor_id", value: investorId.uuidString)
            .execute()
        
        // 2. Fetch Monthly Reports (for Ledger Columns)
        // Corresponds to web: .from("investor_monthly_reports")...order("report_month", ...)
        let reportsResponse = try await supabaseClient.database
            .from("investor_monthly_reports")
            .select("*")
            .eq("investor_id", value: investorId.uuidString)
            .order("report_month", ascending: false)
            .execute()
        
        // Parse Responses
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase // Handle Supabase snake_case
        decoder.dateDecodingStrategy = .iso8601
        
        let positionsData = try decoder.decode([PositionDTO].self, from: positionsResponse.data)
        let reportsData = try decoder.decode([MonthlyReportDTO].self, from: reportsResponse.data)
        
        // 3. Map to Domain Model
        let assetPositions = positionsData.map { positionDTO -> AssetPosition in
            let rawAssetCode = (positionDTO.funds?.asset ?? "UNITS").uppercased()
            
            // Find latest report for this asset
            let latestReport = reportsData.first { $0.assetCode == rawAssetCode }
            
            return AssetPosition(
                id: UUID(), // Generate ephemeral ID as position view doesn't have one stable ID per se
                fundName: positionDTO.funds?.name ?? "Unknown Fund",
                assetCode: rawAssetCode,
                
                // Ledger Data
                balance: Decimal(string: positionDTO.shares) ?? 0,
                yieldEarned: Decimal(string: positionDTO.realizedPnl ?? "0") ?? 0,
                
                // Report Data (MTD)
                openingBalance: latestReport?.openingBalance ?? 0,
                additions: latestReport?.additions ?? 0,
                withdrawals: latestReport?.withdrawals ?? 0,
                mtdYield: latestReport?.yieldEarned ?? 0
            )
        }
        
        // 4. Calculate Aggregates
        let totalYieldAllTime = assetPositions.reduce(Decimal(0)) { $0 + $1.yieldEarned }
        let totalYieldMonth = assetPositions.reduce(Decimal(0)) { $0 + $1.mtdYield }
        
        return Portfolio(
            id: UUID(), // Ephemeral ID for the portfolio object
            investorId: investorId,
            totalYieldAllTime: totalYieldAllTime,
            totalYieldMonth: totalYieldMonth,
            activePositionsCount: assetPositions.count,
            lastUpdated: Date(),
            assets: assetPositions
        )
    }
    
    private func getCachedPortfolio(for investorId: UUID) async throws -> Portfolio? {
        return try await offlineManager.getCachedData(Portfolio.self, for: "\(cacheKey)_\(investorId)")
    }
    
    private func isCacheExpired(_ portfolio: Portfolio) -> Bool {
        return Date().timeIntervalSince(portfolio.lastUpdated) > cacheExpiryMinutes
    }
    
    private func createDefaultPortfolio(for investorId: UUID) -> Portfolio {
        return Portfolio(
            id: UUID(),
            investorId: investorId,
            totalYieldAllTime: 0,
            totalYieldMonth: 0,
            activePositionsCount: 0,
            lastUpdated: Date(),
            assets: []
        )
    }
}

// MARK: - Data Transfer Objects (DTOs)

private struct PositionDTO: Codable {
    let shares: String
    let realizedPnl: String?
    let currentValue: String?
    let costBasis: String?
    let funds: FundDTO?
    
    enum CodingKeys: String, CodingKey {
        case shares
        case realizedPnl = "realized_pnl"
        case currentValue = "current_value"
        case costBasis = "cost_basis"
        case funds
    }
}

private struct FundDTO: Codable {
    let name: String
    let asset: String
    let code: String
}

private struct MonthlyReportDTO: Codable {
    let assetCode: String
    let openingBalance: Decimal
    let additions: Decimal
    let withdrawals: Decimal
    let yieldEarned: Decimal
    
    enum CodingKeys: String, CodingKey {
        case assetCode = "asset_code"
        case openingBalance = "opening_balance"
        case additions
        case withdrawals
        case yieldEarned = "yield_earned"
    }
}