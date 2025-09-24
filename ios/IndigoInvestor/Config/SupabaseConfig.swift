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
            print("✅ Using Supabase URL from Info.plist: \(url)")
            return url
        }

        // Use production URL for both debug and release
        let productionURL = "https://nkfimvovosdehmyyjubn.supabase.co"
        print("⚠️ Using hardcoded production URL: \(productionURL)")
        return productionURL
    }

    var anonKey: String {
        // Read from Info.plist which is populated from xcconfig
        if let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
           !key.isEmpty {
            print("✅ Using Supabase anon key from Info.plist")
            return key
        }

        // Use production anon key for both debug and release
        print("⚠️ Using hardcoded production anon key")
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
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
