//
//  SecurityManager.swift
//  IndigoInvestor
//
//  Manages app security including SSL pinning, jailbreak detection, and secure storage
//

import Foundation
import CryptoKit
import LocalAuthentication
import Security
import UIKit

class SecurityManager: ObservableObject {
    static let shared = SecurityManager()
    
    // MARK: - Published Properties
    @Published var isDeviceSecure = true
    @Published var isJailbroken = false
    @Published var sessionExpirationTime: Date?
    
    // MARK: - Private Properties
    private let keychainService = "com.indigoyield.investor"
    private var sessionTimer: Timer?
    private let sessionTimeout: TimeInterval = 900 // 15 minutes
    
    // SSL Pinning certificates
    private let pinnedCertificates: [String] = [
        // Add your production certificate hashes here
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
    ]
    
    // MARK: - Initialization
    
    private init() {
        performSecurityChecks()
        setupSessionManagement()
    }
    
    // MARK: - Security Checks
    
    private func performSecurityChecks() {
        isJailbroken = checkJailbreak()
        isDeviceSecure = !isJailbroken && hasPasscode()
        
        if isJailbroken {
            showSecurityAlert()
        }
    }
    
    private func checkJailbreak() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        
        // Check for common jailbreak files
        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/usr/bin/ssh",
            "/usr/libexec/sftp-server",
            "/Applications/blackra1n.app",
            "/Applications/IntelliScreen.app",
            "/Applications/SBSettings.app"
        ]
        
        for path in jailbreakPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }
        
        // Check if app can write outside sandbox
        let testString = "Jailbreak test"
        do {
            try testString.write(
                toFile: "/private/test_jb.txt",
                atomically: true,
                encoding: .utf8
            )
            try FileManager.default.removeItem(atPath: "/private/test_jb.txt")
            return true
        } catch {
            // Expected behavior on non-jailbroken device
        }
        
        // Check for suspicious URL schemes
        if UIApplication.shared.canOpenURL(URL(string: "cydia://")!) {
            return true
        }
        
        // Check for modified system files
        let systemManager = FileManager.default
        do {
            let systemAttributes = try systemManager.attributesOfFileSystem(
                forPath: "/"
            )
            if let systemSize = systemAttributes[.systemSize] as? NSNumber {
                // Suspicious if system partition is too large
                if systemSize.int64Value > 4_000_000_000 {
                    return true
                }
            }
        } catch {
            // Ignore errors
        }
        
        return false
        #endif
    }
    
    private func hasPasscode() -> Bool {
        let context = LAContext()
        var error: NSError?
        
        // Check if device has passcode/biometric set up
        return context.canEvaluatePolicy(
            .deviceOwnerAuthentication,
            error: &error
        )
    }
    
    private func showSecurityAlert() {
        DispatchQueue.main.async {
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first {
                let alert = UIAlertController(
                    title: "Security Warning",
                    message: "This device appears to be jailbroken. For your security, some features may be limited.",
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "OK", style: .default))
                window.rootViewController?.present(alert, animated: true)
            }
        }
    }
    
    // MARK: - SSL Pinning
    
    func validateServerTrust(_ serverTrust: SecTrust, for domain: String) -> Bool {
        // Set policies
        let policies = [SecPolicyCreateSSL(true, domain as CFString)]
        SecTrustSetPolicies(serverTrust, policies as CFArray)
        
        // Evaluate trust
        var error: CFError?
        let isValid = SecTrustEvaluateWithError(serverTrust, &error)
        
        guard isValid else {
            print("Server trust evaluation failed: \(error?.localizedDescription ?? "Unknown error")")
            return false
        }
        
        // Get server certificate
        guard let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            return false
        }
        
        // Get certificate data and create hash
        let serverCertData = SecCertificateCopyData(serverCertificate) as Data
        let serverCertHash = SHA256.hash(data: serverCertData)
        let serverHashString = "sha256/" + Data(serverCertHash).base64EncodedString()
        
        // Check against pinned certificates
        let isPinned = pinnedCertificates.contains(serverHashString)
        
        if !isPinned {
            print("Certificate pinning failed. Server hash: \(serverHashString)")
        }
        
        return isPinned
    }
    
    // MARK: - Keychain Management
    
    func saveToKeychain(key: String, value: Data) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: value,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        // Delete existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func loadFromKeychain(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess {
            return result as? Data
        }
        
        return nil
    }
    
    func deleteFromKeychain(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
    
    func clearKeychain() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService
        ]
        
        SecItemDelete(query as CFDictionary)
    }
    
    // MARK: - Secure String Storage
    
    func saveSecureString(_ string: String, for key: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return saveToKeychain(key: key, value: data)
    }
    
    func loadSecureString(for key: String) -> String? {
        guard let data = loadFromKeychain(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    // MARK: - Session Management
    
    private func setupSessionManagement() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }
    
    @objc private func applicationDidBecomeActive() {
        startSessionTimer()
    }
    
    @objc private func applicationWillResignActive() {
        stopSessionTimer()
        sessionExpirationTime = Date().addingTimeInterval(60) // 1 minute grace period
    }
    
    func startSessionTimer() {
        stopSessionTimer()
        
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.checkSessionExpiration()
        }
        
        sessionExpirationTime = Date().addingTimeInterval(sessionTimeout)
    }
    
    func stopSessionTimer() {
        sessionTimer?.invalidate()
        sessionTimer = nil
    }
    
    func extendSession() {
        sessionExpirationTime = Date().addingTimeInterval(sessionTimeout)
    }
    
    private func checkSessionExpiration() {
        guard let expirationTime = sessionExpirationTime else { return }
        
        if Date() > expirationTime {
            handleSessionExpiration()
        }
    }
    
    private func handleSessionExpiration() {
        stopSessionTimer()
        
        // Post notification for app to handle
        NotificationCenter.default.post(
            name: .sessionExpired,
            object: nil
        )
    }
    
    // MARK: - Anti-Tampering
    
    func validateAppIntegrity() -> Bool {
        // Check bundle identifier
        guard let bundleID = Bundle.main.bundleIdentifier,
              bundleID == "com.indigoyield.investor" else {
            return false
        }
        
        // Check code signature (simplified)
        guard let executablePath = Bundle.main.executablePath else {
            return false
        }
        
        // Verify executable hasn't been modified
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: executablePath)
            
            // Check file size is within expected range
            if let fileSize = attributes[.size] as? Int64 {
                // Adjust these values based on your actual app size
                let minSize: Int64 = 1_000_000  // 1 MB
                let maxSize: Int64 = 100_000_000 // 100 MB
                
                if fileSize < minSize || fileSize > maxSize {
                    return false
                }
            }
        } catch {
            return false
        }
        
        return true
    }
    
    // MARK: - Screenshot Prevention
    
    func preventScreenshots(_ prevent: Bool) {
        DispatchQueue.main.async {
            if prevent {
                // Add secure text field to prevent screenshots
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let window = windowScene.windows.first {
                    
                    let secureField = UITextField()
                    secureField.isSecureTextEntry = true
                    secureField.tag = 99999
                    window.addSubview(secureField)
                    window.layer.superlayer?.addSublayer(secureField.layer)
                    secureField.layer.sublayers?.first?.addSublayer(window.layer)
                }
            } else {
                // Remove secure field
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let window = windowScene.windows.first {
                    window.viewWithTag(99999)?.removeFromSuperview()
                }
            }
        }
    }
    
    // MARK: - Biometric Authentication
    
    func authenticateWithBiometrics(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, error)
            return
        }
        
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        ) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let sessionExpired = Notification.Name("sessionExpired")
}

// MARK: - URLSession Delegate for SSL Pinning

class PinnedURLSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        let isValid = SecurityManager.shared.validateServerTrust(
            serverTrust,
            for: challenge.protectionSpace.host
        )
        
        if isValid {
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
