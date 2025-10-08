//
//  NetworkDebugService.swift
//  IndigoInvestor
//
//  Advanced network debugging service for production troubleshooting
//

import Foundation
import Network
import Combine
import os.log

@MainActor
class NetworkDebugService: ObservableObject {
    static let shared = NetworkDebugService()

    @Published var isLogging = false
    @Published var networkLogs: [NetworkLogEntry] = []

    private let logger = Logger(subsystem: "com.indigo.investor", category: "Network")
    private var urlSessionDelegate: DebugURLSessionDelegate?
    private var cancellables = Set<AnyCancellable>()

    struct NetworkLogEntry: Identifiable, Codable {
        let id = UUID()
        let timestamp: Date
        let method: String
        let url: String
        let statusCode: Int?
        let responseTime: TimeInterval?
        let error: String?
        let requestHeaders: [String: String]?
        let responseHeaders: [String: String]?
        let requestBody: String?
        let responseBody: String?

        var isSuccess: Bool {
            guard let status = statusCode else { return false }
            return status >= 200 && status < 400
        }

        var statusDescription: String {
            if let status = statusCode {
                return "\(status)"
            } else if let error = error {
                return "Error: \(error)"
            } else {
                return "Pending"
            }
        }
    }

    private init() {
        setupNetworkLogging()
    }

    func startDebugging() {
        isLogging = true
        logger.info("🔍 Network debugging started")
    }

    func stopDebugging() {
        isLogging = false
        logger.info("⏹️ Network debugging stopped")
    }

    func clearLogs() {
        networkLogs.removeAll()
        logger.info("🗑️ Network logs cleared")
    }

    func exportLogs() -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted

        do {
            let data = try encoder.encode(networkLogs)
            return String(data: data, encoding: .utf8) ?? "Export failed"
        } catch {
            return "Export error: \(error.localizedDescription)"
        }
    }

    private func setupNetworkLogging() {
        urlSessionDelegate = DebugURLSessionDelegate { [weak self] logEntry in
            Task { @MainActor in
                self?.addLogEntry(logEntry)
            }
        }
    }

    private func addLogEntry(_ entry: NetworkLogEntry) {
        guard isLogging else { return }

        networkLogs.append(entry)

        // Keep only last 100 entries to prevent memory issues
        if networkLogs.count > 100 {
            networkLogs.removeFirst()
        }

        // Log to system console
        if entry.isSuccess {
            logger.info("✅ \(entry.method) \(entry.url) - \(entry.statusDescription)")
        } else {
            logger.error("❌ \(entry.method) \(entry.url) - \(entry.statusDescription)")
        }
    }

    func createDebugURLSession() -> URLSession {
        let configuration = URLSessionConfiguration.default
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 30.0
        configuration.timeoutIntervalForResource = 60.0

        return URLSession(
            configuration: configuration,
            delegate: urlSessionDelegate,
            delegateQueue: nil
        )
    }

    // Quick connectivity test
    func testSupabaseConnectivity() async -> ConnectivityResult {
        let config = SupabaseConfig.current

        var results: [String: Any] = [:]

        // Test 1: Basic HTTP connectivity
        do {
            let url = URL(string: config.url)!
            let startTime = Date()

            let (_, response) = try await URLSession.shared.data(from: url)
            let duration = Date().timeIntervalSince(startTime)

            if let httpResponse = response as? HTTPURLResponse {
                results["basicHTTP"] = [
                    "success": true,
                    "statusCode": httpResponse.statusCode,
                    "duration": duration
                ]
            }
        } catch {
            results["basicHTTP"] = [
                "success": false,
                "error": error.localizedDescription
            ]
        }

        // Test 2: REST API endpoint
        do {
            let url = URL(string: "\(config.url)/rest/v1/")!
            var request = URLRequest(url: url)
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")

            let startTime = Date()
            let (_, response) = try await URLSession.shared.data(for: request)
            let duration = Date().timeIntervalSince(startTime)

            if let httpResponse = response as? HTTPURLResponse {
                results["restAPI"] = [
                    "success": httpResponse.statusCode < 500,
                    "statusCode": httpResponse.statusCode,
                    "duration": duration
                ]
            }
        } catch {
            results["restAPI"] = [
                "success": false,
                "error": error.localizedDescription
            ]
        }

        // Test 3: Auth endpoint
        do {
            let url = URL(string: "\(config.url)/auth/v1/token?grant_type=password")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let body = ["email": "test@example.com", "password": "invalid"]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let startTime = Date()
            let (_, response) = try await URLSession.shared.data(for: request)
            let duration = Date().timeIntervalSince(startTime)

            if let httpResponse = response as? HTTPURLResponse {
                // 400/401/422 are expected for invalid credentials
                let isWorking = [400, 401, 422].contains(httpResponse.statusCode)
                results["authEndpoint"] = [
                    "success": isWorking,
                    "statusCode": httpResponse.statusCode,
                    "duration": duration
                ]
            }
        } catch {
            results["authEndpoint"] = [
                "success": false,
                "error": error.localizedDescription
            ]
        }

        return ConnectivityResult(tests: results)
    }
}

