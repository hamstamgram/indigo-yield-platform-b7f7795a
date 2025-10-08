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
        // Configure certificate pinning
        CertificatePinningManager.shared.configure()

        #if DEBUG
        // Allow certificate pinning bypass in debug builds if needed
        if ProcessInfo.processInfo.environment["DISABLE_CERT_PINNING"] == "1" {
            print("⚠️ Certificate pinning DISABLED for debugging")
        }
        #endif

        #if !DEBUG
        // Production security checks
        if SecurityManager.isJailbroken() {
            print("⚠️ WARNING: Device appears to be jailbroken")
            // Consider showing warning dialog or disabling sensitive features
        }

        // Perform comprehensive security audit
        let auditResult = SecurityManager.performSecurityAudit()
        print("🔒 Security Audit: \(auditResult.description)")

        if auditResult.riskLevel == .high {
            print("❌ HIGH SECURITY RISK DETECTED")
            // Consider blocking app usage or showing warning
        }

        // Enable runtime protection
        SecurityManager.enableRuntimeProtection()
        #endif
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
