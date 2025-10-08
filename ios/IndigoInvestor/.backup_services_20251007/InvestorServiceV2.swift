//
//  InvestorServiceV2.swift
//  IndigoInvestor
//
//  Complete investor service matching website functionality
//

import Foundation
import Supabase

// MARK: - Models matching website

struct InvestorPortfolioV2: Codable {
    let portfolioId: String
    let portfolioName: String
    let totalValue: Double
    let totalPnl: Double
    let positions: [InvestorPositionV2]
    let performanceMetrics: PortfolioPerformance

    enum CodingKeys: String, CodingKey {
        case portfolioId = "portfolio_id"
        case portfolioName = "portfolio_name"
        case totalValue = "total_value"
        case totalPnl = "total_pnl"
        case positions
        case performanceMetrics = "performance_metrics"
    }
}

struct InvestorPositionV2: Codable {
    let fundId: String
    let fundName: String
    let fundClass: String
    let asset: String
    let shares: Double
    let costBasis: Double
    let currentValue: Double
    let unrealizedPnl: Double
    let realizedPnl: Double
    let allocationPercentage: Double
    let lastTransactionDate: Date?
    let lockUntilDate: Date?

    enum CodingKeys: String, CodingKey {
        case fundId = "fund_id"
        case fundName = "fund_name"
        case fundClass = "fund_class"
        case asset
        case shares
        case costBasis = "cost_basis"
        case currentValue = "current_value"
        case unrealizedPnl = "unrealized_pnl"
        case realizedPnl = "realized_pnl"
        case allocationPercentage = "allocation_percentage"
        case lastTransactionDate = "last_transaction_date"
        case lockUntilDate = "lock_until_date"
    }
}

struct PortfolioPerformance: Codable {
    let mtdReturn: Double
    let qtdReturn: Double
    let ytdReturn: Double
    let itdReturn: Double
    let mtdPercentage: Double
    let qtdPercentage: Double
    let ytdPercentage: Double
    let itdPercentage: Double

    enum CodingKeys: String, CodingKey {
        case mtdReturn = "mtd_return"
        case qtdReturn = "qtd_return"
        case ytdReturn = "ytd_return"
        case itdReturn = "itd_return"
        case mtdPercentage = "mtd_percentage"
        case qtdPercentage = "qtd_percentage"
        case ytdPercentage = "ytd_percentage"
        case itdPercentage = "itd_percentage"
    }
}

struct YieldHistoryEntry: Codable {
    let date: String
    let asset: String
    let balanceBefore: Double
    let yieldAmount: Double
    let balanceAfter: Double
    let dailyRate: Double
    let annualRate: Double

    enum CodingKeys: String, CodingKey {
        case date
        case asset
        case balanceBefore = "balance_before"
        case yieldAmount = "yield_amount"
        case balanceAfter = "balance_after"
        case dailyRate = "daily_rate"
        case annualRate = "annual_rate"
    }
}

struct WithdrawalRequestV2: Codable {
    let id: String
    let fundId: String
    let fundName: String
    let fundClass: String
    let asset: String
    let requestedAmount: Double
    let approvedAmount: Double?
    let processedAmount: Double?
    let withdrawalType: String
    let status: String
    let notes: String?
    let rejectionReason: String?
    let createdAt: Date
    let approvedAt: Date?
    let settlementDate: Date?
    let txHash: String?

    enum CodingKeys: String, CodingKey {
        case id
        case fundId = "fund_id"
        case fundName = "fund_name"
        case fundClass = "fund_class"
        case asset
        case requestedAmount = "requested_amount"
        case approvedAmount = "approved_amount"
        case processedAmount = "processed_amount"
        case withdrawalType = "withdrawal_type"
        case status
        case notes
        case rejectionReason = "rejection_reason"
        case createdAt = "created_at"
        case approvedAt = "approved_at"
        case settlementDate = "settlement_date"
        case txHash = "tx_hash"
    }
}

// MARK: - Investor Service V2

