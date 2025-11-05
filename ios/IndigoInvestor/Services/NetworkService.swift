//
//  NetworkService.swift
//  IndigoInvestor
//
//  Core networking service with Supabase
//

import Foundation
import Supabase

final class NetworkService: NetworkServiceProtocol {
    private let supabaseClient: SupabaseClient

    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
    }

    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T {
        // Implement generic request handling
        fatalError("Implement request method")
    }

    func upload(data: Data, to path: String) async throws -> URL {
        let response = try await supabaseClient.storage
            .from("documents")
            .upload(
                path: path,
                file: data,
                options: FileOptions(contentType: "application/pdf")
            )

        let url = try supabaseClient.storage
            .from("documents")
            .getPublicURL(path: path)

        return url
    }
}
