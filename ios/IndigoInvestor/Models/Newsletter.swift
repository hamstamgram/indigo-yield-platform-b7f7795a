//
//  Newsletter.swift
//  IndigoInvestor
//
//  Newsletter data models
//

import Foundation

// MARK: - Newsletter Models

struct Newsletter: Identifiable, Codable {
    let id: String
    let title: String
    let content: String
    let excerpt: String
    let publishedDate: Date
    let category: NewsletterCategory
    let status: NewsletterStatus
    let readTime: Int
    let wordCount: Int
    let tags: [String]
    let sections: [NewsletterSection]
    let imageURL: URL?
    let authorId: String
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case content
        case excerpt
        case publishedDate = "published_date"
        case category
        case status
        case readTime = "read_time"
        case wordCount = "word_count"
        case tags
        case sections
        case imageURL = "image_url"
        case authorId = "author_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct NewsletterSection: Identifiable, Codable {
    let id: String
    let newsletterId: String
    let title: String?
    let content: String
    let order: Int
    let sectionType: NewsletterSectionType
    let imageURL: URL?
    let highlights: [String]
    
    enum CodingKeys: String, CodingKey {
        case id
        case newsletterId = "newsletter_id"
        case title
        case content
        case order
        case sectionType = "section_type"
        case imageURL = "image_url"
        case highlights
    }
}

enum NewsletterSectionType: String, Codable, CaseIterable {
    case text = "text"
    case highlight = "highlight"
    case image = "image"
    case chart = "chart"
    case quote = "quote"
    case callout = "callout"
}

enum NewsletterCategory: String, Codable, CaseIterable {
    case all = "all"
    case weekly = "weekly_market"
    case market = "market_updates"
    case funds = "fund_updates"
    case insights = "investment_insights"
    case company = "company_news"
    case performance = "performance"
    case strategy = "strategy"
    
    var displayName: String {
        switch self {
        case .all: return "All"
        case .weekly: return "Weekly Market"
        case .market: return "Market Updates"
        case .funds: return "Fund Updates"
        case .insights: return "Investment Insights"
        case .company: return "Company News"
        case .performance: return "Performance"
        case .strategy: return "Strategy"
        }
    }
    
    var color: String {
        switch self {
        case .all: return "primary"
        case .weekly: return "blue"
        case .market: return "green"
        case .funds: return "purple"
        case .insights: return "orange"
        case .company: return "red"
        case .performance: return "indigo"
        case .strategy: return "teal"
        }
    }
}

enum NewsletterStatus: String, Codable {
    case draft = "draft"
    case scheduled = "scheduled"
    case published = "published"
    case archived = "archived"
}

// MARK: - Subscription Models

struct NewsletterSubscription: Identifiable, Codable {
    let id: String
    let userId: String
    let email: String
    let isActive: Bool
    let frequency: NewsletterFrequency
    let categories: [NewsletterCategory]
    let subscribedAt: Date
    let lastDelivery: Date?
    let preferences: NewsletterPreferences
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case email
        case isActive = "is_active"
        case frequency
        case categories
        case subscribedAt = "subscribed_at"
        case lastDelivery = "last_delivery"
        case preferences
    }
}

struct NewsletterPreferences: Codable {
    let sendTime: String // "09:00" format
    let timezone: String
    let format: NewsletterFormat
    let includeImages: Bool
    let digestMode: Bool
    
    enum CodingKeys: String, CodingKey {
        case sendTime = "send_time"
        case timezone
        case format
        case includeImages = "include_images"
        case digestMode = "digest_mode"
    }
}

enum NewsletterFrequency: String, Codable, CaseIterable {
    case daily = "daily"
    case weekly = "weekly"
    case biweekly = "biweekly"
    case monthly = "monthly"
    
    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .biweekly: return "Bi-weekly"
        case .monthly: return "Monthly"
        }
    }
}

enum NewsletterFormat: String, Codable, CaseIterable {
    case html = "html"
    case plainText = "plain_text"
    case digest = "digest"
    
    var displayName: String {
        switch self {
        case .html: return "Rich HTML"
        case .plainText: return "Plain Text"
        case .digest: return "Digest Summary"
        }
    }
}

// MARK: - Analytics Models

struct NewsletterAnalytics: Codable {
    let newsletterId: String
    let userId: String?
    let event: NewsletterEvent
    let timestamp: Date
    let metadata: [String: String]
    
    enum CodingKeys: String, CodingKey {
        case newsletterId = "newsletter_id"
        case userId = "user_id"
        case event
        case timestamp
        case metadata
    }
}

enum NewsletterEvent: String, Codable {
    case opened = "opened"
    case read = "read"
    case shared = "shared"
    case downloaded = "downloaded"
    case bookmarked = "bookmarked"
}

// MARK: - Reading Progress

struct NewsletterReadingProgress: Codable {
    let newsletterId: String
    let userId: String
    let progress: Double // 0.0 to 1.0
    let lastPosition: Int
    let timeSpent: TimeInterval
    let isCompleted: Bool
    let startedAt: Date
    let completedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case newsletterId = "newsletter_id"
        case userId = "user_id"
        case progress
        case lastPosition = "last_position"
        case timeSpent = "time_spent"
        case isCompleted = "is_completed"
        case startedAt = "started_at"
        case completedAt = "completed_at"
    }
}

// MARK: - Newsletter Stats

struct NewsletterStats: Codable {
    let totalNewsletters: Int
    let readNewsletters: Int
    let averageReadTime: Int
    let favoriteCategory: NewsletterCategory?
    let weeklyGoal: Int
    let weeklyProgress: Int
    let readingStreak: Int
    let lastReadAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case totalNewsletters = "total_newsletters"
        case readNewsletters = "read_newsletters"
        case averageReadTime = "average_read_time"
        case favoriteCategory = "favorite_category"
        case weeklyGoal = "weekly_goal"
        case weeklyProgress = "weekly_progress"
        case readingStreak = "reading_streak"
        case lastReadAt = "last_read_at"
    }
}

// MARK: - API Response Models

struct NewslettersResponse: Codable {
    let newsletters: [Newsletter]
    let totalCount: Int
    let currentPage: Int
    let totalPages: Int
    let hasMore: Bool
    
    enum CodingKeys: String, CodingKey {
        case newsletters = "data"
        case totalCount = "total_count"
        case currentPage = "current_page"
        case totalPages = "total_pages"
        case hasMore = "has_more"
    }
}

struct NewsletterSubscriptionResponse: Codable {
    let subscription: NewsletterSubscription
    let nextDelivery: Date?
    let unreadCount: Int
    
    enum CodingKeys: String, CodingKey {
        case subscription
        case nextDelivery = "next_delivery"
        case unreadCount = "unread_count"
    }
}

// MARK: - Extensions for UI

extension Newsletter {
    var shareURL: URL {
        return URL(string: "https://app.indigo-yield.com/newsletter/\(id)")!
    }
    
    var formattedPublishedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: publishedDate)
    }
    
    var estimatedReadTime: String {
        return "\(readTime) min read"
    }
    
    var isRecent: Bool {
        return Calendar.current.dateInterval(of: .weekOfYear, for: Date())?.contains(publishedDate) ?? false
    }
}

extension NewsletterCategory {
    var systemImageName: String {
        switch self {
        case .all: return "doc.text"
        case .weekly: return "calendar.circle"
        case .market: return "chart.line.uptrend.xyaxis"
        case .funds: return "building.columns"
        case .insights: return "lightbulb"
        case .company: return "building.2"
        case .performance: return "chart.bar.xaxis"
        case .strategy: return "target"
        }
    }
}