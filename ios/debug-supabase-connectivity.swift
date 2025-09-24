//
//  debug-supabase-connectivity.swift
//  IndigoInvestor Debug Tools
//
//  Comprehensive debugging toolkit for Supabase connectivity issues
//

import Foundation
import Network
import SystemConfiguration
import Combine
import Supabase

class SupabaseConnectivityDebugger: ObservableObject {
    @Published var debugResults: [DebugResult] = []
    @Published var isDebugging = false

    private let supabaseURL = "https://nkfimvovosdehmyyjubn.supabase.co"
    private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"

    private var client: SupabaseClient?
    private var networkMonitor: NWPathMonitor?
    private let queue = DispatchQueue(label: "debug-network")

    struct DebugResult: Identifiable {
        let id = UUID()
        let category: DebugCategory
        let test: String
        let status: TestStatus
        let message: String
        let details: [String: Any]?
        let timestamp: Date

        enum DebugCategory: String, CaseIterable {
            case network = "Network Connectivity"
            case dns = "DNS Resolution"
            case ssl = "SSL/TLS Certificate"
            case authentication = "Authentication"
            case database = "Database Queries"
            case realtime = "Realtime Subscriptions"
            case performance = "Performance & Timeouts"
            case configuration = "Configuration"
        }

        enum TestStatus: String {
            case success = "✅"
            case warning = "⚠️"
            case failure = "❌"
            case pending = "⏳"
        }
    }

    // MARK: - Main Debug Function

    @MainActor
    func runComprehensiveDebugging() async {
        isDebugging = true
        debugResults.removeAll()

        await runAllTests()

        isDebugging = false
        printSummaryReport()
    }

    // MARK: - Test Categories

    private func runAllTests() async {
        // 1. Network Connectivity
        await testNetworkConnectivity()

        // 2. DNS Resolution
        await testDNSResolution()

        // 3. SSL/TLS Certificate Validation
        await testSSLCertificate()

        // 4. Configuration Validation
        await testConfiguration()

        // 5. Basic HTTP Connectivity
        await testHTTPConnectivity()

        // 6. Supabase Client Initialization
        await testSupabaseClientInit()

        // 7. Authentication Flow
        await testAuthenticationFlow()

        // 8. Database Query Testing
        await testDatabaseQueries()

        // 9. Performance & Timeout Testing
        await testPerformanceAndTimeouts()

        // 10. Realtime Connection Testing
        await testRealtimeConnection()

        // 11. Rate Limiting Detection
        await testRateLimiting()
    }

    // MARK: - Network Connectivity Tests

    private func testNetworkConnectivity() async {
        await addResult(.network, "Basic Network", .pending, "Testing network availability...")

        let monitor = NWPathMonitor()
        let semaphore = DispatchSemaphore(value: 0)
        var networkStatus: NWPath.Status = .requiresConnection

        monitor.pathUpdateHandler = { path in
            networkStatus = path.status
            semaphore.signal()
        }

        monitor.start(queue: queue)

        _ = semaphore.wait(timeout: .now() + 5.0)
        monitor.cancel()

        let status: DebugResult.TestStatus = networkStatus == .satisfied ? .success : .failure
        let message = "Network status: \(networkStatus)"
        await updateResult(.network, "Basic Network", status, message, ["status": networkStatus.rawValue])

        // Test specific connectivity to Supabase domain
        await testDomainReachability()
    }

    private func testDomainReachability() async {
        await addResult(.network, "Supabase Domain Reachability", .pending, "Testing reachability to supabase.co...")

        guard let url = URL(string: supabaseURL) else {
            await updateResult(.network, "Supabase Domain Reachability", .failure, "Invalid URL", nil)
            return
        }

        let monitor = NWPathMonitor()
        let semaphore = DispatchSemaphore(value: 0)
        var isReachable = false

        monitor.pathUpdateHandler = { path in
            if path.status == .satisfied {
                let endpoint = NWEndpoint.url(url)
                isReachable = path.usesInterfaceType(.wifi) || path.usesInterfaceType(.cellular)
            }
            semaphore.signal()
        }

        monitor.start(queue: queue)
        _ = semaphore.wait(timeout: .now() + 10.0)
        monitor.cancel()

        let status: DebugResult.TestStatus = isReachable ? .success : .failure
        await updateResult(.network, "Supabase Domain Reachability", status,
                          "Reachable: \(isReachable)", ["reachable": isReachable])
    }

