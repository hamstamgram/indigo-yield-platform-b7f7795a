//
//  MockBiometricAuthManager.swift
//  IndigoInvestorTests
//
//  Mock implementation of BiometricAuthManager for testing
//

import Foundation
@testable import IndigoInvestor

class MockBiometricAuthManager {
    var isAvailable = true
    var mockAuthenticationSuccess = true
    var isAuthenticated = false

    func canUseBiometrics() -> Bool {
        return isAvailable
    }

    func authenticate(reason: String) async -> Bool {
        isAuthenticated = mockAuthenticationSuccess
        return mockAuthenticationSuccess
    }
}
