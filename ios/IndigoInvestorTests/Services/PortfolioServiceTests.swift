//
//  PortfolioServiceTests.swift
//  IndigoInvestorTests
//
//  Comprehensive tests for PortfolioService
//

import XCTest
@testable import IndigoInvestor
import Foundation

@MainActor
final class PortfolioServiceTests: XCTestCase {
    var mockRepository: MockPortfolioRepository!
    var mockRealtimeService: MockRealtimeService!
    var portfolioService: PortfolioService!
    var testInvestorId: UUID!
    var testPortfolio: Portfolio!

    override func setUp() async throws {
        try await super.setUp()

        mockRepository = MockPortfolioRepository()
        mockRealtimeService = MockRealtimeService()
        portfolioService = PortfolioService(
            repository: mockRepository,
            realtimeService: mockRealtimeService
        )

        testInvestorId = UUID()
        testPortfolio = createMockPortfolio()
    }

    override func tearDown() async throws {
        portfolioService = nil
        mockRepository = nil
        mockRealtimeService = nil
        testInvestorId = nil
        testPortfolio = nil
        try await super.tearDown()
    }

    // MARK: - Fetch Portfolio Tests

    func testFetchPortfolio_Success() async throws {
        // Given
        mockRepository.mockPortfolio = testPortfolio
        mockRepository.shouldSucceed = true

        // When
        let portfolio = try await portfolioService.fetchPortfolio(for: testInvestorId)

        // Then
        XCTAssertTrue(mockRepository.fetchPortfolioCalled)
        XCTAssertEqual(mockRepository.lastInvestorId, testInvestorId)
        XCTAssertEqual(portfolio.id, testPortfolio.id)
        XCTAssertEqual(portfolio.totalValue, testPortfolio.totalValue)
    }

    func testFetchPortfolio_NetworkError() async throws {
        // Given
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        mockRepository.shouldSucceed = false
        mockRepository.mockError = error

        // When/Then
        do {
            _ = try await portfolioService.fetchPortfolio(for: testInvestorId)
            XCTFail("Should have thrown error")
        } catch let portfolioError as PortfolioError {
            switch portfolioError {
            case .fetchFailed:
                // Expected
                break
            default:
                XCTFail("Wrong error type: \(portfolioError)")
            }
        }
    }

    func testFetchPortfolio_InvalidInvestorId() async throws {
        // Given
        let error = NSError(domain: "Portfolio", code: 404, userInfo: [NSLocalizedDescriptionKey: "Investor not found"])
        mockRepository.shouldSucceed = false
        mockRepository.mockError = error

        // When/Then
        do {
            _ = try await portfolioService.fetchPortfolio(for: UUID())
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertTrue(mockRepository.fetchPortfolioCalled)
        }
    }

    func testFetchPortfolio_EmptyPortfolio() async throws {
        // Given
        var emptyPortfolio = testPortfolio!
        emptyPortfolio.positions = []
        emptyPortfolio.totalValue = 0
        mockRepository.mockPortfolio = emptyPortfolio
        mockRepository.shouldSucceed = true

        // When
        let portfolio = try await portfolioService.fetchPortfolio(for: testInvestorId)

        // Then
        XCTAssertEqual(portfolio.positions.count, 0)
        XCTAssertEqual(portfolio.totalValue, 0)
    }

    // MARK: - Refresh Portfolio Tests

    func testRefreshPortfolio_Success() async throws {
        // Given
        mockRepository.mockPortfolio = testPortfolio
        mockRepository.shouldSucceed = true

        // When
        let portfolio = try await portfolioService.refreshPortfolioData(for: testInvestorId)

        // Then
        XCTAssertTrue(mockRepository.refreshPortfolioCalled)
        XCTAssertEqual(mockRepository.lastInvestorId, testInvestorId)
        XCTAssertEqual(portfolio.id, testPortfolio.id)
    }

    func testRefreshPortfolio_NetworkError() async throws {
        // Given
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        mockRepository.shouldSucceed = false
        mockRepository.mockError = error

        // When/Then
        do {
            _ = try await portfolioService.refreshPortfolioData(for: testInvestorId)
            XCTFail("Should have thrown error")
        } catch let portfolioError as PortfolioError {
            switch portfolioError {
            case .refreshFailed:
                // Expected
                break
            default:
                XCTFail("Wrong error type")
            }
        }
    }

