//
//  PortfolioRepository.swift
//  IndigoInvestor
//
//  Portfolio repository with Supabase integration and offline caching
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
            // If network fails, return stale cache if available
            if let stalePortfolio = try await getCachedPortfolio(for: investorId) {
                print("⚠️ Using stale cache due to network error: \(error)")
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
        // Cache in memory/persistent storage
        try await offlineManager.cacheData(portfolio, for: "\(cacheKey)_\(portfolio.investorId)")
        
        // Also cache in Core Data for offline access
        try await saveToCoreData(portfolio)
    }
    
    // MARK: - Private Methods
    
    private func fetchFromNetwork(investorId: UUID) async throws -> Portfolio {
        print("🌐 Fetching portfolio from network for investor: \(investorId)")

        do {
            // Fetch main portfolio data
            let portfolioResponse = try await supabaseClient.database
                .from("portfolios")
                .select("""
                    id, investor_id, total_value, total_cost, total_gain, total_gain_percent,
                    day_change, day_change_percent, week_change, week_change_percent,
                    month_change, month_change_percent, year_change, year_change_percent,
                    last_updated
                """)
                .eq("investor_id", value: investorId.uuidString)
                .single()
                .execute()

            print("✅ Portfolio data fetched successfully")

        } catch {
            print("❌ Failed to fetch portfolio data: \(error)")

            // If no portfolio found, create a default empty portfolio
            if error.localizedDescription.contains("No rows") ||
               error.localizedDescription.contains("not found") {
                print("⚠️ No portfolio found, creating default empty portfolio")
                return createDefaultPortfolio(for: investorId)
            }

            throw error
        }
        
        // Fetch positions
        let positionsResponse = try await supabaseClient.database
            .from("positions")
            .select("""
                id, portfolio_id, investor_id, asset_symbol, asset_name,
                quantity, average_cost, current_price, market_value,
                total_gain, total_gain_percent, day_change, day_change_percent,
                allocation
            """)
            .eq("investor_id", value: investorId.uuidString)
            .execute()
        
        // Fetch asset allocation
        let allocationResponse = try await supabaseClient.database
            .from("asset_allocations")
            .select("asset_type, value, percentage, color")
            .eq("investor_id", value: investorId.uuidString)
            .execute()
        
        // Fetch performance history (last 30 days)
        let performanceResponse = try await supabaseClient.database
            .from("portfolio_performance")
            .select("date, value, gain, gain_percent")
            .eq("investor_id", value: investorId.uuidString)
            .gte("date", value: Calendar.current.date(byAdding: .day, value: -30, to: Date())?.iso8601String ?? "")
            .order("date", ascending: true)
            .execute()
        
        // Parse responses
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        // Decode main portfolio
        let portfolioData = try decoder.decode(PortfolioNetworkModel.self, from: portfolioResponse.data)
        
        // Decode positions
        let positions = try decoder.decode([PositionNetworkModel].self, from: positionsResponse.data)
            .map { $0.toDomainModel() }
        
        // Decode asset allocation
        let allocations = try decoder.decode([AssetAllocationNetworkModel].self, from: allocationResponse.data)
            .map { $0.toDomainModel() }
        
        // Decode performance history
        let performance = try decoder.decode([PerformanceDataNetworkModel].self, from: performanceResponse.data)
            .map { $0.toDomainModel() }
        
        // Convert to domain model
        let portfolio = portfolioData.toDomainModel(
            positions: positions,
            assetAllocation: allocations,
            performanceHistory: performance
        )
        
        print("✅ Fetched portfolio from network for investor: \(investorId)")
        return portfolio
    }
    
    private func getCachedPortfolio(for investorId: UUID) async throws -> Portfolio? {
        return try await offlineManager.getCachedData(Portfolio.self, for: "\(cacheKey)_\(investorId)")
    }
    
    private func isCacheExpired(_ portfolio: Portfolio) -> Bool {
        return Date().timeIntervalSince(portfolio.lastUpdated) > cacheExpiryMinutes
    }
    
    private func saveToCoreData(_ portfolio: Portfolio) async throws {
        try await coreDataStack.performBackgroundTask { context in
            // Check if portfolio entity exists
            let fetchRequest = NSFetchRequest<PortfolioEntity>(entityName: "PortfolioEntity")
            fetchRequest.predicate = NSPredicate(format: "id == %@", portfolio.id as CVarArg)
            
            let existingPortfolio = try context.fetch(fetchRequest).first
            let portfolioEntity = existingPortfolio ?? PortfolioEntity(context: context)
            
            // Update portfolio entity
            portfolioEntity.id = portfolio.id
            portfolioEntity.investorId = portfolio.investorId
            portfolioEntity.totalValue = NSDecimalNumber(decimal: portfolio.totalValue)
            portfolioEntity.totalCost = NSDecimalNumber(decimal: portfolio.totalCost)
            portfolioEntity.totalGain = NSDecimalNumber(decimal: portfolio.totalGain)
            portfolioEntity.totalGainPercent = portfolio.totalGainPercent
            portfolioEntity.dayChange = NSDecimalNumber(decimal: portfolio.dayChange)
            portfolioEntity.dayChangePercent = portfolio.dayChangePercent
            portfolioEntity.lastUpdated = portfolio.lastUpdated
            
            // Save context
            if context.hasChanges {
                try context.save()
            }
        }
    }
}

