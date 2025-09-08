//
//  SupportViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing support content and help system
//

import Foundation
import SwiftUI
import Combine

@MainActor
class SupportViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var popularArticles: [HelpArticle] = []
    @Published var allFAQs: [FAQ] = []
    @Published var filteredFAQs: [FAQ] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Support availability
    @Published var isChatAvailable = false
    @Published var isPhoneAvailable = false
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var currentCategory: SupportView.SupportCategory = .all
    private var searchQuery = ""
    
    // MARK: - Initialization
    
    init() {
        checkSupportAvailability()
        setupMockData() // For demo purposes
    }
    
    // MARK: - Data Loading
    
    func loadSupportContent() {
        Task {
            await fetchSupportContent()
        }
    }
    
    private func fetchSupportContent() async {
        isLoading = true
        
        do {
            // Fetch FAQs
            let faqResponse = try await supabaseManager.client
                .from("support_faqs")
                .select("*")
                .order("order_index", ascending: true)
                .execute()
            
            let faqs = try JSONDecoder().decode([FAQ].self, from: faqResponse.data)
            
            // Fetch Articles
            let articlesResponse = try await supabaseManager.client
                .from("help_articles")
                .select("*")
                .order("views", ascending: false)
                .limit(10)
                .execute()
            
            let articles = try JSONDecoder().decode([HelpArticle].self, from: articlesResponse.data)
            
            await MainActor.run {
                self.allFAQs = faqs
                self.filteredFAQs = faqs
                self.popularArticles = articles
            }
        } catch {
            // Use mock data if fetch fails
            setupMockData()
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    // MARK: - Filtering
    
    func filterByCategory(_ category: SupportView.SupportCategory) {
        currentCategory = category
        applyFilters()
    }
    
    func searchContent(query: String) {
        searchQuery = query
        applyFilters()
    }
    
    private func applyFilters() {
        var filtered = allFAQs
        
        // Filter by category
        if currentCategory != .all {
            filtered = filtered.filter { faq in
                faq.category.lowercased() == currentCategory.rawValue.lowercased()
            }
        }
        
        // Filter by search query
        if !searchQuery.isEmpty {
            filtered = filtered.filter { faq in
                faq.question.localizedCaseInsensitiveContains(searchQuery) ||
                faq.answer.localizedCaseInsensitiveContains(searchQuery)
            }
        }
        
        filteredFAQs = filtered
    }
    
    // MARK: - Support Actions
    
    func startLiveChat() {
        // Implement live chat integration
        print("Starting live chat...")
    }
    
    func callSupport() {
        if let url = URL(string: "tel://1-888-555-0123") {
            UIApplication.shared.open(url)
        }
    }
    
    func scheduleCallback() {
        // Open calendar or scheduling system
        if let url = URL(string: "https://calendly.com/indigoyield-support") {
            UIApplication.shared.open(url)
        }
    }
    
    func openResource(_ resource: ResourceType) {
        let urls: [ResourceType: String] = [
            .investmentGuide: "https://indigoyield.com/resources/investment-guide",
            .taxCenter: "https://indigoyield.com/resources/tax-center",
            .securityCenter: "https://indigoyield.com/resources/security",
            .videoTutorials: "https://indigoyield.com/resources/videos"
        ]
        
        if let urlString = urls[resource],
           let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }
    
    func generateSupportEmailBody() -> String {
        let deviceInfo = """
        
        ---
        Device Information:
        App Version: \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown")
        iOS Version: \(UIDevice.current.systemVersion)
        Device Model: \(UIDevice.current.model)
        User ID: \(supabaseManager.currentUserId ?? "Unknown")
        """
        
        return "Please describe your issue:\n\n\n\(deviceInfo)"
    }
    
    // MARK: - Support Availability
    
    private func checkSupportAvailability() {
        let calendar = Calendar.current
        let now = Date()
        let hour = calendar.component(.hour, from: now)
        let weekday = calendar.component(.weekday, from: now)
        
        // Phone support: Mon-Fri, 9AM-6PM EST
        isPhoneAvailable = (2...6).contains(weekday) && (9...18).contains(hour)
        
        // Chat support: Mon-Fri, 8AM-8PM EST
        isChatAvailable = (2...6).contains(weekday) && (8...20).contains(hour)
    }
    
    // MARK: - Mock Data
    
    private func setupMockData() {
        allFAQs = FAQ.mockFAQs
        filteredFAQs = FAQ.mockFAQs
        popularArticles = HelpArticle.mockArticles
    }
    
    enum ResourceType {
        case investmentGuide
        case taxCenter
        case securityCenter
        case videoTutorials
    }
}

// MARK: - Models

struct FAQ: Identifiable, Codable {
    let id: UUID
    let category: String
    let question: String
    let answer: String
    let orderIndex: Int
    var helpful: Int?
    
    enum CodingKeys: String, CodingKey {
        case id
        case category
        case question
        case answer
        case orderIndex = "order_index"
        case helpful
    }
    
    static var mockFAQs: [FAQ] {
        [
            FAQ(
                id: UUID(),
                category: "Investments",
                question: "What is the minimum investment amount?",
                answer: "The minimum initial investment is $10,000. Additional investments can be made in increments of $1,000.",
                orderIndex: 1,
                helpful: 45
            ),
            FAQ(
                id: UUID(),
                category: "Withdrawals",
                question: "How long do withdrawals take?",
                answer: "Withdrawal requests are typically processed within 3-5 business days. The funds will be transferred to your verified bank account on file.",
                orderIndex: 2,
                helpful: 38
            ),
            FAQ(
                id: UUID(),
                category: "Security",
                question: "How is my investment protected?",
                answer: "Your investments are protected through multiple layers of security including encryption, biometric authentication, and SIPC insurance up to $500,000.",
                orderIndex: 3,
                helpful: 52
            ),
            FAQ(
                id: UUID(),
                category: "Documents",
                question: "When are monthly statements available?",
                answer: "Monthly statements are generated on the first business day of each month and will be available in your Documents section.",
                orderIndex: 4,
                helpful: 29
            ),
            FAQ(
                id: UUID(),
                category: "Account",
                question: "How do I update my bank account information?",
                answer: "You can update your bank account information in Account Settings > Bank Accounts. New accounts require verification which typically takes 1-2 business days.",
                orderIndex: 5,
                helpful: 31
            )
        ]
    }
}

struct HelpArticle: Identifiable, Codable {
    let id: UUID
    let title: String
    let content: String
    let category: String
    let icon: String
    let readTime: Int
    let views: Int
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case content
        case category
        case icon
        case readTime = "read_time"
        case views
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    static var mockArticles: [HelpArticle] {
        [
            HelpArticle(
                id: UUID(),
                title: "Getting Started with IndigoInvestor",
                content: "Learn how to make your first investment and navigate the platform...",
                category: "Getting Started",
                icon: "play.circle",
                readTime: 5,
                views: 1542,
                createdAt: Date(),
                updatedAt: Date()
            ),
            HelpArticle(
                id: UUID(),
                title: "Understanding Your Portfolio Performance",
                content: "A comprehensive guide to reading and interpreting your portfolio metrics...",
                category: "Investments",
                icon: "chart.line.uptrend.xyaxis",
                readTime: 8,
                views: 987,
                createdAt: Date(),
                updatedAt: Date()
            ),
            HelpArticle(
                id: UUID(),
                title: "Tax Documentation Guide",
                content: "Everything you need to know about tax forms and reporting...",
                category: "Documents",
                icon: "doc.text",
                readTime: 6,
                views: 756,
                createdAt: Date(),
                updatedAt: Date()
            ),
            HelpArticle(
                id: UUID(),
                title: "Security Best Practices",
                content: "How to keep your account secure and protect your investments...",
                category: "Security",
                icon: "lock.shield",
                readTime: 4,
                views: 623,
                createdAt: Date(),
                updatedAt: Date()
            ),
            HelpArticle(
                id: UUID(),
                title: "Withdrawal Process Explained",
                content: "Step-by-step guide to requesting and tracking withdrawals...",
                category: "Withdrawals",
                icon: "arrow.up.circle",
                readTime: 3,
                views: 512,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
    }
}
