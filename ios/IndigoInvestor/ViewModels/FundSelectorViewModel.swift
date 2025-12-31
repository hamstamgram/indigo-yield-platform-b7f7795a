//
//  FundSelectorViewModel.swift
//  IndigoInvestor
//
//  ViewModel for FundSelectorView
//

import SwiftUI
import Combine
import Foundation

// MARK: - Fund Model
struct Fund: Identifiable, Codable {
    let id: UUID
    let name: String
    let category: String
    let description: String
    let minInvestment: Decimal
    let expectedReturn: Double
    let riskLevel: String
    let aum: Decimal
    let inceptionDate: Date
    let performance: [PerformanceData]

    var formattedMinInvestment: String {
        minInvestment.formatted(.currency(code: "USD"))
    }

    var formattedExpectedReturn: String {
        String(format: "+%.1f%%", expectedReturn)
    }

    var formattedAUM: String {
        aum.formatted(.currency(code: "USD"))
    }
}

@MainActor
final class FundSelectorViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var allFunds: [Fund] = []
    @Published var searchText: String = ""
    @Published var selectedCategory: String = "All"
    @Published var selectedFund: Fund?

    // MARK: - Dependencies
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties
    var filteredFunds: [Fund] {
        var funds = allFunds

        // Filter by category
        if selectedCategory != "All" {
            funds = funds.filter { $0.category == selectedCategory }
        }

        // Filter by search text
        if !searchText.isEmpty {
            funds = funds.filter { fund in
                fund.name.localizedCaseInsensitiveContains(searchText) ||
                fund.description.localizedCaseInsensitiveContains(searchText) ||
                fund.category.localizedCaseInsensitiveContains(searchText)
            }
        }

        return funds
    }

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
        setupSearchDebounce()
    }

    // MARK: - Public Methods
    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            // TODO: Implement actual data loading from Supabase
            try await Task.sleep(nanoseconds: 500_000_000) // Simulate network delay

            // Mock data for development
            allFunds = generateMockFunds()

            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to load funds: \(error.localizedDescription)"
        }
    }

    func refreshData() async {
        await loadData()
    }

    func selectFund(_ fund: Fund) {
        selectedFund = fund
        // Navigate to fund details or initiate investment flow
        print("Selected fund: \(fund.name)")
    }

    // MARK: - Private Methods
    private func setupSearchDebounce() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
    }

    private func generateMockFunds() -> [Fund] {
        return [
            Fund(
                id: UUID(),
                name: "Growth Equity Fund",
                category: "Equity",
                description: "High-growth technology and healthcare stocks with strong fundamentals",
                minInvestment: 10000,
                expectedReturn: 12.5,
                riskLevel: "High",
                aum: 250000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 3),
                performance: []
            ),
            Fund(
                id: UUID(),
                name: "Balanced Income Fund",
                category: "Fixed Income",
                description: "Conservative fixed-income portfolio with steady returns",
                minInvestment: 5000,
                expectedReturn: 6.8,
                riskLevel: "Low",
                aum: 180000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 5),
                performance: []
            ),
            Fund(
                id: UUID(),
                name: "Real Estate Opportunity",
                category: "Real Estate",
                description: "Commercial and residential real estate investments across major markets",
                minInvestment: 25000,
                expectedReturn: 9.2,
                riskLevel: "Medium",
                aum: 320000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 2),
                performance: []
            ),
            Fund(
                id: UUID(),
                name: "Alternative Assets Fund",
                category: "Alternatives",
                description: "Diversified portfolio including private equity, hedge funds, and commodities",
                minInvestment: 50000,
                expectedReturn: 15.3,
                riskLevel: "High",
                aum: 450000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 4),
                performance: []
            ),
            Fund(
                id: UUID(),
                name: "Dividend Aristocrats",
                category: "Equity",
                description: "Blue-chip stocks with consistent dividend growth over 25+ years",
                minInvestment: 7500,
                expectedReturn: 8.5,
                riskLevel: "Medium",
                aum: 290000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 6),
                performance: []
            ),
            Fund(
                id: UUID(),
                name: "Municipal Bond Fund",
                category: "Fixed Income",
                description: "Tax-advantaged municipal bonds from investment-grade issuers",
                minInvestment: 3000,
                expectedReturn: 4.2,
                riskLevel: "Low",
                aum: 150000000,
                inceptionDate: Date().addingTimeInterval(-365 * 24 * 60 * 60 * 8),
                performance: []
            )
        ]
    }
}
