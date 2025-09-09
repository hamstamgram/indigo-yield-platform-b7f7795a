//
//  Portfolio.swift
//  IndigoInvestor
//
//  Portfolio data model
//

import Foundation

struct Portfolio: Codable, Identifiable {
    let id: UUID
    let investorId: UUID
    let totalValue: Decimal
    let totalCost: Decimal
    let totalGain: Decimal
    let totalGainPercent: Double
    let dayChange: Decimal
    let dayChangePercent: Double
    let weekChange: Decimal
    let weekChangePercent: Double
    let monthChange: Decimal
    let monthChangePercent: Double
    let yearChange: Decimal
    let yearChangePercent: Double
    let lastUpdated: Date
    let positions: [Position]
    let assetAllocation: [AssetAllocation]
    let performanceHistory: [PerformanceData]
    
    // CodingKeys to exclude computed properties
    enum CodingKeys: String, CodingKey {
        case id, investorId, totalValue, totalCost, totalGain
        case totalGainPercent, dayChange, dayChangePercent
        case weekChange, weekChangePercent, monthChange
        case monthChangePercent, yearChange, yearChangePercent
        case lastUpdated, positions, assetAllocation, performanceHistory
    }
    
    var formattedTotalValue: String {
        return totalValue.formatted(.currency(code: "USD"))
    }
    
    var formattedDayChange: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.positivePrefix = "+"
        return formatter.string(from: dayChange as NSNumber) ?? "$0.00"
    }
    
    var dayChangeColor: String {
        return dayChange >= 0 ? "Green" : "Red"
    }
}

struct Position: Codable, Identifiable {
    let id: UUID
    let portfolioId: UUID
    let assetSymbol: String
    let assetName: String
    let quantity: Decimal
    let averageCost: Decimal
    let currentPrice: Decimal
    let marketValue: Decimal
    let totalGain: Decimal
    let totalGainPercent: Double
    let dayChange: Decimal
    let dayChangePercent: Double
    let allocation: Double
    
    var formattedMarketValue: String {
        return marketValue.formatted(.currency(code: "USD"))
    }
    
    var formattedGain: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.positivePrefix = "+"
        return formatter.string(from: totalGain as NSNumber) ?? "$0.00"
    }
}

struct AssetAllocation: Codable, Identifiable {
    let id: UUID
    let assetType: String
    let value: Decimal
    let percentage: Double
    let color: String
    
    init(id: UUID = UUID(), assetType: String, value: Decimal, percentage: Double, color: String) {
        self.id = id
        self.assetType = assetType
        self.value = value
        self.percentage = percentage
        self.color = color
    }
    
    var formattedPercentage: String {
        return "\(String(format: "%.1f", percentage))%"
    }
}

// PerformanceData is defined in Models/Types.swift

// MARK: - Transaction Models

struct Transaction: Codable, Identifiable {
    let id: UUID
    let investorId: UUID
    let type: TransactionType
    let amount: Decimal
    let currency: String
    let status: TransactionStatus
    let description: String
    let date: Date
    let settledDate: Date?
    let reference: String?
    let metadata: [String: String]?
    
    enum TransactionType: String, Codable, CaseIterable {
        case deposit = "deposit"
        case withdrawal = "withdrawal"
        case interest = "interest"
        case fee = "fee"
        case adjustment = "adjustment"
    }
    
    enum TransactionStatus: String, Codable {
        case pending = "pending"
        case processing = "processing"
        case completed = "completed"
        case failed = "failed"
        case cancelled = "cancelled"
    }
    
    var formattedAmount: String {
        return amount.formatted(.currency(code: currency))
    }
    
    var formattedDate: String {
        return date.formatted(date: .abbreviated, time: .shortened)
    }
    
    var statusColor: String {
        switch status {
        case .completed:
            return "Green"
        case .pending, .processing:
            return "Orange"
        case .failed, .cancelled:
            return "Red"
        }
    }
}

// MARK: - Statement Models
// Statement is defined in AdditionalServices.swift
/*
struct Statement: Codable, Identifiable {
    let id: UUID
    let investorId: UUID
    let period: String
    let startDate: Date
    let endDate: Date
    let fileUrl: String?
    let signedUrl: String?
    let generatedAt: Date
    let type: StatementType
    let status: StatementStatus
    
    enum StatementType: String, Codable {
        case monthly = "monthly"
        case quarterly = "quarterly"
        case annual = "annual"
        case tax = "tax"
        case audit = "audit"
    }
    
    enum StatementStatus: String, Codable {
        case generating = "generating"
        case ready = "ready"
        case failed = "failed"
    }
    
    var title: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return "\(type.rawValue.capitalized) Statement - \(formatter.string(from: startDate))"
    }
    
    var formattedPeriod: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }
}
*/

// MARK: - Withdrawal Models
// WithdrawalRequest is defined in AdditionalServices.swift
/*
struct WithdrawalRequest: Codable, Identifiable {
    let id: UUID
    let investorId: UUID
    let amount: Decimal
    let currency: String
    let status: WithdrawalStatus
    let requestedAt: Date
    let processedAt: Date?
    let approvedBy: UUID?
    let rejectionReason: String?
    let bankDetails: BankDetails?
    let twoFactorVerified: Bool
    
    enum WithdrawalStatus: String, Codable, CaseIterable {
        case pending = "pending"
        case approved = "approved"
        case rejected = "rejected"
        case processing = "processing"
        case completed = "completed"
        case cancelled = "cancelled"
    }
    
    struct BankDetails: Codable {
        let accountName: String
        let accountNumber: String  // Encrypted
        let routingNumber: String  // Encrypted
        let bankName: String
    }
    
    var formattedAmount: String {
        return amount.formatted(.currency(code: currency))
    }
    
    var formattedRequestDate: String {
        return requestedAt.formatted(date: .abbreviated, time: .shortened)
    }
    
    var statusColor: String {
        switch status {
        case .completed, .approved:
            return "Green"
        case .pending, .processing:
            return "Orange"
        case .rejected, .cancelled:
            return "Red"
        }
    }
}
*/

// MARK: - User Models

// UserRole is defined in Models/Types.swift

struct User: Codable, Identifiable {
    let id: UUID
    let email: String
    let fullName: String?
    let role: UserRole
    let isActive: Bool
    let createdAt: Date
    let lastLogin: Date?
    let profile: InvestorProfile?
}

struct InvestorProfile: Codable {
    let id: UUID
    let userId: UUID
    let accountNumber: String
    let phoneNumber: String?
    let address: Address?
    let kycStatus: KYCStatus
    let riskProfile: RiskProfile
    let investmentGoals: [String]
    let preferredCurrency: String
    
    enum KYCStatus: String, Codable {
        case pending = "pending"
        case verified = "verified"
        case rejected = "rejected"
        case expired = "expired"
    }
    
    enum RiskProfile: String, Codable {
        case conservative = "conservative"
        case moderate = "moderate"
        case aggressive = "aggressive"
    }
    
    struct Address: Codable {
        let street: String
        let city: String
        let state: String
        let country: String
        let postalCode: String
    }
}
