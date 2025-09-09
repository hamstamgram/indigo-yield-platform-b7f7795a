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
        // Read from Info.plist which is populated from xcconfig
        if let url = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
           !url.isEmpty {
            return url
        }
        
        #if DEBUG
        // Fallback for development
        return "http://127.0.0.1:54321"
        #else
        // Fallback for production
        return "https://uxpzrxsnxlptkamkkaae.supabase.co"
        #endif
    }
    
    var anonKey: String {
        // Read from Info.plist which is populated from xcconfig
        if let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
           !key.isEmpty {
            return key
        }
        
        #if DEBUG
        // Fallback for development - using the standard Supabase local anon key
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
        #else
        // Production key should be provided via xcconfig
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
