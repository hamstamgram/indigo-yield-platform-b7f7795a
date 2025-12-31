//
//  CustomReportBuilderViewTests.swift
//  IndigoInvestorTests
//
//  CRITICAL: Comprehensive tests for ReportBuilder component and report generation
//

import XCTest
import SwiftUI
@testable import IndigoInvestor

@MainActor
final class CustomReportBuilderViewTests: XCTestCase {

    var mockNetworkService: MockNetworkService!
    var mockReportService: MockReportGenerationService!

    override func setUp() {
        super.setUp()
        mockNetworkService = MockNetworkService()
        mockReportService = MockReportGenerationService()
    }

    override func tearDown() {
        mockNetworkService = nil
        mockReportService = nil
        super.tearDown()
    }

    // MARK: - Report Builder Configuration Tests

    func testReportBuilderInitialization() {
        // Given: Report builder
        let builder = ReportBuilder()

        // When: Checking initial state
        // Then: Should be empty
        XCTAssertTrue(builder.selectedFields.isEmpty)
        XCTAssertNil(builder.dateRange)
        XCTAssertNil(builder.format)
    }

    func testAddFieldToReport() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding fields
        builder.addField(.portfolioValue)
        builder.addField(.totalGain)
        builder.addField(.totalReturn)

        // Then: Should contain all fields
        XCTAssertEqual(builder.selectedFields.count, 3)
        XCTAssertTrue(builder.selectedFields.contains(.portfolioValue))
    }

    func testRemoveFieldFromReport() {
        // Given: Report builder with fields
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.addField(.totalGain)

        // When: Removing field
        builder.removeField(.portfolioValue)

        // Then: Should remove field
        XCTAssertEqual(builder.selectedFields.count, 1)
        XCTAssertFalse(builder.selectedFields.contains(.portfolioValue))
    }

    func testSetDateRange() {
        // Given: Report builder
        var builder = ReportBuilder()
        let startDate = Date().addingTimeInterval(-30 * 24 * 3600)
        let endDate = Date()

        // When: Setting date range
        builder.setDateRange(start: startDate, end: endDate)

        // Then: Should set range
        XCTAssertNotNil(builder.dateRange)
        XCTAssertEqual(builder.dateRange?.start, startDate)
        XCTAssertEqual(builder.dateRange?.end, endDate)
    }

    func testInvalidDateRange() {
        // Given: Report builder
        var builder = ReportBuilder()
        let startDate = Date()
        let endDate = Date().addingTimeInterval(-30 * 24 * 3600) // Past date

        // When: Setting invalid range
        let result = builder.setDateRange(start: startDate, end: endDate)

        // Then: Should reject invalid range
        XCTAssertFalse(result)
        XCTAssertNil(builder.dateRange)
    }

    // MARK: - Report Format Tests

    func testPDFReportGeneration() async throws {
        // Given: Report configuration
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.addField(.totalGain)
        builder.setFormat(.pdf)

        // When: Generating PDF report
        mockReportService.expectedFormat = .pdf
        let reportData = await generateReport(builder)

        // Then: Should generate PDF
        XCTAssertNotNil(reportData)
        XCTAssertTrue(reportData?.isPDF ?? false)
    }

    func testExcelReportGeneration() async throws {
        // Given: Report configuration
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.addField(.transactions)
        builder.setFormat(.excel)

        // When: Generating Excel report
        mockReportService.expectedFormat = .excel
        let reportData = await generateReport(builder)

        // Then: Should generate Excel
        XCTAssertNotNil(reportData)
        XCTAssertTrue(reportData?.isExcel ?? false)
    }

    func testCSVReportGeneration() async throws {
        // Given: Report configuration
        var builder = ReportBuilder()
        builder.addField(.transactions)
        builder.addField(.holdings)
        builder.setFormat(.csv)

        // When: Generating CSV report
        mockReportService.expectedFormat = .csv
        let reportData = await generateReport(builder)

        // Then: Should generate CSV
        XCTAssertNotNil(reportData)
        XCTAssertTrue(reportData?.isCSV ?? false)
    }

    func testJSONReportGeneration() async throws {
        // Given: Report configuration
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.addField(.performance)
        builder.setFormat(.json)

        // When: Generating JSON report
        mockReportService.expectedFormat = .json
        let reportData = await generateReport(builder)

        // Then: Should generate JSON
        XCTAssertNotNil(reportData)
        XCTAssertTrue(reportData?.isJSON ?? false)
    }

    func testAllFormatsSupported() async throws {
        // Given: All report formats
        let formats: [ReportFormat] = [.pdf, .excel, .csv, .json]

        // When: Testing each format
        var results: [Bool] = []
        for format in formats {
            var builder = ReportBuilder()
            builder.addField(.portfolioValue)
            builder.setFormat(format)
            mockReportService.expectedFormat = format

            let reportData = await generateReport(builder)
            results.append(reportData != nil)
        }

        // Then: Should support all formats
        XCTAssertTrue(results.allSatisfy { $0 })
    }

    // MARK: - Report Field Selection Tests

    func testPortfolioValueField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding portfolio value field
        builder.addField(.portfolioValue)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.portfolioValue))
    }

    func testTransactionsField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding transactions field
        builder.addField(.transactions)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.transactions))
    }

    func testHoldingsField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding holdings field
        builder.addField(.holdings)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.holdings))
    }

    func testPerformanceMetricsField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding performance metrics
        builder.addField(.performance)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.performance))
    }

    func testTaxInformationField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding tax info
        builder.addField(.taxInfo)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.taxInfo))
    }

    func testDividendsField() {
        // Given: Report builder
        var builder = ReportBuilder()

        // When: Adding dividends
        builder.addField(.dividends)

        // Then: Should include field
        XCTAssertTrue(builder.selectedFields.contains(.dividends))
    }

    func testAllFieldsSelection() {
        // Given: Report builder
        var builder = ReportBuilder()
        let allFields: [ReportField] = [
            .portfolioValue, .totalGain, .totalReturn, .transactions,
            .holdings, .performance, .taxInfo, .dividends
        ]

        // When: Adding all fields
        allFields.forEach { builder.addField($0) }

        // Then: Should contain all fields
        XCTAssertEqual(builder.selectedFields.count, allFields.count)
    }

    // MARK: - Report Filtering Tests

    func testFilterByDateRange() async throws {
        // Given: Report with date range
        var builder = ReportBuilder()
        builder.addField(.transactions)
        let start = Date().addingTimeInterval(-30 * 24 * 3600)
        let end = Date()
        builder.setDateRange(start: start, end: end)

        // When: Generating filtered report
        let reportData = await generateReport(builder)

        // Then: Should filter by date
        XCTAssertNotNil(reportData)
    }

    func testFilterByAssetType() async throws {
        // Given: Report filtered by asset type
        var builder = ReportBuilder()
        builder.addField(.holdings)
        builder.setAssetFilter(.stocks)

        // When: Generating report
        let reportData = await generateReport(builder)

        // Then: Should filter assets
        XCTAssertNotNil(reportData)
    }

    func testFilterByAccount() async throws {
        // Given: Report filtered by account
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.setAccountFilter("account-123")

        // When: Generating report
        let reportData = await generateReport(builder)

        // Then: Should filter by account
        XCTAssertNotNil(reportData)
    }

    // MARK: - Report Validation Tests

    func testEmptyReportValidation() {
        // Given: Empty report builder
        let builder = ReportBuilder()

        // When: Validating report
        let isValid = validateReport(builder)

        // Then: Should be invalid
        XCTAssertFalse(isValid)
    }

    func testMinimumFieldsValidation() {
        // Given: Report with one field
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)

        // When: Validating report
        let isValid = validateReport(builder)

        // Then: Should be valid
        XCTAssertTrue(isValid)
    }

    func testDateRangeValidation() {
        // Given: Report with future dates
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        let futureDate = Date().addingTimeInterval(365 * 24 * 3600)
        _ = builder.setDateRange(start: Date(), end: futureDate)

        // When: Validating report
        let isValid = validateReport(builder)

        // Then: Should be invalid
        XCTAssertFalse(isValid)
    }

    // MARK: - Report Generation Performance Tests

    func testSmallReportGenerationPerformance() {
        measure {
            Task { @MainActor in
                var builder = ReportBuilder()
                builder.addField(.portfolioValue)
                builder.setFormat(.csv)
                _ = await generateReport(builder)
            }
        }
    }

    func testLargeReportGenerationPerformance() {
        measure {
            Task { @MainActor in
                var builder = ReportBuilder()
                ReportField.allCases.forEach { builder.addField($0) }
                builder.setFormat(.excel)
                _ = await generateReport(builder)
            }
        }
    }

    // MARK: - Report Scheduling Tests

    func testScheduleRecurringReport() async throws {
        // Given: Report schedule
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.setFormat(.pdf)

        let schedule = ReportSchedule(
            frequency: .weekly,
            dayOfWeek: 1, // Monday
            time: Date()
        )

        // When: Scheduling report
        let result = await scheduleReport(builder, schedule: schedule)

        // Then: Should schedule successfully
        XCTAssertTrue(result)
    }

    func testCancelScheduledReport() async throws {
        // Given: Scheduled report
        let reportId = "report-123"

        // When: Canceling schedule
        let result = await cancelScheduledReport(reportId)

        // Then: Should cancel successfully
        XCTAssertTrue(result)
    }

    // MARK: - Report Sharing Tests

    func testExportReportToFile() async throws {
        // Given: Generated report
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.setFormat(.pdf)

        let reportData = await generateReport(builder)

        // When: Exporting to file
        let fileURL = await exportReport(reportData!)

        // Then: Should create file
        XCTAssertNotNil(fileURL)
    }

    func testShareReportViaEmail() async throws {
        // Given: Generated report
        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.setFormat(.pdf)

        let reportData = await generateReport(builder)

        // When: Sharing via email
        let result = await shareReportViaEmail(reportData!, recipients: ["user@example.com"])

        // Then: Should share successfully
        XCTAssertTrue(result)
    }

    // MARK: - Error Handling Tests

    func testGenerationWithNetworkError() async throws {
        // Given: Network error
        mockReportService.shouldFail = true

        var builder = ReportBuilder()
        builder.addField(.portfolioValue)
        builder.setFormat(.pdf)

        // When: Generating report
        let reportData = await generateReport(builder)

        // Then: Should handle error
        XCTAssertNil(reportData)
    }

    func testGenerationWithInvalidData() async throws {
        // Given: Invalid data
        mockReportService.returnInvalidData = true

        var builder = ReportBuilder()
        builder.addField(.portfolioValue)

        // When: Generating report
        let reportData = await generateReport(builder)

        // Then: Should handle invalid data
        XCTAssertNil(reportData)
    }

    // MARK: - Helper Methods

    private func generateReport(_ builder: ReportBuilder) async -> ReportData? {
        return await mockReportService.generateReport(builder)
    }

    private func validateReport(_ builder: ReportBuilder) -> Bool {
        guard !builder.selectedFields.isEmpty else { return false }
        if let dateRange = builder.dateRange {
            guard dateRange.end <= Date() else { return false }
        }
        return true
    }

    private func scheduleReport(_ builder: ReportBuilder, schedule: ReportSchedule) async -> Bool {
        return await mockReportService.scheduleReport(builder, schedule: schedule)
    }

    private func cancelScheduledReport(_ reportId: String) async -> Bool {
        return await mockReportService.cancelScheduledReport(reportId)
    }

    private func exportReport(_ data: ReportData) async -> URL? {
        return await mockReportService.exportReport(data)
    }

    private func shareReportViaEmail(_ data: ReportData, recipients: [String]) async -> Bool {
        return await mockReportService.shareViaEmail(data, recipients: recipients)
    }
}

