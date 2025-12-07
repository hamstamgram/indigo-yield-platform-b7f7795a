//
//  MonthlyReport.swift
//  IndigoInvestor
//
//  Domain model for Investor Monthly Reports (Ledger Data)
//  Matches table: investor_monthly_reports
//

import Foundation

public struct MonthlyReport: Identifiable, Codable {
    public let id: UUID
    public let investorId: UUID
    public let reportMonth: Date
    public let assetCode: String
    public let openingBalance: Decimal
    public let closingBalance: Decimal
    public let additions: Decimal
    public let withdrawals: Decimal
    public let yieldEarned: Decimal
    public let entryDate: Date?
    public let exitDate: Date?
    public let createdAt: Date
    public let updatedAt: Date

    public enum CodingKeys: String, CodingKey {
        case id
        case investorId = "investor_id"
        case reportMonth = "report_month"
        case assetCode = "asset_code"
        case openingBalance = "opening_balance"
        case closingBalance = "closing_balance"
        case additions
        case withdrawals
        case yieldEarned = "yield_earned"
        case entryDate = "entry_date"
        case exitDate = "exit_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    public var rateOfReturn: Decimal {
        guard openingBalance > 0 else { return 0 }
        return (yieldEarned / openingBalance) * 100
    }

    // Helper for UI display
    public var title: String {
        "\(assetCode) Fund - \(reportMonth.formatted(.dateTime.month(.wide).year()))"
    }
}
