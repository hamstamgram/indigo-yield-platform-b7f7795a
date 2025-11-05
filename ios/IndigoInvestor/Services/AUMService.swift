//
//  AUMService.swift
//  IndigoInvestor
//
//  AUM (Assets Under Management) Service
//  Handles fund AUM management and yield distribution
//

import Foundation
import Supabase

// MARK: - Models

struct FundAUM: Codable {
    let id: String
    let fundId: String
    let aumDate: String
    let totalAum: Double
    let investorCount: Int
    let updatedBy: String?
    let createdAt: String
    let updatedAt: String
    let fund: Fund?

    enum CodingKeys: String, CodingKey {
        case id
        case fundId = "fund_id"
        case aumDate = "aum_date"
        case totalAum = "total_aum"
        case investorCount = "investor_count"
        case updatedBy = "updated_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case fund
    }
}

struct YieldDistributionResult: Codable {
    let success: Bool
    let applicationId: String
    let fundAum: Double
    let totalYieldGenerated: Double
    let investorsAffected: Int

    enum CodingKeys: String, CodingKey {
        case success
        case applicationId = "application_id"
        case fundAum = "fund_aum"
        case totalYieldGenerated = "total_yield_generated"
        case investorsAffected = "investors_affected"
    }
}

// Define InvestorSummary for decoding nested investor data
struct InvestorSummary: Codable {
    let name: String?
    let email: String?
    let profile: InvestorProfile?

    struct InvestorProfile: Codable {
        let firstName: String?
        let lastName: String?

        enum CodingKeys: String, CodingKey {
            case firstName = "first_name"
            case lastName = "last_name"
        }
    }
}

struct FundInvestorPosition: Codable {
    let investorId: String
    let fundId: String
    let fundClass: String?
    let shares: Double
    let costBasis: Double
    let currentValue: Double
    let unrealizedPnl: Double?
    let realizedPnl: Double?
    let aumPercentage: Double?
    let investor: InvestorSummary?

    enum CodingKeys: String, CodingKey {
        case investorId = "investor_id"
        case fundId = "fund_id"
        case fundClass = "fund_class"
        case shares
        case costBasis = "cost_basis"
        case currentValue = "current_value"
        case unrealizedPnl = "unrealized_pnl"
        case realizedPnl = "realized_pnl"
        case aumPercentage = "aum_percentage"
        case investor
    }
}

struct FundWithAUM: Codable {
    let id: String
    let code: String
    let name: String
    let asset: String
    let fundClass: String
    let status: String
    let latestAum: Double
    let latestAumDate: String?
    let investorCount: Int

    enum CodingKeys: String, CodingKey {
        case id, code, name, asset
        case fundClass = "fund_class"
        case status
        case latestAum = "latest_aum"
        case latestAumDate = "latest_aum_date"
        case investorCount = "investor_count"
    }
}

// MARK: - AUM Service

@MainActor
class AUMService: ObservableObject {
    private let supabase: SupabaseClient

