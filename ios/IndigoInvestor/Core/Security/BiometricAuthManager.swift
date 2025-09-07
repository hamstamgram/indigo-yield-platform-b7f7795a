//
//  BiometricAuthManager.swift
//  IndigoInvestor
//
//  Manages biometric authentication (Face ID / Touch ID)
//

import LocalAuthentication
import SwiftUI
import Combine

class BiometricAuthManager: ObservableObject {
    enum BiometricType {
        case none
        case touchID
        case faceID
        case opticID
    }
    
    enum BiometricError: LocalizedError {
        case notAvailable
        case notEnrolled
        case authenticationFailed
        case userCancelled
        case passcodeNotSet
        case systemCancel
        
        var errorDescription: String? {
            switch self {
            case .notAvailable:
                return "Biometric authentication is not available on this device"
            case .notEnrolled:
                return "No biometric data is enrolled. Please set up Face ID or Touch ID in Settings"
            case .authenticationFailed:
                return "Biometric authentication failed. Please try again"
            case .userCancelled:
                return "Authentication was cancelled"
            case .passcodeNotSet:
                return "Device passcode is not set"
            case .systemCancel:
                return "Authentication was cancelled by the system"
            }
        }
    }
    
    @Published var isAuthenticated = false
    @Published var biometricType: BiometricType = .none
    @Published var isAvailable = false
    
    private let context = LAContext()
    private let policy: LAPolicy = .deviceOwnerAuthenticationWithBiometrics
    
    init() {
        checkBiometricAvailability()
    }
    
    func checkBiometricAvailability() {
        var error: NSError?
        
        guard context.canEvaluatePolicy(policy, error: &error) else {
            print("Biometric authentication not available: \(error?.localizedDescription ?? "Unknown error")")
            isAvailable = false
            biometricType = .none
            return
        }
        
        isAvailable = true
        
        switch context.biometryType {
        case .faceID:
            biometricType = .faceID
        case .touchID:
            biometricType = .touchID
        case .opticID:
            if #available(iOS 17.0, *) {
                biometricType = .opticID
            } else {
                biometricType = .none
            }
        case .none:
            biometricType = .none
        @unknown default:
            biometricType = .none
        }
    }
    
    func authenticate(reason: String = "Access your portfolio") async throws {
        // Reset context to ensure fresh evaluation
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"
        context.localizedFallbackTitle = "Use Passcode"
        
        // Set timeout for authentication
        context.touchIDAuthenticationAllowableReuseDuration = 60 // 1 minute
        
        var error: NSError?
        
        guard context.canEvaluatePolicy(policy, error: &error) else {
            throw mapLAError(error)
        }
        
        do {
            let success = try await context.evaluatePolicy(
                policy,
                localizedReason: reason
            )
            
            await MainActor.run {
                self.isAuthenticated = success
            }
            
            if !success {
                throw BiometricError.authenticationFailed
            }
        } catch let error as LAError {
            throw mapLAError(error as NSError)
        } catch {
            throw BiometricError.authenticationFailed
        }
    }
    
    func authenticateWithPasscode(reason: String = "Access your portfolio") async throws {
        let context = LAContext()
        let policy: LAPolicy = .deviceOwnerAuthentication // This allows passcode fallback
        
        do {
            let success = try await context.evaluatePolicy(
                policy,
                localizedReason: reason
            )
            
            await MainActor.run {
                self.isAuthenticated = success
            }
            
            if !success {
                throw BiometricError.authenticationFailed
            }
        } catch let error as LAError {
            throw mapLAError(error as NSError)
        } catch {
            throw BiometricError.authenticationFailed
        }
    }
    
    private func mapLAError(_ error: NSError?) -> BiometricError {
        guard let error = error else {
            return .notAvailable
        }
        
        switch error.code {
        case LAError.biometryNotAvailable.rawValue:
            return .notAvailable
        case LAError.biometryNotEnrolled.rawValue:
            return .notEnrolled
        case LAError.authenticationFailed.rawValue:
            return .authenticationFailed
        case LAError.userCancel.rawValue:
            return .userCancelled
        case LAError.passcodeNotSet.rawValue:
            return .passcodeNotSet
        case LAError.systemCancel.rawValue:
            return .systemCancel
        default:
            return .authenticationFailed
        }
    }
    
    func reset() {
        isAuthenticated = false
    }
    
    var biometricImage: String {
        switch biometricType {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .opticID:
            return "opticid"
        case .none:
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
        case .none:
            return "Passcode"
        }
    }
}
