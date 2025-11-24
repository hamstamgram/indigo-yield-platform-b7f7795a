//
//  FundService.swift
//  IndigoInvestor
//
//  Fund Service - Enhanced fund management with investor allocation
//

import Foundation
import Supabase

// MARK: - Models

struct Fund: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let asset: String
    let fundClass: String
    let status: String
    let inceptionDate: String
    let mgmtFeeBps: Int?
    let perfFeeBps: Int?
    let minInvestment: Double?
    let strategy: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id, code, name, asset
        case fundClass = "fund_class"
        case status
        case inceptionDate = "inception_date"
        case mgmtFeeBps = "mgmt_fee_bps"
        case perfFeeBps = "perf_fee_bps"
        case minInvestment = "min_investment"
        case strategy
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct InvestorPosition: Codable {
    let investorId: String
    let fundId: String
    let fundClass: String?
    let shares: Double
    let costBasis: Double
    let currentValue: Double
    let unrealizedPnl: Double?
    let realizedPnl: Double?
    let aumPercentage: Double?
    let lastTransactionDate: String?
    let fund: Fund?

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
        case lastTransactionDate = "last_transaction_date"
        case fund
    }
}

struct FundPerformanceSummary: Codable {
    let totalInvestors: Int
    let totalAUM: Double
    let totalCostBasis: Double
    let totalUnrealizedPnL: Double
    let totalRealizedPnL: Double
}

// MARK: - Fund Service

@MainActor
class FundService: ObservableObject {
    private let supabase: SupabaseClient

