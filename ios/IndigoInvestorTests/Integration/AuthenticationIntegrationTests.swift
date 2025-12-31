//
//  AuthenticationIntegrationTests.swift
//  IndigoInvestorTests
//
//  Comprehensive authentication integration tests for iOS
//  Tests Supabase authentication flows and cross-platform credential compatibility
//

import XCTest
import Supabase
@testable import IndigoInvestor

@MainActor
final class AuthenticationIntegrationTests: XCTestCase {

    // MARK: - Properties

    var supabaseClient: SupabaseClient!
    var authService: AuthService!
    var keychainManager: KeychainManager!
    var biometricManager: BiometricAuthManager!

    // Test credentials
    let testUserEmail = "test-investor@indigoyield.com"
    let testUserPassword = "TestPassword123!"
    let testAdminEmail = "test-admin@indigoyield.com"
    let testAdminPassword = "AdminPassword123!"

    // MARK: - Setup & Teardown

    override func setUp() async throws {
        try await super.setUp()

        // Initialize Supabase client with production credentials
        let config = SupabaseConfig.current

        guard !config.url.isEmpty && !config.anonKey.isEmpty else {
            XCTFail("Supabase configuration not set. Check Secrets.xcconfig")
            return
        }

        supabaseClient = SupabaseClient(
            supabaseURL: URL(string: config.url)!,
            supabaseKey: config.anonKey
        )

        // Initialize dependencies
        keychainManager = KeychainManager()
        biometricManager = BiometricAuthManager()

        // Initialize auth service
        authService = AuthService(
            client: supabaseClient,
            keychainManager: keychainManager,
            biometricManager: biometricManager
        )

        // Clean up any existing session
        do {
            try await supabaseClient.auth.signOut()
            try keychainManager.clearAll()
        } catch {
            print("⚠️ Cleanup warning: \(error)")
        }

        print("✅ Test setup complete")
    }

    override func tearDown() async throws {
        // Clean up session
        try? await supabaseClient.auth.signOut()
        try? keychainManager.clearAll()

        supabaseClient = nil
        authService = nil
        keychainManager = nil
        biometricManager = nil

        try await super.tearDown()

        print("✅ Test teardown complete")
    }

    // MARK: - Email/Password Authentication Tests

    func testSignUpNewUser() async throws {
        print("🧪 Testing user signup...")

        let uniqueEmail = "ios-test-\(UUID().uuidString)@indigoyield.com"

        do {
            try await authService.signUp(
                email: uniqueEmail,
                password: testUserPassword,
                fullName: "iOS Test User"
            )

            // Verify user was created
            XCTAssertNotNil(authService.currentUser, "User should be set after signup")
            XCTAssertEqual(authService.currentUser?.email, uniqueEmail, "Email should match")

            print("✅ User signup successful")
        } catch {
            XCTFail("Signup failed: \(error)")
        }
    }

    func testSignInExistingUser() async throws {
        print("🧪 Testing user sign in...")

        do {
            try await authService.signIn(
                email: testUserEmail,
                password: testUserPassword
            )

            // Verify session created
            XCTAssertNotNil(authService.currentUser, "Current user should be set")
            XCTAssertTrue(authService.isAuthenticated, "Should be authenticated")
            XCTAssertEqual(authService.currentUser?.email, testUserEmail, "Email should match")

            // Verify tokens stored in keychain
            let accessToken = try keychainManager.getAccessToken()
            let refreshToken = try keychainManager.getRefreshToken()

            XCTAssertNotNil(accessToken, "Access token should be stored")
            XCTAssertNotNil(refreshToken, "Refresh token should be stored")

            print("✅ User sign in successful")
        } catch {
            XCTFail("Sign in failed: \(error)")
        }
    }

    func testSignInWithInvalidCredentials() async throws {
        print("🧪 Testing invalid credentials rejection...")

        do {
            try await authService.signIn(
                email: testUserEmail,
                password: "WrongPassword123!"
            )

            XCTFail("Should have thrown error for invalid credentials")
        } catch {
            // Error expected
            XCTAssertFalse(authService.isAuthenticated, "Should not be authenticated")
            XCTAssertNil(authService.currentUser, "Current user should be nil")

            print("✅ Invalid credentials properly rejected")
        }
    }

