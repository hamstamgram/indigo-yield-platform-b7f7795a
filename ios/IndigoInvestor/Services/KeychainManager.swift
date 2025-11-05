//
//  KeychainManager.swift
//  IndigoInvestor
//
//  Secure credential storage using iOS Keychain
//

import Foundation
import Security

final class KeychainManager: KeychainManagerProtocol {
    private let service = "com.indigo.investor"
    private let emailKey = "user_email"
    private let passwordKey = "user_password"
    private let biometricKey = "biometric_enabled"

    func save(email: String, password: String) throws {
        try saveToKeychain(key: emailKey, value: email)
        try saveToKeychain(key: passwordKey, value: password)
    }

    func retrieveCredentials() throws -> (email: String, password: String)? {
        guard let email = try? retrieveFromKeychain(key: emailKey),
              let password = try? retrieveFromKeychain(key: passwordKey) else {
            return nil
        }
        return (email, password)
    }

    func setBiometricEnabled(_ enabled: Bool) throws {
        try saveToKeychain(key: biometricKey, value: enabled ? "true" : "false")
    }

    func isBiometricEnabled() -> Bool {
        guard let value = try? retrieveFromKeychain(key: biometricKey) else {
            return false
        }
        return value == "true"
    }

    func deleteCredentials() throws {
        try deleteFromKeychain(key: emailKey)
        try deleteFromKeychain(key: passwordKey)
        try deleteFromKeychain(key: biometricKey)
    }

    // MARK: - Private Keychain Operations

    private func saveToKeychain(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingError
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        // Delete existing item
        SecItemDelete(query as CFDictionary)

        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    private func retrieveFromKeychain(key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            throw KeychainError.retrieveFailed(status)
        }

        return value
    }

    private func deleteFromKeychain(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
}

// MARK: - Keychain Error

enum KeychainError: Error {
    case encodingError
    case saveFailed(OSStatus)
    case retrieveFailed(OSStatus)
    case deleteFailed(OSStatus)

    var localizedDescription: String {
        switch self {
        case .encodingError:
            return "Failed to encode data"
        case .saveFailed(let status):
            return "Failed to save to keychain: \(status)"
        case .retrieveFailed(let status):
            return "Failed to retrieve from keychain: \(status)"
        case .deleteFailed(let status):
            return "Failed to delete from keychain: \(status)"
        }
    }
}
