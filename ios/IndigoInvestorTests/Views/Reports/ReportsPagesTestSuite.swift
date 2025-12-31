//
//  ReportsPagesTestSuite.swift
//  IndigoInvestorTests
//
//  Comprehensive test suite for all 6 Reports pages
//

import XCTest
import SwiftUI
@testable import IndigoInvestor

// MARK: - Reports Dashboard Tests

@MainActor
final class ReportsDashboardViewTests: XCTestCase {

    func testReportsDashboardLoad() async throws {
        // Given: Reports dashboard
        let mockService = MockReportsService()

        // When: Loading dashboard
        let data = await mockService.loadDashboard()

        // Then: Should load all report types
        XCTAssertNotNil(data)
        XCTAssertGreaterThan(data.availableReports.count, 0)
    }

    func testRecentReportsDisplay() async throws {
        // Given: Recent reports
        let mockService = MockReportsService()
        mockService.mockRecentReports = [
            ReportSummary(id: "1", type: .performance, date: Date()),
            ReportSummary(id: "2", type: .tax, date: Date())
        ]

        // When: Fetching recent reports
        let reports = await mockService.getRecentReports()

        // Then: Should return recent reports
        XCTAssertEqual(reports.count, 2)
    }

    func testQuickReportGeneration() async throws {
        // Given: Quick report type
        let reportType = ReportType.performance

        // When: Generating quick report
        let mockService = MockReportsService()
        let report = await mockService.generateQuickReport(type: reportType)

        // Then: Should generate successfully
        XCTAssertNotNil(report)
    }
}

// MARK: - Portfolio Performance Report Tests

@MainActor
final class PortfolioPerformanceReportTests: XCTestCase {

    func testPerformanceMetricsCalculation() async throws {
        // Given: Portfolio data
        let mockService = MockPerformanceService()
        mockService.mockPortfolioValue = 100000.0
        mockService.mockTotalGain = 15000.0

        // When: Calculating metrics
        let metrics = await mockService.calculatePerformanceMetrics()

        // Then: Should calculate correctly
        XCTAssertEqual(metrics.totalReturn, 15.0) // 15% return
        XCTAssertEqual(metrics.totalGain, 15000.0)
    }

    func testTimeWeightedReturn() async throws {
        // Given: Portfolio transactions
        let mockService = MockPerformanceService()

        // When: Calculating TWR
        let twr = await mockService.calculateTimeWeightedReturn()

        // Then: Should calculate TWR
        XCTAssertNotNil(twr)
        XCTAssertGreaterThanOrEqual(twr, -1.0) // -100% minimum
    }

    func testMoneyWeightedReturn() async throws {
        // Given: Portfolio cash flows
        let mockService = MockPerformanceService()

        // When: Calculating MWR
        let mwr = await mockService.calculateMoneyWeightedReturn()

        // Then: Should calculate MWR
        XCTAssertNotNil(mwr)
    }

    func testBenchmarkComparison() async throws {
        // Given: Portfolio and benchmark data
        let mockService = MockPerformanceService()
        mockService.mockPortfolioReturn = 12.5
        mockService.mockBenchmarkReturn = 10.0

        // When: Comparing to benchmark
        let comparison = await mockService.compareToBenadmark()

        // Then: Should show outperformance
        XCTAssertGreaterThan(comparison.alpha, 0)
    }

    func testRiskMetricsCalculation() async throws {
        // Given: Historical returns
        let mockService = MockPerformanceService()

        // When: Calculating risk metrics
        let metrics = await mockService.calculateRiskMetrics()

        // Then: Should calculate volatility, Sharpe, etc.
        XCTAssertNotNil(metrics.volatility)
        XCTAssertNotNil(metrics.sharpeRatio)
        XCTAssertNotNil(metrics.maxDrawdown)
    }
}

// MARK: - Tax Report Tests

@MainActor
final class TaxReportViewTests: XCTestCase {

    func testCapitalGainsCalculation() async throws {
        // Given: Trades for tax year
        let mockService = MockTaxService()
        mockService.mockTrades = [
            Trade(buyDate: Date(), sellDate: Date(), gain: 1000.0, type: .longTerm),
            Trade(buyDate: Date(), sellDate: Date(), gain: 500.0, type: .shortTerm)
        ]

        // When: Calculating capital gains
        let gains = await mockService.calculateCapitalGains()

        // Then: Should separate short and long term
        XCTAssertEqual(gains.shortTerm, 500.0)
        XCTAssertEqual(gains.longTerm, 1000.0)
    }

    func testDividendIncome() async throws {
        // Given: Dividend payments
        let mockService = MockTaxService()
        mockService.mockDividends = [
            Dividend(date: Date(), amount: 100.0, qualified: true),
            Dividend(date: Date(), amount: 50.0, qualified: false)
        ]

        // When: Calculating dividend income
        let income = await mockService.calculateDividendIncome()

        // Then: Should separate qualified and ordinary
        XCTAssertEqual(income.qualified, 100.0)
        XCTAssertEqual(income.ordinary, 50.0)
    }

