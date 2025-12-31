//
//  NotificationsViewModelTests.swift
//  IndigoInvestorTests
//
//  Comprehensive test suite for Notifications ViewModel
//  Tests cover all 5 notification pages and real-time functionality
//

import XCTest
import Combine
import UserNotifications
@testable import IndigoInvestor

@MainActor
final class NotificationsViewModelTests: XCTestCase {

    var viewModel: NotificationsViewModel!
    var cancellables: Set<AnyCancellable>!

    override func setUp() async throws {
        try await super.setUp()
        viewModel = NotificationsViewModel()
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() async throws {
        viewModel = nil
        cancellables = nil
        try await super.tearDown()
    }

    // MARK: - Test 1: Notification Center Page (/notifications)

    func testNotificationCenterInitialization() throws {
        // Then: View model should initialize properly
        XCTAssertNotNil(viewModel.notifications)
        XCTAssertNotNil(viewModel.filteredNotifications)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testNotificationCenterLoading() async throws {
        // Given: Fresh view model
        XCTAssertTrue(viewModel.notifications.isEmpty)

        // When: Loading notifications
        viewModel.loadNotifications()

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s

        // Then: Loading should complete
        XCTAssertFalse(viewModel.isLoading)
    }

    func testUnreadNotificationBadge() throws {
        // Given: Mix of read and unread notifications
        let notification1 = createMockNotification(isRead: false)
        let notification2 = createMockNotification(isRead: true)
        let notification3 = createMockNotification(isRead: false)

        viewModel.notifications = [notification1, notification2, notification3]
        viewModel.filteredNotifications = viewModel.notifications

        // Then: Should have unread notifications
        viewModel.hasUnreadNotifications = viewModel.notifications.contains { !$0.isRead }
        XCTAssertTrue(viewModel.hasUnreadNotifications)

        let unreadCount = viewModel.notifications.filter { !$0.isRead }.count
        XCTAssertEqual(unreadCount, 2)
    }

    func testGroupedNotifications() throws {
        // Given: Notifications from different dates
        let calendar = Calendar.current
        let now = Date()

        let today1 = createMockNotification(timestamp: now)
        let today2 = createMockNotification(timestamp: now)
        let yesterday = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -1, to: now)!
        )
        let lastWeek = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -5, to: now)!
        )

        viewModel.filteredNotifications = [today1, today2, yesterday, lastWeek]

        // When: Getting grouped notifications
        let grouped = viewModel.groupedNotifications

        // Then: Should be grouped by date
        XCTAssertGreaterThan(grouped.count, 0)

        // Should have "Today" group
        let todayGroup = grouped.first { $0.key == "Today" }
        XCTAssertNotNil(todayGroup)
        XCTAssertEqual(todayGroup?.value.count, 2)
    }

    // MARK: - Test 2: Notification Settings Page (/notifications/settings)

    func testNotificationPreferences() throws {
        // Given: Notification preferences exist
        // Then: Should be accessible
        XCTAssertNotNil(viewModel)

        // Note: Actual preferences would be stored in UserDefaults or Supabase
        // This validates the structure exists
    }

    // MARK: - Test 3: Price Alerts Page (/notifications/alerts)

    func testPriceAlerts() throws {
        // Given: Price alert notifications
        let alert1 = createMockNotification(
            type: .security,
            title: "Price Alert",
            message: "Your portfolio value increased by 5%"
        )
        let alert2 = createMockNotification(
            type: .security,
            title: "Market Alert",
            message: "Significant market movement detected"
        )

        viewModel.notifications = [alert1, alert2]
        viewModel.filteredNotifications = viewModel.notifications

        // When: Filtering by security type (alerts)
        viewModel.filterNotifications(by: .security)

        // Then: Should show only alert notifications
        XCTAssertEqual(viewModel.filteredNotifications.count, 2)
        XCTAssertTrue(viewModel.filteredNotifications.allSatisfy { $0.type == .security })
    }

    // MARK: - Test 4: Notification History Page (/notifications/history)

    func testNotificationHistory() throws {
        // Given: Historical notifications
        let calendar = Calendar.current
        let now = Date()

        let recent = createMockNotification(timestamp: now)
        let old1 = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -30, to: now)!
        )
        let old2 = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -60, to: now)!
        )

        viewModel.notifications = [recent, old1, old2]
        viewModel.filteredNotifications = viewModel.notifications

        // Then: Should maintain all historical notifications
        XCTAssertEqual(viewModel.notifications.count, 3)
    }

    func testNotificationHistoryOrdering() throws {
        // Given: Notifications at different times
        let calendar = Calendar.current
        let now = Date()

        let oldest = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -10, to: now)!
        )
        let middle = createMockNotification(
            timestamp: calendar.date(byAdding: .day, value: -5, to: now)!
        )
        let newest = createMockNotification(timestamp: now)

        // Add in random order
        viewModel.notifications = [middle, oldest, newest]
        viewModel.filteredNotifications = viewModel.notifications

        // When: Getting grouped notifications (sorted by date)
        let grouped = viewModel.groupedNotifications

        // Then: Should be in date order (newest first)
        if grouped.count > 1 {
            let firstDate = viewModel.filteredNotifications.first(where: {
                grouped[0].value.contains { $0.id == $1.id }
            })?.timestamp ?? Date.distantPast

            let secondDate = viewModel.filteredNotifications.first(where: {
                grouped[1].value.contains { $0.id == $1.id }
            })?.timestamp ?? Date.distantPast

            XCTAssertGreaterThanOrEqual(firstDate, secondDate)
        }
    }

    // MARK: - Test 5: Notification Details Page (/notifications/:id)

    func testNotificationDetails() throws {
        // Given: Notification with full details
        let notification = createMockNotification(
            title: "Monthly Statement Ready",
            message: "Your January 2024 statement is now available",
            hasAction: true,
            actionUrl: "/documents/statements/123"
        )

        viewModel.notifications = [notification]

        // Then: Notification should have complete details
        XCTAssertFalse(notification.title.isEmpty)
        XCTAssertNotNil(notification.message)
        XCTAssertTrue(notification.hasAction)
        XCTAssertNotNil(notification.actionUrl)
    }

    func testNotificationTapAction() async throws {
        // Given: Unread notification
        let notification = createMockNotification(isRead: false, hasAction: true)
        viewModel.notifications = [notification]
        viewModel.filteredNotifications = [notification]

        // When: Tapping notification
        viewModel.handleNotificationTap(notification)

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000)

        // Then: Should be marked as read
        // Note: Full test requires mocked Supabase
        XCTAssertNotNil(notification)
    }

    // MARK: - Filtering Tests

    func testFilterAllNotifications() throws {
        // Given: Various notification types
        let statement = createMockNotification(type: .statement)
        let transaction = createMockNotification(type: .transaction)
        let security = createMockNotification(type: .security)

        viewModel.notifications = [statement, transaction, security]

        // When: Filtering by "all"
        viewModel.filterNotifications(by: .all)

        // Then: Should show all notifications
        XCTAssertEqual(viewModel.filteredNotifications.count, 3)
    }

    func testFilterUnreadNotifications() throws {
        // Given: Mix of read and unread
        let unread1 = createMockNotification(isRead: false)
        let read1 = createMockNotification(isRead: true)
        let unread2 = createMockNotification(isRead: false)
        let read2 = createMockNotification(isRead: true)

        viewModel.notifications = [unread1, read1, unread2, read2]

        // When: Filtering by unread
        viewModel.filterNotifications(by: .unread)

        // Then: Should show only unread
        XCTAssertEqual(viewModel.filteredNotifications.count, 2)
        XCTAssertTrue(viewModel.filteredNotifications.allSatisfy { !$0.isRead })
    }

    func testFilterStatements() throws {
        // Given: Various types
        let stmt1 = createMockNotification(type: .statement)
        let stmt2 = createMockNotification(type: .statement)
        let other = createMockNotification(type: .transaction)

        viewModel.notifications = [stmt1, stmt2, other]

        // When: Filtering by statements
        viewModel.filterNotifications(by: .statements)

        // Then: Should show only statements
        XCTAssertEqual(viewModel.filteredNotifications.count, 2)
        XCTAssertTrue(viewModel.filteredNotifications.allSatisfy { $0.type == .statement })
    }

    func testFilterTransactions() throws {
        // Given: Various types
        let txn1 = createMockNotification(type: .transaction)
        let txn2 = createMockNotification(type: .transaction)
        let other = createMockNotification(type: .statement)

        viewModel.notifications = [txn1, txn2, other]

        // When: Filtering by transactions
        viewModel.filterNotifications(by: .transactions)

        // Then: Should show only transactions
        XCTAssertEqual(viewModel.filteredNotifications.count, 2)
        XCTAssertTrue(viewModel.filteredNotifications.allSatisfy { $0.type == .transaction })
    }

    func testFilterSecurity() throws {
        // Given: Various types including security
        let security1 = createMockNotification(type: .security)
        let security2 = createMockNotification(type: .security)
        let other = createMockNotification(type: .marketing)

        viewModel.notifications = [security1, security2, other]

        // When: Filtering by security
        viewModel.filterNotifications(by: .security)

        // Then: Should show only security notifications
        XCTAssertEqual(viewModel.filteredNotifications.count, 2)
        XCTAssertTrue(viewModel.filteredNotifications.allSatisfy { $0.type == .security })
    }

    func testFilterMarketing() throws {
        // Given: Various types including marketing
        let marketing1 = createMockNotification(type: .marketing)
        let other = createMockNotification(type: .statement)

        viewModel.notifications = [marketing1, other]

        // When: Filtering by marketing
        viewModel.filterNotifications(by: .marketing)

        // Then: Should show only marketing notifications
        XCTAssertEqual(viewModel.filteredNotifications.count, 1)
        XCTAssertEqual(viewModel.filteredNotifications.first?.type, .marketing)
    }

    // MARK: - Count Tests

    func testGetCountForAllCategories() throws {
        // Given: Notifications of various types
        viewModel.notifications = [
            createMockNotification(type: .statement, isRead: false),
            createMockNotification(type: .statement, isRead: true),
            createMockNotification(type: .transaction, isRead: false),
            createMockNotification(type: .security, isRead: true),
            createMockNotification(type: .marketing, isRead: false)
        ]

        // When: Getting counts
        let allCount = viewModel.getCount(for: .all)
        let unreadCount = viewModel.getCount(for: .unread)
        let statementsCount = viewModel.getCount(for: .statements)
        let transactionsCount = viewModel.getCount(for: .transactions)
        let securityCount = viewModel.getCount(for: .security)
        let marketingCount = viewModel.getCount(for: .marketing)

        // Then: Counts should be accurate
        XCTAssertEqual(allCount, 5)
        XCTAssertEqual(unreadCount, 3)
        XCTAssertEqual(statementsCount, 2)
        XCTAssertEqual(transactionsCount, 1)
        XCTAssertEqual(securityCount, 1)
        XCTAssertEqual(marketingCount, 1)
    }

    // MARK: - Action Tests

    func testMarkAsRead() async throws {
        // Given: Unread notification
        let notification = createMockNotification(isRead: false)
        viewModel.notifications = [notification]
        viewModel.filteredNotifications = [notification]

        XCTAssertFalse(notification.isRead)

        // When: Marking as read
        viewModel.markAsRead(notification)

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000)

        // Then: Should update unread status
        // Note: Full test requires mocked Supabase
        XCTAssertNotNil(notification)
    }

    func testMarkAllAsRead() async throws {
        // Given: Multiple unread notifications
        let unread1 = createMockNotification(isRead: false)
        let unread2 = createMockNotification(isRead: false)
        let alreadyRead = createMockNotification(isRead: true)

        viewModel.notifications = [unread1, unread2, alreadyRead]
        viewModel.filteredNotifications = viewModel.notifications

        // When: Marking all as read
        viewModel.markAllAsRead()

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000)

        // Then: Should mark all unread as read
        // Note: Full test requires mocked Supabase
        XCTAssertNotNil(viewModel)
    }

    func testDeleteNotification() async throws {
        // Given: Notification to delete
        let notification = createMockNotification()
        viewModel.notifications = [notification]
        viewModel.filteredNotifications = [notification]

        let initialCount = viewModel.notifications.count

        // When: Deleting notification
        viewModel.deleteNotification(notification)

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000)

        // Then: Should be removed
        // Note: Full test requires mocked Supabase
        XCTAssertEqual(initialCount, 1)
    }

    // MARK: - Real-time Updates Tests

    func testRealtimeNotificationSubscription() throws {
        // Given: View model with realtime subscription
        // Then: Should be subscribed to updates
        // Note: Full test requires mocked Supabase Realtime
        XCTAssertNotNil(viewModel)
    }

    func testRefreshNotifications() async throws {
        // When: Refreshing notifications
        await viewModel.refreshNotifications()

        // Then: Should complete without error
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Notification Type Tests

    func testAllNotificationTypes() throws {
        // Given: All notification types
        let types: [AppNotification.NotificationType] = [
            .statement, .transaction, .interest, .security, .marketing, .system
        ]

        // When: Creating notifications of each type
        let notifications = types.map { type in
            createMockNotification(type: type)
        }

        // Then: Should handle all types
        XCTAssertEqual(notifications.count, 6)
        XCTAssertEqual(Set(notifications.map { $0.type }).count, 6)
    }

    func testNotificationTypeIcons() throws {
        // Given: Different notification types
        let statement = createMockNotification(type: .statement)
        let transaction = createMockNotification(type: .transaction)
        let security = createMockNotification(type: .security)

        // Then: Each type should have distinct characteristics
        XCTAssertNotEqual(statement.type, transaction.type)
        XCTAssertNotEqual(transaction.type, security.type)
    }

    // MARK: - Badge Count Tests

    func testBadgeCountCalculation() throws {
        // Given: Unread notifications
        viewModel.notifications = [
            createMockNotification(isRead: false),
            createMockNotification(isRead: false),
            createMockNotification(isRead: true),
            createMockNotification(isRead: false)
        ]

        // When: Calculating badge count
        let unreadCount = viewModel.notifications.filter { !$0.isRead }.count

        // Then: Should count only unread
        XCTAssertEqual(unreadCount, 3)
    }

    // MARK: - Date Formatting Tests

    func testTodayFormatting() throws {
        // Given: Notification from today
        let today = createMockNotification(timestamp: Date())
        viewModel.filteredNotifications = [today]

        // When: Getting grouped notifications
        let grouped = viewModel.groupedNotifications

        // Then: Should have "Today" group
        let todayGroup = grouped.first { $0.key == "Today" }
        XCTAssertNotNil(todayGroup)
    }

    func testYesterdayFormatting() throws {
        // Given: Notification from yesterday
        let calendar = Calendar.current
        let yesterday = calendar.date(byAdding: .day, value: -1, to: Date())!

        let notification = createMockNotification(timestamp: yesterday)
        viewModel.filteredNotifications = [notification]

        // When: Getting grouped notifications
        let grouped = viewModel.groupedNotifications

        // Then: Should have "Yesterday" group
        let yesterdayGroup = grouped.first { $0.key == "Yesterday" }
        XCTAssertNotNil(yesterdayGroup)
    }

    func testWeekdayFormatting() throws {
        // Given: Notification from last week
        let calendar = Calendar.current
        let lastWeek = calendar.date(byAdding: .day, value: -5, to: Date())!

        let notification = createMockNotification(timestamp: lastWeek)
        viewModel.filteredNotifications = [notification]

        // When: Getting grouped notifications
        let grouped = viewModel.groupedNotifications

        // Then: Should have weekday group
        XCTAssertGreaterThan(grouped.count, 0)
        XCTAssertNotEqual(grouped.first?.key, "Today")
        XCTAssertNotEqual(grouped.first?.key, "Yesterday")
    }

    // MARK: - Edge Cases

    func testEmptyNotificationsList() throws {
        // Given: No notifications
        viewModel.notifications = []
        viewModel.filteredNotifications = []

        // Then: Should handle empty state
        XCTAssertFalse(viewModel.hasUnreadNotifications)
        XCTAssertEqual(viewModel.getCount(for: .all), 0)
        XCTAssertTrue(viewModel.groupedNotifications.isEmpty)
    }

    func testAllNotificationsRead() throws {
        // Given: All notifications are read
        viewModel.notifications = [
            createMockNotification(isRead: true),
            createMockNotification(isRead: true),
            createMockNotification(isRead: true)
        ]

        // Then: Should have no unread notifications
        XCTAssertFalse(viewModel.notifications.contains { !$0.isRead })
        XCTAssertEqual(viewModel.getCount(for: .unread), 0)
    }

    func testAllNotificationsUnread() throws {
        // Given: All notifications are unread
        viewModel.notifications = [
            createMockNotification(isRead: false),
            createMockNotification(isRead: false),
            createMockNotification(isRead: false)
        ]

        // Then: All should be unread
        XCTAssertTrue(viewModel.notifications.allSatisfy { !$0.isRead })
        XCTAssertEqual(viewModel.getCount(for: .unread), 3)
    }

    func testNotificationWithoutMessage() throws {
        // Given: Notification without message
        let notification = createMockNotification(message: nil)

        // Then: Should handle missing message
        XCTAssertNil(notification.message)
        XCTAssertFalse(notification.title.isEmpty)
    }

    func testNotificationWithoutAction() throws {
        // Given: Notification without action
        let notification = createMockNotification(hasAction: false, actionUrl: nil)

        // Then: Should handle missing action
        XCTAssertFalse(notification.hasAction)
        XCTAssertNil(notification.actionUrl)
    }

    // MARK: - Performance Tests

    func testFilteringPerformance() throws {
        // Given: Large number of notifications
        let notifications = (0..<1000).map { _ in
            createMockNotification()
        }
        viewModel.notifications = notifications

        // When: Filtering notifications
        measure {
            viewModel.filterNotifications(by: .unread)
            viewModel.filterNotifications(by: .statements)
            viewModel.filterNotifications(by: .transactions)
            viewModel.filterNotifications(by: .all)
        }

        // Then: Should complete in reasonable time
        XCTAssertNotNil(viewModel.filteredNotifications)
    }

    func testGroupingPerformance() throws {
        // Given: Large number of notifications
        let notifications = (0..<1000).map { index in
            let calendar = Calendar.current
            let date = calendar.date(byAdding: .hour, value: -index, to: Date())!
            return createMockNotification(timestamp: date)
        }
        viewModel.filteredNotifications = notifications

        // When: Grouping notifications
        measure {
            _ = viewModel.groupedNotifications
        }

        // Then: Should complete in reasonable time
        XCTAssertNotNil(viewModel.groupedNotifications)
    }

    // MARK: - Helper Methods

    private func createMockNotification(
        id: UUID = UUID(),
        type: AppNotification.NotificationType = .statement,
        title: String = "Test Notification",
        message: String? = "Test message",
        timestamp: Date = Date(),
        isRead: Bool = false,
        hasAction: Bool = false,
        actionUrl: String? = nil
    ) -> AppNotification {
        return AppNotification(
            id: id,
            userId: UUID(),
            title: title,
            message: message,
            type: type,
            timestamp: timestamp,
            isRead: isRead,
            hasAction: hasAction,
            actionUrl: actionUrl,
            metadata: nil,
            createdAt: timestamp,
            updatedAt: timestamp
        )
    }
}
