//
//  AuthServiceTests.swift
//  IndigoInvestorTests
//
//  Comprehensive tests for AuthService
//

import XCTest
@testable import IndigoInvestor
import Supabase

@MainActor
final class AuthServiceTests: XCTestCase {
    var mockSupabaseClient: MockSupabaseClient!
    var mockKeychainManager: MockKeychainManager!
    var mockBiometricManager: MockBiometricAuthManager!
    var authService: AuthService!

    override func setUp() async throws {
        try await super.setUp()
        mockSupabaseClient = MockSupabaseClient()
        mockKeychainManager = MockKeychainManager()
        mockBiometricManager = MockBiometricAuthManager()

        // authService = AuthService(
        //     client: mockSupabaseClient as! SupabaseClient,
        //     keychainManager: mockKeychainManager,
        //     biometricManager: mockBiometricManager
        // )
    }

    override func tearDown() async throws {
        authService = nil
        mockSupabaseClient = nil
        mockKeychainManager = nil
        mockBiometricManager = nil
        try await super.tearDown()
    }

    // MARK: - Sign In Tests

    func testSignIn_Success() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"
        mockSupabaseClient.shouldSucceed = true
        mockBiometricManager.biometricsAvailable = true

        // When
        try await authService.signIn(email: email, password: password)

        // Then
        XCTAssertTrue(mockSupabaseClient.signInEmailCalled)
        XCTAssertEqual(mockSupabaseClient.lastSignInEmail, email)
        XCTAssertEqual(mockSupabaseClient.lastSignInPassword, password)
        XCTAssertTrue(authService.isAuthenticated)
        XCTAssertNotNil(authService.currentUser)
        XCTAssertNil(authService.error)
        XCTAssertFalse(authService.isLoading)

