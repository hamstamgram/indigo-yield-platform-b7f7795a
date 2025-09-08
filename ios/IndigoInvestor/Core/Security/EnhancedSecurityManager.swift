//
//  EnhancedSecurityManager.swift
//  IndigoInvestor
//
//  Enhanced security manager with 2FA, biometric auth, and security policies
//

import Foundation
import LocalAuthentication
import CryptoKit
import SwiftUI

// MARK: - Two-Factor Authentication Manager

class TwoFactorAuthManager: ObservableObject {
    @Published var isConfigured = false
    @Published var requiresVerification = false
    private let keychainManager = KeychainManager.shared
    
    // MARK: - TOTP Implementation
    
    func generateSecret() -> String {
        // Generate a random 32-byte secret for TOTP
        let randomData = Data((0..<32).map { _ in UInt8.random(in: 0...255) })
        return randomData.base32EncodedString()
    }
    
    func generateTOTPCode(secret: String, timeInterval: TimeInterval = 30) -> String? {
        guard let secretData = Data(base32Encoded: secret) else { return nil }
        
        let counter = UInt64(Date().timeIntervalSince1970 / timeInterval)
        var counterBigEndian = counter.bigEndian
        let counterData = Data(bytes: &counterBigEndian, count: 8)
        
        let hmac = HMAC<SHA256>.authenticationCode(for: counterData, using: SymmetricKey(data: secretData))
        let hmacData = Data(hmac)
        
        // Dynamic truncation
        let offset = Int(hmacData[hmacData.count - 1] & 0x0f)
        let truncatedData = hmacData[offset..<offset + 4]
        
        var code = truncatedData.withUnsafeBytes { bytes in
            bytes.load(as: UInt32.self).bigEndian
        }
        code &= 0x7fffffff
        code = code % 1000000
        
        return String(format: "%06d", code)
    }
    
    func verifyTOTPCode(_ code: String, secret: String, window: Int = 1) -> Bool {
        let timeInterval: TimeInterval = 30
        let currentTime = Date().timeIntervalSince1970
        
        // Check current and adjacent time windows
        for i in -window...window {
            let testTime = currentTime + (Double(i) * timeInterval)
            let testCounter = UInt64(testTime / timeInterval)
            
            if let generatedCode = generateTOTPCodeForCounter(secret: secret, counter: testCounter),
               generatedCode == code {
                return true
            }
        }
        
        return false
    }
    
    private func generateTOTPCodeForCounter(secret: String, counter: UInt64) -> String? {
        guard let secretData = Data(base32Encoded: secret) else { return nil }
        
        var counterBigEndian = counter.bigEndian
        let counterData = Data(bytes: &counterBigEndian, count: 8)
        
        let hmac = HMAC<SHA256>.authenticationCode(for: counterData, using: SymmetricKey(data: secretData))
        let hmacData = Data(hmac)
        
        let offset = Int(hmacData[hmacData.count - 1] & 0x0f)
        let truncatedData = hmacData[offset..<offset + 4]
        
        var code = truncatedData.withUnsafeBytes { bytes in
            bytes.load(as: UInt32.self).bigEndian
        }
        code &= 0x7fffffff
        code = code % 1000000
        
        return String(format: "%06d", code)
    }
    
    // MARK: - QR Code Generation
    
    func generateProvisioningURI(accountName: String, issuer: String = "IndigoYield", secret: String) -> String {
        let encodedAccount = accountName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let encodedIssuer = issuer.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        
        return "otpauth://totp/\(encodedIssuer):\(encodedAccount)?secret=\(secret)&issuer=\(encodedIssuer)&algorithm=SHA256&digits=6&period=30"
    }
    
    // MARK: - Secure Storage
    
    func storeTOTPSecret(_ secret: String) throws {
        try keychainManager.save(secret, for: "totp_secret", withBiometric: true)
        isConfigured = true
    }
    
    func retrieveTOTPSecret() throws -> String? {
        return try keychainManager.retrieve("totp_secret")
    }
    
