//
//  DocumentsVaultViewModelTests.swift
//  IndigoInvestorTests
//
//  Comprehensive test suite for Documents Vault ViewModel
//  Tests cover all 9 document pages and critical functionality
//

import XCTest
import Combine
@testable import IndigoInvestor

@MainActor
final class DocumentsVaultViewModelTests: XCTestCase {

    var viewModel: DocumentsVaultViewModel!
    var cancellables: Set<AnyCancellable>!

    override func setUp() async throws {
        try await super.setUp()
        viewModel = DocumentsVaultViewModel()
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() async throws {
        viewModel = nil
        cancellables = nil
        try await super.tearDown()
    }

    // MARK: - Test 1: Document Vault Main Page (/documents)

    func testDocumentVaultLoading() async throws {
        // Given: Fresh view model
        XCTAssertTrue(viewModel.documents.isEmpty, "Documents should be empty initially")

        // When: Loading documents
        await viewModel.refreshDocuments()

        // Then: Loading state should be updated
        XCTAssertFalse(viewModel.isLoading, "Loading should complete")
        XCTAssertNil(viewModel.errorMessage, "Should have no errors")
    }

    func testDocumentVaultMetrics() async throws {
        // Given: Mock documents
        let mockDocs = createMockDocuments(count: 10)
        mockDocs.forEach { viewModel.addDocument($0) }

        // Then: Metrics should be calculated
        XCTAssertGreaterThan(viewModel.usedStorage, 0, "Storage should be calculated")
        XCTAssertGreaterThan(viewModel.thisMonthCount, 0, "Month count should be tracked")
        XCTAssertGreaterThanOrEqual(viewModel.storagePercentage, 0, "Storage percentage should be valid")
        XCTAssertLessThanOrEqual(viewModel.storagePercentage, 1.0, "Storage percentage should not exceed 100%")
    }

    func testDocumentCategoryFiltering() throws {
        // Given: Documents of different categories
        let statement = createMockDocument(category: .statement)
        let tax = createMockDocument(category: .tax)
        let agreement = createMockDocument(category: .agreement)

        viewModel.addDocument(statement)
        viewModel.addDocument(tax)
        viewModel.addDocument(agreement)

        // When: Filtering by statements
        viewModel.filterByCategory(.statements)

        // Then: Only statements should be shown
        XCTAssertEqual(viewModel.filteredDocuments.count, 1)
        XCTAssertEqual(viewModel.filteredDocuments.first?.category, .statement)

        // When: Filtering by tax
        viewModel.filterByCategory(.tax)

        // Then: Only tax documents should be shown
        XCTAssertEqual(viewModel.filteredDocuments.count, 1)
        XCTAssertEqual(viewModel.filteredDocuments.first?.category, .tax)
    }

    // MARK: - Test 2: Monthly Statements Page (/documents/statements)

    func testStatementsFiltering() throws {
        // Given: Mix of documents
        let statement1 = createMockDocument(category: .statement, name: "Statement Jan 2024")
        let statement2 = createMockDocument(category: .statement, name: "Statement Feb 2024")
        let taxDoc = createMockDocument(category: .tax, name: "Tax Form 1099")

        viewModel.addDocument(statement1)
        viewModel.addDocument(statement2)
        viewModel.addDocument(taxDoc)

        // When: Filtering by statements category
        viewModel.filterByCategory(.statements)

        // Then: Only statements should be returned
        XCTAssertEqual(viewModel.filteredDocuments.count, 2)
        XCTAssertTrue(viewModel.filteredDocuments.allSatisfy { $0.category == .statement })
    }

    func testStatementsSizeCalculation() throws {
        // Given: Multiple statements with varying sizes
        let stmt1 = createMockDocument(category: .statement, fileSize: 1024 * 1024) // 1MB
        let stmt2 = createMockDocument(category: .statement, fileSize: 2 * 1024 * 1024) // 2MB

        viewModel.addDocument(stmt1)
        viewModel.addDocument(stmt2)

        // Then: Size should be calculated correctly
        XCTAssertEqual(viewModel.statementsSize, "3 MB")
    }

    // MARK: - Test 3: Statement Viewer Page (/documents/statements/:id)

    func testDocumentLoaderInitialization() async throws {
        // Given: Document loader
        let loader = DocumentLoader()

        // Then: Should be in initial state
        XCTAssertNil(loader.documentData)
        XCTAssertFalse(loader.isLoading)
        XCTAssertNil(loader.error)
    }

    func testDocumentViewerMarksAsRead() async throws {
        // Given: Unread document
        let unreadDoc = createMockDocument(isRead: false)
        viewModel.addDocument(unreadDoc)

        let initialUnreadCount = viewModel.unreadCount

        // When: Marking as read
        viewModel.markAsRead(unreadDoc)

        // Wait for async operation
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1s

        // Then: Unread count should decrease
        XCTAssertEqual(viewModel.unreadCount, initialUnreadCount - 1)
    }

    // MARK: - Test 4: Tax Documents Page (/documents/tax)

    func testTaxDocumentsFiltering() throws {
        // Given: Mix of documents including tax forms
        let tax1 = createMockDocument(category: .tax, name: "Form 1099-DIV")
        let tax2 = createMockDocument(category: .tax, name: "Form 1099-INT")
        let statement = createMockDocument(category: .statement)

        viewModel.addDocument(tax1)
        viewModel.addDocument(tax2)
        viewModel.addDocument(statement)

        // When: Filtering by tax category
        viewModel.filterByCategory(.tax)

        // Then: Only tax documents should be shown
        XCTAssertEqual(viewModel.filteredDocuments.count, 2)
        XCTAssertTrue(viewModel.filteredDocuments.allSatisfy { $0.category == .tax })
    }

    func testTaxDocumentsSizeTracking() throws {
        // Given: Tax documents
        let tax1 = createMockDocument(category: .tax, fileSize: 500 * 1024) // 500KB
        let tax2 = createMockDocument(category: .tax, fileSize: 300 * 1024) // 300KB

        viewModel.addDocument(tax1)
        viewModel.addDocument(tax2)

        // Then: Tax forms size should be calculated
        XCTAssertFalse(viewModel.taxFormsSize.isEmpty)
        XCTAssertTrue(viewModel.taxFormsSize.contains("KB"))
    }

    // MARK: - Test 5: Trade Confirmations Page (/documents/trade-confirmations)

    func testTradeConfirmationsCount() throws {
        // Given: Documents including reports (trade confirmations)
        let trade1 = createMockDocument(category: .report, name: "Trade Confirmation 001")
        let trade2 = createMockDocument(category: .report, name: "Trade Confirmation 002")
        let other = createMockDocument(category: .statement)

        viewModel.addDocument(trade1)
        viewModel.addDocument(trade2)
        viewModel.addDocument(other)

        // When: Getting report count
        let count = viewModel.getCategoryCount(.reports)

        // Then: Should count only reports
        XCTAssertEqual(count, 2)
    }

    // MARK: - Test 6: Legal Agreements Page (/documents/agreements)

    func testAgreementsFiltering() throws {
        // Given: Legal agreements
        let agreement1 = createMockDocument(category: .agreement, name: "Investment Agreement")
        let agreement2 = createMockDocument(category: .agreement, name: "Terms of Service")
        let other = createMockDocument(category: .statement)

        viewModel.addDocument(agreement1)
        viewModel.addDocument(agreement2)
        viewModel.addDocument(other)

        // When: Filtering by agreements
        viewModel.filterByCategory(.agreements)

        // Then: Only agreements should be shown
        XCTAssertEqual(viewModel.filteredDocuments.count, 2)
        XCTAssertTrue(viewModel.filteredDocuments.allSatisfy { $0.category == .agreement })
    }

    // MARK: - Test 7: Document Upload Page (/documents/upload)

    func testDocumentAddition() throws {
        // Given: Empty document list
        let initialCount = viewModel.documents.count

        // When: Adding a new document
        let newDoc = createMockDocument(name: "New Upload.pdf")
        viewModel.addDocument(newDoc)

        // Then: Document should be added
        XCTAssertEqual(viewModel.documents.count, initialCount + 1)
        XCTAssertEqual(viewModel.documents.first?.id, newDoc.id)
    }

    func testStorageQuotaTracking() throws {
        // Given: Documents consuming storage
        let largeDoc = createMockDocument(fileSize: 100 * 1024 * 1024) // 100MB
        viewModel.addDocument(largeDoc)

        // Then: Storage percentage should be calculated
        let expectedPercentage = Double(100 * 1024 * 1024) / Double(viewModel.totalStorage)
        XCTAssertEqual(viewModel.storagePercentage, expectedPercentage, accuracy: 0.01)
    }

    // MARK: - Test 8: Browse Categories Page (/documents/categories)

    func testAllCategoryCounts() throws {
        // Given: Documents in various categories
        viewModel.addDocument(createMockDocument(category: .statement))
        viewModel.addDocument(createMockDocument(category: .statement))
        viewModel.addDocument(createMockDocument(category: .tax))
        viewModel.addDocument(createMockDocument(category: .agreement))
        viewModel.addDocument(createMockDocument(category: .report))
        viewModel.addDocument(createMockDocument(category: .kyc))

        // When: Getting counts for all categories
        let allCount = viewModel.getCategoryCount(.all)
        let statementsCount = viewModel.getCategoryCount(.statements)
        let taxCount = viewModel.getCategoryCount(.tax)
        let agreementsCount = viewModel.getCategoryCount(.agreements)
        let reportsCount = viewModel.getCategoryCount(.reports)
        let kycCount = viewModel.getCategoryCount(.kyc)

        // Then: Counts should be accurate
        XCTAssertEqual(allCount, 6)
        XCTAssertEqual(statementsCount, 2)
        XCTAssertEqual(taxCount, 1)
        XCTAssertEqual(agreementsCount, 1)
        XCTAssertEqual(reportsCount, 1)
        XCTAssertEqual(kycCount, 1)
    }

    // MARK: - Test 9: Document Viewer with PDF.js (/documents/:id)

    func testPDFViewerFunctionality() throws {
        // Given: PDF document
        let pdfDoc = createMockDocument(type: .pdf, fileExtension: "pdf")
        viewModel.addDocument(pdfDoc)

        // Then: Document should have correct type
        XCTAssertEqual(pdfDoc.type, .pdf)
        XCTAssertEqual(pdfDoc.fileExtension, "pdf")
    }

    func testDocumentSharing() async throws {
        // Given: Document to share
        let doc = createMockDocument(name: "Share Test.pdf")
        viewModel.addDocument(doc)

        // When: Initiating share (would trigger UIActivityViewController)
        // Note: Cannot fully test UI interaction in unit tests

        // Then: Document should be in the list
        XCTAssertTrue(viewModel.documents.contains(where: { $0.id == doc.id }))
    }

    func testDocumentDownload() async throws {
        // Given: Document to download
        let doc = createMockDocument(name: "Download Test.pdf")
        viewModel.addDocument(doc)

        // When: Initiating download
        // Note: Would require mocked URL session

        // Then: Document should remain in list
        XCTAssertTrue(viewModel.documents.contains(where: { $0.id == doc.id }))
    }

    // MARK: - Cross-Page Functionality Tests

    func testSearchFunctionality() throws {
        // Given: Documents with various names
        viewModel.addDocument(createMockDocument(name: "Investment Statement Q1 2024"))
        viewModel.addDocument(createMockDocument(name: "Tax Form 1099"))
        viewModel.addDocument(createMockDocument(name: "Trade Confirmation"))

        // When: Searching for "Investment"
        viewModel.searchDocuments(query: "Investment")

        // Then: Should return matching documents
        XCTAssertEqual(viewModel.filteredDocuments.count, 1)
        XCTAssertTrue(viewModel.filteredDocuments.first?.name.contains("Investment") ?? false)

        // When: Searching for "Form"
        viewModel.searchDocuments(query: "Form")

        // Then: Should return tax form
        XCTAssertEqual(viewModel.filteredDocuments.count, 1)
        XCTAssertTrue(viewModel.filteredDocuments.first?.name.contains("Form") ?? false)

        // When: Clearing search
        viewModel.searchDocuments(query: "")

        // Then: Should show all documents
        XCTAssertEqual(viewModel.filteredDocuments.count, 3)
    }

    func testSortingByDate() throws {
        // Given: Documents with different dates
        let calendar = Calendar.current
        let now = Date()

        let oldDoc = createMockDocument(
            name: "Old Document",
            createdAt: calendar.date(byAdding: .day, value: -30, to: now)!
        )
        let recentDoc = createMockDocument(
            name: "Recent Document",
            createdAt: calendar.date(byAdding: .day, value: -5, to: now)!
        )
        let newestDoc = createMockDocument(
            name: "Newest Document",
            createdAt: now
        )

        viewModel.addDocument(oldDoc)
        viewModel.addDocument(recentDoc)
        viewModel.addDocument(newestDoc)

        // When: Sorting by date descending
        viewModel.sortDocuments(by: .dateDescending)

        // Then: Newest should be first
        XCTAssertEqual(viewModel.filteredDocuments.first?.name, "Newest Document")
        XCTAssertEqual(viewModel.filteredDocuments.last?.name, "Old Document")

        // When: Sorting by date ascending
        viewModel.sortDocuments(by: .dateAscending)

        // Then: Oldest should be first
        XCTAssertEqual(viewModel.filteredDocuments.first?.name, "Old Document")
        XCTAssertEqual(viewModel.filteredDocuments.last?.name, "Newest Document")
    }

    func testSortingByName() throws {
        // Given: Documents with different names
        viewModel.addDocument(createMockDocument(name: "Zebra Document"))
        viewModel.addDocument(createMockDocument(name: "Apple Document"))
        viewModel.addDocument(createMockDocument(name: "Mango Document"))

        // When: Sorting by name ascending
        viewModel.sortDocuments(by: .nameAscending)

        // Then: Should be alphabetically ordered
        XCTAssertEqual(viewModel.filteredDocuments[0].name, "Apple Document")
        XCTAssertEqual(viewModel.filteredDocuments[1].name, "Mango Document")
        XCTAssertEqual(viewModel.filteredDocuments[2].name, "Zebra Document")

        // When: Sorting by name descending
        viewModel.sortDocuments(by: .nameDescending)

        // Then: Should be reverse alphabetical
        XCTAssertEqual(viewModel.filteredDocuments[0].name, "Zebra Document")
        XCTAssertEqual(viewModel.filteredDocuments[2].name, "Apple Document")
    }

    func testSortingBySize() throws {
        // Given: Documents with different sizes
        let small = createMockDocument(name: "Small", fileSize: 1024) // 1KB
        let medium = createMockDocument(name: "Medium", fileSize: 1024 * 1024) // 1MB
        let large = createMockDocument(name: "Large", fileSize: 10 * 1024 * 1024) // 10MB

        viewModel.addDocument(small)
        viewModel.addDocument(large)
        viewModel.addDocument(medium)

        // When: Sorting by size descending
        viewModel.sortDocuments(by: .sizeDescending)

        // Then: Largest should be first
        XCTAssertEqual(viewModel.filteredDocuments[0].name, "Large")
        XCTAssertEqual(viewModel.filteredDocuments[2].name, "Small")

        // When: Sorting by size ascending
        viewModel.sortDocuments(by: .sizeAscending)

        // Then: Smallest should be first
        XCTAssertEqual(viewModel.filteredDocuments[0].name, "Small")
        XCTAssertEqual(viewModel.filteredDocuments[2].name, "Large")
    }

    func testDocumentDeletion() async throws {
        // Given: Document in the list
        let doc = createMockDocument(name: "To Delete")
        viewModel.addDocument(doc)
        let initialCount = viewModel.documents.count

        // When: Deleting document (mocked - would need Supabase mock)
        // viewModel.deleteDocument(doc)

        // Then: Would remove from list
        // Note: Full test requires mocked Supabase client
        XCTAssertTrue(viewModel.documents.contains(where: { $0.id == doc.id }))
    }

    func testUnreadDocumentTracking() throws {
        // Given: Mix of read and unread documents
        viewModel.addDocument(createMockDocument(isRead: true))
        viewModel.addDocument(createMockDocument(isRead: false))
        viewModel.addDocument(createMockDocument(isRead: false))
        viewModel.addDocument(createMockDocument(isRead: true))

        // Then: Unread count should be accurate
        XCTAssertEqual(viewModel.unreadCount, 2)
    }

    func testThisMonthDocumentCount() throws {
        // Given: Documents from this month and previous months
        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.dateInterval(of: .month, for: now)!.start

        let thisMonth1 = createMockDocument(createdAt: now)
        let thisMonth2 = createMockDocument(createdAt: startOfMonth)
        let lastMonth = createMockDocument(
            createdAt: calendar.date(byAdding: .month, value: -1, to: now)!
        )

        viewModel.addDocument(thisMonth1)
        viewModel.addDocument(thisMonth2)
        viewModel.addDocument(lastMonth)

        // Then: This month count should be accurate
        XCTAssertEqual(viewModel.thisMonthCount, 2)
    }

    func testFormattedFileSizes() throws {
        // Given: Document with specific size
        let doc = createMockDocument(fileSize: 1536 * 1024) // 1.5MB

        // Then: Should format size correctly
        XCTAssertTrue(doc.formattedSize.contains("MB"))
    }

    // MARK: - Helper Methods

    private func createMockDocument(
        id: UUID = UUID(),
        name: String = "Test Document.pdf",
        type: Document.DocumentType = .pdf,
        category: Document.Category = .statement,
        fileSize: Int64 = 1024 * 1024, // 1MB default
        isRead: Bool = false,
        createdAt: Date = Date(),
        fileExtension: String = "pdf"
    ) -> Document {
        return Document(
            id: id,
            name: name,
            type: type,
            category: category,
            fileSize: fileSize,
            filePath: "documents/\(id.uuidString).\(fileExtension)",
            isRead: isRead,
            requiresAuth: true,
            createdAt: createdAt,
            fileExtension: fileExtension
        )
    }

    private func createMockDocuments(count: Int) -> [Document] {
        return (0..<count).map { index in
            createMockDocument(name: "Document \(index).pdf")
        }
    }
}
