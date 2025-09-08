//
//  ServiceLocatorSimplified.swift
//  IndigoInvestor
//
//  Simplified service locator for initial compilation
//

import Foundation
import Supabase
import KeychainAccess

class ServiceLocatorSimplified: ObservableObject {
    static let shared = ServiceLocatorSimplified()
    
    // Core services
    private(set) var supabaseClient: SupabaseClient?
    private(set) var keychainManager: KeychainManager!
    private(set) var biometricManager: BiometricAuthManager!
    
    private init() {
        setupServices()
    }
    
    func configureSupabase(url: String, anonKey: String) {
        guard let url = URL(string: url) else {
            fatalError("Invalid Supabase URL")
        }
        
        supabaseClient = SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey
        )
    }
    
    private func setupServices() {
        keychainManager = KeychainManager.shared
        biometricManager = BiometricAuthManager()
    }
}
