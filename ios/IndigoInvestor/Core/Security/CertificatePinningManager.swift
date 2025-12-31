//
//  CertificatePinningManager.swift
//  IndigoInvestor
//
//  Certificate pinning manager for preventing MITM attacks
//

import Foundation
import Network

class CertificatePinningManager: NSObject {
    static let shared = CertificatePinningManager()
    
    private var pinnedCertificates: [String: Data] = [:]
    private var pinnedPublicKeys: [String: SecKey] = [:]
    
    private override init() {
        super.init()
    }
    
    func configure() {
        loadPinnedCertificates()
        print("🔒 Certificate pinning manager configured")
    }
    
    private func loadPinnedCertificates() {
        // Load Supabase certificate
        guard let certPath = Bundle.main.path(forResource: "supabase", ofType: "cer") else {
            print("⚠️ WARNING: Certificate file not found. Certificate pinning DISABLED!")
            print("⚠️ Run: cd ios/Scripts && ./extract_certificate.sh to generate certificate")
            return
        }

        guard let certData = try? Data(contentsOf: URL(fileURLWithPath: certPath)) else {
            print("❌ Failed to load certificate data")
            return
        }

        // Store certificate data for both domain variations
        pinnedCertificates["nkfimvovosdehmyyjubn.supabase.co"] = certData
        pinnedCertificates["supabase.co"] = certData

        // Extract and store public key
        if let publicKey = extractPublicKey(from: certData) {
            pinnedPublicKeys["nkfimvovosdehmyyjubn.supabase.co"] = publicKey
            pinnedPublicKeys["supabase.co"] = publicKey
            print("✅ Certificate pinning configured for Supabase")
            print("✅ Pinned domains: nkfimvovosdehmyyjubn.supabase.co, supabase.co")
        } else {
            print("❌ Failed to extract public key from certificate")
        }
    }
    private func extractPublicKey(from certificateData: Data) -> SecKey? {
        guard let certificate = SecCertificateCreateWithData(nil, certificateData) else {
            print("❌ Failed to create certificate from data")
            return nil
        }
        
        var trust: SecTrust?
        let policy = SecPolicyCreateBasicX509()
        
        guard SecTrustCreateWithCertificates(certificate, policy, &trust) == errSecSuccess,
              let trust = trust else {
            print("❌ Failed to create trust object")
            return nil
        }
        
        var result: SecTrustResultType = .invalid
        guard SecTrustEvaluate(trust, &result) == errSecSuccess else {
            print("❌ Failed to evaluate trust")
            return nil
        }
        
        return SecTrustCopyPublicKey(trust)
    }
    
    func validateCertificate(for host: String, certificate: SecCertificate) -> Bool {
        // Get certificate data
        let certificateData = SecCertificateCopyData(certificate)
        let data = CFDataGetBytePtr(certificateData)
        let length = CFDataGetLength(certificateData)
        let certificateNSData = Data(bytes: data!, count: length)
        
        // Check against pinned certificate
        if let pinnedCertData = pinnedCertificates[host] {
            return certificateNSData == pinnedCertData
        }
        
        // Check against pinned public key
        if let pinnedPublicKey = pinnedPublicKeys[host],
           let certPublicKey = extractPublicKey(from: certificateNSData) {
            return SecKeyIsEqualToKey(pinnedPublicKey, certPublicKey)
        }
        
        print("❌ No pinned certificate or public key found for host: \(host)")
        return false
    }
    
    func validateServerTrust(_ serverTrust: SecTrust, for host: String) -> Bool {
        // Get server certificate
        guard let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            print("❌ Failed to get server certificate")
            return false
        }
        
        // Validate against our pinned certificates/keys
        let isValid = validateCertificate(for: host, certificate: serverCertificate)
        
        if !isValid {
            print("❌ Certificate pinning validation failed for: \(host)")
        } else {
            print("✅ Certificate pinning validation passed for: \(host)")
        }
        
        return isValid
    }
}

// MARK: - URLSessionDelegate Extension

extension CertificatePinningManager: URLSessionDelegate {
    func urlSession(_ session: URLSession, 
                   didReceive challenge: URLAuthenticationChallenge, 
                   completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        guard let serverTrust = challenge.protectionSpace.serverTrust,
              let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0) else {
            print("❌ Invalid server trust or certificate")
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        
        let host = challenge.protectionSpace.host
        
        // Validate certificate pinning
        if validateCertificate(for: host, certificate: serverCertificate) {
            // Create credential with the server trust
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
        } else {
            // Certificate pinning failed
            print("❌ Certificate pinning failed for host: \(host)")
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

// MARK: - Certificate Pinning Delegate

class CertificatePinningDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession,
                   didReceive challenge: URLAuthenticationChallenge,
                   completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        // Delegate to the certificate pinning manager
        CertificatePinningManager.shared.urlSession(session, didReceive: challenge, completionHandler: completionHandler)
    }
}