@MainActor
class InvestorServiceV2: ObservableObject {
    private let supabaseClient: SupabaseClient

    @Published var portfolio: InvestorPortfolioV2?
    @Published var yieldHistory: [YieldHistoryEntry] = []
    @Published var withdrawalRequests: [WithdrawalRequestV2] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    // MARK: - Get Investor Portfolio

    func getInvestorPortfolio() async throws -> InvestorPortfolioV2? {
        guard let user = supabaseClient.auth.currentUser else { return nil }

        // Get investor record
        let investorResponse = try await supabaseClient.database
            .from("investors")
            .select("id")
            .eq("profile_id", value: user.id.uuidString)
            .single()
            .execute()

        guard let investorData = try? JSONDecoder().decode([String: String].self, from: investorResponse.data),
              let investorId = investorData["id"] else {
            return nil
        }

        // Get portfolio
        let portfolioResponse = try? await supabaseClient.database
            .from("portfolios_v2")
            .select("id, name")
            .eq("owner_user_id", value: user.id.uuidString)
            .single()
            .execute()

        var portfolioId: String?
        var portfolioName: String?

        if let portfolioData = portfolioResponse?.data,
           let portfolio = try? JSONDecoder().decode([String: String].self, from: portfolioData) {
            portfolioId = portfolio["id"]
            portfolioName = portfolio["name"]
        }

        // Get all positions for this investor
        let positionsResponse = try await supabaseClient.database
            .from("investor_positions")
            .select("""
                fund_id,
                fund_class,
                shares,
                cost_basis,
                current_value,
                unrealized_pnl,
                realized_pnl,
                last_transaction_date,
                lock_until_date,
                funds!inner(name, asset)
            """)
            .eq("investor_id", value: investorId)
            .execute()

        let positionsData = try JSONDecoder().decode([[String: AnyDecodable]].self, from: positionsResponse.data)

        let totalValue = positionsData.reduce(0) { sum, pos in
            sum + (pos["current_value"]?.doubleValue ?? 0)
        }

        let totalPnL = positionsData.reduce(0) { sum, pos in
            sum + (pos["unrealized_pnl"]?.doubleValue ?? 0) + (pos["realized_pnl"]?.doubleValue ?? 0)
        }

        let positions: [InvestorPositionV2] = positionsData.compactMap { pos in
            guard let fundId = pos["fund_id"]?.stringValue,
                  let fundsData = pos["funds"]?.dictionaryValue,
                  let fundName = fundsData["name"]?.stringValue,
                  let asset = fundsData["asset"]?.stringValue else {
                return nil
            }

            let currentValue = pos["current_value"]?.doubleValue ?? 0

            return InvestorPositionV2(
                fundId: fundId,
                fundName: fundName,
                fundClass: pos["fund_class"]?.stringValue ?? "",
                asset: asset,
                shares: pos["shares"]?.doubleValue ?? 0,
                costBasis: pos["cost_basis"]?.doubleValue ?? 0,
                currentValue: currentValue,
                unrealizedPnl: pos["unrealized_pnl"]?.doubleValue ?? 0,
                realizedPnl: pos["realized_pnl"]?.doubleValue ?? 0,
                allocationPercentage: totalValue > 0 ? (currentValue / totalValue) * 100 : 0,
                lastTransactionDate: nil, // TODO: Parse date
                lockUntilDate: nil // TODO: Parse date
            )
        }

        // Calculate performance metrics
        let performanceMetrics = PortfolioPerformance(
            mtdReturn: 0,
            qtdReturn: 0,
            ytdReturn: totalPnL,
            itdReturn: totalPnL,
            mtdPercentage: 0,
            qtdPercentage: 0,
            ytdPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0,
            itdPercentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0
        )

        return InvestorPortfolioV2(
            portfolioId: portfolioId ?? UUID().uuidString,
            portfolioName: portfolioName ?? "My Portfolio",
            totalValue: totalValue,
            totalPnl: totalPnL,
            positions: positions,
            performanceMetrics: performanceMetrics
        )
    }

