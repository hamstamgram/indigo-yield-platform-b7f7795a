//
//  MockSupabaseClient.swift
//  IndigoInvestorTests
//
//  Mock implementation of Supabase client for testing
//

import Foundation
import Supabase

/// Mock Supabase client for testing purposes
class MockSupabaseClient {
    // MARK: - Properties

    var shouldSucceed = true
    var mockError: Error?
    var mockAuthResponse: MockAuthResponse?
    var mockQueryResponse: [[String: Any]]?
    var authStateChangeHandler: ((AuthChangeEvent, Session?) -> Void)?

    // Tracking
    var signInEmailCalled = false
    var signInBiometricCalled = false
    var signOutCalled = false
    var signUpCalled = false
    var queryFromCalled = false
    var insertIntoCalled = false
    var updateIntoCalled = false
    var deleteFromCalled = false

    var lastSignInEmail: String?
    var lastSignInPassword: String?
    var lastQueryTable: String?
    var lastInsertTable: String?
    var lastInsertData: [String: Any]?

    // MARK: - Auth Mock

    struct MockAuthResponse {
        let session: Session?
        let user: User?
    }

    func signInWithPassword(email: String, password: String) async throws -> MockAuthResponse {
        signInEmailCalled = true
        lastSignInEmail = email
        lastSignInPassword = password

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "MockSupabase", code: 401, userInfo: [NSLocalizedDescriptionKey: "Invalid credentials"])
        }

        return mockAuthResponse ?? MockAuthResponse(
            session: createMockSession(),
            user: createMockUser(email: email)
        )
    }

    func signInWithBiometric() async throws -> MockAuthResponse {
        signInBiometricCalled = true

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "MockSupabase", code: 401, userInfo: [NSLocalizedDescriptionKey: "Biometric authentication failed"])
        }

        return mockAuthResponse ?? MockAuthResponse(
            session: createMockSession(),
            user: createMockUser(email: "test@example.com")
        )
    }

    func signUp(email: String, password: String, data: [String: Any]? = nil) async throws -> MockAuthResponse {
        signUpCalled = true

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "MockSupabase", code: 422, userInfo: [NSLocalizedDescriptionKey: "User already exists"])
        }

        return MockAuthResponse(
            session: createMockSession(),
            user: createMockUser(email: email)
        )
    }

    func signOut() async throws {
        signOutCalled = true

        if !shouldSucceed {
            throw mockError ?? NSError(domain: "MockSupabase", code: 500, userInfo: [NSLocalizedDescriptionKey: "Sign out failed"])
        }
    }

    func currentSession() async throws -> Session? {
        if !shouldSucceed {
            return nil
        }
        return mockAuthResponse?.session ?? createMockSession()
    }

    func currentUser() -> User? {
        if !shouldSucceed {
            return nil
        }
        return mockAuthResponse?.user ?? createMockUser(email: "test@example.com")
    }

    func onAuthStateChange(handler: @escaping (AuthChangeEvent, Session?) -> Void) {
        authStateChangeHandler = handler
    }

    // MARK: - Database Mock

    func from(_ table: String) -> MockQueryBuilder {
        queryFromCalled = true
        lastQueryTable = table
        return MockQueryBuilder(client: self, table: table)
    }

    // MARK: - Helper Methods

    private func createMockSession() -> Session {
        // Create a mock session with minimal required data
        Session(
            accessToken: "mock_access_token_\(UUID().uuidString)",
            tokenType: "bearer",
            expiresIn: 3600,
            refreshToken: "mock_refresh_token_\(UUID().uuidString)",
            user: createMockUser(email: "test@example.com")
        )
    }

    private func createMockUser(email: String) -> User {
        User(
            id: UUID(),
            appMetadata: [:],
            userMetadata: ["email": email],
            aud: "authenticated",
            createdAt: Date(),
            email: email
        )
    }

    // MARK: - Reset

    func reset() {
        shouldSucceed = true
        mockError = nil
        mockAuthResponse = nil
        mockQueryResponse = nil

        signInEmailCalled = false
        signInBiometricCalled = false
        signOutCalled = false
        signUpCalled = false
        queryFromCalled = false
        insertIntoCalled = false
        updateIntoCalled = false
        deleteFromCalled = false

        lastSignInEmail = nil
        lastSignInPassword = nil
        lastQueryTable = nil
        lastInsertTable = nil
        lastInsertData = nil
    }
}