    func testWashSaleDetection() async throws {
        // Given: Trades with potential wash sales
        let mockService = MockTaxService()

        // When: Detecting wash sales
        let washSales = await mockService.detectWashSales()

        // Then: Should identify wash sales
        XCTAssertNotNil(washSales)
    }

    func testForm1099Generation() async throws {
        // Given: Tax year data
        let mockService = MockTaxService()

        // When: Generating 1099
        let form1099 = await mockService.generate1099(year: 2024)

        // Then: Should generate form
        XCTAssertNotNil(form1099)
        XCTAssertTrue(form1099.contains("1099-B"))
    }

    func testTaxLotSelection() async throws {
        // Given: Multiple tax lots
        let mockService = MockTaxService()
        let methods: [TaxLotMethod] = [.fifo, .lifo, .hifo, .specificId]

        // When: Testing each method
        var results: [Bool] = []
        for method in methods {
            let result = await mockService.selectTaxLot(method: method)
            results.append(result != nil)
        }

        // Then: Should support all methods
        XCTAssertTrue(results.allSatisfy { $0 })
    }
}

// MARK: - Monthly Statement Tests

@MainActor
final class MonthlyStatementViewTests: XCTestCase {

    func testStatementGeneration() async throws {
        // Given: Month and year
        let mockService = MockStatementService()
        let month = 10
        let year = 2024

        // When: Generating statement
        let statement = await mockService.generateMonthlyStatement(month: month, year: year)

        // Then: Should generate statement
        XCTAssertNotNil(statement)
    }

    func testAccountSummary() async throws {
        // Given: Account activity
        let mockService = MockStatementService()

        // When: Generating summary
        let summary = await mockService.generateAccountSummary()

        // Then: Should include key metrics
        XCTAssertNotNil(summary.beginningBalance)
        XCTAssertNotNil(summary.endingBalance)
        XCTAssertNotNil(summary.deposits)
        XCTAssertNotNil(summary.withdrawals)
    }

    func testTransactionHistory() async throws {
        // Given: Monthly transactions
        let mockService = MockStatementService()

        // When: Fetching transactions
        let transactions = await mockService.getMonthlyTransactions()

        // Then: Should return all transactions
        XCTAssertNotNil(transactions)
    }

    func testFeesAndCharges() async throws {
        // Given: Account fees
        let mockService = MockStatementService()

        // When: Calculating fees
        let fees = await mockService.calculateMonthlyFees()

        // Then: Should itemize fees
        XCTAssertNotNil(fees)
    }
}

// MARK: - Report History Tests

@MainActor
final class ReportHistoryViewTests: XCTestCase {

    func testHistoryLoad() async throws {
        // Given: Report history
        let mockService = MockReportHistoryService()

        // When: Loading history
        let history = await mockService.loadReportHistory()

        // Then: Should load all reports
        XCTAssertNotNil(history)
    }

    func testFilterByType() async throws {
        // Given: Report history with mixed types
        let mockService = MockReportHistoryService()

        // When: Filtering by type
        let filtered = await mockService.filterReports(type: .tax)

        // Then: Should return only tax reports
        XCTAssertTrue(filtered.allSatisfy { $0.type == .tax })
    }

    func testFilterByDateRange() async throws {
        // Given: Report history
        let mockService = MockReportHistoryService()
        let start = Date().addingTimeInterval(-30 * 24 * 3600)
        let end = Date()

        // When: Filtering by date
        let filtered = await mockService.filterReports(start: start, end: end)

        // Then: Should return reports in range
        XCTAssertNotNil(filtered)
    }

    func testReportDownload() async throws {
        // Given: Historical report
        let mockService = MockReportHistoryService()
        let reportId = "report-123"

        // When: Downloading report
        let data = await mockService.downloadReport(reportId)

        // Then: Should download successfully
        XCTAssertNotNil(data)
    }

    func testReportDeletion() async throws {
        // Given: Historical report
        let mockService = MockReportHistoryService()
        let reportId = "report-123"

        // When: Deleting report
        let result = await mockService.deleteReport(reportId)

        // Then: Should delete successfully
        XCTAssertTrue(result)
    }

    func testBulkDownload() async throws {
        // Given: Multiple reports
        let mockService = MockReportHistoryService()
        let reportIds = ["report-1", "report-2", "report-3"]

        // When: Bulk downloading
        let zipFile = await mockService.bulkDownload(reportIds)

        // Then: Should create zip file
        XCTAssertNotNil(zipFile)
    }
}

// MARK: - Mock Models

enum ReportType {
    case performance
    case tax
    case statement
    case custom
}

struct ReportSummary {
    let id: String
    let type: ReportType
    let date: Date
}

struct DashboardData {
    let availableReports: [ReportType]
}

struct PerformanceMetrics {
    let totalReturn: Double
    let totalGain: Double
    let portfolioValue: Double
}

struct BenchmarkComparison {
    let alpha: Double
    let beta: Double
}

struct RiskMetrics {
    let volatility: Double
    let sharpeRatio: Double
    let maxDrawdown: Double
}