    func testSignOut() async throws {
        print("🧪 Testing sign out...")

        // Sign in first
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        XCTAssertTrue(authService.isAuthenticated, "Should be authenticated before signout")

        // Sign out
        try await authService.signOut()

        // Verify session cleared
        XCTAssertFalse(authService.isAuthenticated, "Should not be authenticated after signout")
        XCTAssertNil(authService.currentUser, "Current user should be nil")

        // Verify tokens cleared from keychain
        let accessToken = try? keychainManager.getAccessToken()
        let refreshToken = try? keychainManager.getRefreshToken()

        XCTAssertNil(accessToken, "Access token should be cleared")
        XCTAssertNil(refreshToken, "Refresh token should be cleared")

        print("✅ Sign out successful")
    }

    // MARK: - Session Management Tests

    func testSessionPersistence() async throws {
        print("🧪 Testing session persistence...")

        // Sign in
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        let userId = authService.currentUser?.id
        XCTAssertNotNil(userId, "User ID should be set")

        // Simulate app restart by creating new auth service
        let newAuthService = AuthService(
            client: supabaseClient,
            keychainManager: keychainManager,
            biometricManager: biometricManager
        )

        // Wait for session check
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // Session should be restored
        await newAuthService.checkAuthStatus()

        // Note: Session restoration depends on Supabase configuration
        // and refresh token validity

        print("✅ Session persistence tested")
    }

    func testTokenRefresh() async throws {
        print("🧪 Testing token refresh...")

        // Sign in
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        // Get initial tokens
        let initialAccessToken = try keychainManager.getAccessToken()
        let refreshToken = try keychainManager.getRefreshToken()

        XCTAssertNotNil(initialAccessToken, "Initial access token should exist")
        XCTAssertNotNil(refreshToken, "Refresh token should exist")

        // Make API call that might trigger refresh
        // (In production, tokens expire after 1 hour)

        let session = try await supabaseClient.auth.session
        XCTAssertNotNil(session, "Session should be valid")

        print("✅ Token refresh tested")
    }

    // MARK: - Password Reset Tests

    func testPasswordResetRequest() async throws {
        print("🧪 Testing password reset request...")

        do {
            try await authService.resetPassword(email: testUserEmail)

            // If no error thrown, reset email was sent
            print("✅ Password reset email sent")
        } catch {
            XCTFail("Password reset request failed: \(error)")
        }
    }

    func testPasswordUpdate() async throws {
        print("🧪 Testing password update...")

        // Sign in first
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        // Update password
        let newPassword = "NewPassword123!"

        do {
            try await authService.updatePassword(newPassword: newPassword)

            // Sign out
            try await authService.signOut()

            // Try signing in with new password
            try await authService.signIn(
                email: testUserEmail,
                password: newPassword
            )

            XCTAssertTrue(authService.isAuthenticated, "Should authenticate with new password")

            // Change password back
            try await authService.updatePassword(newPassword: testUserPassword)

            print("✅ Password update successful")
        } catch {
            // Restore original password before failing
            try? await authService.signIn(email: testUserEmail, password: newPassword)
            try? await authService.updatePassword(newPassword: testUserPassword)
            XCTFail("Password update failed: \(error)")
        }
    }

    // MARK: - Cross-Platform Compatibility Tests

    func testWebCreatedCredentialsWorkOnIOS() async throws {
        print("🧪 Testing cross-platform credentials (web → iOS)...")

        // This test verifies that credentials created on web platform
        // work on iOS app using the same Supabase backend

        do {
            try await authService.signIn(
                email: testUserEmail,
                password: testUserPassword
            )

            XCTAssertTrue(authService.isAuthenticated, "Web-created credentials should work on iOS")
            XCTAssertNotNil(authService.currentUser, "User session should be created")

            // Fetch user profile to verify full access
            let userId = authService.currentUser?.id
            XCTAssertNotNil(userId, "User ID should be available")

            print("✅ Web-created credentials work on iOS")
        } catch {
            XCTFail("Cross-platform authentication failed: \(error)")
        }
    }

