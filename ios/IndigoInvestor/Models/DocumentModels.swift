//
//  DocumentModels.swift
//  IndigoInvestor
//
//  Statement and Withdrawal models
//

import Foundation

// MARK: - Statement

public struct Statement: Identifiable, Codable {
    public let id: UUID
    public let investorId: UUID
    public let period: String
    public let url: String
    public let generatedAt: Date
    
    public var periodStart: Date { generatedAt }
    public var periodEnd: Date { generatedAt }
    public var fileName: String { "statement_\(period).pdf" }
    public var fileUrl: String { url }
    public var createdAt: Date { generatedAt }
}

// MARK: - Withdrawal Request

public struct WithdrawalRequest: Identifiable, Codable {
    public let id: UUID
    public let amount: Decimal
    public let status: WithdrawalStatus
    public let requestedAt: Date
    public let processedAt: Date?
    
    public enum WithdrawalStatus: String, Codable {
        case pending = "pending"
        case approved = "approved"
        case rejected = "rejected"
        case processing = "processing"
        case completed = "completed"
        case cancelled = "cancelled"
    }
}

// MARK: - Document

public struct Document: Identifiable, Codable {
    public let id: UUID
    public let investorId: UUID
    public let name: String
    public let type: DocumentType
    public let url: String
    public let createdAt: Date
    public let size: Int64
    
    public enum DocumentType: String, Codable {
        case statement = "statement"
        case taxForm = "tax_form"
        case agreement = "agreement"
        case other = "other"
    }
    
    public var formattedSize: String {
        ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
}