    // MARK: - Get Yield History

    func getYieldHistory(days: Int = 30) async throws -> [YieldHistoryEntry] {
        guard let user = supabaseClient.auth.currentUser else { return [] }

        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime]

        let response = try await supabaseClient.database
            .from("yield_distribution_log")
            .select("""
                application_date,
                asset_code,
                balance_before,
                yield_amount,
                balance_after,
                daily_yield_applications!inner(daily_yield_percentage)
            """)
            .eq("user_id", value: user.id.uuidString)
            .gte("application_date", value: dateFormatter.string(from: startDate))
            .order("application_date", ascending: false)
            .execute()

        let data = try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)

        return data.compactMap { entry in
            guard let date = entry["application_date"]?.stringValue,
                  let assetCode = entry["asset_code"]?.stringValue,
                  let dailyYieldApp = entry["daily_yield_applications"]?.dictionaryValue,
                  let dailyRate = dailyYieldApp["daily_yield_percentage"]?.doubleValue else {
                return nil
            }

            return YieldHistoryEntry(
                date: date,
                asset: assetCode,
                balanceBefore: entry["balance_before"]?.doubleValue ?? 0,
                yieldAmount: entry["yield_amount"]?.doubleValue ?? 0,
                balanceAfter: entry["balance_after"]?.doubleValue ?? 0,
                dailyRate: dailyRate,
                annualRate: dailyRate * 365
            )
        }
    }

    // MARK: - Get Withdrawal Requests

    func getWithdrawalRequests() async throws -> [WithdrawalRequestV2] {
        guard let user = supabaseClient.auth.currentUser else { return [] }

        // Get investor record
        let investorResponse = try await supabaseClient.database
            .from("investors")
            .select("id")
            .eq("profile_id", value: user.id.uuidString)
            .single()
            .execute()

        guard let investorData = try? JSONDecoder().decode([String: String].self, from: investorResponse.data),
              let investorId = investorData["id"] else {
            return []
        }

        let response = try await supabaseClient.database
            .from("withdrawal_requests")
            .select("""
                *,
                funds!inner(name, asset, fund_class)
            """)
            .eq("investor_id", value: investorId)
            .order("created_at", ascending: false)
            .execute()

        let data = try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)

        return data.compactMap { request in
            guard let id = request["id"]?.stringValue,
                  let fundId = request["fund_id"]?.stringValue,
                  let fundsData = request["funds"]?.dictionaryValue,
                  let fundName = fundsData["name"]?.stringValue,
                  let asset = fundsData["asset"]?.stringValue,
                  let status = request["status"]?.stringValue else {
                return nil
            }

            return WithdrawalRequestV2(
                id: id,
                fundId: fundId,
                fundName: fundName,
                fundClass: fundsData["fund_class"]?.stringValue ?? "",
                asset: asset,
                requestedAmount: request["requested_amount"]?.doubleValue ?? 0,
                approvedAmount: request["approved_amount"]?.doubleValue,
                processedAmount: request["processed_amount"]?.doubleValue,
                withdrawalType: request["withdrawal_type"]?.stringValue ?? "partial",
                status: status,
                notes: request["notes"]?.stringValue,
                rejectionReason: request["rejection_reason"]?.stringValue,
                createdAt: Date(), // TODO: Parse date from request["request_date"]
                approvedAt: nil, // TODO: Parse date
                settlementDate: nil, // TODO: Parse date
                txHash: request["tx_hash"]?.stringValue
            )
        }
    }

    // MARK: - Create Withdrawal Request

    func createWithdrawalRequest(fundId: String, amount: Double, withdrawalType: String = "partial", notes: String? = nil) async throws -> String {
        guard let user = supabaseClient.auth.currentUser else {
            throw NSError(domain: "InvestorServiceV2", code: 0, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }

        // Get investor record
        let investorResponse = try await supabaseClient.database
            .from("investors")
            .select("id")
            .eq("profile_id", value: user.id.uuidString)
            .single()
            .execute()

        guard let investorData = try? JSONDecoder().decode([String: String].self, from: investorResponse.data),
              let investorId = investorData["id"] else {
            throw NSError(domain: "InvestorServiceV2", code: 0, userInfo: [NSLocalizedDescriptionKey: "Investor profile not found"])
        }

        let params: [String: AnyDecodable] = [
            "p_investor_id": AnyDecodable(investorId),
            "p_fund_id": AnyDecodable(fundId),
            "p_amount": AnyDecodable(amount),
            "p_type": AnyDecodable(withdrawalType),
            "p_notes": AnyDecodable(notes)
        ]

        let response = try await supabaseClient.database.rpc("create_withdrawal_request", params: params).execute()

        if let result = try? JSONDecoder().decode(String.self, from: response.data) {
            return result
        }

        return "Withdrawal request created"
    }

    // MARK: - Cancel Withdrawal Request

    func cancelWithdrawalRequest(requestId: String, reason: String? = nil) async throws {
        _ = try await supabaseClient.database
            .from("withdrawal_requests")
            .update([
                "status": "cancelled",
                "cancellation_reason": reason ?? "Cancelled by investor",
                "cancelled_at": ISO8601DateFormatter().string(from: Date())
            ])
            .eq("id", value: requestId)
            .eq("status", value: "pending")
            .execute()
    }

    // MARK: - Get Available Funds

    func getAvailableFunds() async throws -> [[String: AnyDecodable]] {
        let response = try await supabaseClient.database
            .from("funds")
            .select("*")
            .eq("status", value: "active")
            .order("name")
            .execute()

        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }

    // MARK: - Get Current Yield Rates

    func getCurrentYieldRates() async throws -> [[String: Any]] {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10) // Get YYYY-MM-DD

        let response = try await supabaseClient.database
            .from("yield_rates")
            .select("""
                daily_yield_percentage,
                assets!inner(symbol, name)
            """)
            .eq("date", value: String(today))
            .execute()

        let data = try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)

        return data.compactMap { rate in
            guard let assetsData = rate["assets"]?.dictionaryValue,
                  let symbol = assetsData["symbol"]?.stringValue,
                  let name = assetsData["name"]?.stringValue,
                  let dailyRate = rate["daily_yield_percentage"]?.doubleValue else {
                return nil
            }

            return [
                "asset_symbol": symbol,
                "asset_name": name,
                "daily_rate": dailyRate,
                "annual_rate": dailyRate * 365
            ]
        }
    }

    // MARK: - Get Investor Documents

    func getInvestorDocuments() async throws -> [[String: AnyDecodable]] {
        guard let user = supabaseClient.auth.currentUser else { return [] }

        let response = try await supabaseClient.database
            .from("documents")
            .select("*")
            .eq("user_id", value: user.id.uuidString)
            .order("created_at", ascending: false)
            .execute()

        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }

    // MARK: - Get Portfolio Performance History

    func getPortfolioPerformanceHistory(days: Int = 30) async throws -> [[String: AnyDecodable]] {
        guard let user = supabaseClient.auth.currentUser else { return [] }

        // Get portfolio
        let portfolioResponse = try? await supabaseClient.database
            .from("portfolios_v2")
            .select("id")
            .eq("owner_user_id", value: user.id.uuidString)
            .single()
            .execute()

        guard let portfolioData = portfolioResponse?.data,
              let portfolio = try? JSONDecoder().decode([String: String].self, from: portfolioData),
              let portfolioId = portfolio["id"] else {
            return []
        }

        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        let dateFormatter = ISO8601DateFormatter()

        let response = try await supabaseClient.database
            .from("portfolio_nav_snapshots")
            .select("*")
            .eq("portfolio_id", value: portfolioId)
            .gte("as_of", value: dateFormatter.string(from: startDate))
            .order("as_of", ascending: true)
            .execute()

        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }
}