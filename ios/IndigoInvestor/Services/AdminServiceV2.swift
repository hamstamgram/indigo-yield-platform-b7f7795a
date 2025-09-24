//
//  AdminServiceV2.swift
//  IndigoInvestor
//
//  Complete admin service matching website functionality
//

import Foundation
import Supabase

// MARK: - Models matching website

struct InvestorSummaryV2: Codable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let totalAum: Double
    let status: String
    let kycStatus: String
    let onboardingDate: Date?
    let lastStatementDate: Date?
    let portfolioDetails: PortfolioDetailsV2

    enum CodingKeys: String, CodingKey {
        case id, email
        case firstName = "first_name"
        case lastName = "last_name"
        case totalAum = "total_aum"
        case status
        case kycStatus = "kyc_status"
        case onboardingDate = "onboarding_date"
        case lastStatementDate = "last_statement_date"
        case portfolioDetails = "portfolio_details"
    }
}

struct PortfolioDetailsV2: Codable {
    let assetBreakdown: [String: Double]
    let performanceMetrics: PerformanceMetricsV2

    enum CodingKeys: String, CodingKey {
        case assetBreakdown = "asset_breakdown"
        case performanceMetrics = "performance_metrics"
    }
}

struct PerformanceMetricsV2: Codable {
    let totalReturn: Double
    let monthlyReturn: Double
    let sharpeRatio: Double

    enum CodingKeys: String, CodingKey {
        case totalReturn = "total_return"
        case monthlyReturn = "monthly_return"
        case sharpeRatio = "sharpe_ratio"
    }
}

struct DashboardStatsV2: Codable {
    let totalAum: Double
    let investorCount: Int
    let pendingWithdrawals: Int
    let interest24h: Double

    enum CodingKeys: String, CodingKey {
        case totalAum = "total_aum"
        case investorCount = "investor_count"
        case pendingWithdrawals = "pending_withdrawals"
        case interest24h = "interest_24h"
    }
}

struct InvestorPositionDetail: Codable {
    let fundId: String
    let fundName: String
    let fundCode: String
    let asset: String
    let fundClass: String
    let shares: Double
    let currentValue: Double
    let costBasis: Double
    let unrealizedPnl: Double
    let realizedPnl: Double
    let lastTransactionDate: Date?
    let lockUntilDate: Date?

    enum CodingKeys: String, CodingKey {
        case fundId = "fund_id"
        case fundName = "fund_name"
        case fundCode = "fund_code"
        case asset
        case fundClass = "fund_class"
        case shares
        case currentValue = "current_value"
        case costBasis = "cost_basis"
        case unrealizedPnl = "unrealized_pnl"
        case realizedPnl = "realized_pnl"
        case lastTransactionDate = "last_transaction_date"
        case lockUntilDate = "lock_until_date"
    }
}

// MARK: - Admin Service V2

@MainActor
class AdminServiceV2: ObservableObject {
    private let supabaseClient: SupabaseClient

    @Published var dashboardStats: DashboardStatsV2?
    @Published var investors: [InvestorSummaryV2] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    // MARK: - Dashboard Stats

    func getDashboardStats() async throws -> DashboardStatsV2 {
        // Get total AUM from actual positions
        let positionsResponse = try await supabaseClient.database
            .from("positions")
            .select("current_balance, asset_code")
            .gt("current_balance", value: 0)
            .execute()

        let positions = try JSONDecoder().decode([[String: AnyDecodable]].self, from: positionsResponse.data)
        let totalAum = positions.reduce(0) { sum, pos in
            sum + (pos["current_balance"]?.doubleValue ?? 0)
        }

        // Get investor count
        let investorsResponse = try await supabaseClient.database
            .from("profiles")
            .select("""
                id,
                positions!inner (
                    current_balance
                )
            """)
            .eq("is_admin", value: false)
            .gt("positions.current_balance", value: 0)
            .execute()

        let investorsData = try JSONDecoder().decode([[String: AnyDecodable]].self, from: investorsResponse.data)
        let investorCount = investorsData.count

        // Get pending withdrawals
        let withdrawalsResponse = try await supabaseClient.database
            .from("withdrawal_requests")
            .select("id")
            .in("status", values: ["pending", "approved"])
            .execute()

        let withdrawalsData = try JSONDecoder().decode([[String: AnyDecodable]].self, from: withdrawalsResponse.data)
        let pendingWithdrawals = withdrawalsData.count

        // Calculate estimated daily yield (7.2% APY on total AUM)
        let interest24h = totalAum * 0.072 / 365

        return DashboardStatsV2(
            totalAum: totalAum,
            investorCount: investorCount,
            pendingWithdrawals: pendingWithdrawals,
            interest24h: interest24h
        )
    }

    // MARK: - Get All Investors

