//
//  IndigoInvestorApp.swift
//  IndigoInvestor
//
//  Main application entry point for Indigo Yield Platform iOS app
//

import SwiftUI
import Supabase

@main
struct IndigoInvestorApp: App {
    @StateObject private var serviceLocator = ServiceLocator.shared
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var networkMonitor = NetworkMonitor()
    
    init() {
        configureApp()
    }
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(serviceLocator)
                .environmentObject(authViewModel)
                .environmentObject(networkMonitor)
                .onAppear {
                    Task {
                        await authViewModel.checkBiometricAvailability()
                        await authViewModel.restoreSession()
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                    Task {
                        await authViewModel.refreshSession()
                    }
                }
        }
    }
    
    private func configureApp() {
        // Configure Supabase
        configureSupabase()
        
        // Configure security
        configureSecurity()
        
        // Configure appearance
        configureAppearance()
        
        // Configure crash reporting
        configureCrashReporting()
    }
    
    private func configureSupabase() {
        let config = SupabaseConfig.current
        serviceLocator.configureSupabase(
            url: config.url,
            anonKey: config.anonKey
        )
    }
    
    private func configureSecurity() {
        // Certificate pinning will be configured later
        // CertificatePinningManager.shared.configure()
        
        // Jailbreak detection will be added later
        // if SecurityManager.isJailbroken() {
        //     print("⚠️ Warning: Device appears to be jailbroken")
        // }
    }
    
    private func configureAppearance() {
        // Set up app-wide appearance
        UINavigationBar.appearance().tintColor = UIColor(named: "Primary")
        UITabBar.appearance().tintColor = UIColor(named: "Primary")
    }
    
    private func configureCrashReporting() {
        #if !DEBUG
        // Configure crash reporting for production
        // CrashReporter.configure()
        #endif
    }
}