// MARK: - Mock Query Builder

class MockQueryBuilder {
    weak var client: MockSupabaseClient?
    let table: String
    var selectFields: String?
    var whereConditions: [(column: String, operator: String, value: Any)] = []
    var orderByColumn: String?
    var orderDescending: Bool = false
    var limitValue: Int?

    init(client: MockSupabaseClient, table: String) {
        self.client = client
        self.table = table
    }

    func select(_ fields: String = "*") -> MockQueryBuilder {
        selectFields = fields
        return self
    }

    func eq(_ column: String, value: Any) -> MockQueryBuilder {
        whereConditions.append((column, "eq", value))
        return self
    }

    func neq(_ column: String, value: Any) -> MockQueryBuilder {
        whereConditions.append((column, "neq", value))
        return self
    }

    func gt(_ column: String, value: Any) -> MockQueryBuilder {
        whereConditions.append((column: column, operator: "gt", value: value))
        return self
    }

    func lt(_ column: String, value: Any) -> MockQueryBuilder {
        whereConditions.append((column: column, operator: "lt", value: value))
        return self
    }

    func order(_ column: String, ascending: Bool = true) -> MockQueryBuilder {
        orderByColumn = column
        orderDescending = !ascending
        return self
    }

    func limit(_ count: Int) -> MockQueryBuilder {
        limitValue = count
        return self
    }

    func insert(_ data: [String: Any]) async throws -> [[String: Any]] {
        client?.insertIntoCalled = true
        client?.lastInsertTable = table
        client?.lastInsertData = data

        guard let client = client, client.shouldSucceed else {
            throw client?.mockError ?? NSError(domain: "MockSupabase", code: 500, userInfo: [NSLocalizedDescriptionKey: "Insert failed"])
        }

        return client.mockQueryResponse ?? [data]
    }

    func update(_ data: [String: Any]) async throws -> [[String: Any]] {
        client?.updateIntoCalled = true

        guard let client = client, client.shouldSucceed else {
            throw client?.mockError ?? NSError(domain: "MockSupabase", code: 500, userInfo: [NSLocalizedDescriptionKey: "Update failed"])
        }

        return client.mockQueryResponse ?? [data]
    }

    func delete() async throws -> [[String: Any]] {
        client?.deleteFromCalled = true

        guard let client = client, client.shouldSucceed else {
            throw client?.mockError ?? NSError(domain: "MockSupabase", code: 500, userInfo: [NSLocalizedDescriptionKey: "Delete failed"])
        }

        return client.mockQueryResponse ?? []
    }

    func execute() async throws -> [[String: Any]] {
        guard let client = client, client.shouldSucceed else {
            throw client?.mockError ?? NSError(domain: "MockSupabase", code: 500, userInfo: [NSLocalizedDescriptionKey: "Query failed"])
        }

        return client.mockQueryResponse ?? []
    }
}

// MARK: - Mock Factory Methods

extension MockSupabaseClient {
    static func createSuccessClient(withSession session: Session? = nil) -> MockSupabaseClient {
        let client = MockSupabaseClient()
        client.shouldSucceed = true
        if let session = session {
            client.mockAuthResponse = MockAuthResponse(session: session, user: session.user)
        }
        return client
    }

    static func createFailureClient(error: Error? = nil) -> MockSupabaseClient {
        let client = MockSupabaseClient()
        client.shouldSucceed = false
        client.mockError = error
        return client
    }

    static func createClientWithMockData(_ data: [[String: Any]]) -> MockSupabaseClient {
        let client = MockSupabaseClient()
        client.shouldSucceed = true
        client.mockQueryResponse = data
        return client
    }
}
