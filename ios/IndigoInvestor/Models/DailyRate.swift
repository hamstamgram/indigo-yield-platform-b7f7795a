//
//  DailyRate.swift
//  IndigoInvestor
//
//  Model for daily cryptocurrency rates
//

import Foundation

struct DailyRate: Identifiable, Codable {
    let id: UUID
    let rateDate: Date
    let btcRate: Decimal
    let ethRate: Decimal
    let solRate: Decimal
    let usdtRate: Decimal
    let usdcRate: Decimal
    let eurcRate: Decimal
    let notes: String?
    let createdBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rateDate = "rate_date"
        case btcRate = "btc_rate"
        case ethRate = "eth_rate"
        case solRate = "sol_rate"
        case usdtRate = "usdt_rate"
        case usdcRate = "usdc_rate"
        case eurcRate = "eurc_rate"
        case notes
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Helper to get rate for specific asset
    func rate(for asset: String) -> Decimal {
        switch asset.uppercased() {
        case "BTC": return btcRate
        case "ETH": return ethRate
        case "SOL": return solRate
        case "USDT": return usdtRate
        case "USDC": return usdcRate
        case "EURC": return eurcRate
        default: return 0
        }
    }

    // Calculate percentage change
    func calculateChange(from previous: DailyRate?, for asset: String) -> Decimal? {
        guard let previous = previous else { return nil }

        let currentRate = rate(for: asset)
        let previousRate = previous.rate(for: asset)

        guard previousRate > 0 else { return nil }

        return ((currentRate - previousRate) / previousRate) * 100
    }
}