        // Verify tokens stored
        XCTAssertTrue(mockKeychainManager.saveAccessTokenCalled)
        XCTAssertTrue(mockKeychainManager.saveRefreshTokenCalled)
        XCTAssertTrue(mockKeychainManager.saveUserIDCalled)
    }

    func testSignIn_InvalidCredentials() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 401, userInfo: [NSLocalizedDescriptionKey: "Invalid credentials"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.signIn(email: "wrong@example.com", password: "wrongpass")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertFalse(authService.isAuthenticated)
            XCTAssertNil(authService.currentUser)
            XCTAssertNotNil(authService.error)
            XCTAssertFalse(authService.isLoading)
        }
    }

    func testSignIn_EmptyEmail() async throws {
        // When/Then
        do {
            try await authService.signIn(email: "", password: "password")
            XCTFail("Should have thrown error for empty email")
        } catch {
            XCTAssertFalse(authService.isAuthenticated)
        }
    }

    func testSignIn_EmptyPassword() async throws {
        // When/Then
        do {
            try await authService.signIn(email: "test@example.com", password: "")
            XCTFail("Should have thrown error for empty password")
        } catch {
            XCTAssertFalse(authService.isAuthenticated)
        }
    }

    func testSignIn_NetworkError() async throws {
        // Given
        let networkError = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = networkError

        // When/Then
        do {
            try await authService.signIn(email: "test@example.com", password: "password")
            XCTFail("Should have thrown network error")
        } catch {
            XCTAssertNotNil(authService.error)
            XCTAssertFalse(authService.isAuthenticated)
        }
    }

    // MARK: - Sign Up Tests

    func testSignUp_Success() async throws {
        // Given
        let email = "newuser@example.com"
        let password = "securePass123!"
        let fullName = "New User"
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.signUp(email: email, password: password, fullName: fullName)

        // Then
        XCTAssertTrue(mockSupabaseClient.signUpCalled)
        XCTAssertNotNil(authService.currentUser)
        XCTAssertNil(authService.error)
        XCTAssertFalse(authService.isLoading)
    }

    func testSignUp_UserAlreadyExists() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 422, userInfo: [NSLocalizedDescriptionKey: "User already exists"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.signUp(email: "existing@example.com", password: "pass", fullName: "User")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertNotNil(authService.error)
        }
    }

    func testSignUp_WeakPassword() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 422, userInfo: [NSLocalizedDescriptionKey: "Password too weak"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.signUp(email: "test@example.com", password: "123", fullName: "User")
            XCTFail("Should have thrown error for weak password")
        } catch {
            XCTAssertNotNil(authService.error)
        }
    }

    // MARK: - Sign Out Tests

    func testSignOut_Success() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = true

        // Setup authenticated state
        try await authService.signIn(email: "test@example.com", password: "password")
        XCTAssertTrue(authService.isAuthenticated)

        // When
        try await authService.signOut()

        // Then
        XCTAssertTrue(mockSupabaseClient.signOutCalled)
        XCTAssertFalse(authService.isAuthenticated)
        XCTAssertNil(authService.currentUser)
        XCTAssertNil(authService.error)

        // Verify tokens cleared
        XCTAssertTrue(mockKeychainManager.clearTokensCalled)
        XCTAssertTrue(mockKeychainManager.clearAllCalled)
    }

    func testSignOut_WhenNotAuthenticated() async throws {
        // Given - Not authenticated
        XCTAssertFalse(authService.isAuthenticated)

        // When
        try await authService.signOut()

        // Then - Should still succeed
        XCTAssertTrue(mockSupabaseClient.signOutCalled)
        XCTAssertFalse(authService.isAuthenticated)
    }

    func testSignOut_NetworkError() async throws {
        // Given
        let error = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.signOut()
            XCTFail("Should have thrown network error")
        } catch {
            XCTAssertNotNil(authService.error)
        }
    }

    // MARK: - Biometric Authentication Tests

    func testSignInWithBiometrics_Success() async throws {
        // Given
        mockBiometricManager.biometricsAvailable = true
        mockBiometricManager.authenticationSucceeds = true
        mockKeychainManager.mockRefreshToken = "mock_refresh_token"
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.signInWithBiometrics()

        // Then
        XCTAssertTrue(mockBiometricManager.authenticateCalled)
        XCTAssertTrue(authService.isAuthenticated)
        XCTAssertNotNil(authService.currentUser)
    }

    func testSignInWithBiometrics_NotAvailable() async throws {
        // Given
        mockBiometricManager.biometricsAvailable = false

        // When/Then
        do {
            try await authService.signInWithBiometrics()
            XCTFail("Should have thrown biometrics not available error")
        } catch AuthError.biometricsNotAvailable {
            // Expected
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }

    func testSignInWithBiometrics_AuthenticationFailed() async throws {
        // Given
        mockBiometricManager.biometricsAvailable = true
        mockBiometricManager.authenticationSucceeds = false

        // When/Then
        do {
            try await authService.signInWithBiometrics()
            XCTFail("Should have thrown authentication failed error")
        } catch {
            XCTAssertFalse(authService.isAuthenticated)
        }
    }

    func testSignInWithBiometrics_NoStoredCredentials() async throws {
        // Given
        mockBiometricManager.biometricsAvailable = true
        mockBiometricManager.authenticationSucceeds = true
        mockKeychainManager.mockRefreshToken = nil // No stored token

        // When/Then
        do {
            try await authService.signInWithBiometrics()
            XCTFail("Should have thrown no credentials error")
        } catch AuthError.noStoredCredentials {
            // Expected
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }

    func testEnableBiometricAuth_Success() async throws {
        // Given
        mockBiometricManager.biometricsAvailable = true

        // When
        await authService.enableBiometricAuth()

        // Then
        XCTAssertTrue(mockKeychainManager.setBiometricEnabledCalled)
        XCTAssertEqual(mockKeychainManager.lastBiometricEnabledValue, true)
    }

    func testDisableBiometricAuth() {
        // When
        authService.disableBiometricAuth()

        // Then
        XCTAssertTrue(mockKeychainManager.setBiometricEnabledCalled)
        XCTAssertEqual(mockKeychainManager.lastBiometricEnabledValue, false)
    }

    // MARK: - Password Reset Tests

    func testResetPassword_Success() async throws {
        // Given
        let email = "test@example.com"
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.resetPassword(email: email)

        // Then
        XCTAssertNil(authService.error)
        XCTAssertFalse(authService.isLoading)
    }

    func testResetPassword_InvalidEmail() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 422, userInfo: [NSLocalizedDescriptionKey: "Invalid email"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.resetPassword(email: "invalid-email")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertNotNil(authService.error)
        }
    }

    func testUpdatePassword_Success() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.updatePassword(newPassword: "newSecurePass123!")

        // Then
        XCTAssertNil(authService.error)
        XCTAssertFalse(authService.isLoading)
    }

    func testUpdatePassword_WeakPassword() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 422, userInfo: [NSLocalizedDescriptionKey: "Password too weak"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.updatePassword(newPassword: "123")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertNotNil(authService.error)
        }
    }

    // MARK: - Session Management Tests

    func testCheckAuthStatus_WithValidSession() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = true
        mockSupabaseClient.mockAuthResponse = MockSupabaseClient.MockAuthResponse(
            session: mockSupabaseClient.createMockSession(),
            user: mockSupabaseClient.createMockUser(email: "test@example.com")
        )

        // When
        await authService.checkAuthStatus()

        // Then
        XCTAssertTrue(authService.isAuthenticated)
        XCTAssertNotNil(authService.currentUser)
    }

    func testCheckAuthStatus_NoSession() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = false

        // When
        await authService.checkAuthStatus()

        // Then
        XCTAssertFalse(authService.isAuthenticated)
        XCTAssertNil(authService.currentUser)
    }

    func testRefreshSession_Success() async throws {
        // Given
        mockKeychainManager.mockRefreshToken = "valid_refresh_token"
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.refreshSession()

        // Then
        XCTAssertTrue(authService.isAuthenticated)
        XCTAssertNotNil(authService.currentUser)
    }

    func testRefreshSession_ExpiredToken() async throws {
        // Given
        let error = NSError(domain: "Auth", code: 401, userInfo: [NSLocalizedDescriptionKey: "Token expired"])
        mockSupabaseClient.shouldSucceed = false
        mockSupabaseClient.mockError = error

        // When/Then
        do {
            try await authService.refreshSession()
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertFalse(authService.isAuthenticated)
        }
    }

    // MARK: - Loading State Tests

    func testLoadingState_DuringSignIn() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = true

        // When - Start sign in
        let signInTask = Task {
            try await authService.signIn(email: "test@example.com", password: "password")
        }

        // Then - Should be loading
        // Note: This test is tricky due to async timing
        // In real implementation, you'd use expectations

        try await signInTask.value
        XCTAssertFalse(authService.isLoading) // After completion
    }

    // MARK: - Error Handling Tests

    func testError_ClearedOnSuccessfulOperation() async throws {
        // Given - Set an error first
        mockSupabaseClient.shouldSucceed = false
        do {
            try await authService.signIn(email: "test@example.com", password: "wrong")
        } catch {}
        XCTAssertNotNil(authService.error)

        // When - Successful operation
        mockSupabaseClient.shouldSucceed = true
        try await authService.signIn(email: "test@example.com", password: "correct")

        // Then
        XCTAssertNil(authService.error)
    }

    // MARK: - Token Storage Tests

    func testTokens_StoredOnSignIn() async throws {
        // Given
        mockSupabaseClient.shouldSucceed = true

        // When
        try await authService.signIn(email: "test@example.com", password: "password")

        // Then
        XCTAssertTrue(mockKeychainManager.saveAccessTokenCalled)
        XCTAssertTrue(mockKeychainManager.saveRefreshTokenCalled)
        XCTAssertTrue(mockKeychainManager.saveUserIDCalled)
        XCTAssertNotNil(mockKeychainManager.lastAccessToken)
        XCTAssertNotNil(mockKeychainManager.lastRefreshToken)
    }

    func testTokens_ClearedOnSignOut() async throws {
        // Given - Sign in first
        mockSupabaseClient.shouldSucceed = true
        try await authService.signIn(email: "test@example.com", password: "password")

        // When
        try await authService.signOut()

        // Then
        XCTAssertTrue(mockKeychainManager.clearTokensCalled)
        XCTAssertTrue(mockKeychainManager.clearAllCalled)
    }
}