    func testRefreshPortfolio_UpdatesData() async throws {
        // Given
        let initialPortfolio = testPortfolio!
        mockRepository.mockPortfolio = initialPortfolio

        // First fetch
        _ = try await portfolioService.fetchPortfolio(for: testInvestorId)

        // Update portfolio value
        var updatedPortfolio = initialPortfolio
        updatedPortfolio.totalValue = initialPortfolio.totalValue + 10000
        mockRepository.mockPortfolio = updatedPortfolio

        // When
        let refreshedPortfolio = try await portfolioService.refreshPortfolioData(for: testInvestorId)

        // Then
        XCTAssertEqual(refreshedPortfolio.totalValue, updatedPortfolio.totalValue)
        XCTAssertNotEqual(refreshedPortfolio.totalValue, initialPortfolio.totalValue)
    }

    // MARK: - Realtime Subscription Tests

    func testSubscribeToPortfolioUpdates_Success() async throws {
        // Given
        mockRealtimeService.shouldSucceed = true

        // When
        let stream = portfolioService.subscribeToPortfolioUpdates(investorId: testInvestorId)

        // Collect first update
        var receivedPortfolios: [Portfolio] = []
        let task = Task {
            for await portfolio in stream {
                receivedPortfolios.append(portfolio)
                if receivedPortfolios.count >= 1 {
                    break
                }
            }
        }

        // Simulate realtime update
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        mockRealtimeService.simulateUpdate(["new": portfolioToDict(testPortfolio)])

        // Wait for processing
        try await Task.sleep(nanoseconds: 200_000_000) // 0.2s
        task.cancel()

        // Then
        XCTAssertTrue(mockRealtimeService.subscribeToChannelCalled)
        XCTAssertTrue(mockRealtimeService.lastChannelName?.contains(testInvestorId.uuidString) ?? false)
    }

    func testSubscribeToPortfolioUpdates_Cancellation() async throws {
        // Given
        mockRealtimeService.shouldSucceed = true

        // When
        let stream = portfolioService.subscribeToPortfolioUpdates(investorId: testInvestorId)

        let task = Task {
            for await _ in stream {
                // Start receiving
            }
        }

        // Cancel subscription
        try await Task.sleep(nanoseconds: 100_000_000)
        task.cancel()
        try await Task.sleep(nanoseconds: 100_000_000)

        // Then
        XCTAssertTrue(mockRealtimeService.unsubscribeFromChannelCalled)
    }

    // MARK: - Performance Tests

    func testFetchPortfolio_PerformanceWithLargePortfolio() async throws {
        // Given
        var largePortfolio = testPortfolio!
        largePortfolio.positions = (0..<100).map { index in
            Position(
                id: UUID(),
                assetType: "Asset \(index)",
                quantity: Decimal(Double.random(in: 1...1000)),
                currentValue: Decimal(Double.random(in: 1000...100000)),
                costBasis: Decimal(Double.random(in: 1000...90000)),
                allocation: Double.random(in: 0.01...0.1)
            )
        }
        mockRepository.mockPortfolio = largePortfolio
        mockRepository.shouldSucceed = true

        // When
        measure {
            Task {
                _ = try? await portfolioService.fetchPortfolio(for: testInvestorId)
            }
        }
    }

    // MARK: - Error Handling Tests

    func testFetchPortfolio_HandlesMultipleErrors() async throws {
        // Given
        let errors = [
            NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet),
            NSError(domain: "Portfolio", code: 404),
            NSError(domain: "Portfolio", code: 500)
        ]

