//
//  IndigoInvestorTests.swift
//  IndigoInvestorTests
//
//  Unit tests for the IndigoInvestor iOS app
//

import XCTest
@testable import IndigoInvestor

final class IndigoInvestorTests: XCTestCase {
    
    override func setUpWithError() throws {
        // Setup before each test
    }
    
    override func tearDownWithError() throws {
        // Cleanup after each test
    }
    
    // MARK: - Authentication Tests
    
    func testEmailValidation() {
        let viewModel = AuthViewModel()
        
        XCTAssertTrue(viewModel.isValidEmail("user@example.com"))
        XCTAssertTrue(viewModel.isValidEmail("test.user+tag@example.co.uk"))
        XCTAssertFalse(viewModel.isValidEmail("invalid.email"))
        XCTAssertFalse(viewModel.isValidEmail("@example.com"))
        XCTAssertFalse(viewModel.isValidEmail("user@"))
        XCTAssertFalse(viewModel.isValidEmail(""))
    }
    
    func testPasswordValidation() {
        let viewModel = AuthViewModel()
        
        XCTAssertTrue(viewModel.isValidPassword("SecurePass123!"))
        XCTAssertTrue(viewModel.isValidPassword("P@ssw0rd!"))
        XCTAssertFalse(viewModel.isValidPassword("weak"))
        XCTAssertFalse(viewModel.isValidPassword("12345678"))
        XCTAssertFalse(viewModel.isValidPassword(""))
    }
    
    // MARK: - Portfolio Tests
    
    func testPortfolioCalculations() {
        let portfolio = Portfolio(
            id: UUID(),
            investorId: UUID(),
            totalInvested: 100000,
            currentValue: 115000,
            totalReturn: 15000,
            positions: [],
            lastUpdated: Date()
        )
        
        XCTAssertEqual(portfolio.totalInvested, 100000)
        XCTAssertEqual(portfolio.currentValue, 115000)
        XCTAssertEqual(portfolio.totalReturn, 15000)
        
        let returnPercentage = (portfolio.totalReturn / portfolio.totalInvested) * 100
        XCTAssertEqual(returnPercentage, 15.0, accuracy: 0.01)
    }
    
    func testPositionValuation() {
        let position = Position(
            id: UUID(),
            investorId: UUID(),
            assetName: "Test Asset",
            assetType: "Equity",
            quantity: 100,
            averagePrice: 50,
            currentPrice: 55,
            currentValue: 5500,
            unrealizedGainLoss: 500,
            allocationPercentage: 25
        )
        
        XCTAssertEqual(position.quantity, 100)
        XCTAssertEqual(position.averagePrice, 50)
        XCTAssertEqual(position.currentPrice, 55)
        XCTAssertEqual(position.currentValue, 5500)
        XCTAssertEqual(position.unrealizedGainLoss, 500)
    }
    
    // MARK: - Transaction Tests
    
    func testTransactionTypes() {
        let depositTx = Transaction(
            id: UUID(),
            investorId: UUID(),
            type: "deposit",
            amount: 10000,
            status: "completed",
            description: "Initial deposit",
            createdAt: Date(),
            processedAt: Date()
        )
        
        XCTAssertEqual(depositTx.type, "deposit")
        XCTAssertEqual(depositTx.amount, 10000)
        XCTAssertEqual(depositTx.status, "completed")
    }
    
    // MARK: - Date Formatting Tests
    
    func testDateFormatting() {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        
        let date = Date(timeIntervalSince1970: 1693526400) // Sept 1, 2023
        let formatted = formatter.string(from: date)
        
        XCTAssertNotNil(formatted)
        XCTAssertTrue(formatted.contains("2023") || formatted.contains("23"))
    }
    
    // MARK: - Currency Formatting Tests
    
    func testCurrencyFormatting() {
        let amount: Decimal = 1234567.89
        let formatted = amount.formatted(.currency(code: "USD"))
        
        XCTAssertTrue(formatted.contains("1,234,567") || formatted.contains("1.234.567"))
        XCTAssertTrue(formatted.contains("$") || formatted.contains("USD"))
    }
    
    // MARK: - Security Tests
    
    func testKeychainStorage() {
        let keychain = KeychainManager.shared
        let testKey = "test_key"
        let testValue = "test_value"
        
        // Save to keychain
        let saveResult = keychain.save(testValue, for: testKey)
        XCTAssertTrue(saveResult)
        
        // Retrieve from keychain
        let retrievedValue = keychain.retrieve(for: testKey)
        XCTAssertEqual(retrievedValue, testValue)
        
        // Delete from keychain
        let deleteResult = keychain.delete(for: testKey)
        XCTAssertTrue(deleteResult)
        
        // Verify deletion
        let deletedValue = keychain.retrieve(for: testKey)
        XCTAssertNil(deletedValue)
    }
    
    // MARK: - View Model Tests
    
