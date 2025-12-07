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

// MARK: - Withdrawal Types

enum WithdrawalStatus: String, Codable {
    case pending = "pending"
    case approved = "approved"
    case processing = "processing"
    case completed = "completed"
    case rejected = "rejected"
}

// MARK: - Native Tokens (Platform's 7 Canonical Funds)
// IMPORTANT: USDC is NOT a platform fund. Use USDT for stablecoin.

enum NativeToken: String, Codable, CaseIterable {
    case btc = "BTC"
    case eth = "ETH"
    case sol = "SOL"
    case usdt = "USDT"
    case eurc = "EURC"
    case xaut = "xAUT"
    case xrp = "XRP"

    var displayName: String {
        switch self {
        case .btc: return "BTC Yield Fund"
        case .eth: return "ETH Yield Fund"
        case .sol: return "SOL Yield Fund"
        case .usdt: return "Stablecoin Fund"
        case .eurc: return "EURC Yield Fund"
        case .xaut: return "Tokenized Gold"
        case .xrp: return "XRP Yield Fund"
        }
    }

    var symbol: String {
        return self.rawValue
    }

    var isStablecoin: Bool {
        switch self {
        case .usdt, .eurc:
            return true
        default:
            return false
        }
    }
}

// MARK: - Fund Types

enum FundStatus: String, Codable {
    case active = "active"
    case inactive = "inactive"
    case suspended = "suspended"
}

enum FundClass: String, Codable {
    case equity = "equity"
    case fixedIncome = "fixed_income"
    case mixed = "mixed"
    case alternative = "alternative"
    case crypto = "crypto"
}

// MARK: - Performance Data

struct PerformanceData: Identifiable, Codable {
    let id: UUID
    let date: Date
    let value: Decimal
    let gain: Decimal
    let gainPercent: Double

    init(id: UUID = UUID(), date: Date, value: Decimal, gain: Decimal, gainPercent: Double) {
        self.id = id
        self.date = date
        self.value = value
        self.gain = gain
        self.gainPercent = gainPercent
    }
}

// MARK: - Live Events

struct LiveEvent: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let category: EventCategory
    let timestamp: Date
    let marketImpact: Double?
    let relatedAssets: [String]
    let hasActionButton: Bool
    let actionButtonTitle: String?
    let priority: EventPriority
    let isRead: Bool

    init(id: String = UUID().uuidString, title: String, description: String, category: EventCategory, timestamp: Date = Date(), marketImpact: Double? = nil, relatedAssets: [String] = [], hasActionButton: Bool = false, actionButtonTitle: String? = nil, priority: EventPriority = .medium, isRead: Bool = false) {
        self.id = id
        self.title = title
        self.description = description
        self.category = category
        self.timestamp = timestamp
        self.marketImpact = marketImpact
        self.relatedAssets = relatedAssets
        self.hasActionButton = hasActionButton
        self.actionButtonTitle = actionButtonTitle
        self.priority = priority
        self.isRead = isRead
    }
}

enum EventCategory: String, CaseIterable, Codable {
    case all = "all"
    case market = "market_update"
    case fund = "fund_news"
    case system = "system"
    case alert = "alert"
    case maintenance = "maintenance"

    var displayName: String {
        switch self {
        case .all: return "All"
        case .market: return "Market Update"
        case .fund: return "Fund News"
        case .system: return "System"
        case .alert: return "Alert"
        case .maintenance: return "Maintenance"
        }
    }
}

enum EventPriority: String, Codable {
    case high = "high"
    case medium = "medium"
    case low = "low"
}

enum StatusType: String, Codable {
    case info = "info"
    case warning = "warning"
    case error = "error"
}

// MARK: - Newsletter

struct NewsletterIssue: Identifiable, Codable {
    let id: String
    let title: String
    let excerpt: String
    let date: Date
    let category: NewsletterCategory
    let readTime: Int
    let wordCount: Int
    let isRead: Bool
    let tags: [String]
    let sections: [NewsletterContentSection]
    let shareURL: String

    init(id: String = UUID().uuidString, title: String, excerpt: String, date: Date = Date(), category: NewsletterCategory, readTime: Int, wordCount: Int, isRead: Bool = false, tags: [String] = [], sections: [NewsletterContentSection] = [], shareURL: String? = nil) {
        self.id = id
        self.title = title
        self.excerpt = excerpt
        self.date = date
        self.category = category
        self.readTime = readTime
        self.wordCount = wordCount
        self.isRead = isRead
        self.tags = tags
        self.sections = sections
        self.shareURL = shareURL ?? "https://app.indigo-yield.com/newsletter/\(id)"
    }
}

struct NewsletterContentSection: Identifiable, Codable {
    let id: String
    let title: String?
    let content: String
    let imageURL: String?
    let highlights: [String]

    init(id: String = UUID().uuidString, title: String? = nil, content: String, imageURL: String? = nil, highlights: [String] = []) {
        self.id = id
        self.title = title
        self.content = content
        self.imageURL = imageURL
        self.highlights = highlights
    }
}

enum NewsletterCategory: String, CaseIterable, Codable {
    case all = "all"
    case weekly = "weekly"
    case market = "market"
    case funds = "funds"
    case insights = "insights"
    case company = "company"

    var displayName: String {
        switch self {
        case .all: return "All"
        case .weekly: return "Market Weekly"
        case .market: return "Market Updates"
        case .funds: return "Fund Updates"
        case .insights: return "Investment Insights"
        case .company: return "Company News"
        }
    }
}

enum NewsletterFrequency: String, CaseIterable, Codable {
    case daily = "daily"
    case weekly = "weekly"
    case monthly = "monthly"

    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        }
    }
}