    func removeTOTPConfiguration() throws {
        try keychainManager.delete("totp_secret")
        isConfigured = false
    }
}

// MARK: - Enhanced Biometric Manager

class EnhancedBiometricManager: ObservableObject {
    @Published var isAvailable = false
    @Published var biometricType: LABiometryType = .none
    @Published var isEnrolled = false
    
    private let context = LAContext()
    private let keychainManager = KeychainManager.shared
    
    init() {
        checkBiometricAvailability()
    }
    
    func checkBiometricAvailability() {
        var error: NSError?
        isAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        biometricType = context.biometryType
        
        if isAvailable {
            isEnrolled = keychainManager.isBiometricEnabled()
        }
    }
    
    func authenticateWithBiometric(reason: String) async -> Result<Bool, Error> {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"
        context.localizedFallbackTitle = "Use Passcode"
        
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return .success(success)
        } catch {
            return .failure(error)
        }
    }
    
    func authenticateForSensitiveAction(action: String) async -> Bool {
        let reason = "Authenticate to \(action)"
        
        switch await authenticateWithBiometric(reason: reason) {
        case .success(true):
            return true
        case .success(false), .failure:
            // Fallback to passcode
            return await authenticateWithPasscode(reason: reason)
        }
    }
    
    private func authenticateWithPasscode(reason: String) async -> Bool {
        let context = LAContext()
        
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
            return success
        } catch {
            return false
        }
    }
    
    var biometricImage: String {
        switch biometricType {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .opticID:
            return "opticid"
        default:
            return "lock.fill"
        }
    }
    
    var biometricName: String {
        switch biometricType {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .opticID:
            return "Optic ID"
        default:
            return "Passcode"
        }
    }
}

// MARK: - Security Policy Manager

class SecurityPolicyManager: ObservableObject {
    @Published var requiresBiometricForWithdrawal = true
    @Published var requiresBiometricForStatements = false
    @Published var requires2FAForWithdrawal = true
    @Published var requires2FAForAdminActions = true
    @Published var sessionTimeout: TimeInterval = 300 // 5 minutes
    @Published var maxLoginAttempts = 5
    @Published var isJailbroken = false
    
    private let keychainManager = KeychainManager.shared
    
    init() {
        checkDeviceSecurity()
        loadPolicies()
    }
    
    private func checkDeviceSecurity() {
        isJailbroken = SecurityManager.isJailbroken()
        
        if isJailbroken {
            // Log security event
            logSecurityEvent(type: .jailbreakDetected)
        }
    }
    
    func loadPolicies() {
        // Load from keychain or defaults
        if let data = try? keychainManager.retrieve("security_policies"),
           let policies = try? JSONDecoder().decode(SecurityPolicies.self, from: Data(data.utf8)) {
            self.requiresBiometricForWithdrawal = policies.requiresBiometricForWithdrawal
            self.requiresBiometricForStatements = policies.requiresBiometricForStatements
            self.requires2FAForWithdrawal = policies.requires2FAForWithdrawal
            self.requires2FAForAdminActions = policies.requires2FAForAdminActions
            self.sessionTimeout = policies.sessionTimeout
            self.maxLoginAttempts = policies.maxLoginAttempts
        }
    }
    
    func savePolicies() {
        let policies = SecurityPolicies(
            requiresBiometricForWithdrawal: requiresBiometricForWithdrawal,
            requiresBiometricForStatements: requiresBiometricForStatements,
            requires2FAForWithdrawal: requires2FAForWithdrawal,
            requires2FAForAdminActions: requires2FAForAdminActions,
            sessionTimeout: sessionTimeout,
            maxLoginAttempts: maxLoginAttempts
        )
        
        if let data = try? JSONEncoder().encode(policies),
           let string = String(data: data, encoding: .utf8) {
            try? keychainManager.save(string, for: "security_policies")
        }
    }
    
