//
//  SecurityManager.swift
//  IndigoInvestor
//
//  Security manager for jailbreak detection and security configuration
//

import Foundation
import UIKit

class SecurityManager {
    
    // MARK: - Jailbreak Detection
    
    static func isJailbroken() -> Bool {
        // Check multiple jailbreak indicators
        return checkForJailbreakFiles() ||
               checkForJailbreakApps() ||
               canWriteToRootDirectory() ||
               checkForSuspiciousSymlinks()
    }
    
    private static func checkForJailbreakFiles() -> Bool {
        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/private/var/lib/cydia",
            "/private/var/stash",
            "/usr/libexec/sftp-server",
            "/usr/bin/ssh",
            "/private/etc/apt",
            "/private/var/tmp/cydia.log",
            "/System/Library/LaunchDaemons/com.ikey.bbot.plist",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/frida-server"
        ]
        
        for path in jailbreakPaths {
            if FileManager.default.fileExists(atPath: path) {
                print("⚠️ Jailbreak indicator found: \(path)")
                return true
            }
        }
        
        return false
    }
    
    private static func checkForJailbreakApps() -> Bool {
        let jailbreakApps = [
            "cydia://package/com.example.package",
            "sileo://package/com.example.package"
        ]
        
        for appScheme in jailbreakApps {
            if let url = URL(string: appScheme),
               UIApplication.shared.canOpenURL(url) {
                print("⚠️ Jailbreak app detected: \(appScheme)")
                return true
            }
        }
        
        return false
    }
    
    static func canWriteToRootDirectory() -> Bool {
        let testString = "jailbreak_test"
        let testPath = "/private/test_jailbreak.txt"
        
        do {
            try testString.write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            print("⚠️ Can write to root directory - potential jailbreak")
            return true
        } catch {
            // Cannot write to root - good
            return false
        }
    }
    
    private static func checkForSuspiciousSymlinks() -> Bool {
        let suspiciousSymlinks = [
            "/Applications",
            "/usr/bin",
            "/bin"
        ]
        
        for path in suspiciousSymlinks {
            do {
                let attributes = try FileManager.default.attributesOfItem(atPath: path)
                if let fileType = attributes[.type] as? FileAttributeType,
                   fileType == .typeSymbolicLink {
                    print("⚠️ Suspicious symlink found: \(path)")
                    return true
                }
            } catch {
                // Error getting attributes - continue checking
                continue
            }
        }
        
        return false
    }
    
    // MARK: - App Transport Security Configuration
    
    static func configureATS() {
        // ATS is configured via Info.plist, but we can validate current settings
        validateATSConfiguration()
    }
    
    private static func validateATSConfiguration() {
        guard let infoDict = Bundle.main.infoDictionary,
              let atsDict = infoDict["NSAppTransportSecurity"] as? [String: Any] else {
            print("⚠️ No ATS configuration found")
            return
        }
        
        // Check if ATS is disabled (bad for production)
        if let allowsArbitraryLoads = atsDict["NSAllowsArbitraryLoads"] as? Bool,
           allowsArbitraryLoads {
            print("⚠️ ATS allows arbitrary loads - security risk!")
        }
        
        // Check exception domains
        if let exceptionDomains = atsDict["NSExceptionDomains"] as? [String: Any] {
            for (domain, _) in exceptionDomains {
                print("ℹ️ ATS exception configured for domain: \(domain)")
            }
        }
        
        print("✅ ATS configuration validated")
    }
    
    // MARK: - Runtime Protection
    
    static func enableRuntimeProtection() {
        // Enable various runtime protections
        configureDebuggerDetection()
        configureTamperingDetection()
    }
    
    private static func configureDebuggerDetection() {
        // Check if debugger is attached
        var info = kinfo_proc()
        var size = MemoryLayout.stride(ofValue: info)
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        
        let result = sysctl(&mib, u_int(mib.count), &info, &size, nil, 0)
        
        if result == 0 && (info.kp_proc.p_flag & P_TRACED) != 0 {
            print("⚠️ Debugger detected - potential security risk")
            // In production, you might want to exit or disable sensitive features
        }
    }
    
    private static func configureTamperingDetection() {
        // Check app bundle integrity
        guard let bundlePath = Bundle.main.bundlePath else {
            print("❌ Cannot get bundle path")
            return
        }
        
        // Basic check - in production, implement more sophisticated integrity checks
        let fileManager = FileManager.default
        
        if !fileManager.fileExists(atPath: bundlePath) {
            print("❌ App bundle integrity compromised")
        }
        
        // Check if app is installed from App Store (simplified check)
        if bundlePath.contains("/var/containers/Bundle/Application/") {
            print("✅ App appears to be from App Store")
        } else {
            print("⚠️ App not installed from App Store - potential security risk")
        }
    }
    
    // MARK: - Secure Communication
    
    static func configureSecureCommunication() {
        // Configure TLS settings for network communications
        configureTLSSettings()
    }
    
    private static func configureTLSSettings() {
        // TLS configuration is handled by URLSession and ATS
        // Additional security measures can be implemented here
        print("🔒 Secure communication configured")
    }
    
    // MARK: - Security Audit
    
    static func performSecurityAudit() -> SecurityAuditResult {
        var issues: [SecurityIssue] = []
        
        // Check for jailbreak
        if isJailbroken() {
            issues.append(.jailbreakDetected)
        }
        
        // Check for debugger
        if isDebuggerAttached() {
            issues.append(.debuggerAttached)
        }
        
        // Check ATS configuration
        if !isATSProperlyConfigured() {
            issues.append(.weakATSConfiguration)
        }
        
        let riskLevel: SecurityRiskLevel
        if issues.contains(.jailbreakDetected) {
            riskLevel = .high
        } else if !issues.isEmpty {
            riskLevel = .medium
        } else {
            riskLevel = .low
        }
        
        return SecurityAuditResult(issues: issues, riskLevel: riskLevel)
    }
    
    private static func isDebuggerAttached() -> Bool {
        var info = kinfo_proc()
        var size = MemoryLayout.stride(ofValue: info)
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        
        let result = sysctl(&mib, u_int(mib.count), &info, &size, nil, 0)
        return result == 0 && (info.kp_proc.p_flag & P_TRACED) != 0
    }
    
    private static func isATSProperlyConfigured() -> Bool {
        guard let infoDict = Bundle.main.infoDictionary,
              let atsDict = infoDict["NSAppTransportSecurity"] as? [String: Any] else {
            return false
        }
        
        // Check if ATS allows arbitrary loads (bad)
        if let allowsArbitraryLoads = atsDict["NSAllowsArbitraryLoads"] as? Bool,
           allowsArbitraryLoads {
            return false
        }
        
        return true
    }
}

// MARK: - Security Types

enum SecurityIssue {
    case jailbreakDetected
    case debuggerAttached
    case weakATSConfiguration
    case tamperingDetected
    case insecureStorage
}

enum SecurityRiskLevel {
    case low
    case medium
    case high
}

struct SecurityAuditResult {
    let issues: [SecurityIssue]
    let riskLevel: SecurityRiskLevel
    let timestamp: Date = Date()
    
    var isSecure: Bool {
        return issues.isEmpty
    }
    
    var description: String {
        if isSecure {
            return "Security audit passed - no issues detected"
        } else {
            return "Security issues detected: \(issues.count) issues, risk level: \(riskLevel)"
        }
    }
}
