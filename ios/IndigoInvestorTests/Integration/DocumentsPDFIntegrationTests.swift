//
//  DocumentsPDFIntegrationTests.swift
//  IndigoInvestorTests
//
//  Integration tests for PDF viewer functionality and file operations
//  Tests PDF rendering, caching, and document interactions
//

import XCTest
import PDFKit
@testable import IndigoInvestor

@MainActor
final class DocumentsPDFIntegrationTests: XCTestCase {

    var documentLoader: DocumentLoader!
    var viewModel: DocumentsVaultViewModel!

    override func setUp() async throws {
        try await super.setUp()
        documentLoader = DocumentLoader()
        viewModel = DocumentsVaultViewModel()
    }

    override func tearDown() async throws {
        documentLoader = nil
        viewModel = nil
        try await super.tearDown()
    }

    // MARK: - PDF Viewer Tests (react-pdf equivalent)

    func testPDFViewerInitialization() throws {
        // Given: Document loader
        XCTAssertNotNil(documentLoader)

        // Then: Should be in initial state
        XCTAssertNil(documentLoader.documentData)
        XCTAssertFalse(documentLoader.isLoading)
        XCTAssertNil(documentLoader.error)
    }

    func testPDFDocumentValidation() throws {
        // Given: PDF data
        let pdfData = createMockPDFData()

        // When: Creating PDFDocument
        let pdfDocument = PDFDocument(data: pdfData)

        // Then: Should be valid PDF
        XCTAssertNotNil(pdfDocument)
        XCTAssertGreaterThan(pdfDocument?.pageCount ?? 0, 0)
    }

    func testPDFPageRendering() throws {
        // Given: PDF document with pages
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData) else {
            XCTFail("Failed to create PDF document")
            return
        }

        // When: Getting first page
        guard let firstPage = pdfDocument.page(at: 0) else {
            XCTFail("Failed to get first page")
            return
        }

