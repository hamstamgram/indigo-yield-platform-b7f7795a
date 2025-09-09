//
//  DocumentModels.swift
//  IndigoInvestor
//
//  Statement and Withdrawal models
//

import Foundation

// MARK: - Statement

struct Statement: Identifiable, Codable {
    let id: UUID
    let investorId: UUID
    let period: String
    let url: String
    let generatedAt: Date
    
    // Legacy support for old implementation
    var periodStart: Date { generatedAt }
    var periodEnd: Date { generatedAt }
    var fileName: String { "statement_\(period).pdf" }
    var fileUrl: String { url }
    var createdAt: Date { generatedAt }
}

// MARK: - Withdrawal Request

struct WithdrawalRequest: Identifiable {
    let id: UUID
    let amount: Double
    let status: WithdrawalStatus
    let requestedAt: Date
    let processedAt: Date?
}