// MARK: - Network Models

private struct PortfolioNetworkModel: Codable {
    let id: UUID
    let investorId: UUID
    let totalValue: Decimal
    let totalCost: Decimal
    let totalGain: Decimal
    let totalGainPercent: Double
    let dayChange: Decimal
    let dayChangePercent: Double
    let weekChange: Decimal
    let weekChangePercent: Double
    let monthChange: Decimal
    let monthChangePercent: Double
    let yearChange: Decimal
    let yearChangePercent: Double
    let lastUpdated: Date
    
    func toDomainModel(positions: [Position], assetAllocation: [AssetAllocation], performanceHistory: [PerformanceData]) -> Portfolio {
        return Portfolio(
            id: id,
            investorId: investorId,
            totalValue: totalValue,
            totalCost: totalCost,
            totalGain: totalGain,
            totalGainPercent: totalGainPercent,
            dayChange: dayChange,
            dayChangePercent: dayChangePercent,
            weekChange: weekChange,
            weekChangePercent: weekChangePercent,
            monthChange: monthChange,
            monthChangePercent: monthChangePercent,
            yearChange: yearChange,
            yearChangePercent: yearChangePercent,
            lastUpdated: lastUpdated,
            positions: positions,
            assetAllocation: assetAllocation,
            performanceHistory: performanceHistory
        )
    }
}

private struct PositionNetworkModel: Codable {
    let id: UUID
    let portfolioId: UUID
    let investorId: UUID
    let assetSymbol: String
    let assetName: String
    let quantity: Decimal
    let averageCost: Decimal
    let currentPrice: Decimal
    let marketValue: Decimal
    let totalGain: Decimal
    let totalGainPercent: Double
    let dayChange: Decimal
    let dayChangePercent: Double
    let allocation: Double
    
    func toDomainModel() -> Position {
        return Position(
            id: id,
            portfolioId: portfolioId,
            assetSymbol: assetSymbol,
            assetName: assetName,
            quantity: quantity,
            averageCost: averageCost,
            currentPrice: currentPrice,
            marketValue: marketValue,
            totalGain: totalGain,
            totalGainPercent: totalGainPercent,
            dayChange: dayChange,
            dayChangePercent: dayChangePercent,
            allocation: allocation
        )
    }
}

private struct AssetAllocationNetworkModel: Codable {
    let assetType: String
    let value: Decimal
    let percentage: Double
    let color: String
    
    func toDomainModel() -> AssetAllocation {
        return AssetAllocation(
            assetType: assetType,
            value: value,
            percentage: percentage,
            color: color
        )
    }
}

private struct PerformanceDataNetworkModel: Codable {
    let date: Date
    let value: Decimal
    let gain: Decimal
    let gainPercent: Double
    
    func toDomainModel() -> PerformanceData {
        return PerformanceData(
            date: date,
            value: value,
            gain: gain,
            gainPercent: gainPercent
        )
    }
}

// MARK: - Core Data Entity (Reference)
// Note: This would be defined in the Core Data model file

@objc(PortfolioEntity)
class PortfolioEntity: NSManagedObject {
    @NSManaged var id: UUID
    @NSManaged var investorId: UUID
    @NSManaged var totalValue: NSDecimalNumber
    @NSManaged var totalCost: NSDecimalNumber
    @NSManaged var totalGain: NSDecimalNumber
    @NSManaged var totalGainPercent: Double
    @NSManaged var dayChange: NSDecimalNumber
    @NSManaged var dayChangePercent: Double
    @NSManaged var lastUpdated: Date
}

    // MARK: - Default Portfolio Creation

    private func createDefaultPortfolio(for investorId: UUID) -> Portfolio {
        return Portfolio(
            id: UUID(),
            investorId: investorId,
            totalValue: 0,
            totalCost: 0,
            totalGain: 0,
            totalGainPercent: 0.0,
            dayChange: 0,
            dayChangePercent: 0.0,
            weekChange: 0,
            weekChangePercent: 0.0,
            monthChange: 0,
            monthChangePercent: 0.0,
            yearChange: 0,
            yearChangePercent: 0.0,
            lastUpdated: Date(),
            positions: [],
            assetAllocation: [],
            performanceHistory: []
        )
    }
}

// MARK: - Extensions

extension Date {
    var iso8601String: String {
        return ISO8601DateFormatter().string(from: self)
    }
}
