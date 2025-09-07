//
//  KeychainManager.swift
//  IndigoInvestor
//
//  Secure keychain storage manager
//

import Foundation
import Security
import KeychainAccess

class KeychainManager {
    static let shared = KeychainManager()
    
    private let keychain: Keychain
    private let serviceName = "com.indigo.investor"
    
    // Keychain keys
    private enum Keys {
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
        static let userID = "user_id"
        static let userRole = "user_role"
        static let biometricEnabled = "biometric_enabled"
        static let sessionExpiry = "session_expiry"
        static let twoFactorSecret = "two_factor_secret"
        static let deviceID = "device_id"
        static let pinnedCertificates = "pinned_certificates"
    }
    
    private init() {
        keychain = Keychain(service: serviceName)
            .accessibility(.whenUnlockedThisDeviceOnly)
            .authenticationPrompt("Authenticate to access your secure data")
    }
    
    // MARK: - Token Management
    
    func saveAccessToken(_ token: String) throws {
        try keychain.set(token, key: Keys.accessToken)
    }
    
    func getAccessToken() throws -> String? {
        return try keychain.getString(Keys.accessToken)
    }
    
    func saveRefreshToken(_ token: String) throws {
        try keychain.set(token, key: Keys.refreshToken)
    }
    
    func getRefreshToken() throws -> String? {
        return try keychain.getString(Keys.refreshToken)
    }
    
    func clearTokens() throws {
        try keychain.remove(Keys.accessToken)
        try keychain.remove(Keys.refreshToken)
    }
    
    // MARK: - User Data
    
    func saveUserID(_ id: String) throws {
        try keychain.set(id, key: Keys.userID)
    }
    
    func getUserID() throws -> String? {
        return try keychain.getString(Keys.userID)
    }
    
    func saveUserRole(_ role: String) throws {
        try keychain.set(role, key: Keys.userRole)
    }
    
    func getUserRole() throws -> String? {
        return try keychain.getString(Keys.userRole)
    }
    
    // MARK: - Session Management
    
    func saveSessionExpiry(_ date: Date) throws {
        let timestamp = date.timeIntervalSince1970
        try keychain.set(String(timestamp), key: Keys.sessionExpiry)
    }
    
    func getSessionExpiry() throws -> Date? {
        guard let timestampString = try keychain.getString(Keys.sessionExpiry),
              let timestamp = Double(timestampString) else {
            return nil
        }
        return Date(timeIntervalSince1970: timestamp)
    }
    
    func isSessionValid() -> Bool {
        do {
            guard let expiry = try getSessionExpiry() else {
                return false
            }
            return expiry > Date()
        } catch {
            return false
        }
    }
    
    // MARK: - Biometric Settings
    
    func setBiometricEnabled(_ enabled: Bool) throws {
        try keychain.set(enabled ? "true" : "false", key: Keys.biometricEnabled)
    }
    
    func isBiometricEnabled() -> Bool {
        do {
            guard let value = try keychain.getString(Keys.biometricEnabled) else {
                return false
            }
            return value == "true"
        } catch {
            return false
        }
    }
    
    // MARK: - Two-Factor Authentication
    
    func saveTwoFactorSecret(_ secret: String) throws {
        // Use additional encryption for 2FA secrets
        let encryptedSecret = try encrypt(secret)
        try keychain
            .accessibility(.whenUnlockedThisDeviceOnly, authenticationPolicy: .biometryCurrentSet)
            .set(encryptedSecret, key: Keys.twoFactorSecret)
    }
    
    func getTwoFactorSecret() throws -> String? {
        guard let encryptedSecret = try keychain.getString(Keys.twoFactorSecret) else {
            return nil
        }
        return try decrypt(encryptedSecret)
    }
    
    // MARK: - Device Management
    
    func getOrCreateDeviceID() throws -> String {
        if let existingID = try keychain.getString(Keys.deviceID) {
            return existingID
        }
        
        let newID = UUID().uuidString
        try keychain.set(newID, key: Keys.deviceID)
        return newID
    }
    
    // MARK: - Certificate Pinning
    
    func savePinnedCertificates(_ certificates: [String]) throws {
        let data = try JSONEncoder().encode(certificates)
        try keychain.set(data, key: Keys.pinnedCertificates)
    }
    
    func getPinnedCertificates() throws -> [String]? {
        guard let data = try keychain.getData(Keys.pinnedCertificates) else {
            return nil
        }
        return try JSONDecoder().decode([String].self, from: data)
    }
    
    // MARK: - Clear All Data
    
    func clearAll() throws {
        try keychain.removeAll()
    }
    
    // MARK: - Encryption Helpers
    
    private func encrypt(_ string: String) throws -> String {
        // Implement additional encryption if needed
        // For now, keychain provides sufficient encryption
        return string
    }
    
    private func decrypt(_ string: String) throws -> String {
        // Implement decryption if additional encryption was used
        return string
    }
    
    // MARK: - Debug Helpers
    
    #if DEBUG
    func debugPrintAllKeys() {
        do {
            let allKeys = keychain.allKeys()
            print("📱 Keychain Contents:")
            for key in allKeys {
                if let value = try keychain.getString(key) {
                    // Redact sensitive values in logs
                    let redacted = key.contains("token") || key.contains("secret") ? "***REDACTED***" : value
                    print("  - \(key): \(redacted)")
                }
            }
        } catch {
            print("❌ Error reading keychain: \(error)")
        }
    }
    #endif
}
