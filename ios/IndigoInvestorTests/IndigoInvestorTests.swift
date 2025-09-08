//
//  IndigoInvestorTests.swift
//  IndigoInvestorTests
//
//  Comprehensive test suite for IndigoInvestor app
//

import XCTest
import Combine
@testable import IndigoInvestor

class IndigoInvestorTests: XCTestCase {
    
    var cancellables = Set<AnyCancellable>()
    
    override func setUpWithError() throws {
        // Setup before each test
        cancellables = []
    }
    
    override func tearDownWithError() throws {
        // Cleanup after each test
        cancellables = []
    }
    
    // MARK: - Authentication Tests
    
    func testLoginWithValidCredentials() throws {
        let viewModel = LoginViewModel()
        let expectation = XCTestExpectation(description: "Login succeeds")
        
        viewModel.email = "test@example.com"
        viewModel.password = "ValidPassword123!"
        
        viewModel.$isAuthenticated
            .dropFirst()
            .sink { isAuthenticated in
                if isAuthenticated {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        viewModel.login()
        
        wait(for: [expectation], timeout: 5.0)
        XCTAssertTrue(viewModel.isAuthenticated)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testLoginWithInvalidCredentials() throws {
        let viewModel = LoginViewModel()
        let expectation = XCTestExpectation(description: "Login fails")
        
        viewModel.email = "invalid@example.com"
        viewModel.password = "wrongpassword"
        
        viewModel.$errorMessage
            .dropFirst()
            .sink { error in
                if error != nil {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        viewModel.login()
        
        wait(for: [expectation], timeout: 5.0)
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertNotNil(viewModel.errorMessage)
    }
    
    func testEmailValidation() {
        let viewModel = LoginViewModel()
        
        // Valid emails
        XCTAssertTrue(viewModel.isValidEmail("user@example.com"))
        XCTAssertTrue(viewModel.isValidEmail("user.name@example.co.uk"))
        XCTAssertTrue(viewModel.isValidEmail("user+tag@example.com"))
        
        // Invalid emails
        XCTAssertFalse(viewModel.isValidEmail("invalid"))
        XCTAssertFalse(viewModel.isValidEmail("@example.com"))
        XCTAssertFalse(viewModel.isValidEmail("user@"))
        XCTAssertFalse(viewModel.isValidEmail("user@.com"))
    }
    
    // MARK: - Portfolio Tests
    
    func testPortfolioCalculations() {
        let portfolio = Portfolio(
            id: UUID(),
            userId: UUID(),
            totalValue: 100000,
            totalCost: 80000,
            totalReturn: 20000,
            returnPercentage: 25,
            dailyChange: 500,
            dailyChangePercent: 0.5,
            ytdReturn: 15000,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        XCTAssertEqual(portfolio.totalValue, 100000)
        XCTAssertEqual(portfolio.totalReturn, 20000)
        XCTAssertEqual(portfolio.returnPercentage, 25)
        XCTAssertEqual(portfolio.formattedTotalValue, "$100,000.00")
        XCTAssertEqual(portfolio.formattedTotalReturn, "+$20,000.00")
    }
    
    func testPortfolioPerformanceMetrics() {
        let viewModel = PortfolioViewModel()
        
        // Test mock data loading
        viewModel.loadMockData()
        
        XCTAssertNotNil(viewModel.portfolio)
        XCTAssertGreaterThan(viewModel.assets.count, 0)
        XCTAssertGreaterThan(viewModel.recentTransactions.count, 0)
    }
    
    // MARK: - Transaction Tests
    
    func testTransactionValidation() {
        let transaction = Transaction(
            id: UUID(),
            userId: UUID(),
            type: .withdrawal,
            amount: 5000,
            description: "Test withdrawal",
            status: .pending,
            createdAt: Date()
        )
        
        XCTAssertEqual(transaction.type, .withdrawal)
        XCTAssertEqual(transaction.amount, 5000)
        XCTAssertEqual(transaction.status, .pending)
        XCTAssertEqual(transaction.formattedAmount, "-$5,000.00")
    }
    
    func testWithdrawalRequestValidation() {
        let viewModel = WithdrawalRequestViewModel()
        
        // Test minimum amount validation
        viewModel.amount = "100"
        XCTAssertFalse(viewModel.canSubmitRequest)
        
        viewModel.amount = "1000"
        viewModel.selectedAccount = BankAccount(
            id: UUID(),
            userId: UUID(),
            bankName: "Test Bank",
            accountType: "checking",
            last4: "1234",
            accountHolderName: "John Doe",
            isVerified: true,
            isPrimary: true,
            createdAt: Date()
        )
        XCTAssertTrue(viewModel.canSubmitRequest)
    }
    
    // MARK: - Security Tests
    
    func testKeychainStorage() {
        let securityManager = SecurityManager.shared
        let testKey = "test_key"
        let testValue = "test_value"
        
        // Save to keychain
        let saved = securityManager.saveSecureString(testValue, for: testKey)
        XCTAssertTrue(saved)
        
        // Load from keychain
        let loaded = securityManager.loadSecureString(for: testKey)
        XCTAssertEqual(loaded, testValue)
        
        // Delete from keychain
        let deleted = securityManager.deleteFromKeychain(key: testKey)
        XCTAssertTrue(deleted)
        
        // Verify deletion
        let loadedAfterDelete = securityManager.loadSecureString(for: testKey)
        XCTAssertNil(loadedAfterDelete)
    }
    
    func testSessionManagement() {
        let securityManager = SecurityManager.shared
        
        securityManager.startSessionTimer()
        XCTAssertNotNil(securityManager.sessionExpirationTime)
        
        securityManager.extendSession()
        let extendedTime = securityManager.sessionExpirationTime
        XCTAssertNotNil(extendedTime)
        
        securityManager.stopSessionTimer()
    }
    
    // MARK: - Core Data Tests
    
    func testCoreDataSaveAndFetch() throws {
        let coreDataManager = CoreDataManager.shared
        let context = coreDataManager.context
        
        // Create test user
        let user = CachedUser(context: context)
        user.id = UUID()
        user.email = "test@example.com"
        user.firstName = "John"
        user.lastName = "Doe"
        user.role = "investor"
        user.createdAt = Date()
        user.lastUpdated = Date()
        user.syncStatus = "synced"
        
        // Save
        coreDataManager.save()
        
        // Fetch
        let fetchedUsers = coreDataManager.fetch(
            CachedUser.self,
            predicate: NSPredicate(format: "email == %@", "test@example.com")
        )
        
        XCTAssertEqual(fetchedUsers.count, 1)
        XCTAssertEqual(fetchedUsers.first?.firstName, "John")
        
        // Cleanup
        if let fetchedUser = fetchedUsers.first {
            coreDataManager.delete(fetchedUser)
        }
    }
    
    // MARK: - Notification Tests
    
    func testNotificationCategorySetup() {
        let notificationManager = PushNotificationManager.shared
        
        notificationManager.checkAuthorizationStatus()
        
        // Test notification content creation
        let content = RichNotificationContent(
            title: "Test Notification",
            body: "This is a test",
            subtitle: "Test Subtitle",
            imageURL: nil,
            category: .transaction,
            userInfo: ["test": "data"]
        )
        
        let notificationContent = content.createContent()
        XCTAssertEqual(notificationContent.title, "Test Notification")
        XCTAssertEqual(notificationContent.body, "This is a test")
        XCTAssertEqual(notificationContent.categoryIdentifier, "TRANSACTION_CATEGORY")
    }
    
    // MARK: - Document Management Tests
    
    func testDocumentFiltering() {
        let viewModel = DocumentsVaultViewModel()
        
        viewModel.loadMockDocuments()
        let initialCount = viewModel.filteredDocuments.count
        
        // Test year filter
        viewModel.filterByYear(2024)
        XCTAssertLessThanOrEqual(viewModel.filteredDocuments.count, initialCount)
        
        // Test type filter
        viewModel.filterByType(.statement)
        let statementCount = viewModel.filteredDocuments.count
        
        viewModel.filterByType(.taxForm)
        let taxFormCount = viewModel.filteredDocuments.count
        
        // Reset filter
        viewModel.filterByType(.all)
        XCTAssertEqual(viewModel.filteredDocuments.count, initialCount)
    }
    
    // MARK: - Asset Management Tests
    
    func testAssetCalculations() {
        let asset = Asset(
            id: UUID(),
            portfolioId: UUID(),
            name: "Test Bond",
            symbol: "TB001",
            assetType: "bond",
            quantity: 10,
            purchasePrice: 1000,
            currentValue: 1100,
            costBasis: 10000,
            purchaseDate: Date().addingTimeInterval(-86400 * 30),
            status: "active",
            createdAt: Date(),
            updatedAt: Date()
        )
        
        XCTAssertEqual(asset.totalReturn, 100)
        XCTAssertEqual(asset.totalReturnPercent, 10)
        XCTAssertEqual(asset.holdingPeriodDays, 30)
    }
    
    // MARK: - Performance Tests
    
    func testPortfolioLoadPerformance() {
        measure {
            let viewModel = PortfolioViewModel()
            viewModel.loadMockData()
            
            XCTAssertNotNil(viewModel.portfolio)
        }
    }
    
    func testTransactionListPerformance() {
        measure {
            let viewModel = TransactionsViewModel()
            viewModel.loadMockTransactions()
            
            XCTAssertGreaterThan(viewModel.transactions.count, 0)
        }
    }
    
    // MARK: - UI Component Tests
    
    func testIndigoThemeColors() {
        let primaryColor = IndigoTheme.primaryColor
        let secondaryColor = IndigoTheme.secondaryColor
        
        XCTAssertNotNil(primaryColor)
        XCTAssertNotNil(secondaryColor)
        
        // Test color scheme specific colors
        let lightBackground = IndigoTheme.backgroundColor(for: .light)
        let darkBackground = IndigoTheme.backgroundColor(for: .dark)
        
        XCTAssertNotEqual(lightBackground, darkBackground)
    }
    
    // MARK: - Support System Tests
    
    func testFAQFiltering() {
        let viewModel = SupportViewModel()
        
        viewModel.loadSupportContent()
        let initialCount = viewModel.filteredFAQs.count
        
        viewModel.filterByCategory(.investments)
        XCTAssertLessThanOrEqual(viewModel.filteredFAQs.count, initialCount)
        
        viewModel.searchContent(query: "withdrawal")
        let searchCount = viewModel.filteredFAQs.count
        
        viewModel.searchContent(query: "")
        viewModel.filterByCategory(.all)
        XCTAssertEqual(viewModel.filteredFAQs.count, initialCount)
    }
    
    // MARK: - Integration Tests
    
    func testEndToEndWithdrawalFlow() async throws {
        let withdrawalViewModel = WithdrawalRequestViewModel()
        
        // Setup test data
        withdrawalViewModel.amount = "5000"
        withdrawalViewModel.selectedAccount = BankAccount(
            id: UUID(),
            userId: UUID(),
            bankName: "Test Bank",
            accountType: "checking",
            last4: "1234",
            accountHolderName: "John Doe",
            isVerified: true,
            isPrimary: true,
            createdAt: Date()
        )
        
        // Validate request
        XCTAssertTrue(withdrawalViewModel.canSubmitRequest)
        
        // Submit request
        await withdrawalViewModel.submitWithdrawal()
        
        // Verify submission
        XCTAssertTrue(withdrawalViewModel.isLoading || withdrawalViewModel.showSuccessAlert)
    }
}

// MARK: - Mock Data Extensions

extension LoginViewModel {
    func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}

extension Portfolio {
    var formattedTotalValue: String {
        formatCurrency(totalValue)
    }
    
    var formattedTotalReturn: String {
        let sign = totalReturn >= 0 ? "+" : ""
        return sign + formatCurrency(totalReturn)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}