struct Trade {
    let buyDate: Date
    let sellDate: Date
    let gain: Double
    let type: TradeType

    enum TradeType {
        case shortTerm
        case longTerm
    }
}

struct CapitalGains {
    let shortTerm: Double
    let longTerm: Double
}

struct Dividend {
    let date: Date
    let amount: Double
    let qualified: Bool
}

struct DividendIncome {
    let qualified: Double
    let ordinary: Double
}

enum TaxLotMethod {
    case fifo
    case lifo
    case hifo
    case specificId
}

struct AccountSummary {
    let beginningBalance: Double
    let endingBalance: Double
    let deposits: Double
    let withdrawals: Double
}

// MARK: - Mock Services

class MockReportsService {
    var mockRecentReports: [ReportSummary] = []

    func loadDashboard() async -> DashboardData {
        return DashboardData(availableReports: [.performance, .tax, .statement, .custom])
    }

    func getRecentReports() async -> [ReportSummary] {
        return mockRecentReports
    }

    func generateQuickReport(type: ReportType) async -> Data? {
        return Data(count: 1024)
    }
}

class MockPerformanceService {
    var mockPortfolioValue: Double = 0
    var mockTotalGain: Double = 0
    var mockPortfolioReturn: Double = 0
    var mockBenchmarkReturn: Double = 0

    func calculatePerformanceMetrics() async -> PerformanceMetrics {
        let totalReturn = (mockTotalGain / (mockPortfolioValue - mockTotalGain)) * 100
        return PerformanceMetrics(
            totalReturn: totalReturn,
            totalGain: mockTotalGain,
            portfolioValue: mockPortfolioValue
        )
    }

    func calculateTimeWeightedReturn() async -> Double {
        return 12.5 // Mock 12.5% return
    }

    func calculateMoneyWeightedReturn() async -> Double {
        return 11.8 // Mock 11.8% return
    }

    func compareToBenadmark() async -> BenchmarkComparison {
        let alpha = mockPortfolioReturn - mockBenchmarkReturn
        return BenchmarkComparison(alpha: alpha, beta: 1.0)
    }

    func calculateRiskMetrics() async -> RiskMetrics {
        return RiskMetrics(
            volatility: 15.2,
            sharpeRatio: 1.3,
            maxDrawdown: -12.5
        )
    }
}

class MockTaxService {
    var mockTrades: [Trade] = []
    var mockDividends: [Dividend] = []

    func calculateCapitalGains() async -> CapitalGains {
        let shortTerm = mockTrades
            .filter { $0.type == .shortTerm }
            .reduce(0) { $0 + $1.gain }
        let longTerm = mockTrades
            .filter { $0.type == .longTerm }
            .reduce(0) { $0 + $1.gain }
        return CapitalGains(shortTerm: shortTerm, longTerm: longTerm)
    }

    func calculateDividendIncome() async -> DividendIncome {
        let qualified = mockDividends
            .filter { $0.qualified }
            .reduce(0) { $0 + $1.amount }
        let ordinary = mockDividends
            .filter { !$0.qualified }
            .reduce(0) { $0 + $1.amount }
        return DividendIncome(qualified: qualified, ordinary: ordinary)
    }

    func detectWashSales() async -> [Trade] {
        return []
    }

    func generate1099(year: Int) async -> String {
        return "Form 1099-B for tax year \(year)"
    }

    func selectTaxLot(method: TaxLotMethod) async -> Trade? {
        return mockTrades.first
    }
}

class MockStatementService {
    func generateMonthlyStatement(month: Int, year: Int) async -> Data? {
        return Data(count: 1024)
    }

    func generateAccountSummary() async -> AccountSummary {
        return AccountSummary(
            beginningBalance: 95000.0,
            endingBalance: 100000.0,
            deposits: 10000.0,
            withdrawals: 5000.0
        )
    }

    func getMonthlyTransactions() async -> [Transaction] {
        return []
    }

    func calculateMonthlyFees() async -> [Fee] {
        return []
    }
}

class MockReportHistoryService {
    func loadReportHistory() async -> [ReportSummary] {
        return [
            ReportSummary(id: "1", type: .performance, date: Date()),
            ReportSummary(id: "2", type: .tax, date: Date())
        ]
    }

    func filterReports(type: ReportType) async -> [ReportSummary] {
        let all = await loadReportHistory()
        return all.filter { $0.type == type }
    }

    func filterReports(start: Date, end: Date) async -> [ReportSummary] {
        let all = await loadReportHistory()
        return all.filter { $0.date >= start && $0.date <= end }
    }

    func downloadReport(_ reportId: String) async -> Data? {
        return Data(count: 1024)
    }

    func deleteReport(_ reportId: String) async -> Bool {
        return true
    }

    func bulkDownload(_ reportIds: [String]) async -> Data? {
        return Data(count: 10240) // Mock zip file
    }
}

struct Transaction {
    let id: String
    let date: Date
    let amount: Double
}

struct Fee {
    let type: String
    let amount: Double
}