    func validateSecurityRequirements(for action: SecurityAction) -> SecurityRequirements {
        switch action {
        case .viewPortfolio:
            return SecurityRequirements(requiresBiometric: false, requires2FA: false)
        case .viewStatement:
            return SecurityRequirements(requiresBiometric: requiresBiometricForStatements, requires2FA: false)
        case .submitWithdrawal:
            return SecurityRequirements(requiresBiometric: requiresBiometricForWithdrawal, requires2FA: requires2FAForWithdrawal)
        case .approveWithdrawal:
            return SecurityRequirements(requiresBiometric: true, requires2FA: requires2FAForAdminActions)
        case .modifyYieldSettings:
            return SecurityRequirements(requiresBiometric: true, requires2FA: requires2FAForAdminActions)
        }
    }
    
    private func logSecurityEvent(type: SecurityEventType, metadata: [String: Any]? = nil) {
        // Log to analytics/monitoring
        print("🔒 Security Event: \(type)")
        
        // In production, send to monitoring service
        #if !DEBUG
        // Analytics.track(event: "security_event", properties: ["type": type.rawValue, "metadata": metadata])
        #endif
    }
}

// MARK: - Supporting Types

struct SecurityPolicies: Codable {
    let requiresBiometricForWithdrawal: Bool
    let requiresBiometricForStatements: Bool
    let requires2FAForWithdrawal: Bool
    let requires2FAForAdminActions: Bool
    let sessionTimeout: TimeInterval
    let maxLoginAttempts: Int
}

enum SecurityAction {
    case viewPortfolio
    case viewStatement
    case submitWithdrawal
    case approveWithdrawal
    case modifyYieldSettings
}

struct SecurityRequirements {
    let requiresBiometric: Bool
    let requires2FA: Bool
}

enum SecurityEventType: String {
    case jailbreakDetected = "jailbreak_detected"
    case biometricAuthFailed = "biometric_auth_failed"
    case twoFactorFailed = "2fa_failed"
    case sessionExpired = "session_expired"
    case maxAttemptsReached = "max_attempts_reached"
    case certificatePinningFailed = "certificate_pinning_failed"
}

// MARK: - Base32 Encoding Extension

extension Data {
    init?(base32Encoded string: String) {
        let base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        let cleanedString = string.uppercased().replacingOccurrences(of: "=", with: "")
        
        var bits = ""
        for char in cleanedString {
            guard let index = base32Alphabet.firstIndex(of: char) else { return nil }
            let value = base32Alphabet.distance(from: base32Alphabet.startIndex, to: index)
            bits += String(value, radix: 2).padLeft(toLength: 5, withPad: "0")
        }
        
        var bytes = [UInt8]()
        for i in stride(from: 0, to: bits.count - 7, by: 8) {
            let startIndex = bits.index(bits.startIndex, offsetBy: i)
            let endIndex = bits.index(startIndex, offsetBy: 8)
            let byteString = String(bits[startIndex..<endIndex])
            guard let byte = UInt8(byteString, radix: 2) else { return nil }
            bytes.append(byte)
        }
        
        self.init(bytes)
    }
    
    func base32EncodedString() -> String {
        let base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        var result = ""
        var bits = ""
        
        for byte in self {
            bits += String(byte, radix: 2).padLeft(toLength: 8, withPad: "0")
        }
        
        for i in stride(from: 0, to: bits.count, by: 5) {
            let startIndex = bits.index(bits.startIndex, offsetBy: i)
            let endIndex = min(bits.index(startIndex, offsetBy: 5), bits.endIndex)
            let chunk = String(bits[startIndex..<endIndex]).padRight(toLength: 5, withPad: "0")
            
            guard let value = Int(chunk, radix: 2) else { continue }
            let index = base32Alphabet.index(base32Alphabet.startIndex, offsetBy: value)
            result.append(base32Alphabet[index])
        }
        
        // Add padding
        while result.count % 8 != 0 {
            result.append("=")
        }
        
        return result
    }
}

extension String {
    func padLeft(toLength: Int, withPad: String) -> String {
        String(repeating: withPad, count: max(0, toLength - count)) + self
    }
    
    func padRight(toLength: Int, withPad: String) -> String {
        self + String(repeating: withPad, count: max(0, toLength - count))
    }
}