        for error in errors {
            mockRepository.shouldSucceed = false
            mockRepository.mockError = error

            // When/Then
            do {
                _ = try await portfolioService.fetchPortfolio(for: testInvestorId)
                XCTFail("Should have thrown error")
            } catch {
                // Expected
            }
        }
    }

    // MARK: - Data Validation Tests

    func testFetchPortfolio_ValidatesPositionData() async throws {
        // Given
        var portfolioWithInvalidPosition = testPortfolio!
        portfolioWithInvalidPosition.positions.append(
            Position(
                id: UUID(),
                assetType: "Invalid",
                quantity: -100, // Invalid negative quantity
                currentValue: 0,
                costBasis: 0,
                allocation: 0
            )
        )
        mockRepository.mockPortfolio = portfolioWithInvalidPosition
        mockRepository.shouldSucceed = true

        // When
        let portfolio = try await portfolioService.fetchPortfolio(for: testInvestorId)

        // Then - Service should still return data (validation is view layer concern)
        XCTAssertEqual(portfolio.positions.count, portfolioWithInvalidPosition.positions.count)
    }

    func testFetchPortfolio_CalculatesTotalValue() async throws {
        // Given
        mockRepository.mockPortfolio = testPortfolio
        mockRepository.shouldSucceed = true

        // When
        let portfolio = try await portfolioService.fetchPortfolio(for: testInvestorId)

        // Then
        let expectedTotal = portfolio.positions.reduce(Decimal.zero) { $0 + $1.currentValue }
        XCTAssertEqual(portfolio.totalValue, expectedTotal)
    }

    // MARK: - Concurrency Tests

    func testFetchPortfolio_MultipleConcurrentRequests() async throws {
        // Given
        mockRepository.mockPortfolio = testPortfolio
        mockRepository.shouldSucceed = true

        // When - Make multiple concurrent requests
        async let fetch1 = portfolioService.fetchPortfolio(for: testInvestorId)
        async let fetch2 = portfolioService.fetchPortfolio(for: testInvestorId)
        async let fetch3 = portfolioService.fetchPortfolio(for: testInvestorId)

        let portfolios = try await [fetch1, fetch2, fetch3]

        // Then - All should succeed
        XCTAssertEqual(portfolios.count, 3)
        portfolios.forEach { portfolio in
            XCTAssertEqual(portfolio.id, testPortfolio.id)
        }
    }

    // MARK: - Helper Methods

    private func createMockPortfolio() -> Portfolio {
        Portfolio(
            id: UUID(),
            investorId: testInvestorId,
            totalValue: 150000,
            cashBalance: 10000,
            totalReturn: 15000,
            totalReturnPercentage: 11.1,
            positions: [
                Position(
                    id: UUID(),
                    assetType: "BTC",
                    quantity: 1.5,
                    currentValue: 66250.50,
                    costBasis: 60000,
                    allocation: 0.44
                ),
                Position(
                    id: UUID(),
                    assetType: "ETH",
                    quantity: 10,
                    currentValue: 27900,
                    costBasis: 25000,
                    allocation: 0.19
                ),
                Position(
                    id: UUID(),
                    assetType: "EUROC",
                    quantity: 45849.50,
                    currentValue: 45849.50,
                    costBasis: 45000,
                    allocation: 0.31
                )
            ],
            lastUpdated: Date()
        )
    }

    private func portfolioToDict(_ portfolio: Portfolio) -> [String: Any] {
        [
            "id": portfolio.id.uuidString,
            "investor_id": portfolio.investorId.uuidString,
            "total_value": NSDecimalNumber(decimal: portfolio.totalValue).doubleValue,
            "cash_balance": NSDecimalNumber(decimal: portfolio.cashBalance).doubleValue,
            "total_return": NSDecimalNumber(decimal: portfolio.totalReturn).doubleValue,
            "total_return_percentage": portfolio.totalReturnPercentage,
            "last_updated": ISO8601DateFormatter().string(from: portfolio.lastUpdated)
        ]
    }
}

// MARK: - Mock Portfolio Repository

class MockPortfolioRepository: PortfolioRepositoryProtocol {
    var shouldSucceed = true
    var mockError: Error?
    var mockPortfolio: Portfolio?

    var fetchPortfolioCalled = false
    var refreshPortfolioCalled = false
    var lastInvestorId: UUID?

    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        fetchPortfolioCalled = true
        lastInvestorId = investorId

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "Portfolio", code: 500)
        }

        guard let portfolio = mockPortfolio else {
            throw NSError(domain: "Portfolio", code: 404)
        }

        return portfolio
    }

    func refreshPortfolioFromNetwork(for investorId: UUID) async throws -> Portfolio {
        refreshPortfolioCalled = true
        lastInvestorId = investorId

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "Portfolio", code: 500)
        }

        guard let portfolio = mockPortfolio else {
            throw NSError(domain: "Portfolio", code: 404)
        }

        return portfolio
    }

    func reset() {
        shouldSucceed = true
        mockError = nil
        mockPortfolio = nil
        fetchPortfolioCalled = false
        refreshPortfolioCalled = false
        lastInvestorId = nil
    }
}

// MARK: - Mock Realtime Service

class MockRealtimeService: RealtimeServiceProtocol {
    var shouldSucceed = true
    var subscribeToChannelCalled = false
    var unsubscribeFromChannelCalled = false
    var lastChannelName: String?
    private var updateHandlers: [String: ([String: Any]) -> Void] = [:]

    func subscribeToChannel(_ channelName: String, onUpdate: @escaping ([String: Any]) -> Void) {
        subscribeToChannelCalled = true
        lastChannelName = channelName
        updateHandlers[channelName] = onUpdate
    }

    func unsubscribeFromChannel(_ channelName: String) {
        unsubscribeFromChannelCalled = true
        updateHandlers.removeValue(forKey: channelName)
    }

    func simulateUpdate(_ payload: [String: Any]) {
        guard let channelName = lastChannelName,
              let handler = updateHandlers[channelName] else {
            return
        }
        handler(payload)
    }

    func reset() {
        shouldSucceed = true
        subscribeToChannelCalled = false
        unsubscribeFromChannelCalled = false
        lastChannelName = nil
        updateHandlers.removeAll()
    }
}