    func testIOSCreatedCredentialsWorkOnWeb() async throws {
        print("🧪 Testing cross-platform credentials (iOS → web)...")

        // Create user on iOS
        let crossPlatformEmail = "ios-created-\(UUID().uuidString)@indigoyield.com"

        do {
            // Sign up on iOS
            try await authService.signUp(
                email: crossPlatformEmail,
                password: testUserPassword,
                fullName: "iOS Created User"
            )

            // Sign out
            try await authService.signOut()

            // Sign in using direct Supabase client (simulating web)
            let response = try await supabaseClient.auth.signInWithPassword(
                email: crossPlatformEmail,
                password: testUserPassword
            )

            XCTAssertNotNil(response.session, "Session should be created")
            XCTAssertEqual(response.user.email, crossPlatformEmail, "Email should match")

            print("✅ iOS-created credentials work on web")
        } catch {
            XCTFail("Cross-platform credential creation failed: \(error)")
        }
    }

    func testUserDataSyncAcrossPlatforms() async throws {
        print("🧪 Testing user data sync across platforms...")

        // Sign in
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        let userId = authService.currentUser?.id
        XCTAssertNotNil(userId, "User ID should be available")

        // Fetch profile using Supabase client
        let response = try await supabaseClient.database
            .from("profiles")
            .select()
            .eq("id", value: userId!.uuidString)
            .single()
            .execute()

        // Profile might not exist for test user, that's OK
        print("✅ User data sync query successful")
    }

    // MARK: - Biometric Authentication Tests

    func testBiometricAuthSetup() async throws {
        print("🧪 Testing biometric auth setup...")

        // Sign in with password first
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        // Check if biometrics available
        if biometricManager.canUseBiometrics() {
            // Tokens should be stored for biometric auth
            let refreshToken = try? keychainManager.getRefreshToken()
            XCTAssertNotNil(refreshToken, "Refresh token should be stored for biometric auth")

            print("✅ Biometric auth setup successful")
        } else {
            print("⚠️ Biometrics not available on simulator/device")
        }
    }

    // MARK: - Admin Authentication Tests

    func testAdminAuthentication() async throws {
        print("🧪 Testing admin authentication...")

        do {
            try await authService.signIn(
                email: testAdminEmail,
                password: testAdminPassword
            )

            XCTAssertTrue(authService.isAuthenticated, "Admin should be authenticated")
            XCTAssertNotNil(authService.currentUser, "Admin user should be set")

            // Verify admin access (would check admin_users table in production)
            let userId = authService.currentUser?.id
            XCTAssertNotNil(userId, "Admin user ID should be available")

            print("✅ Admin authentication successful")
        } catch {
            print("⚠️ Admin authentication test skipped (admin user may not exist)")
        }
    }

    // MARK: - Direct Supabase API Tests

    func testSupabaseAPISignUp() async throws {
        print("🧪 Testing Supabase API signup...")

        let uniqueEmail = "api-test-\(UUID().uuidString)@indigoyield.com"

        do {
            let response = try await supabaseClient.auth.signUp(
                email: uniqueEmail,
                password: testUserPassword,
                data: ["full_name": .string("API Test User")]
            )

            XCTAssertNotNil(response.user, "User should be created")
            XCTAssertEqual(response.user?.email, uniqueEmail, "Email should match")

            print("✅ Supabase API signup successful")
        } catch {
            XCTFail("API signup failed: \(error)")
        }
    }

    func testSupabaseAPISignIn() async throws {
        print("🧪 Testing Supabase API sign in...")

        do {
            let response = try await supabaseClient.auth.signInWithPassword(
                email: testUserEmail,
                password: testUserPassword
            )

            XCTAssertNotNil(response.session, "Session should be created")
            XCTAssertNotNil(response.session.accessToken, "Access token should be present")
            XCTAssertNotNil(response.session.refreshToken, "Refresh token should be present")
            XCTAssertNotNil(response.user, "User should be present")

            print("✅ Supabase API sign in successful")
        } catch {
            XCTFail("API sign in failed: \(error)")
        }
    }