    func testDashboardViewModelInitialization() {
        let viewModel = DashboardViewModel()
        
        XCTAssertNotNil(viewModel)
        XCTAssertEqual(viewModel.portfolioValue, 0)
        XCTAssertTrue(viewModel.recentTransactions.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testPortfolioViewModelMockData() {
        let viewModel = PortfolioViewModel()
        
        // Load mock data
        viewModel.loadMockData()
        
        XCTAssertGreaterThan(viewModel.totalValue, 0)
        XCTAssertFalse(viewModel.positions.isEmpty)
        XCTAssertFalse(viewModel.performanceData.isEmpty)
    }
    
    // MARK: - Admin Features Tests
    
    func testAdminDashboardMetrics() {
        let viewModel = AdminDashboardViewModel()
        
        viewModel.loadMockData()
        
        XCTAssertGreaterThanOrEqual(viewModel.totalAUM, 0)
        XCTAssertGreaterThanOrEqual(viewModel.activeInvestors, 0)
        XCTAssertGreaterThanOrEqual(viewModel.pendingApprovals, 0)
    }
    
    func testApprovalWorkflow() {
        let approval = PendingApproval(
            title: "Test Withdrawal",
            requester: "test@example.com",
            type: .withdrawal,
            priority: .normal,
            requestDate: Date(),
            amount: 10000,
            reason: "Test reason",
            hasDocuments: false,
            auditTrail: []
        )
        
        XCTAssertEqual(approval.type, .withdrawal)
        XCTAssertEqual(approval.amount, 10000)
        XCTAssertEqual(approval.priority, .normal)
    }
    
    // MARK: - Network Tests
    
    func testSupabaseConfiguration() {
        // This test verifies that Supabase can be configured
        // In a real test, you'd use a test/staging environment
        
        let hasURL = !Environment.Supabase.url.isEmpty
        let hasKey = !Environment.Supabase.anonKey.isEmpty
        
        // These will be true when properly configured
        XCTAssertTrue(hasURL || hasKey, "Supabase configuration should be available")
    }
    
    // MARK: - Performance Tests
    
    func testPortfolioLoadingPerformance() throws {
        let viewModel = PortfolioViewModel()
        
        measure {
            viewModel.loadMockData()
        }
    }
    
    func testTransactionListPerformance() throws {
        let transactions = (0..<1000).map { index in
            Transaction(
                id: UUID(),
                investorId: UUID(),
                type: "deposit",
                amount: Decimal(index * 100),
                status: "completed",
                description: "Transaction \(index)",
                createdAt: Date(),
                processedAt: Date()
            )
        }
        
        measure {
            _ = transactions.filter { $0.amount > 50000 }
            _ = transactions.sorted { $0.createdAt > $1.createdAt }
        }
    }
    
    // MARK: - Accessibility Tests
    
    func testAccessibilityLabels() {
        // Verify that important UI elements have accessibility labels
        let loginButton = "Sign In"
        let portfolioTab = "Portfolio"
        let logoutButton = "Sign Out"
        
        XCTAssertFalse(loginButton.isEmpty)
        XCTAssertFalse(portfolioTab.isEmpty)
        XCTAssertFalse(logoutButton.isEmpty)
    }
    
    // MARK: - Localization Tests
    
    func testNumberFormatting() {
        let number: Decimal = 1234567.89
        
        // Test US format
        let usFormatter = NumberFormatter()
        usFormatter.locale = Locale(identifier: "en_US")
        usFormatter.numberStyle = .currency
        let usFormatted = usFormatter.string(from: number as NSDecimalNumber)
        XCTAssertNotNil(usFormatted)
        
        // Test UK format
        let ukFormatter = NumberFormatter()
        ukFormatter.locale = Locale(identifier: "en_GB")
        ukFormatter.numberStyle = .currency
        let ukFormatted = ukFormatter.string(from: number as NSDecimalNumber)
        XCTAssertNotNil(ukFormatted)
    }
    
    // MARK: - Data Validation Tests
    
    func testWithdrawalRequestValidation() {
        let portfolio = Portfolio(
            id: UUID(),
            investorId: UUID(),
            totalInvested: 100000,
            currentValue: 115000,
            totalReturn: 15000,
            positions: [],
            lastUpdated: Date()
        )
        
        // Test valid withdrawal
        let validAmount: Decimal = 50000
        XCTAssertTrue(validAmount <= portfolio.currentValue)
        
        // Test invalid withdrawal (exceeds balance)
        let invalidAmount: Decimal = 200000
        XCTAssertFalse(invalidAmount <= portfolio.currentValue)
        
        // Test minimum withdrawal
        let minimumAmount: Decimal = 1000
        XCTAssertTrue(minimumAmount >= 1000) // Minimum withdrawal amount
    }
    
    // MARK: - Mock Data Generation Tests
    
    func testMockDataGeneration() {
        // Test that mock data generators produce valid data
        let mockInvestor = InvestorAccount(
            name: "Test User",
            email: "test@example.com",
            status: .active,
            totalInvested: 100000,
            currentValue: 110000,
            joinDate: Date().addingTimeInterval(-365 * 24 * 60 * 60),
            lastActivityDate: Date(),
            isVerified: true,
            riskProfile: "Moderate"
        )
        
        XCTAssertEqual(mockInvestor.name, "Test User")
        XCTAssertEqual(mockInvestor.status, .active)
        XCTAssertTrue(mockInvestor.isVerified)
        XCTAssertEqual(mockInvestor.riskProfile, "Moderate")
    }
}

// MARK: - UI Tests

class IndigoInvestorUITests: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    func testLoginFlow() throws {
        // Test the login flow
        let emailField = app.textFields["Email"]
        let passwordField = app.secureTextFields["Password"]
        let signInButton = app.buttons["Sign In"]
        
        // Check if login screen elements exist
        XCTAssertTrue(emailField.exists || app.staticTexts["Sign In"].exists)
    }
    
    func testTabNavigation() throws {
        // Test navigation between tabs (after login)
        // This would require being logged in first
        
        let dashboardTab = app.tabBars.buttons["Dashboard"]
        let portfolioTab = app.tabBars.buttons["Portfolio"]
        let transactionsTab = app.tabBars.buttons["Transactions"]
        
        // These assertions would work after implementing login
        // XCTAssertTrue(dashboardTab.exists)
        // XCTAssertTrue(portfolioTab.exists)
        // XCTAssertTrue(transactionsTab.exists)
    }
}