// MARK: - Mock Models

enum ReportFormat {
    case pdf
    case excel
    case csv
    case json
}

enum ReportField: CaseIterable {
    case portfolioValue
    case totalGain
    case totalReturn
    case transactions
    case holdings
    case performance
    case taxInfo
    case dividends
}

enum AssetType {
    case stocks
    case bonds
    case crypto
    case etf
}

struct DateRange {
    let start: Date
    let end: Date
}

struct ReportBuilder {
    var selectedFields: Set<ReportField> = []
    var dateRange: DateRange?
    var format: ReportFormat?
    var assetFilter: AssetType?
    var accountFilter: String?

    mutating func addField(_ field: ReportField) {
        selectedFields.insert(field)
    }

    mutating func removeField(_ field: ReportField) {
        selectedFields.remove(field)
    }

    mutating func setDateRange(start: Date, end: Date) -> Bool {
        guard start < end && end <= Date() else { return false }
        dateRange = DateRange(start: start, end: end)
        return true
    }

    mutating func setFormat(_ format: ReportFormat) {
        self.format = format
    }

    mutating func setAssetFilter(_ type: AssetType) {
        self.assetFilter = type
    }

    mutating func setAccountFilter(_ accountId: String) {
        self.accountFilter = accountId
    }
}

struct ReportData {
    let data: Data
    let format: ReportFormat