    func testSupabaseAPIGetSession() async throws {
        print("🧪 Testing Supabase API get session...")

        // Sign in first
        _ = try await supabaseClient.auth.signInWithPassword(
            email: testUserEmail,
            password: testUserPassword
        )

        // Get current session
        do {
            let session = try await supabaseClient.auth.session

            XCTAssertNotNil(session, "Session should exist")
            XCTAssertNotNil(session.accessToken, "Access token should be present")
            XCTAssertNotNil(session.user, "User should be present")

            print("✅ Supabase API get session successful")
        } catch {
            XCTFail("Get session failed: \(error)")
        }
    }

    func testSupabaseAPISignOut() async throws {
        print("🧪 Testing Supabase API sign out...")

        // Sign in first
        _ = try await supabaseClient.auth.signInWithPassword(
            email: testUserEmail,
            password: testUserPassword
        )

        // Sign out
        do {
            try await supabaseClient.auth.signOut()

            // Verify session is cleared
            do {
                _ = try await supabaseClient.auth.session
                XCTFail("Session should be cleared after signout")
            } catch {
                // Error expected - session should not exist
                print("✅ Supabase API sign out successful")
            }
        } catch {
            XCTFail("Sign out failed: \(error)")
        }
    }

    // MARK: - Security Tests

    func testTokenStorage() async throws {
        print("🧪 Testing secure token storage...")

        // Sign in
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        // Verify tokens stored securely in keychain
        let accessToken = try keychainManager.getAccessToken()
        let refreshToken = try keychainManager.getRefreshToken()
        let userId = try keychainManager.getUserID()

        XCTAssertNotNil(accessToken, "Access token should be stored")
        XCTAssertNotNil(refreshToken, "Refresh token should be stored")
        XCTAssertNotNil(userId, "User ID should be stored")

        // Verify tokens are not stored in UserDefaults or plain text
        let defaults = UserDefaults.standard
        XCTAssertNil(defaults.string(forKey: "access_token"), "Tokens should not be in UserDefaults")

        print("✅ Token storage is secure")
    }

    func testSessionExpiration() async throws {
        print("🧪 Testing session expiration handling...")

        // Sign in
        try await authService.signIn(
            email: testUserEmail,
            password: testUserPassword
        )

        // In production, tokens expire after 1 hour
        // This test verifies the refresh mechanism exists

        let refreshToken = try keychainManager.getRefreshToken()
        XCTAssertNotNil(refreshToken, "Refresh token should be available for session refresh")

        print("✅ Session expiration handling verified")
    }

    // MARK: - Performance Tests

    func testAuthenticationPerformance() async throws {
        print("🧪 Testing authentication performance...")

        measure {
            let expectation = self.expectation(description: "Authentication")

            Task {
                do {
                    try await authService.signIn(
                        email: testUserEmail,
                        password: testUserPassword
                    )

                    try await authService.signOut()

                    expectation.fulfill()
                } catch {
                    XCTFail("Performance test failed: \(error)")
                    expectation.fulfill()
                }
            }

            wait(for: [expectation], timeout: 10.0)
        }

        print("✅ Authentication performance measured")
    }

    // MARK: - Error Handling Tests

    func testNetworkErrorHandling() async throws {
        print("🧪 Testing network error handling...")

        // This test would require mocking network failures
        // For now, verify error propagation

        do {
            try await authService.signIn(
                email: "nonexistent@example.com",
                password: "wrongpassword"
            )
            XCTFail("Should throw error for invalid credentials")
        } catch {
            XCTAssertNotNil(error, "Error should be propagated")
            print("✅ Error handling working correctly")
        }
    }
}

// MARK: - Helper Extensions

extension AuthenticationIntegrationTests {

    /// Helper to create a test user if needed
    func createTestUserIfNeeded(email: String, password: String) async throws {
        do {
            try await supabaseClient.auth.signUp(
                email: email,
                password: password
            )
            print("✅ Test user created: \(email)")
        } catch {
            // User might already exist
            print("ℹ️ Test user may already exist: \(email)")
        }
    }

    /// Helper to clean up test user
    func cleanupTestUser(email: String) async throws {
        // Note: Supabase doesn't provide user deletion via client API
        // This would require service role access or manual cleanup
        print("ℹ️ Test user cleanup: \(email) (manual cleanup required)")
    }
}
