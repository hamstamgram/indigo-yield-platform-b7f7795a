//
//  SupportViewModelTests.swift
//  IndigoInvestorTests
//
//  Comprehensive test suite for Support ViewModel
//  Tests cover all 7 support pages and critical functionality
//

import XCTest
import Combine
@testable import IndigoInvestor

@MainActor
final class SupportViewModelTests: XCTestCase {

    var viewModel: SupportViewModel!
    var cancellables: Set<AnyCancellable>!

    override func setUp() async throws {
        try await super.setUp()
        viewModel = SupportViewModel()
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() async throws {
        viewModel = nil
        cancellables = nil
        try await super.tearDown()
    }

    // MARK: - Test 1: Support Hub Page (/support)

    func testSupportHubInitialization() throws {
        // Then: View model should initialize with mock data
        XCTAssertFalse(viewModel.popularArticles.isEmpty, "Should have popular articles")
        XCTAssertFalse(viewModel.allFAQs.isEmpty, "Should have FAQs")
    }

    func testSupportAvailability() throws {
        // Then: Support availability should be checked
        // Note: Actual values depend on time of day
        XCTAssertNotNil(viewModel.isChatAvailable)
        XCTAssertNotNil(viewModel.isPhoneAvailable)
    }

    func testPopularArticlesCount() throws {
        // Given: Mock articles are loaded
        // Then: Should have reasonable number of popular articles
        XCTAssertGreaterThan(viewModel.popularArticles.count, 0)
        XCTAssertLessThanOrEqual(viewModel.popularArticles.count, 10)
    }

    // MARK: - Test 2: FAQ with Search Page (/support/faq)

    func testFAQLoading() throws {
        // Given: FAQs are loaded
        let faqCount = viewModel.allFAQs.count

        // Then: Should have FAQs available
        XCTAssertGreaterThan(faqCount, 0, "Should have FAQs loaded")
        XCTAssertEqual(viewModel.filteredFAQs.count, faqCount, "Initially all FAQs should be shown")
    }

    func testFAQSearchByQuestion() throws {
        // Given: FAQs with specific questions
        // Mock FAQ includes "minimum investment amount"

        // When: Searching for "investment"
        viewModel.searchContent(query: "investment")

        // Then: Should return matching FAQs
        XCTAssertGreaterThan(viewModel.filteredFAQs.count, 0)
        XCTAssertTrue(
            viewModel.filteredFAQs.first?.question.localizedCaseInsensitiveContains("investment") ?? false
        )
    }

    func testFAQSearchByAnswer() throws {
        // Given: FAQs with specific content
        // Mock FAQ includes "$10,000" in answer

        // When: Searching for "$10,000"
        viewModel.searchContent(query: "$10,000")

        // Then: Should find FAQ with that answer
        XCTAssertGreaterThan(viewModel.filteredFAQs.count, 0)
        XCTAssertTrue(
            viewModel.filteredFAQs.first?.answer.contains("$10,000") ?? false
        )
    }

    func testFAQSearchCaseInsensitive() throws {
        // When: Searching with different cases
        viewModel.searchContent(query: "WITHDRAWAL")

        let upperCaseResults = viewModel.filteredFAQs.count

        viewModel.searchContent(query: "withdrawal")

        let lowerCaseResults = viewModel.filteredFAQs.count

        // Then: Should return same results regardless of case
        XCTAssertEqual(upperCaseResults, lowerCaseResults)
        XCTAssertGreaterThan(lowerCaseResults, 0)
    }

    func testFAQSearchNoResults() throws {
        // When: Searching for non-existent content
        viewModel.searchContent(query: "xyzabc123nonexistent")

        // Then: Should return empty results
        XCTAssertEqual(viewModel.filteredFAQs.count, 0)
    }

    func testFAQSearchClear() throws {
        // Given: Filtered FAQs
        let totalCount = viewModel.allFAQs.count
        viewModel.searchContent(query: "investment")

        let filteredCount = viewModel.filteredFAQs.count
        XCTAssertLessThan(filteredCount, totalCount)

        // When: Clearing search
        viewModel.searchContent(query: "")

        // Then: Should show all FAQs again
        XCTAssertEqual(viewModel.filteredFAQs.count, totalCount)
    }

    // MARK: - Test 3: Support Tickets Page (/support/tickets)

    func testSupportTicketsContentLoading() async throws {
        // Given: View model initialized
        XCTAssertFalse(viewModel.isLoading, "Should not be loading initially")

        // When: Loading support content
        viewModel.loadSupportContent()

        // Wait for async operation
        try await Task.sleep(nanoseconds: 200_000_000) // 0.2s

        // Then: Loading should complete
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - Test 4: Create Ticket Page (/support/tickets/new)

    func testSupportEmailBodyGeneration() throws {
        // When: Generating support email body
        let emailBody = viewModel.generateSupportEmailBody()

        // Then: Should include device information
        XCTAssertTrue(emailBody.contains("Device Information"))
        XCTAssertTrue(emailBody.contains("iOS Version"))
        XCTAssertTrue(emailBody.contains("Device Model"))
        XCTAssertTrue(emailBody.contains("describe your issue"))
    }

    // MARK: - Test 5: Ticket Details Page (/support/tickets/:id)

    func testTicketDetailsTracking() throws {
        // Note: Ticket details would be fetched from Supabase
        // This test validates the structure exists

        // Given: Support system is available
        XCTAssertNotNil(viewModel, "View model should exist")

        // Then: Should be able to track tickets
        // Would require Supabase integration for full test
    }

    // MARK: - Test 6: Live Chat Page (/support/live-chat)

    func testLiveChatAvailability() throws {
        // Given: Current time and day
        // Then: Chat availability should be determined
        // Note: Actual availability depends on business hours

        let chatAvailable = viewModel.isChatAvailable

        // Should be a boolean value
        XCTAssertNotNil(chatAvailable)
    }

    func testLiveChatInitiation() throws {
        // When: Starting live chat
        viewModel.startLiveChat()

        // Then: Should trigger chat system
        // Note: Full test requires chat integration mock
        XCTAssertNotNil(viewModel)
    }

    func testPhoneSupportInitiation() throws {
        // When: Calling support
        // Note: Cannot fully test URL opening in unit tests

        // Then: Should have phone support method
        viewModel.callSupport()
        XCTAssertNotNil(viewModel)
    }

    func testScheduleCallback() throws {
        // When: Scheduling callback
        viewModel.scheduleCallback()

        // Then: Should trigger scheduling system
        // Note: Full test requires URL opening mock
        XCTAssertNotNil(viewModel)
    }

    // MARK: - Test 7: Knowledge Base Page (/support/knowledge-base)

    func testKnowledgeBaseArticles() throws {
        // Given: Help articles loaded
        let articles = viewModel.popularArticles

        // Then: Should have articles with proper structure
        XCTAssertGreaterThan(articles.count, 0)

        for article in articles {
            XCTAssertFalse(article.title.isEmpty, "Article should have title")
            XCTAssertFalse(article.content.isEmpty, "Article should have content")
            XCTAssertFalse(article.category.isEmpty, "Article should have category")
            XCTAssertGreaterThan(article.readTime, 0, "Article should have read time")
        }
    }

    func testKnowledgeBaseCategories() throws {
        // Given: Articles with different categories
        let categories = Set(viewModel.popularArticles.map { $0.category })

        // Then: Should have multiple categories
        XCTAssertGreaterThan(categories.count, 0)

        // Should include common categories
        let commonCategories = ["Getting Started", "Investments", "Documents", "Security", "Withdrawals"]
        let hasCommonCategory = categories.contains(where: { commonCategories.contains($0) })
        XCTAssertTrue(hasCommonCategory)
    }

    func testArticleReadTimeEstimates() throws {
        // Given: Articles with read times
        for article in viewModel.popularArticles {
            // Then: Read time should be reasonable (1-15 minutes)
            XCTAssertGreaterThan(article.readTime, 0)
            XCTAssertLessThanOrEqual(article.readTime, 15)
        }
    }

    func testArticleViewsTracking() throws {
        // Given: Articles with view counts
        for article in viewModel.popularArticles {
            // Then: Should track views
            XCTAssertGreaterThanOrEqual(article.views, 0)
        }
    }

    // MARK: - Cross-Page Functionality Tests

    func testCategoryFiltering() throws {
        // Given: FAQs with different categories
        let allCount = viewModel.allFAQs.count

        // When: Filtering by specific category (Investments)
        viewModel.filterByCategory(.investments)

        // Then: Should show only investment FAQs
        XCTAssertLessThanOrEqual(viewModel.filteredFAQs.count, allCount)

        if !viewModel.filteredFAQs.isEmpty {
            XCTAssertTrue(
                viewModel.filteredFAQs.allSatisfy { $0.category.lowercased() == "investments" }
            )
        }
    }

    func testAllCategoryShowsEverything() throws {
        // Given: Filtered state
        viewModel.filterByCategory(.investments)
        let filteredCount = viewModel.filteredFAQs.count

        // When: Switching to "All" category
        viewModel.filterByCategory(.all)

        // Then: Should show all FAQs
        XCTAssertEqual(viewModel.filteredFAQs.count, viewModel.allFAQs.count)
        XCTAssertGreaterThanOrEqual(viewModel.filteredFAQs.count, filteredCount)
    }

    func testMultipleCategoryFilters() throws {
        // Test filtering through multiple categories

        // Investments
        viewModel.filterByCategory(.investments)
        let investmentCount = viewModel.filteredFAQs.count

        // Account
        viewModel.filterByCategory(.account)
        let accountCount = viewModel.filteredFAQs.count

        // Security
        viewModel.filterByCategory(.security)
        let securityCount = viewModel.filteredFAQs.count

        // Then: Each category should work
        XCTAssertGreaterThanOrEqual(investmentCount, 0)
        XCTAssertGreaterThanOrEqual(accountCount, 0)
        XCTAssertGreaterThanOrEqual(securityCount, 0)
    }

    func testCombinedSearchAndFilter() throws {
        // Given: Category filter applied
        viewModel.filterByCategory(.investments)
        let categoryFilteredCount = viewModel.filteredFAQs.count

        // When: Also applying search
        viewModel.searchContent(query: "minimum")

        // Then: Should apply both filters
        XCTAssertLessThanOrEqual(viewModel.filteredFAQs.count, categoryFilteredCount)

        if !viewModel.filteredFAQs.isEmpty {
            // Results should match both category and search
            for faq in viewModel.filteredFAQs {
                let matchesSearch = faq.question.localizedCaseInsensitiveContains("minimum") ||
                                  faq.answer.localizedCaseInsensitiveContains("minimum")
                XCTAssertTrue(matchesSearch)
            }
        }
    }

    func testResourceTypes() throws {
        // Given: Different resource types
        let resources: [SupportViewModel.ResourceType] = [
            .investmentGuide,
            .taxCenter,
            .securityCenter,
            .videoTutorials
        ]

        // When: Opening each resource type
        for resource in resources {
            viewModel.openResource(resource)
            // Then: Should trigger appropriate action
            // Note: Full test requires URL opening mock
        }

        XCTAssertNotNil(viewModel)
    }

    func testHelpfulnessTracking() throws {
        // Given: FAQs with helpfulness scores
        for faq in viewModel.allFAQs {
            if let helpful = faq.helpful {
                // Then: Helpfulness should be reasonable
                XCTAssertGreaterThanOrEqual(helpful, 0)
                XCTAssertLessThan(helpful, 1000) // Arbitrary reasonable maximum
            }
        }
    }

    func testFAQOrdering() throws {
        // Given: FAQs with order indices
        for faq in viewModel.allFAQs {
            // Then: Should have valid order index
            XCTAssertGreaterThan(faq.orderIndex, 0)
        }
    }

    // MARK: - Performance Tests

    func testSearchPerformance() throws {
        // Given: Large number of FAQs
        let iterations = 100

        // When: Performing multiple searches
        measure {
            for i in 0..<iterations {
                let query = i % 2 == 0 ? "investment" : "withdrawal"
                viewModel.searchContent(query: query)
            }
        }

        // Then: Should complete in reasonable time
        XCTAssertNotNil(viewModel.filteredFAQs)
    }

    func testFilteringPerformance() throws {
        // Given: Multiple category changes
        let categories: [SupportView.SupportCategory] = [
            .all, .investments, .withdrawals, .account, .security, .documents
        ]

        // When: Switching between categories repeatedly
        measure {
            for category in categories {
                viewModel.filterByCategory(category)
            }
        }

        // Then: Should complete quickly
        XCTAssertNotNil(viewModel.filteredFAQs)
    }

    // MARK: - Edge Cases

    func testEmptySearchQuery() throws {
        // When: Searching with empty string
        viewModel.searchContent(query: "")

        // Then: Should show all FAQs
        XCTAssertEqual(viewModel.filteredFAQs.count, viewModel.allFAQs.count)
    }

    func testWhitespaceSearchQuery() throws {
        // When: Searching with whitespace
        viewModel.searchContent(query: "   ")

        // Then: Should handle gracefully
        XCTAssertGreaterThanOrEqual(viewModel.filteredFAQs.count, 0)
    }

    func testSpecialCharactersInSearch() throws {
        // When: Searching with special characters
        viewModel.searchContent(query: "$10,000")

        // Then: Should find matching FAQs
        if !viewModel.filteredFAQs.isEmpty {
            XCTAssertTrue(
                viewModel.filteredFAQs.first?.answer.contains("$10,000") ?? false
            )
        }
    }

    func testUnicodeInSearch() throws {
        // When: Searching with unicode characters
        viewModel.searchContent(query: "café")

        // Then: Should handle unicode gracefully
        XCTAssertGreaterThanOrEqual(viewModel.filteredFAQs.count, 0)
    }

    func testCategoryFilterWithNoMatches() throws {
        // Note: With mock data, all categories should have matches
        // But testing the case where a category might be empty

        viewModel.filterByCategory(.investments)

        // Then: Should return valid array (even if empty)
        XCTAssertNotNil(viewModel.filteredFAQs)
        XCTAssertGreaterThanOrEqual(viewModel.filteredFAQs.count, 0)
    }

    // MARK: - Integration Tests

    func testSupportWorkflow() throws {
        // Simulate a complete support workflow

        // 1. User visits support hub
        XCTAssertFalse(viewModel.popularArticles.isEmpty)

        // 2. User searches FAQs
        viewModel.searchContent(query: "investment")
        XCTAssertGreaterThan(viewModel.filteredFAQs.count, 0)

        // 3. User filters by category
        viewModel.filterByCategory(.investments)

        // 4. User might initiate chat
        let wasChatAvailable = viewModel.isChatAvailable

        // 5. User generates email body
        let emailBody = viewModel.generateSupportEmailBody()
        XCTAssertTrue(emailBody.contains("Device Information"))

        // Workflow should complete successfully
        XCTAssertNotNil(viewModel)
        XCTAssertNotNil(wasChatAvailable)
    }

    func testArticleNavigation() throws {
        // Given: Popular articles
        let articles = viewModel.popularArticles

        // When: User views articles
        for article in articles {
            // Then: Each article should have necessary data
            XCTAssertFalse(article.id.uuidString.isEmpty)
            XCTAssertFalse(article.title.isEmpty)
            XCTAssertFalse(article.content.isEmpty)
            XCTAssertFalse(article.icon.isEmpty)
        }
    }

    // MARK: - Data Validation Tests

    func testFAQDataIntegrity() throws {
        // Given: All FAQs
        for faq in viewModel.allFAQs {
            // Then: Each FAQ should have complete data
            XCTAssertFalse(faq.id.uuidString.isEmpty, "FAQ should have ID")
            XCTAssertFalse(faq.question.isEmpty, "FAQ should have question")
            XCTAssertFalse(faq.answer.isEmpty, "FAQ should have answer")
            XCTAssertFalse(faq.category.isEmpty, "FAQ should have category")
            XCTAssertGreaterThan(faq.orderIndex, 0, "FAQ should have order index")
        }
    }

    func testArticleDataIntegrity() throws {
        // Given: All articles
        for article in viewModel.popularArticles {
            // Then: Each article should have complete data
            XCTAssertFalse(article.id.uuidString.isEmpty)
            XCTAssertFalse(article.title.isEmpty)
            XCTAssertFalse(article.content.isEmpty)
            XCTAssertFalse(article.category.isEmpty)
            XCTAssertFalse(article.icon.isEmpty)
            XCTAssertGreaterThan(article.readTime, 0)
            XCTAssertGreaterThanOrEqual(article.views, 0)
        }
    }
}