    @Published var allFunds: [Fund] = []
    @Published var investorPositions: [InvestorPosition] = []
    @Published var availableFunds: [Fund] = []
    @Published var fundPerformance: FundPerformanceSummary?
    @Published var isLoading = false
    @Published var error: String?

    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }

    // MARK: - Get All Funds

    func getAllFunds() async -> [Fund] {
        do {
            let response = try await supabase
                .from("funds")
                .select("*")
                .eq("status", value: "active")
                .order("name")
                .execute()

            let data = try JSONDecoder().decode([Fund].self, from: response.data)

            await MainActor.run {
                self.allFunds = data
            }

            return data
        } catch {
            print("Error fetching funds: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Get Fund by ID

    func getFundById(fundId: String) async -> Fund? {
        do {
            let response = try await supabase
                .from("funds")
                .select("*")
                .eq("id", value: fundId)
                .single()
                .execute()

            let fund = try JSONDecoder().decode(Fund.self, from: response.data)
            return fund
        } catch {
            print("Error fetching fund: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return nil
        }
    }

    // MARK: - Add Fund to Investor

    func addFundToInvestor(investorId: String, fundId: String, initialInvestment: Double = 0) async -> (success: Bool, error: String?) {
        do {
            struct AddFundParams: Encodable {
                let p_investor_id: String
                let p_fund_id: String
                let p_initial_investment: Double
            }

            let params = AddFundParams(
                p_investor_id: investorId,
                p_fund_id: fundId,
                p_initial_investment: initialInvestment
            )

            _ = try await supabase
                .rpc("add_fund_to_investor", params: params)
                .execute()

            return (success: true, error: nil)
        } catch {
            print("Error adding fund to investor: \(error)")
            return (success: false, error: error.localizedDescription)
        }
    }

    // MARK: - Get Investor Positions

    func getInvestorPositions(investorId: String) async -> [InvestorPosition] {
        do {
            let response = try await supabase
                .from("investor_positions")
                .select("""
                    *,
                    fund:funds (
                        id,
                        code,
                        name,
                        asset,
                        fund_class
                    )
                """)
                .eq("investor_id", value: investorId)
                .order("current_value", ascending: false)
                .execute()

            let data = try JSONDecoder().decode([InvestorPosition].self, from: response.data)

            await MainActor.run {
                self.investorPositions = data
            }

            return data
        } catch {
            print("Error fetching investor positions: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Update Investor Position

    func updateInvestorPosition(
        investorId: String,
        fundId: String,
        shares: Double? = nil,
        costBasis: Double? = nil,
        currentValue: Double? = nil
    ) async -> (success: Bool, error: String?) {
        do {
            struct UpdatePositionData: Encodable {
                let updated_at: String
                let shares: Double?
                let cost_basis: Double?
                let current_value: Double?
            }

            let updates = UpdatePositionData(
                updated_at: ISO8601DateFormatter().string(from: Date()),
                shares: shares,
                cost_basis: costBasis,
                current_value: currentValue
            )

            _ = try await supabase
                .from("investor_positions")
                .update(updates)
                .eq("investor_id", value: investorId)
                .eq("fund_id", value: fundId)
                .execute()

            return (success: true, error: nil)
        } catch {
            print("Error updating investor position: \(error)")
            return (success: false, error: error.localizedDescription)
        }
    }

    // MARK: - Get Available Funds for Investor

    func getAvailableFundsForInvestor(investorId: String) async -> [Fund] {
        do {
            // Get all active funds
            let fundsResponse = try await supabase
                .from("funds")
                .select("*")
                .eq("status", value: "active")
                .execute()

            let allFunds = try JSONDecoder().decode([Fund].self, from: fundsResponse.data)

            // Get investor's current positions
            let positionsResponse = try await supabase
                .from("investor_positions")
                .select("fund_id")
                .eq("investor_id", value: investorId)
                .execute()

            struct FundIdWrapper: Codable {
                let fundId: String
                enum CodingKeys: String, CodingKey {
                    case fundId = "fund_id"
                }
            }

            let positions = try JSONDecoder().decode([FundIdWrapper].self, from: positionsResponse.data)
            let existingFundIds = Set(positions.map { $0.fundId })

            // Filter out funds where investor already has positions
            let available = allFunds.filter { !existingFundIds.contains($0.id) }

            await MainActor.run {
                self.availableFunds = available
            }

            return available
        } catch {
            print("Error fetching available funds: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return []
        }
    }

    // MARK: - Remove Fund from Investor

    func removeFundFromInvestor(investorId: String, fundId: String) async -> (success: Bool, error: String?) {
        do {
            _ = try await supabase
                .from("investor_positions")
                .delete()
                .eq("investor_id", value: investorId)
                .eq("fund_id", value: fundId)
                .execute()

            return (success: true, error: nil)
        } catch {
            print("Error removing fund from investor: \(error)")
            return (success: false, error: error.localizedDescription)
        }
    }

    // MARK: - Get Fund Performance Summary

    func getFundPerformanceSummary(fundId: String) async -> FundPerformanceSummary {
        do {
            let response = try await supabase
                .from("investor_positions")
                .select("*")
                .eq("fund_id", value: fundId)
                .execute()

            let positions = try JSONDecoder().decode([InvestorPosition].self, from: response.data)

            let summary = FundPerformanceSummary(
                totalInvestors: positions.count,
                totalAUM: positions.reduce(0) { $0 + $1.currentValue },
                totalCostBasis: positions.reduce(0) { $0 + $1.costBasis },
                totalUnrealizedPnL: positions.reduce(0) { $0 + ($1.unrealizedPnl ?? 0) },
                totalRealizedPnL: positions.reduce(0) { $0 + ($1.realizedPnl ?? 0) }
            )

            await MainActor.run {
                self.fundPerformance = summary
            }

            return summary
        } catch {
            print("Error fetching fund performance: \(error)")
            await MainActor.run {
                self.error = error.localizedDescription
            }
            return FundPerformanceSummary(
                totalInvestors: 0,
                totalAUM: 0,
                totalCostBasis: 0,
                totalUnrealizedPnL: 0,
                totalRealizedPnL: 0
            )
        }
    }

    // MARK: - Refresh Data

    func refreshAllData() async {
        await MainActor.run {
            isLoading = true
            error = nil
        }

        _ = await getAllFunds()

        await MainActor.run {
            isLoading = false
        }
    }
}