    // MARK: - DNS Resolution Tests

    private func testDNSResolution() async {
        await addResult(.dns, "DNS Resolution", .pending, "Resolving Supabase domain...")

        let host = "nkfimvovosdehmyyjubn.supabase.co"
        var addresses: [String] = []

        let semaphore = DispatchSemaphore(value: 0)

        queue.async {
            var hints = addrinfo()
            hints.ai_family = AF_UNSPEC
            hints.ai_socktype = SOCK_STREAM

            var result: UnsafeMutablePointer<addrinfo>?
            let status = getaddrinfo(host, nil, &hints, &result)

            defer {
                if let result = result {
                    freeaddrinfo(result)
                }
                semaphore.signal()
            }

            guard status == 0, let result = result else {
                return
            }

            var current = result
            while current != nil {
                defer { current = current?.pointee.ai_next }

                guard let addr = current?.pointee.ai_addr else { continue }

                var buffer = [CChar](repeating: 0, count: Int(INET6_ADDRSTRLEN))

                switch current?.pointee.ai_family {
                case AF_INET:
                    let sin = addr.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { $0.pointee }
                    inet_ntop(AF_INET, &sin.sin_addr, &buffer, socklen_t(INET_ADDRSTRLEN))
                case AF_INET6:
                    let sin6 = addr.withMemoryRebound(to: sockaddr_in6.self, capacity: 1) { $0.pointee }
                    inet_ntop(AF_INET6, &sin6.sin6_addr, &buffer, socklen_t(INET6_ADDRSTRLEN))
                default:
                    continue
                }

                let ipString = String(cString: buffer)
                if !ipString.isEmpty {
                    addresses.append(ipString)
                }
            }
        }

        _ = semaphore.wait(timeout: .now() + 10.0)

        let status: DebugResult.TestStatus = !addresses.isEmpty ? .success : .failure
        let message = addresses.isEmpty ? "DNS resolution failed" : "Resolved to: \(addresses.joined(separator: ", "))"
        await updateResult(.dns, "DNS Resolution", status, message, ["addresses": addresses])
    }

    // MARK: - SSL Certificate Tests

    private func testSSLCertificate() async {
        await addResult(.ssl, "SSL Certificate", .pending, "Validating SSL certificate...")

        guard let url = URL(string: supabaseURL) else {
            await updateResult(.ssl, "SSL Certificate", .failure, "Invalid URL", nil)
            return
        }

        let session = URLSession(configuration: .default)

        do {
            let (_, response) = try await session.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse else {
                await updateResult(.ssl, "SSL Certificate", .failure, "No HTTP response", nil)
                return
            }

            let status: DebugResult.TestStatus = httpResponse.statusCode < 400 ? .success : .warning
            let message = "SSL handshake completed. Status: \(httpResponse.statusCode)"

            await updateResult(.ssl, "SSL Certificate", status, message, [
                "statusCode": httpResponse.statusCode,
                "headers": httpResponse.allHeaderFields
            ])
        } catch {
            let isSSLError = (error as NSError).domain == NSURLErrorDomain &&
                            [(NSURLErrorServerCertificateUntrusted,
                              NSURLErrorServerCertificateHasUnknownCA,
                              NSURLErrorCannotLoadFromNetwork)].contains((error as NSError).code)

            let status: DebugResult.TestStatus = isSSLError ? .failure : .warning
            await updateResult(.ssl, "SSL Certificate", status, "SSL Error: \(error.localizedDescription)", ["error": error.localizedDescription])
        }
    }

    // MARK: - Configuration Tests

