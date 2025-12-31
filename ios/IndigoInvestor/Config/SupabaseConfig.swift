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
        guard let url = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              !url.isEmpty,
              !url.contains("YOUR_") else {
            fatalError("❌ SUPABASE_URL not configured. Check Config/Secrets.xcconfig and ensure it's properly set.")
        }
        return url
    }

    var anonKey: String {
        // Read from Info.plist which is populated from xcconfig
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !key.isEmpty,
              !key.contains("YOUR_") else {
            fatalError("❌ SUPABASE_ANON_KEY not configured. Check Config/Secrets.xcconfig and ensure it's properly set.")
        }
        return key
    }

    var isConfigurationValid: Bool {
        let url = self.url
        let key = self.anonKey

        guard !url.isEmpty, !key.isEmpty,
              URL(string: url) != nil,
              key.contains(".") else { // Basic JWT format check
            print("❌ Invalid Supabase configuration")
            return false
        }

        print("✅ Supabase configuration is valid")
        return true
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
            "nkfimvovosdehmyyjubn.supabase.co",
            "supabase.co"
        ]
    }
}
