//
//  SupabaseConfig.swift
//  IndigoInvestor
//
//  Supabase configuration management
//

import Foundation

struct SupabaseConfig {
    static let current = SupabaseConfig()
    
    var url: String {
        #if DEBUG
        // Development environment
        return ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://uxpzrxsnxlptkamkkaae.supabase.co"
        #else
        // Production environment
        return "https://uxpzrxsnxlptkamkkaae.supabase.co"
        #endif
    }
    
    var anonKey: String {
        #if DEBUG
        // Development environment - should be loaded from environment or secure config
        return ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? ""
        #else
        // Production environment - should be loaded from secure configuration
        return ""
        #endif
    }
    
    var jwtAudience: String {
        return "authenticated"
    }
    
    var realtimeURL: String {
        return url.replacingOccurrences(of: "https://", with: "wss://") + "/realtime/v1"
    }
    
    var storageURL: String {
        return "\(url)/storage/v1"
    }
    
    var authURL: String {
        return "\(url)/auth/v1"
    }
    
    var restURL: String {
        return "\(url)/rest/v1"
    }
    
    // Certificate pins for security
    var pinnedCertificates: [String] {
        return [
            // Add base64 encoded certificate pins here
        ]
    }
    
    // Allowed hosts for certificate pinning
    var pinnedHosts: [String] {
        return [
            "uxpzrxsnxlptkamkkaae.supabase.co",
            "supabase.co"
        ]
    }
}