    private func testConfiguration() async {
        await addResult(.configuration, "App Transport Security", .pending, "Checking ATS configuration...")

        let infoPlist = Bundle.main.infoDictionary
        let atsSettings = infoPlist?["NSAppTransportSecurity"] as? [String: Any]

        var issues: [String] = []
        var hasSupabaseException = false

        if let exceptionDomains = atsSettings?["NSExceptionDomains"] as? [String: Any] {
            hasSupabaseException = exceptionDomains.keys.contains { domain in
                domain.contains("supabase.co") || domain.contains("supabase")
            }
        }

        if !hasSupabaseException {
            issues.append("Missing Supabase domain exception in ATS")
        }

        if let allowsArbitraryLoads = atsSettings?["NSAllowsArbitraryLoads"] as? Bool, allowsArbitraryLoads {
            issues.append("ATS allows arbitrary loads (security risk)")
        }

        let status: DebugResult.TestStatus = issues.isEmpty ? .success : (hasSupabaseException ? .warning : .failure)
        let message = issues.isEmpty ? "ATS configuration OK" : "Issues: \(issues.joined(separator: ", "))"

        await updateResult(.configuration, "App Transport Security", status, message, [
            "atsSettings": atsSettings as Any,
            "issues": issues
        ])

        // Test Supabase configuration
        await testSupabaseConfigValues()
    }

    private func testSupabaseConfigValues() async {
        await addResult(.configuration, "Supabase Configuration", .pending, "Validating Supabase config...")

        let config = SupabaseConfig.current
        var issues: [String] = []

        if config.url.isEmpty {
            issues.append("Empty Supabase URL")
        }

        if config.anonKey.isEmpty {
            issues.append("Empty anon key")
        }

        if !config.anonKey.contains(".") {
            issues.append("Invalid JWT format for anon key")
        }

        if !config.isConfigurationValid {
            issues.append("Configuration validation failed")
        }

        let status: DebugResult.TestStatus = issues.isEmpty ? .success : .failure
        let message = issues.isEmpty ? "Configuration valid" : "Issues: \(issues.joined(separator: ", "))"

        await updateResult(.configuration, "Supabase Configuration", status, message, [
            "url": config.url,
            "anonKeyLength": config.anonKey.count,
            "issues": issues
        ])
    }

    // MARK: - HTTP Connectivity Tests

    private func testHTTPConnectivity() async {
        await addResult(.network, "HTTP Connectivity", .pending, "Testing basic HTTP connectivity...")

        guard let url = URL(string: "\(supabaseURL)/rest/v1/") else {
            await updateResult(.network, "HTTP Connectivity", .failure, "Invalid URL", nil)
            return
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 30.0

        let startTime = Date()

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let endTime = Date()
            let duration = endTime.timeIntervalSince(startTime)

            guard let httpResponse = response as? HTTPURLResponse else {
                await updateResult(.network, "HTTP Connectivity", .failure, "No HTTP response", nil)
                return
            }

            let status: DebugResult.TestStatus = httpResponse.statusCode < 500 ? .success : .failure
            let message = "HTTP \(httpResponse.statusCode) in \(String(format: "%.2f", duration))s"

            await updateResult(.network, "HTTP Connectivity", status, message, [
                "statusCode": httpResponse.statusCode,
                "duration": duration,
                "responseSize": data.count,
                "headers": httpResponse.allHeaderFields
            ])
        } catch {
            let endTime = Date()
            let duration = endTime.timeIntervalSince(startTime)

            await updateResult(.network, "HTTP Connectivity", .failure,
                              "HTTP Error after \(String(format: "%.2f", duration))s: \(error.localizedDescription)",
                              ["error": error.localizedDescription, "duration": duration])
        }
    }

    // MARK: - Supabase Client Tests

    private func testSupabaseClientInit() async {
        await addResult(.configuration, "Supabase Client", .pending, "Initializing Supabase client...")

        do {
            guard let url = URL(string: supabaseURL) else {
                await updateResult(.configuration, "Supabase Client", .failure, "Invalid URL", nil)
                return
            }

            let client = SupabaseClient(
                supabaseURL: url,
                supabaseKey: anonKey
            )

            self.client = client

            await updateResult(.configuration, "Supabase Client", .success, "Client initialized successfully", nil)
        } catch {
            await updateResult(.configuration, "Supabase Client", .failure,
                              "Client initialization failed: \(error.localizedDescription)",
                              ["error": error.localizedDescription])
        }
    }

    // MARK: - Authentication Tests

