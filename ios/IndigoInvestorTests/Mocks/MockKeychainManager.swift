//
//  MockKeychainManager.swift
//  IndigoInvestorTests
//
//  Mock implementation of KeychainManager for testing
//

import Foundation
@testable import IndigoInvestor

class MockKeychainManager {
    var storage: [String: String] = [:]
    var shouldThrowError = false
    var didSaveAccessToken = false
    var didSaveRefreshToken = false
    var mockAccessToken: String?
    var mockRefreshToken: String?

    // MARK: - Token Management

    func saveAccessToken(_ token: String) throws {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        didSaveAccessToken = true
        storage["access_token"] = token
    }

    func getAccessToken() throws -> String? {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        return mockAccessToken ?? storage["access_token"]
    }

    func saveRefreshToken(_ token: String) throws {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        didSaveRefreshToken = true
        storage["refresh_token"] = token
    }

    func getRefreshToken() throws -> String? {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        return mockRefreshToken ?? storage["refresh_token"]
    }

    func clearTokens() throws {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        storage.removeValue(forKey: "access_token")
        storage.removeValue(forKey: "refresh_token")
    }

    func clearAll() throws {
        if shouldThrowError {
            throw NSError(domain: "MockKeychainManager", code: -1, userInfo: nil)
        }
        storage.removeAll()
    }

    func saveUserID(_ id: String) throws {
        storage["user_id"] = id
    }

    func getUserID() throws -> String? {
        return storage["user_id"]
    }

    func setBiometricEnabled(_ enabled: Bool) throws {
        storage["biometric_enabled"] = enabled ? "true" : "false"
    }

    func isBiometricEnabled() -> Bool {
        return storage["biometric_enabled"] == "true"
    }
}
