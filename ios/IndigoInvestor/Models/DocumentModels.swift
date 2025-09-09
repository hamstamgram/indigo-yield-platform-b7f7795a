//
//  DocumentModels.swift
//  IndigoInvestor
//
//  Statement and Withdrawal models
//

import Foundation

// MARK: - Statement

struct Statement: Identifiable {
    let id: UUID
    let periodStart: Date
    let periodEnd: Date
    let fileName: String
    let fileUrl: String
    let createdAt: Date
}

// MARK: - Withdrawal Request

struct WithdrawalRequest: Identifiable {
    let id: UUID
    let amount: Double
    let status: WithdrawalStatus
    let requestedAt: Date
    let processedAt: Date?
}