    func getAllInvestorsWithSummary() async throws -> [InvestorSummaryV2] {
        // Step 1: Get all non-admin profiles
        let profilesResponse = try await supabaseClient.database
            .from("profiles")
            .select("""
                id,
                email,
                first_name,
                last_name,
                created_at
            """)
            .eq("is_admin", value: false)
            .order("created_at", ascending: false)
            .execute()

        guard profilesResponse.data.count > 0 else {
            return []
        }

        let profiles = try JSONDecoder().decode([[String: AnyDecodable]].self, from: profilesResponse.data)
        let userIds = profiles.compactMap { $0["id"]?.stringValue }

        guard !userIds.isEmpty else {
            return []
        }

        // Step 2: Get all positions for these users
        let positionsResponse = try await supabaseClient.database
            .from("positions")
            .select("""
                user_id,
                asset_code,
                current_balance,
                total_earned,
                principal
            """)
            .in("user_id", values: userIds)
            .gt("current_balance", value: 0)
            .execute()

        let positions = try? JSONDecoder().decode([[String: AnyDecodable]].self, from: positionsResponse.data) ?? []

        // Step 3: Get investor data if available
        let investorsResponse = try await supabaseClient.database
            .from("investors")
            .select("""
                profile_id,
                status,
                kyc_status,
                onboarding_date
            """)
            .in("profile_id", values: userIds)
            .execute()

        let investorsData = try? JSONDecoder().decode([[String: AnyDecodable]].self, from: investorsResponse.data) ?? []

        // Step 4: Combine all data
        return profiles.compactMap { profile in
            guard let profileId = profile["id"]?.stringValue,
                  let email = profile["email"]?.stringValue else {
                return nil
            }

            // Get positions for this profile
            let userPositions = positions.filter { $0["user_id"]?.stringValue == profileId }

            // Get investor data for this profile
            let investorData = investorsData.first { $0["profile_id"]?.stringValue == profileId }

            // Calculate total AUM
            let totalAum = userPositions.reduce(0) { sum, pos in
                sum + (pos["current_balance"]?.doubleValue ?? 0)
            }

            // Create asset breakdown
            var assetBreakdown: [String: Double] = [:]
            userPositions.forEach { pos in
                if let assetCode = pos["asset_code"]?.stringValue,
                   let balance = pos["current_balance"]?.doubleValue,
                   balance > 0 {
                    assetBreakdown[assetCode] = balance
                }
            }

            // Calculate performance metrics
            let totalEarned = userPositions.reduce(0) { sum, pos in
                sum + (pos["total_earned"]?.doubleValue ?? 0)
            }
            let totalPrincipal = userPositions.reduce(0) { sum, pos in
                sum + (pos["principal"]?.doubleValue ?? 0)
            }

            let totalReturn = totalPrincipal > 0 ? totalEarned / totalPrincipal : 0

            let portfolioDetails = PortfolioDetailsV2(
                assetBreakdown: assetBreakdown,
                performanceMetrics: PerformanceMetricsV2(
                    totalReturn: totalReturn,
                    monthlyReturn: totalReturn / 12,
                    sharpeRatio: totalReturn > 0 ? min(totalReturn * 2, 3) : 0
                )
            )

            return InvestorSummaryV2(
                id: profileId,
                email: email,
                firstName: profile["first_name"]?.stringValue ?? "",
                lastName: profile["last_name"]?.stringValue ?? "",
                totalAum: totalAum,
                status: investorData?["status"]?.stringValue ?? "active",
                kycStatus: investorData?["kyc_status"]?.stringValue ?? "pending",
                onboardingDate: nil, // TODO: Parse date
                lastStatementDate: nil,
                portfolioDetails: portfolioDetails
            )
        }
    }

    // MARK: - Get Investor Positions

    func getInvestorPositions(investorId: String) async throws -> [InvestorPositionDetail] {
        // Get positions from the actual positions table
        let positionsResponse = try await supabaseClient.database
            .from("positions")
            .select("""
                asset_code,
                current_balance,
                total_earned,
                principal,
                updated_at,
                last_modified_at
            """)
            .eq("user_id", value: investorId)
            .gt("current_balance", value: 0)
            .execute()

        let positions = try JSONDecoder().decode([[String: AnyDecodable]].self, from: positionsResponse.data)

        // Also get investor_positions data if available
        let fundPositionsResponse = try await supabaseClient.database
            .from("investor_positions")
            .select("""
                *,
                funds (
                    name,
                    code,
                    asset,
                    fund_class
                )
            """)
            .eq("investor_id", value: investorId)
            .execute()

        let fundPositions = try? JSONDecoder().decode([[String: AnyDecodable]].self, from: fundPositionsResponse.data) ?? []

        // Combine both data sources
        var combinedPositions: [InvestorPositionDetail] = []

        // Add positions from positions table
        positions.forEach { pos in
            guard let assetCode = pos["asset_code"]?.stringValue else { return }

            let fundPosition = fundPositions.first { fp in
                fp["funds"]?.dictionaryValue?["asset"]?.stringValue == assetCode
            }

            let fundData = fundPosition?["funds"]?.dictionaryValue

            let detail = InvestorPositionDetail(
                fundId: fundPosition?["fund_id"]?.stringValue ?? UUID().uuidString,
                fundName: fundData?["name"]?.stringValue ?? "\(assetCode) Position",
                fundCode: fundData?["code"]?.stringValue ?? assetCode,
                asset: assetCode,
                fundClass: fundPosition?["fund_class"]?.stringValue ?? "Standard",
                shares: pos["current_balance"]?.doubleValue ?? 0,
                currentValue: pos["current_balance"]?.doubleValue ?? 0,
                costBasis: pos["principal"]?.doubleValue ?? 0,
                unrealizedPnl: pos["total_earned"]?.doubleValue ?? 0,
                realizedPnl: 0,
                lastTransactionDate: nil, // TODO: Parse date
                lockUntilDate: nil // TODO: Parse date
            )

            combinedPositions.append(detail)
        }

        return combinedPositions
    }

