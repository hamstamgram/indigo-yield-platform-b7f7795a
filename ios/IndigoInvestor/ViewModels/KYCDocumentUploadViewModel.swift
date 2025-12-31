//
//  KYCDocumentUploadViewModel.swift
//  IndigoInvestor
//
//  ViewModel for KYCDocumentUploadView
//

import SwiftUI
import Combine

@MainActor
final class KYCDocumentUploadViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var data: [String] = []

    // MARK: - Dependencies
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
    }

    // MARK: - Public Methods
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            // TODO: Implement actual data loading from Supabase
            try await Task.sleep(nanoseconds: 1_000_000_000) // Simulate network delay

            // Placeholder data
            data = ["Item 1", "Item 2", "Item 3"]

            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to load data: \(error.localizedDescription)"
        }
    }

    func refreshData() async {
        await loadData()
    }
}