struct ConnectivityResult {
    let tests: [String: Any]

    var overallSuccess: Bool {
        return tests.values.compactMap { test in
            if let testDict = test as? [String: Any],
               let success = testDict["success"] as? Bool {
                return success
            }
            return false
        }.allSatisfy { $0 }
    }

    var summary: String {
        let passedTests = tests.values.compactMap { test in
            if let testDict = test as? [String: Any],
               let success = testDict["success"] as? Bool {
                return success
            }
            return false
        }.filter { $0 }.count

        return "\(passedTests)/\(tests.count) tests passed"
    }
}

// Custom URLSessionDelegate for detailed network logging
class DebugURLSessionDelegate: NSObject, URLSessionDataDelegate {
    private let onLogEntry: (NetworkDebugService.NetworkLogEntry) -> Void
    private var taskStartTimes: [URLSessionTask: Date] = [:]

    init(onLogEntry: @escaping (NetworkDebugService.NetworkLogEntry) -> Void) {
        self.onLogEntry = onLogEntry
        super.init()
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {

        let startTime = taskStartTimes[dataTask] ?? Date()
        let responseTime = Date().timeIntervalSince(startTime)

        guard let httpResponse = response as? HTTPURLResponse,
              let url = dataTask.originalRequest?.url else {
            completionHandler(.allow)
            return
        }

        let logEntry = NetworkDebugService.NetworkLogEntry(
            timestamp: Date(),
            method: dataTask.originalRequest?.httpMethod ?? "GET",
            url: url.absoluteString,
            statusCode: httpResponse.statusCode,
            responseTime: responseTime,
            error: nil,
            requestHeaders: dataTask.originalRequest?.allHTTPHeaderFields,
            responseHeaders: httpResponse.allHeaderFields as? [String: String],
            requestBody: dataTask.originalRequest?.httpBody.flatMap { String(data: $0, encoding: .utf8) },
            responseBody: nil // Would need to capture in didReceive data
        )

        onLogEntry(logEntry)
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        defer {
            taskStartTimes.removeValue(forKey: task)
        }

        guard let error = error,
              let url = task.originalRequest?.url else {
            return
        }

        let startTime = taskStartTimes[task] ?? Date()
        let responseTime = Date().timeIntervalSince(startTime)

        let logEntry = NetworkDebugService.NetworkLogEntry(
            timestamp: Date(),
            method: task.originalRequest?.httpMethod ?? "GET",
            url: url.absoluteString,
            statusCode: nil,
            responseTime: responseTime,
            error: error.localizedDescription,
            requestHeaders: task.originalRequest?.allHTTPHeaderFields,
            responseHeaders: nil,
            requestBody: task.originalRequest?.httpBody.flatMap { String(data: $0, encoding: .utf8) },
            responseBody: nil
        )

        onLogEntry(logEntry)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {

        // Log redirect
        let logEntry = NetworkDebugService.NetworkLogEntry(
            timestamp: Date(),
            method: "REDIRECT",
            url: "\(response.url?.absoluteString ?? "unknown") → \(request.url?.absoluteString ?? "unknown")",
            statusCode: response.statusCode,
            responseTime: nil,
            error: nil,
            requestHeaders: request.allHTTPHeaderFields,
            responseHeaders: response.allHeaderFields as? [String: String],
            requestBody: nil,
            responseBody: nil
        )

        onLogEntry(logEntry)
        completionHandler(request)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willBeginDelayedRequest request: URLRequest, completionHandler: @escaping (URLSession.DelayedRequestDisposition, URLRequest?) -> Void) {

        taskStartTimes[task] = Date()
        completionHandler(.continueLoading, nil)
    }
}

// MARK: - Debug Extensions

extension URLRequest {
    var debugDescription: String {
        var components: [String] = []

        components.append("\(httpMethod ?? "GET") \(url?.absoluteString ?? "unknown")")

        if let headers = allHTTPHeaderFields, !headers.isEmpty {
            components.append("Headers: \(headers)")
        }

        if let body = httpBody,
           let bodyString = String(data: body, encoding: .utf8),
           !bodyString.isEmpty {
            components.append("Body: \(bodyString)")
        }

        return components.joined(separator: "\n")
    }
}

extension URLResponse {
    var debugDescription: String {
        guard let httpResponse = self as? HTTPURLResponse else {
            return "Non-HTTP Response"
        }

        var components: [String] = []
        components.append("Status: \(httpResponse.statusCode)")

        if !httpResponse.allHeaderFields.isEmpty {
            components.append("Headers: \(httpResponse.allHeaderFields)")
        }

        return components.joined(separator: "\n")
    }
}