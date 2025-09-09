//
//  Types.swift
//  IndigoInvestor
//
//  Common types and enums used throughout the app
//

import Foundation

// MARK: - Transaction Types

enum TransactionType: String, Codable, CaseIterable {
    case deposit = "deposit"
    case withdrawal = "withdrawal"
    case interest = "interest"
    case fee = "fee"
    
    var displayName: String {
        switch self {
        case .deposit: return "Deposit"
        case .withdrawal: return "Withdrawal"
        case .interest: return "Interest"
        case .fee: return "Fee"
        }
    }
}

enum TransactionStatus: String, Codable {
    case pending = "pending"
    case processing = "processing"
    case completed = "completed"
    case failed = "failed"
    case cancelled = "cancelled"
}

// MARK: - User Types

enum UserRole: String, Codable {
    case investor = "investor"
    case admin = "admin"
    case superAdmin = "super_admin"
}

// MARK: - Withdrawal Types

enum WithdrawalStatus: String, Codable {
    case pending = "pending"
    case approved = "approved"
    case processing = "processing"
    case completed = "completed"
    case rejected = "rejected"
}

// MARK: - Performance Data

struct PerformanceData: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
    let percentageChange: Double
}