    @Published var fundAUMHistory: [FundAUM] = []
    @Published var allFundsWithAUM: [FundWithAUM] = []
    @Published var fundInvestorPositions: [FundInvestorPosition] = []
    @Published var isLoading = false
    @Published var error: String?

    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }

    // MARK: - Set Daily AUM

    func setFundDailyAUM(fundId: String, aumAmount: Double, aumDate: String? = nil) async -> (success: Bool, data: Any?, error: String?) {
        do {
            let params: [String: Any] = [
                "p_fund_id": fundId,
                "p_aum_amount": aumAmount,
                "p_aum_date": aumDate ?? ISO8601DateFormatter().string(from: Date()).split(separator: "T").first.map(String.init) ?? ""
            ]

            let response = try await supabase
                .rpc("set_fund_daily_aum", params: params)
                .execute()

            return (success: true, data: response.data, error: nil)
        } catch {
            print("Error setting fund daily AUM: \(error)")
            return (success: false, data: nil, error: error.localizedDescription)
        }
    }

    // MARK: - Get Fund AUM History

    func getFundAUMHistory(fundId: String? = nil, startDate: String? = nil, endDate: String? = nil) async -> [FundAUM] {
        do {
            var query = supabase
                .from("fund_daily_aum")
                .select("""
                    *,
                    fund:funds (
                        code,
                        name,
                        asset,
                        fund_class
                    )
                """)
                .order("aum_date", ascending: false)

            if let fundId = fundId {
                query = query.eq("fund_id", value: fundId)
            }

            if let startDate = startDate {
                query = query.gte("aum_date", value: startDate)
            }

            if let endDate = endDate {
                query = query.lte("aum_date", value: endDate)
            }

            let response = try await query.execute()
            let data = try JSONDecoder().decode([FundAUM].self, from: response.data)

            await MainActor.run {
                self.fundAUMHistory = data
            }

            return data
        } catch {
            print("Error fetching fund AUM history: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Apply Daily Yield

    func applyDailyYieldToFund(fundId: String, yieldPercentage: Double, applicationDate: String? = nil) async -> (success: Bool, data: YieldDistributionResult?, error: String?) {
        do {
            let params: [String: Any] = [
                "p_fund_id": fundId,
                "p_daily_yield_percentage": yieldPercentage,
                "p_application_date": applicationDate ?? ISO8601DateFormatter().string(from: Date()).split(separator: "T").first.map(String.init) ?? ""
            ]

            let response = try await supabase
                .rpc("apply_daily_yield_to_fund", params: params)
                .execute()

            let result = try JSONDecoder().decode(YieldDistributionResult.self, from: response.data)
            return (success: true, data: result, error: nil)
        } catch {
            print("Error applying daily yield: \(error)")
            return (success: false, data: nil, error: error.localizedDescription)
        }
    }

    // MARK: - Update Investor AUM Percentages

    func updateInvestorAUMPercentages(fundId: String, totalAUM: Double? = nil) async -> (success: Bool, error: String?) {
        do {
            var params: [String: Any] = ["p_fund_id": fundId]

            if let totalAUM = totalAUM {
                params["p_total_aum"] = totalAUM
            }

            _ = try await supabase
                .rpc("update_investor_aum_percentages", params: params)
                .execute()

            return (success: true, error: nil)
        } catch {
            print("Error updating AUM percentages: \(error)")
            return (success: false, error: error.localizedDescription)
        }
    }

    // MARK: - Get Fund Investor Positions

    func getFundInvestorPositions(fundId: String) async -> [FundInvestorPosition] {
        do {
            let response = try await supabase
                .from("investor_positions")
                .select("""
                    *,
                    investor:investors (
                        name,
                        email,
                        profile:profiles (
                            first_name,
                            last_name
                        )
                    )
                """)
                .eq("fund_id", value: fundId)
                .gt("current_value", value: 0)
                .order("current_value", ascending: false)
                .execute()

            let data = try JSONDecoder().decode([FundInvestorPosition].self, from: response.data)

            await MainActor.run {
                self.fundInvestorPositions = data
            }

            return data
        } catch {
            print("Error fetching fund investor positions: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Get All Funds with AUM

    func getAllFundsWithAUM() async -> [FundWithAUM] {
        do {
            let fundsResponse = try await supabase
                .from("funds")
                .select("*")
                .eq("status", value: "active")
                .order("name")
                .execute()

            let funds = try JSONDecoder().decode([Fund].self, from: fundsResponse.data)

            var fundsWithAUM: [FundWithAUM] = []

            for fund in funds {
                // Get latest AUM for each fund
                let aumResponse = try? await supabase
                    .from("fund_daily_aum")
                    .select("*")
                    .eq("fund_id", value: fund.id)
                    .order("aum_date", ascending: false)
                    .limit(1)
                    .single()
                    .execute()

                let aumData = try? aumResponse.map { try JSONDecoder().decode(FundAUM.self, from: $0.data) }

                let fundWithAUM = FundWithAUM(
                    id: fund.id,
                    code: fund.code,
                    name: fund.name,
                    asset: fund.asset,
                    fundClass: fund.fundClass,
                    status: fund.status,
                    latestAum: aumData?.totalAum ?? 0,
                    latestAumDate: aumData?.aumDate,
                    investorCount: aumData?.investorCount ?? 0
                )

                fundsWithAUM.append(fundWithAUM)
            }

            await MainActor.run {
                self.allFundsWithAUM = fundsWithAUM
            }

            return fundsWithAUM
        } catch {
            print("Error fetching funds with AUM: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Refresh Data

    func refreshAllData() async {
        await MainActor.run {
            isLoading = true
            error = nil
        }

        _ = await getAllFundsWithAUM()

        await MainActor.run {
            isLoading = false
        }
    }
}