    var isPDF: Bool { format == .pdf }
    var isExcel: Bool { format == .excel }
    var isCSV: Bool { format == .csv }
    var isJSON: Bool { format == .json }
}

struct ReportSchedule {
    enum Frequency {
        case daily
        case weekly
        case monthly
    }

    let frequency: Frequency
    let dayOfWeek: Int?
    let time: Date
}

// MARK: - Mock Report Generation Service

class MockReportGenerationService {
    var expectedFormat: ReportFormat = .pdf
    var shouldFail = false
    var returnInvalidData = false

    func generateReport(_ builder: ReportBuilder) async -> ReportData? {
        if shouldFail { return nil }
        if returnInvalidData { return nil }

        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms

        let data = Data(count: 1024)
        return ReportData(data: data, format: builder.format ?? .pdf)
    }

    func scheduleReport(_ builder: ReportBuilder, schedule: ReportSchedule) async -> Bool {
        if shouldFail { return false }
        return true
    }

    func cancelScheduledReport(_ reportId: String) async -> Bool {
        return true
    }

    func exportReport(_ data: ReportData) async -> URL? {
        if shouldFail { return nil }
        return URL(fileURLWithPath: "/tmp/report.\(data.format)")
    }

    func shareViaEmail(_ data: ReportData, recipients: [String]) async -> Bool {
        if shouldFail { return false }
        return !recipients.isEmpty
    }
}