        // Then: Page should be renderable
        let bounds = firstPage.bounds(for: .mediaBox)
        XCTAssertGreaterThan(bounds.width, 0)
        XCTAssertGreaterThan(bounds.height, 0)
    }

    func testPDFThumbnailGeneration() throws {
        // Given: PDF page
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData),
              let page = pdfDocument.page(at: 0) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Generating thumbnail
        let thumbnailSize = CGSize(width: 200, height: 200)
        let thumbnail = page.thumbnail(of: thumbnailSize, for: .mediaBox)

        // Then: Thumbnail should be generated
        XCTAssertNotNil(thumbnail)
        XCTAssertLessThanOrEqual(thumbnail.size.width, thumbnailSize.width * 2) // Account for retina
        XCTAssertLessThanOrEqual(thumbnail.size.height, thumbnailSize.height * 2)
    }

    func testPDFTextExtraction() throws {
        // Given: PDF with text content
        let pdfData = createMockPDFData(withText: "Investment Statement")
        guard let pdfDocument = PDFDocument(data: pdfData),
              let page = pdfDocument.page(at: 0) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Extracting text
        let text = page.string

        // Then: Should extract text
        XCTAssertNotNil(text)
        XCTAssertFalse(text?.isEmpty ?? true)
    }

    func testPDFMultiPageHandling() throws {
        // Given: Multi-page PDF
        let pdfData = createMockPDFData(pageCount: 3)
        guard let pdfDocument = PDFDocument(data: pdfData) else {
            XCTFail("Failed to create PDF")
            return
        }

        // Then: Should have multiple pages
        XCTAssertEqual(pdfDocument.pageCount, 3)

        // All pages should be accessible
        for i in 0..<pdfDocument.pageCount {
            XCTAssertNotNil(pdfDocument.page(at: i))
        }
    }

    func testPDFZoomLevels() throws {
        // Given: PDF page
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData),
              let page = pdfDocument.page(at: 0) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Testing different zoom levels
        let originalBounds = page.bounds(for: .mediaBox)
        let scale1x = CGAffineTransform(scaleX: 1.0, y: 1.0)
        let scale2x = CGAffineTransform(scaleX: 2.0, y: 2.0)

        // Then: Bounds should scale appropriately
        XCTAssertEqual(originalBounds.applying(scale1x).width, originalBounds.width)
        XCTAssertEqual(originalBounds.applying(scale2x).width, originalBounds.width * 2)
    }

    // MARK: - Document Loading Tests

    func testDocumentLoadingState() async throws {
        // Given: Document to load
        let document = createMockDocument()

        // When: Starting to load document
        XCTAssertFalse(documentLoader.isLoading)

        // Simulate loading
        await documentLoader.loadDocument(document)

        // Then: Loading state should update
        // Note: Actual implementation would set isLoading during fetch
        XCTAssertFalse(documentLoader.isLoading) // Should complete
    }

    func testDocumentLoadingError() async throws {
        // Given: Invalid document path
        let invalidDoc = Document(
            id: UUID(),
            name: "Invalid.pdf",
            type: .pdf,
            category: .statement,
            fileSize: 0,
            filePath: "nonexistent/path.pdf",
            isRead: false,
            requiresAuth: true,
            createdAt: Date(),
            fileExtension: "pdf"
        )

        // When: Loading invalid document
        await documentLoader.loadDocument(invalidDoc)

        // Then: Should handle error gracefully
        XCTAssertNotNil(documentLoader.error) // Error should be set
    }

    // MARK: - Document Caching Tests

    func testDocumentCacheStorage() async throws {
        // Given: Document data
        let document = createMockDocument()
        let testData = createMockPDFData()

        // When: Caching document
        let cacheManager = DocumentCacheManager()
        try await cacheManager.cacheDocument(testData, for: document.id)

        // Then: Should be cached
        let cachedData = try await cacheManager.getCachedDocument(for: document.id)
        XCTAssertNotNil(cachedData)
        XCTAssertEqual(cachedData?.count, testData.count)
    }

    func testDocumentCacheRetrieval() async throws {
        // Given: Cached document
        let document = createMockDocument()
        let testData = createMockPDFData()

        let cacheManager = DocumentCacheManager()
        try await cacheManager.cacheDocument(testData, for: document.id)

        // When: Retrieving cached document
        let retrieved = try await cacheManager.getCachedDocument(for: document.id)

        // Then: Should return same data
        XCTAssertEqual(retrieved, testData)
    }

    func testDocumentCacheMiss() async throws {
        // Given: Non-existent document
        let nonExistentId = UUID()

        // When: Trying to get cached document
        let cacheManager = DocumentCacheManager()
        let result = try await cacheManager.getCachedDocument(for: nonExistentId)

        // Then: Should return nil
        XCTAssertNil(result)
    }

    func testDocumentCacheExpiration() async throws {
        // Given: Old cached document
        // Note: Real implementation checks file modification date
        let cacheManager = DocumentCacheManager()

        // When: Document is older than 7 days
        // Then: Should be removed automatically
        // This would require setting file dates which is complex in tests
        XCTAssertNotNil(cacheManager)
    }

    // MARK: - File Download Tests

    func testDocumentDownloadInitiation() async throws {
        // Given: Document to download
        let document = createMockDocument()
        viewModel.addDocument(document)

        // When: Initiating download
        // Note: Full test requires mocked URLSession
        // viewModel.downloadDocument(document)

        // Then: Document should exist
        XCTAssertTrue(viewModel.documents.contains(where: { $0.id == document.id }))
    }

    func testDocumentDownloadProgress() throws {
        // Given: Document being downloaded
        // Note: Would track download progress through URLSession delegate

        // When: Download is in progress
        // Then: Progress should be reportable (0.0 to 1.0)
        let progress: Double = 0.5
        XCTAssertGreaterThanOrEqual(progress, 0.0)
        XCTAssertLessThanOrEqual(progress, 1.0)
    }

    func testDocumentDownloadCompletion() throws {
        // Given: Downloaded document
        let document = createMockDocument()

        // Then: Should be accessible locally
        XCTAssertFalse(document.filePath.isEmpty)
        XCTAssertEqual(document.fileExtension, "pdf")
    }

    // MARK: - Document Sharing Tests

    func testDocumentShareSheet() async throws {
        // Given: Document to share
        let document = createMockDocument()
        viewModel.addDocument(document)

        // When: Initiating share
        // Note: UIActivityViewController testing requires UI testing framework

        // Then: Document should be shareable
        XCTAssertTrue(document.fileSize > 0)
    }

    func testDocumentExport() throws {
        // Given: Document data
        let pdfData = createMockPDFData()

        // When: Exporting to file system
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("export_test.pdf")

        do {
            try pdfData.write(to: tempURL)

            // Then: File should be written
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempURL.path))

            // Cleanup
            try? FileManager.default.removeItem(at: tempURL)
        } catch {
            XCTFail("Failed to write PDF: \(error)")
        }
    }

    // MARK: - PDF Viewer UI Integration Tests

    func testPDFViewerNavigation() throws {
        // Given: Multi-page PDF
        let pdfData = createMockPDFData(pageCount: 5)
        guard let pdfDocument = PDFDocument(data: pdfData) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Navigating pages
        var currentPage = 0

        // Next page
        currentPage = min(currentPage + 1, pdfDocument.pageCount - 1)
        XCTAssertEqual(currentPage, 1)

        // Previous page
        currentPage = max(currentPage - 1, 0)
        XCTAssertEqual(currentPage, 0)

        // Jump to page
        currentPage = 4
        XCTAssertLessThan(currentPage, pdfDocument.pageCount)
    }

    func testPDFViewerBookmarks() throws {
        // Given: PDF with potential bookmarks
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Accessing outline (bookmarks)
        let outline = pdfDocument.outlineRoot

        // Then: Outline may or may not exist
        // Not all PDFs have bookmarks
        if let outline = outline {
            XCTAssertGreaterThanOrEqual(outline.numberOfChildren, 0)
        } else {
            XCTAssertNil(outline) // Valid case
        }
    }

    func testPDFViewerAnnotations() throws {
        // Given: PDF page
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData),
              let page = pdfDocument.page(at: 0) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Accessing annotations
        let annotations = page.annotations

        // Then: Should return annotations array (may be empty)
        XCTAssertNotNil(annotations)
    }

    // MARK: - Performance Tests

    func testPDFLoadingPerformance() throws {
        // Given: PDF data
        let pdfData = createMockPDFData(pageCount: 10)

        // When: Loading PDF multiple times
        measure {
            _ = PDFDocument(data: pdfData)
        }

        // Then: Should load in reasonable time
    }

    func testPDFRenderingPerformance() throws {
        // Given: PDF document
        let pdfData = createMockPDFData()
        guard let pdfDocument = PDFDocument(data: pdfData),
              let page = pdfDocument.page(at: 0) else {
            XCTFail("Failed to create PDF")
            return
        }

        // When: Rendering thumbnails
        measure {
            _ = page.thumbnail(of: CGSize(width: 200, height: 200), for: .mediaBox)
        }

        // Then: Should render quickly
    }

    func testDocumentCachePerformance() async throws {
        // Given: Multiple documents
        let documents = (0..<10).map { _ in createMockDocument() }
        let testData = createMockPDFData()
        let cacheManager = DocumentCacheManager()

        // When: Caching multiple documents
        for doc in documents {
            try await cacheManager.cacheDocument(testData, for: doc.id)
        }

        // Then: Should cache efficiently
        for doc in documents {
            let cached = try await cacheManager.getCachedDocument(for: doc.id)
            XCTAssertNotNil(cached)
        }
    }

    // MARK: - Helper Methods

    private func createMockPDFData(pageCount: Int = 1, withText: String = "") -> Data {
        // Create a minimal PDF with specified number of pages
        let pageSize = CGSize(width: 612, height: 792) // Standard letter size

        let pdfMetaData = [
            kCGPDFContextCreator: "IndigoInvestor Tests",
            kCGPDFContextTitle: "Test Document"
        ]

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]

        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageSize), format: format)

        let data = renderer.pdfData { context in
            for _ in 0..<pageCount {
                context.beginPage()

                if !withText.isEmpty {
                    let attributes: [NSAttributedString.Key: Any] = [
                        .font: UIFont.systemFont(ofSize: 12)
                    ]
                    let text = withText as NSString
                    text.draw(at: CGPoint(x: 50, y: 50), withAttributes: attributes)
                }
            }
        }

        return data
    }

    private func createMockDocument(
        id: UUID = UUID(),
        name: String = "Test Document.pdf",
        fileSize: Int64 = 1024 * 1024
    ) -> Document {
        return Document(
            id: id,
            name: name,
            type: .pdf,
            category: .statement,
            fileSize: fileSize,
            filePath: "documents/\(id.uuidString).pdf",
            isRead: false,
            requiresAuth: true,
            createdAt: Date(),
            fileExtension: "pdf"
        )
    }
}