    private func testAuthenticationFlow() async {
        await addResult(.authentication, "Auth Endpoint", .pending, "Testing auth endpoint...")

        guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=password") else {
            await updateResult(.authentication, "Auth Endpoint", .failure, "Invalid auth URL", nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Test with invalid credentials to check if endpoint responds
        let body = ["email": "test@example.com", "password": "invalid"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (_, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                await updateResult(.authentication, "Auth Endpoint", .failure, "No HTTP response", nil)
                return
            }

            // 400 is expected for invalid credentials - shows endpoint is working
            let status: DebugResult.TestStatus = [400, 401, 422].contains(httpResponse.statusCode) ? .success : .warning
            let message = "Auth endpoint responding with HTTP \(httpResponse.statusCode)"

            await updateResult(.authentication, "Auth Endpoint", status, message, [
                "statusCode": httpResponse.statusCode
            ])
        } catch {
            await updateResult(.authentication, "Auth Endpoint", .failure,
                              "Auth endpoint error: \(error.localizedDescription)",
                              ["error": error.localizedDescription])
        }
    }

    // MARK: - Database Query Tests

    private func testDatabaseQueries() async {
        await addResult(.database, "REST API", .pending, "Testing REST API access...")

        guard let client = self.client else {
            await updateResult(.database, "REST API", .failure, "Client not initialized", nil)
            return
        }

        do {
            // Test a simple query that should work with public access
            let response = try await client
                .from("profiles")
                .select("id")
                .limit(1)
                .execute()

            let status: DebugResult.TestStatus = response.data.count >= 0 ? .success : .warning
            let message = "REST API accessible, returned \(response.data.count) bytes"

            await updateResult(.database, "REST API", status, message, [
                "responseSize": response.data.count
            ])
        } catch {
            // Check if it's an RLS policy issue vs connectivity issue
            let errorMsg = error.localizedDescription.lowercased()
            let isRLSError = errorMsg.contains("row level security") ||
                            errorMsg.contains("policy") ||
                            errorMsg.contains("insufficient_privilege")

            let status: DebugResult.TestStatus = isRLSError ? .warning : .failure
            let message = isRLSError ? "REST API accessible but RLS policy blocks access" : "REST API error: \(error.localizedDescription)"

            await updateResult(.database, "REST API", status, message, ["error": error.localizedDescription])
        }

        // Test portfolio-specific query
        await testPortfolioQuery()
    }

    private func testPortfolioQuery() async {
        await addResult(.database, "Portfolio Query", .pending, "Testing portfolio table access...")

        guard let client = self.client else {
            await updateResult(.database, "Portfolio Query", .failure, "Client not initialized", nil)
            return
        }

        do {
            let response = try await client
                .from("portfolios")
                .select("id")
                .limit(1)
                .execute()

            let status: DebugResult.TestStatus = response.data.count >= 0 ? .success : .warning
            let message = "Portfolio table accessible, returned \(response.data.count) bytes"

            await updateResult(.database, "Portfolio Query", status, message, [
                "responseSize": response.data.count
            ])
        } catch {
            let errorMsg = error.localizedDescription
            let status: DebugResult.TestStatus = .failure
            let message = "Portfolio query failed: \(errorMsg)"

            await updateResult(.database, "Portfolio Query", status, message, ["error": errorMsg])
        }
    }

    // MARK: - Performance Tests

    private func testPerformanceAndTimeouts() async {
        await addResult(.performance, "Response Time", .pending, "Testing response times...")

        let testEndpoint = "\(supabaseURL)/rest/v1/"
        var times: [TimeInterval] = []

        for i in 1...5 {
            await addResult(.performance, "Response Time Test \(i)", .pending, "Testing...")

            guard let url = URL(string: testEndpoint) else { continue }

            var request = URLRequest(url: url)
            request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
            request.timeoutInterval = 10.0

            let startTime = Date()

            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                let duration = Date().timeIntervalSince(startTime)
                times.append(duration)

                let status: DebugResult.TestStatus = duration < 5.0 ? .success : .warning
                await updateResult(.performance, "Response Time Test \(i)", status,
                                  "\(String(format: "%.2f", duration))s", ["duration": duration])
            } catch {
                let duration = Date().timeIntervalSince(startTime)
                await updateResult(.performance, "Response Time Test \(i)", .failure,
                                  "Timeout/Error after \(String(format: "%.2f", duration))s",
                                  ["duration": duration, "error": error.localizedDescription])
            }
        }

        if !times.isEmpty {
            let avgTime = times.reduce(0, +) / Double(times.count)
            let maxTime = times.max() ?? 0
            let minTime = times.min() ?? 0

            let status: DebugResult.TestStatus = avgTime < 3.0 ? .success : .warning
            await updateResult(.performance, "Response Time", status,
                              "Avg: \(String(format: "%.2f", avgTime))s (Min: \(String(format: "%.2f", minTime))s, Max: \(String(format: "%.2f", maxTime))s)",
                              ["average": avgTime, "min": minTime, "max": maxTime])
        }
    }

