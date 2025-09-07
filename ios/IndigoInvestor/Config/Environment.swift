//
//  Environment.swift
//  IndigoInvestor
//
//  Environment configuration for the app
//

import Foundation

/// Environment configuration
enum Environment {
    
    // MARK: - Environment Types
    
    enum EnvironmentType {
        case development
        case staging
        case production
        
        var name: String {
            switch self {
            case .development: return "Development"
            case .staging: return "Staging"
            case .production: return "Production"
            }
        }
    }
    
    // MARK: - Current Environment
    
    #if DEBUG
    static let current: EnvironmentType = .development
    #else
    static let current: EnvironmentType = .production
    #endif
    
    // MARK: - Supabase Configuration
    
    struct Supabase {
        static var url: String {
            switch Environment.current {
            case .development, .staging:
                // Use development/staging Supabase project
                return ProcessInfo.processInfo.environment["SUPABASE_URL"] 
                    ?? "https://your-project-ref.supabase.co"
            case .production:
                // Use production Supabase project
                return ProcessInfo.processInfo.environment["SUPABASE_URL_PROD"] 
                    ?? "https://your-prod-project-ref.supabase.co"
            }
        }
        
        static var anonKey: String {
            switch Environment.current {
            case .development, .staging:
                return ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] 
                    ?? "your-anon-key-here"
            case .production:
                return ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY_PROD"] 
                    ?? "your-prod-anon-key-here"
            }
        }
        
        static var serviceRoleKey: String? {
            // Only for admin operations - should be stored securely
            return ProcessInfo.processInfo.environment["SUPABASE_SERVICE_KEY"]
        }
    }
    
    // MARK: - API Configuration
    
    struct API {
        static var baseURL: String {
            switch Environment.current {
            case .development:
                return "http://localhost:3000"
            case .staging:
                return "https://api-staging.indigo.com"
            case .production:
                return "https://api.indigo.com"
            }
        }
        
        static var timeout: TimeInterval = 30.0
        static var maxRetries: Int = 3
    }
    
    // MARK: - Feature Flags
    
    struct Features {
        static var enableBiometricAuth: Bool {
            return true
        }
        
        static var enablePushNotifications: Bool {
            switch Environment.current {
            case .development: return false
            case .staging, .production: return true
            }
        }
        
        static var enableAnalytics: Bool {
            switch Environment.current {
            case .development: return false
            case .staging, .production: return true
            }
        }
        
        static var enableCrashReporting: Bool {
            switch Environment.current {
            case .development: return false
            case .staging, .production: return true
            }
        }
        
        static var debugMenuEnabled: Bool {
            #if DEBUG
            return true
            #else
            return false
            #endif
        }
    }
    
    // MARK: - Security
    
    struct Security {
        static var sessionTimeout: TimeInterval = 15 * 60 // 15 minutes
        static var maxLoginAttempts: Int = 5
        static var lockoutDuration: TimeInterval = 30 * 60 // 30 minutes
        static var requirePinAfterBackground: Bool = true
        static var minPasswordLength: Int = 8
    }
    
    // MARK: - App Info
    
    struct App {
        static var version: String {
            Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        }
        
        static var buildNumber: String {
            Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        }
        
        static var bundleIdentifier: String {
            Bundle.main.bundleIdentifier ?? "com.indigo.investor"
        }
        
        static var displayName: String {
            Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "Indigo Investor"
        }
    }
    
    // MARK: - Logging
    
    struct Logging {
        static var isEnabled: Bool {
            #if DEBUG
            return true
            #else
            return false
            #endif
        }
        
        static var level: LogLevel {
            switch Environment.current {
            case .development: return .verbose
            case .staging: return .debug
            case .production: return .warning
            }
        }
        
        enum LogLevel: Int {
            case verbose = 0
            case debug = 1
            case info = 2
            case warning = 3
            case error = 4
            
            var emoji: String {
                switch self {
                case .verbose: return "💬"
                case .debug: return "🔍"
                case .info: return "ℹ️"
                case .warning: return "⚠️"
                case .error: return "❌"
                }
            }
        }
    }
    
    // MARK: - Cache Configuration
    
    struct Cache {
        static var portfolioRefreshInterval: TimeInterval = 60 // 1 minute
        static var transactionsCacheExpiry: TimeInterval = 300 // 5 minutes
        static var statementsCacheExpiry: TimeInterval = 3600 // 1 hour
        static var imageCacheMaxSize: Int = 100 * 1024 * 1024 // 100 MB
    }
    
    // MARK: - Network Configuration
    
    struct Network {
        static var reachabilityCheckInterval: TimeInterval = 10.0
        static var offlineRetryInterval: TimeInterval = 30.0
        static var maxConcurrentRequests: Int = 5
    }
    
    // MARK: - Helper Methods
    
    static func log(_ message: String, level: Logging.LogLevel = .debug, file: String = #file, function: String = #function, line: Int = #line) {
        guard Logging.isEnabled && level.rawValue >= Logging.level.rawValue else { return }
        
        let fileName = URL(fileURLWithPath: file).lastPathComponent
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        
        print("\(level.emoji) [\(timestamp)] [\(fileName):\(line)] \(function) - \(message)")
    }
}

// MARK: - Environment Variables Loader

extension Environment {
    /// Load environment variables from a .env file (for development)
    static func loadDotEnv() {
        #if DEBUG
        guard let path = Bundle.main.path(forResource: ".env", ofType: nil) else {
            log("No .env file found", level: .warning)
            return
        }
        
        do {
            let contents = try String(contentsOfFile: path, encoding: .utf8)
            let lines = contents.components(separatedBy: .newlines)
            
            for line in lines {
                let parts = line.components(separatedBy: "=")
                guard parts.count == 2,
                      let key = parts.first?.trimmingCharacters(in: .whitespaces),
                      let value = parts.last?.trimmingCharacters(in: .whitespaces),
                      !key.isEmpty else { continue }
                
                setenv(key, value, 1)
            }
            
            log("Loaded environment variables from .env", level: .info)
        } catch {
            log("Failed to load .env file: \(error)", level: .error)
        }
        #endif
    }
}