    // MARK: - Withdrawal Management

    func getWithdrawalRequests(status: String? = nil) async throws -> [[String: AnyDecodable]] {
        var query = supabaseClient.database
            .from("withdrawal_requests")
            .select("""
                *,
                investors!inner(name, email),
                funds!inner(name, asset, fund_class)
            """)
            .order("created_at", ascending: false)

        if let status = status {
            query = query.eq("status", value: status)
        }

        let response = try await query.execute()
        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }

    func approveWithdrawal(requestId: String, approvedAmount: Double? = nil, adminNotes: String? = nil) async throws {
        let params: [String: AnyDecodable] = [
            "p_request_id": AnyDecodable(requestId),
            "p_approved_amount": AnyDecodable(approvedAmount),
            "p_admin_notes": AnyDecodable(adminNotes)
        ]

        _ = try await supabaseClient.database.rpc("approve_withdrawal", params: params).execute()
    }

    func rejectWithdrawal(requestId: String, reason: String, adminNotes: String? = nil) async throws {
        let params: [String: AnyDecodable] = [
            "p_request_id": AnyDecodable(requestId),
            "p_reason": AnyDecodable(reason),
            "p_admin_notes": AnyDecodable(adminNotes)
        ]

        _ = try await supabaseClient.database.rpc("reject_withdrawal", params: params).execute()
    }

    // MARK: - Recent Transactions

    func getRecentTransactions(limit: Int = 50) async throws -> [[String: AnyDecodable]] {
        let response = try await supabaseClient.database
            .from("transactions_v2")
            .select("""
                *,
                portfolios_v2!inner(
                    name,
                    profiles!inner(first_name, last_name, email)
                ),
                assets_v2!inner(name, symbol)
            """)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()

        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }

    // MARK: - Create Investor Profile

    func createInvestorProfile(email: String, firstName: String, lastName: String, phone: String? = nil) async throws -> [String: AnyDecodable] {
        let params: [String: AnyDecodable] = [
            "p_email": AnyDecodable(email),
            "p_first_name": AnyDecodable(firstName),
            "p_last_name": AnyDecodable(lastName),
            "p_phone": AnyDecodable(phone),
            "p_send_invite": AnyDecodable(true)
        ]

        let response = try await supabaseClient.database.rpc("create_investor_profile", params: params).execute()
        return try JSONDecoder().decode([String: AnyDecodable].self, from: response.data)
    }

    // MARK: - Update Investor Status

    func updateInvestorStatus(investorId: String, status: String) async throws {
        _ = try await supabaseClient.database
            .from("investors")
            .update(["status": status, "updated_at": ISO8601DateFormatter().string(from: Date())])
            .eq("id", value: investorId)
            .execute()
    }

    // MARK: - Audit Logs

    func getAuditLogs(limit: Int = 100) async throws -> [[String: AnyDecodable]] {
        let response = try await supabaseClient.database
            .from("audit_log")
            .select("""
                *,
                profiles!inner(first_name, last_name, email)
            """)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()

        return try JSONDecoder().decode([[String: AnyDecodable]].self, from: response.data)
    }
}

// MARK: - Helper for decoding Any types

struct AnyDecodable: Decodable {
    let value: Any

    var stringValue: String? { value as? String }
    var doubleValue: Double? { value as? Double }
    var intValue: Int? { value as? Int }
    var boolValue: Bool? { value as? Bool }
    var dictionaryValue: [String: AnyDecodable]? { value as? [String: AnyDecodable] }
    var arrayValue: [AnyDecodable]? { value as? [AnyDecodable] }

    init(_ value: Any?) {
        self.value = value ?? NSNull()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyDecodable].self) {
            value = array
        } else if let dictionary = try? container.decode([String: AnyDecodable].self) {
            value = dictionary
        } else {
            value = NSNull()
        }
    }
}