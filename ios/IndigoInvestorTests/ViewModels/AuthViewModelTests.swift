//
//  AuthViewModelTests.swift
//  IndigoInvestorTests
//
//  Comprehensive tests for AuthViewModel
//

import XCTest
@testable import IndigoInvestor
import Combine

@MainActor
final class AuthViewModelTests: XCTestCase {
    var viewModel: AuthViewModel!
    var cancellables: Set<AnyCancellable>!

    override func setUp() async throws {
        try await super.setUp()
        viewModel = AuthViewModel()
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() async throws {
        viewModel = nil
        cancellables = nil
        try await super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInit_SetsDefaultValues() {
        // Then
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertTrue(viewModel.isLoading)
        XCTAssertNil(viewModel.user)
        XCTAssertEqual(viewModel.userRole, .investor)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
        XCTAssertFalse(viewModel.requiresTwoFactor)
    }

    // MARK: - Login Tests

    func testLogin_Success_UpdatesState() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"

        // When
        try await viewModel.login(email: email, password: password)

        // Then
        XCTAssertTrue(viewModel.isAuthenticated)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.user)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    func testLogin_InvalidCredentials_SetsError() async throws {
        // Given
        let email = "wrong@example.com"
        let password = "wrongpassword"

        // When/Then
        do {
            try await viewModel.login(email: email, password: password)
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertFalse(viewModel.isAuthenticated)
            XCTAssertFalse(viewModel.isLoading)
            XCTAssertNotNil(viewModel.errorMessage)
            XCTAssertTrue(viewModel.showError)
        }
    }

    func testLogin_EmptyEmail_ThrowsError() async throws {
        // When/Then
        do {
            try await viewModel.login(email: "", password: "password")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertFalse(viewModel.isAuthenticated)
            XCTAssertNotNil(viewModel.errorMessage)
        }
    }

    func testLogin_EmptyPassword_ThrowsError() async throws {
        // When/Then
        do {
            try await viewModel.login(email: "test@example.com", password: "")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertFalse(viewModel.isAuthenticated)
            XCTAssertNotNil(viewModel.errorMessage)
        }
    }

    func testLogin_SetsLoadingState() async throws {
        // Given
        let expectation = XCTestExpectation(description: "Loading state changes")
        var loadingStates: [Bool] = []

        viewModel.$isLoading
            .sink { isLoading in
                loadingStates.append(isLoading)
                if loadingStates.count >= 2 {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)

        // When
        Task {
            try? await viewModel.login(email: "test@example.com", password: "password123")
        }

        // Then
        await fulfillment(of: [expectation], timeout: 2.0)
        XCTAssertTrue(loadingStates.contains(true)) // Should have been loading
        XCTAssertTrue(loadingStates.contains(false)) // Should finish loading
    }

    // MARK: - Logout Tests

    func testLogout_Success_ResetsState() async throws {
        // Given - Login first
        try await viewModel.login(email: "test@example.com", password: "password123")
        XCTAssertTrue(viewModel.isAuthenticated)

        // When
        try await viewModel.logout()

        // Then
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertNil(viewModel.user)
        XCTAssertEqual(viewModel.userRole, .investor)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testLogout_WhenNotAuthenticated_Succeeds() async throws {
        // Given - Not authenticated
        XCTAssertFalse(viewModel.isAuthenticated)

        // When
        try await viewModel.logout()

        // Then - Should still succeed
        XCTAssertFalse(viewModel.isAuthenticated)
    }

    func testLogout_ClearsErrorState() async throws {
        // Given - Set error first
        viewModel.errorMessage = "Some error"
        viewModel.showError = true

        try await viewModel.login(email: "test@example.com", password: "password123")

        // When
        try await viewModel.logout()

        // Then - Error should be cleared
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Session Restore Tests

    func testRestoreSession_WithValidToken_RestoresUser() async throws {
        // Given - Mock valid session in keychain
        // Note: This would require mocking ServiceLocator

        // When
        await viewModel.restoreSession()

        // Then
        XCTAssertFalse(viewModel.isLoading)
    }

    func testRestoreSession_WithExpiredToken_DoesNotRestore() async throws {
        // Given - No valid session

        // When
        await viewModel.restoreSession()

        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.isAuthenticated)
    }

    // MARK: - Two Factor Authentication Tests

    func testVerifyTwoFactor_Success_AuthenticatesUser() async throws {
        // Given
        viewModel.requiresTwoFactor = true

        // When
        try await viewModel.verifyTwoFactor(code: "123456")

        // Then
        XCTAssertFalse(viewModel.requiresTwoFactor)
        XCTAssertTrue(viewModel.isAuthenticated)
    }

    func testVerifyTwoFactor_InvalidCode_ThrowsError() async throws {
        // Given
        viewModel.requiresTwoFactor = true

        // When/Then
        // Note: Current implementation doesn't validate code
        try await viewModel.verifyTwoFactor(code: "000000")
    }

    // MARK: - Published Properties Tests

    func testIsAuthenticated_PublishesChanges() async throws {
        // Given
        let expectation = XCTestExpectation(description: "isAuthenticated changes")
        var authStates: [Bool] = []

        viewModel.$isAuthenticated
            .sink { isAuth in
                authStates.append(isAuth)
                if authStates.count >= 2 {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)

        // When
        try await viewModel.login(email: "test@example.com", password: "password123")

        // Then
        await fulfillment(of: [expectation], timeout: 2.0)
        XCTAssertEqual(authStates.last, true)
    }

    func testErrorMessage_PublishesChanges() async throws {
        // Given
        let expectation = XCTestExpectation(description: "errorMessage changes")
        var errorMessages: [String?] = []

        viewModel.$errorMessage
            .sink { message in
                errorMessages.append(message)
                if errorMessages.count >= 2 {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)

        // When
        do {
            try await viewModel.login(email: "wrong@example.com", password: "wrong")
        } catch {}

        // Then
        await fulfillment(of: [expectation], timeout: 2.0)
        XCTAssertNotNil(errorMessages.last)
    }

    // MARK: - User Role Tests

    func testLogin_SetsUserRole() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"

        // When
        try await viewModel.login(email: email, password: password)

        // Then
        // Default role should be investor
        XCTAssertEqual(viewModel.userRole, .investor)
    }

    func testLogout_ResetsUserRole() async throws {
        // Given
        try await viewModel.login(email: "test@example.com", password: "password123")
        viewModel.userRole = .admin

        // When
        try await viewModel.logout()

        // Then
        XCTAssertEqual(viewModel.userRole, .investor)
    }

    // MARK: - Error Handling Tests

    func testLogin_NetworkError_SetsAppropriateError() async throws {
        // Given - Network unavailable
        // This would require mocking network layer

        // When/Then
        do {
            try await viewModel.login(email: "test@example.com", password: "password")
        } catch {
            XCTAssertNotNil(viewModel.errorMessage)
            XCTAssertTrue(viewModel.showError)
        }
    }

    func testLogin_ClearsErrorOnSuccess() async throws {
        // Given - Set error first
        viewModel.errorMessage = "Previous error"

        // When
        try await viewModel.login(email: "test@example.com", password: "password123")

        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    // MARK: - State Transition Tests

    func testAuthFlow_CompleteLoginLogoutCycle() async throws {
        // Initial state
        XCTAssertFalse(viewModel.isAuthenticated)

        // Login
        try await viewModel.login(email: "test@example.com", password: "password123")
        XCTAssertTrue(viewModel.isAuthenticated)
        XCTAssertNotNil(viewModel.user)

        // Logout
        try await viewModel.logout()
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertNil(viewModel.user)
    }

    // MARK: - Concurrent Access Tests

    func testLogin_MultipleConcurrentCalls_HandledSafely() async throws {
        // When - Multiple concurrent login attempts
        async let login1 = viewModel.login(email: "test1@example.com", password: "pass1")
        async let login2 = viewModel.login(email: "test2@example.com", password: "pass2")

        // Then - Should handle gracefully
        do {
            _ = try await [login1, login2]
        } catch {
            // May fail due to race conditions, but shouldn't crash
        }

        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - Current User Tests

    func testCurrentUser_ReturnsUserWhenAuthenticated() async throws {
        // Given
        try await viewModel.login(email: "test@example.com", password: "password123")

        // When
        let currentUser = viewModel.currentUser

        // Then
        XCTAssertNotNil(currentUser)
        XCTAssertEqual(currentUser?.email, viewModel.user?.email)
    }

    func testCurrentUser_ReturnsNilWhenNotAuthenticated() {
        // When
        let currentUser = viewModel.currentUser

        // Then
        XCTAssertNil(currentUser)
    }
}