    // MARK: - Realtime Tests

    private func testRealtimeConnection() async {
        await addResult(.realtime, "Realtime Connection", .pending, "Testing realtime connection...")

        // For now, just test the WebSocket endpoint
        let realtimeURL = supabaseURL.replacingOccurrences(of: "https://", with: "wss://") + "/realtime/v1/websocket"

        await updateResult(.realtime, "Realtime Connection", .warning,
                          "Realtime endpoint: \(realtimeURL) (WebSocket testing not implemented)",
                          ["endpoint": realtimeURL])
    }

    // MARK: - Rate Limiting Tests

    private func testRateLimiting() async {
        await addResult(.performance, "Rate Limiting", .pending, "Testing for rate limits...")

        guard let url = URL(string: "\(supabaseURL)/rest/v1/") else {
            await updateResult(.performance, "Rate Limiting", .failure, "Invalid URL", nil)
            return
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        var rateLimited = false
        var successCount = 0

        // Make rapid requests to test rate limiting
        for i in 1...10 {
            do {
                let (_, response) = try await URLSession.shared.data(for: request)

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 429 {
                        rateLimited = true
                        break
                    } else if httpResponse.statusCode < 500 {
                        successCount += 1
                    }
                }
            } catch {
                break
            }

            // Small delay to avoid overwhelming
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        }

        let status: DebugResult.TestStatus = rateLimited ? .warning : .success
        let message = rateLimited ? "Rate limiting detected" : "\(successCount)/10 requests succeeded"

        await updateResult(.performance, "Rate Limiting", status, message, [
            "rateLimited": rateLimited,
            "successCount": successCount
        ])
    }

    // MARK: - Helper Methods

    @MainActor
    private func addResult(_ category: DebugResult.DebugCategory, _ test: String, _ status: DebugResult.TestStatus, _ message: String, _ details: [String: Any]? = nil) {
        let result = DebugResult(
            category: category,
            test: test,
            status: status,
            message: message,
            details: details,
            timestamp: Date()
        )
        debugResults.append(result)
    }

    @MainActor
    private func updateResult(_ category: DebugResult.DebugCategory, _ test: String, _ status: DebugResult.TestStatus, _ message: String, _ details: [String: Any]? = nil) {
        if let index = debugResults.firstIndex(where: { $0.category == category && $0.test == test }) {
            let updatedResult = DebugResult(
                category: category,
                test: test,
                status: status,
                message: message,
                details: details,
                timestamp: debugResults[index].timestamp
            )
            debugResults[index] = updatedResult
        } else {
            await addResult(category, test, status, message, details)
        }
    }

    private func printSummaryReport() {
        print("\n" + "="*80)
        print("SUPABASE CONNECTIVITY DEBUG REPORT")
        print("="*80)

        let categories = DebugResult.DebugCategory.allCases

        for category in categories {
            let categoryResults = debugResults.filter { $0.category == category }
            if !categoryResults.isEmpty {
                print("\n[\(category.rawValue)]")
                print("-" * 40)

                for result in categoryResults {
                    print("\(result.status.rawValue) \(result.test): \(result.message)")
                }
            }
        }

        // Summary statistics
        let total = debugResults.count
        let success = debugResults.filter { $0.status == .success }.count
        let warnings = debugResults.filter { $0.status == .warning }.count
        let failures = debugResults.filter { $0.status == .failure }.count

        print("\n" + "="*80)
        print("SUMMARY: \(success) passed, \(warnings) warnings, \(failures) failed (\(total) total)")

        if failures > 0 {
            print("\nCRITICAL ISSUES:")
            for result in debugResults.filter({ $0.status == .failure }) {
                print("❌ \(result.category.rawValue) - \(result.test): \(result.message)")
            }
        }

        print("="*80 + "\n")
    }
}

// String extension for Python-like string multiplication
extension String {
    static func * (string: String, count: Int) -> String {
        return String(repeating: string, count: count)
    }
}

// Usage example:
/*
let debugger = SupabaseConnectivityDebugger()
await debugger.runComprehensiveDebugging()
*/