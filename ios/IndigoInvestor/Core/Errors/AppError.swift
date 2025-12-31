//
//  AppError.swift
//  IndigoInvestor
//
//  Unified error handling for the application
//

import Foundation

enum AppError: LocalizedError {
    // MARK: - Authentication Errors
    case authenticationFailed(reason: String)
    case sessionExpired
    case invalidCredentials
    case biometricsUnavailable
    case biometricsFailed
    case noStoredCredentials
    case emailNotVerified
    case twoFactorRequired

    // MARK: - Network Errors
    case networkUnavailable
    case requestFailed(statusCode: Int)
    case invalidResponse
    case timeout
    case serverError(message: String)

    // MARK: - Data Errors
    case dataCorrupted
    case decodingFailed(underlyingError: Error)
    case encodingFailed(underlyingError: Error)
    case invalidData(reason: String)

    // MARK: - Security Errors
    case certificatePinningFailed
    case jailbreakDetected
    case tamperingDetected
    case securityCheckFailed(reason: String)

    // MARK: - Business Logic Errors
    case insufficientFunds
    case invalidAmount
    case withdrawalLimitExceeded
    case portfolioNotFound
    case transactionFailed(reason: String)
    case documentUploadFailed

    // MARK: - Permission Errors
    case unauthorized
    case forbidden
    case resourceNotFound

    // MARK: - General Errors
    case unknown(underlyingError: Error?)
    case configurationError(message: String)

    var errorDescription: String? {
        switch self {
        // Authentication
        case .authenticationFailed(let reason):
            return "Authentication failed: \(reason)"
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .invalidCredentials:
            return "Invalid email or password"
        case .biometricsUnavailable:
            return "Biometric authentication is not available on this device"
        case .biometricsFailed:
            return "Biometric authentication failed. Please try again."
        case .noStoredCredentials:
            return "No stored credentials found. Please sign in with your email and password."
        case .emailNotVerified:
            return "Please verify your email address before signing in"
        case .twoFactorRequired:
            return "Two-factor authentication is required"

        // Network
        case .networkUnavailable:
            return "No internet connection. Please check your network settings."
        case .requestFailed(let code):
            return "Request failed with status code \(code)"
        case .invalidResponse:
            return "Received invalid response from server"
        case .timeout:
            return "Request timed out. Please try again."
        case .serverError(let message):
            return "Server error: \(message)"

        // Data
        case .dataCorrupted:
            return "Data is corrupted or invalid"
        case .decodingFailed(let error):
            return "Failed to decode data: \(error.localizedDescription)"
        case .encodingFailed(let error):
            return "Failed to encode data: \(error.localizedDescription)"
        case .invalidData(let reason):
            return "Invalid data: \(reason)"

        // Security
        case .certificatePinningFailed:
            return "Security validation failed. Please check your connection."
        case .jailbreakDetected:
            return "This app cannot run on jailbroken devices for your security"
        case .tamperingDetected:
            return "App integrity check failed"
        case .securityCheckFailed(let reason):
            return "Security check failed: \(reason)"

        // Business Logic
        case .insufficientFunds:
            return "Insufficient funds for this transaction"
        case .invalidAmount:
            return "Invalid amount entered"
        case .withdrawalLimitExceeded:
            return "Withdrawal limit exceeded"
        case .portfolioNotFound:
            return "Portfolio not found"
        case .transactionFailed(let reason):
            return "Transaction failed: \(reason)"
        case .documentUploadFailed:
            return "Failed to upload document. Please try again."

        // Permission
        case .unauthorized:
            return "Unauthorized. Please sign in again."
        case .forbidden:
            return "You don't have permission to perform this action"
        case .resourceNotFound:
            return "Resource not found"

        // General
        case .unknown(let error):
            if let error = error {
                return "An error occurred: \(error.localizedDescription)"
            }
            return "An unknown error occurred"
        case .configurationError(let message):
            return "Configuration error: \(message)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .sessionExpired:
            return "Please sign in again to continue."
        case .networkUnavailable:
            return "Check your WiFi or cellular connection and try again."
        case .timeout:
            return "Try again or check your connection."
        case .jailbreakDetected:
            return "Please use a non-jailbroken device for your security."
        case .invalidCredentials:
            return "Check your email and password and try again."
        case .biometricsFailed:
            return "Use your password to sign in instead."
        default:
            return nil
        }
    }

    var isRetryable: Bool {
        switch self {
        case .networkUnavailable, .timeout, .requestFailed, .serverError:
            return true
        default:
            return false
        }
    }

    var shouldLogOut: Bool {
        switch self {
        case .sessionExpired, .unauthorized:
            return true
        default:
            return false
        }
    }
}

// MARK: - Error Extension

extension Error {
    var asAppError: AppError {
        // If already an AppError, return it
        if let appError = self as? AppError {
            return appError
        }

        // Map URLError to AppError
        if let urlError = self as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost:
                return .networkUnavailable
            case .timedOut:
                return .timeout
            case .cannotFindHost, .cannotConnectToHost:
                return .serverError(message: "Cannot connect to server")
            default:
                return .unknown(underlyingError: urlError)
            }
        }

        // Map DecodingError to AppError
        if let decodingError = self as? DecodingError {
            return .decodingFailed(underlyingError: decodingError)
        }

        // Map EncodingError to AppError
        if let encodingError = self as? EncodingError {
            return .encodingFailed(underlyingError: encodingError)
        }

        // Default
        return .unknown(underlyingError: self)
    }
}

// MARK: - Auth Error Enum (Legacy Support)

enum AuthError: LocalizedError {
    case biometricsNotAvailable
    case biometricsFailed
    case noStoredCredentials
    case sessionExpired
    case invalidCredentials

    var errorDescription: String? {
        asAppError.errorDescription
    }

    var asAppError: AppError {
        switch self {
        case .biometricsNotAvailable:
            return .biometricsUnavailable
        case .biometricsFailed:
            return .biometricsFailed
        case .noStoredCredentials:
            return .noStoredCredentials
        case .sessionExpired:
            return .sessionExpired
        case .invalidCredentials:
            return .invalidCredentials
        }
    }
}
