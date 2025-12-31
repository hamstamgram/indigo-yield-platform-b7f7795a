//
//  Portfolio.swift
//  IndigoInvestor
//
//  Portfolio and Transaction models
//

import Foundation

// MARK: - Portfolio

public struct Portfolio: Codable, Identifiable {
    public let id: UUID
    public let investorId: UUID
    
    // Passive Reporting Metrics
    public let totalYieldAllTime: Decimal
    public let totalYieldMonth: Decimal
    public let activePositionsCount: Int
    public let lastUpdated: Date
    
    // Assets (The Ledger)
    public let assets: [AssetPosition]
    
    public var totalYieldAllTimeFormatted: String {
        return totalYieldAllTime.formatted()
    }
    
    public var latestYieldFormatted: String {
        let prefix = totalYieldMonth >= 0 ? "+" : ""
        return prefix + totalYieldMonth.formatted()
    }
    
    public var yieldUnitLabel: String {
        if assets.count == 1 {
            return assets.first?.assetCode ?? "UNITS"
        }
        return "UNITS"
    }
}

// MARK: - Asset Position

public struct AssetPosition: Codable, Identifiable {
    public let id: UUID
    public let fundName: String
    public let assetCode: String
    
    // Ledger Data
    public let balance: Decimal
    public let yieldEarned: Decimal // Lifetime yield
    
    // Report Data (MTD)
    public let openingBalance: Decimal
    public let additions: Decimal
    public let withdrawals: Decimal
    public let mtdYield: Decimal
    
    public var balanceFormatted: String {
        return balance.formatted()
    }
    
    public var mtdYieldFormatted: String {
        let prefix = mtdYield >= 0 ? "+" : ""
        return prefix + mtdYield.formatted()
    }
    
    public var openingBalanceFormatted: String { openingBalance.formatted() }
    public var additionsFormatted: String { "+\(additions.formatted())" }
    public var withdrawalsFormatted: String { withdrawals > 0 ? "-\(withdrawals.formatted())" : "0.0000" }
}

// MARK: - Transaction

public struct Transaction: Codable, Identifiable {
    public let id: UUID
    public let investorId: UUID
    public let type: TransactionType
    public let amount: Decimal
    public let assetCode: String
    public let status: TransactionStatus
    public let description: String
    public let date: Date
    
    public enum TransactionType: String, Codable, CaseIterable {
        case deposit = "deposit"
        case withdrawal = "withdrawal"
        case yield = "yield"
        case fee = "fee"
        case adjustment = "adjustment"
    }
    
    public enum TransactionStatus: String, Codable {
        case pending = "pending"
        case processing = "processing"
        case completed = "completed"
        case failed = "failed"
        case cancelled = "cancelled"
    }
    
    public var formattedAmount: String {
        return "\(amount.formatted()) \(assetCode)"
    }
    
    public var formattedDate: String {
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}