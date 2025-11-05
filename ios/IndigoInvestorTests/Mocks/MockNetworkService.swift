//
//  MockNetworkService.swift
//  IndigoInvestorTests
//
//  Mock network service for testing all views
//

import Foundation
@testable import IndigoInvestor

class MockNetworkService: NetworkServiceProtocol {

    // MARK: - Configuration
    var shouldFail = false
    var shouldDelayResponse = false
    var mockResponse: [String: Any] = [:]
    var mockProfileData: [String: Any] = [:]
    var onRetry: (() -> Void)?

    // MARK: - NetworkServiceProtocol Implementation

    func fetchData(from endpoint: String) async throws -> Data {
        if shouldDelayResponse {
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        }

        if shouldFail {
            throw NetworkError.serverError
        }

        // Return mock data based on endpoint
        let response = mockResponse.isEmpty ? mockProfileData : mockResponse
        return try JSONSerialization.data(withJSONObject: response)
    }

    func post(to endpoint: String, body: Data) async throws -> Data {
        if shouldFail {
            throw NetworkError.serverError
        }

        let response = ["success": true]
        return try JSONSerialization.data(withJSONObject: response)
    }

    func put(to endpoint: String, body: Data) async throws -> Data {
        if shouldFail {
            throw NetworkError.serverError
        }

        let response = ["success": true]
        return try JSONSerialization.data(withJSONObject: response)
    }

    func delete(from endpoint: String) async throws -> Data {
        if shouldFail {
            throw NetworkError.serverError
        }

        let response = ["success": true]
        return try JSONSerialization.data(withJSONObject: response)
    }

    func uploadFile(_ data: Data, to endpoint: String, fileName: String) async throws -> Data {
        if shouldFail {
            throw NetworkError.uploadFailed
        }

        let response = ["success": true, "fileId": "file-123"]
        return try JSONSerialization.data(withJSONObject: response)
    }

    func downloadFile(from endpoint: String) async throws -> Data {
        if shouldFail {
            throw NetworkError.downloadFailed
        }

        return Data(count: 1024) // Mock file data
    }
}

// MARK: - Network Errors

enum NetworkError: Error {
    case serverError
    case invalidResponse
    case uploadFailed
    case downloadFailed
    case unauthorized
    case notFound
}

// MARK: - Network Service Protocol (if not already defined)

protocol NetworkServiceProtocol {
    func fetchData(from endpoint: String) async throws -> Data
    func post(to endpoint: String, body: Data) async throws -> Data
    func put(to endpoint: String, body: Data) async throws -> Data
    func delete(from endpoint: String) async throws -> Data
    func uploadFile(_ data: Data, to endpoint: String, fileName: String) async throws -> Data
    func downloadFile(from endpoint: String) async throws -> Data
}
