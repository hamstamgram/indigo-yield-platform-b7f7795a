//
//  PortfolioViewModel.swift
//  IndigoInvestor
//
//  Portfolio view model for detailed portfolio management
//

import Foundation
import SwiftUI
import Combine

@MainActor
class PortfolioViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var portfolio: Portfolio?
    @Published var positions: [Position] = []
    @Published var selectedPosition: Position?
    @Published var assetAllocation: [AssetAllocation] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var selectedTab = 0 // 0: Positions, 1: Allocation, 2: Performance
    
    // MARK: - Dependencies
    private let portfolioService: PortfolioServiceProtocol
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var portfolioSubscription: Task<Void, Never>?
    private var currentInvestorId: UUID?
    
    // MARK: - Initialization
    
    init(portfolioService: PortfolioServiceProtocol) {
        self.portfolioService = portfolioService
        setupSubscriptions()
    }
    
    deinit {
        portfolioSubscription?.cancel()
    }
    
    // MARK: - Public Methods
    
    func loadPortfolio(for investorId: UUID) async {
        guard !isLoading else { return }
        
        isLoading = true
        currentInvestorId = investorId
        errorMessage = nil
        
        do {
            let portfolio = try await portfolioService.fetchPortfolio(for: investorId)
            
            self.portfolio = portfolio
            self.positions = portfolio.positions
            self.assetAllocation = portfolio.assetAllocation
            
            // Setup real-time updates
            setupRealtimeSubscription(for: investorId)
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func refreshPortfolio() async {
        guard let investorId = currentInvestorId, !isRefreshing else { return }
        
        isRefreshing = true
        errorMessage = nil
        
        do {
            let portfolio = try await portfolioService.refreshPortfolioData(for: investorId)
            
            self.portfolio = portfolio
            self.positions = portfolio.positions
            self.assetAllocation = portfolio.assetAllocation
            
        } catch {
            handleError(error)
        }
        
        isRefreshing = false
    }
    
    func selectPosition(_ position: Position) {
        selectedPosition = position
    }
    
    func clearSelection() {
        selectedPosition = nil
    }
    
    // MARK: - Private Methods
    
    private func setupSubscriptions() {
        // Any additional subscriptions can be added here
    }
    
    private func setupRealtimeSubscription(for investorId: UUID) {
        portfolioSubscription?.cancel()
        
        portfolioSubscription = Task {
            for await updatedPortfolio in portfolioService.subscribeToPortfolioUpdates(investorId: investorId) {
                await MainActor.run {
                    self.portfolio = updatedPortfolio
                    self.positions = updatedPortfolio.positions
                    self.assetAllocation = updatedPortfolio.assetAllocation
                    
                    // Update selected position if it exists
                    if let selectedPos = self.selectedPosition,
                       let updatedPos = updatedPortfolio.positions.first(where: { $0.id == selectedPos.id }) {
                        self.selectedPosition = updatedPos
                    }
                }
            }
        }
    }
    
    private func handleError(_ error: Error) {
        print("❌ Portfolio error: \(error)")
        
        errorMessage = error.localizedDescription
        showError = true
        
        // Log error for analytics
        logError(error)
    }
    
    private func logError(_ error: Error) {
        let errorInfo = [
            "error": error.localizedDescription,
            "timestamp": Date().iso8601String,
            "investor_id": currentInvestorId?.uuidString ?? "unknown",
            "screen": "Portfolio"
        ]
        
        print("📊 Error logged: \(errorInfo)")
    }
}

// MARK: - Computed Properties

extension PortfolioViewModel {
    var totalValue: String {
        return portfolio?.formattedTotalValue ?? "$0.00"
    }
    
    var totalGain: String {
        guard let portfolio = portfolio else { return "$0.00" }
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.positivePrefix = "+"
        
        return formatter.string(from: portfolio.totalGain as NSNumber) ?? "$0.00"
    }
    
    var totalGainPercent: String {
        guard let portfolio = portfolio else { return "0.00%" }
        return String(format: "%.2f%%", portfolio.totalGainPercent)
    }
    
    var totalGainColor: Color {
        guard let portfolio = portfolio else { return .primary }
        return portfolio.totalGain >= 0 ? .green : .red
    }
    
    var dayChange: String {
        return portfolio?.formattedDayChange ?? "$0.00"
    }
    
    var dayChangeColor: Color {
        guard let portfolio = portfolio else { return .primary }
        return portfolio.dayChange >= 0 ? .green : .red
    }
    
    var sortedPositions: [Position] {
        return positions.sorted { $0.marketValue > $1.marketValue }
    }
    
    var topPositions: [Position] {
        return Array(sortedPositions.prefix(5))
    }
    
    var hasData: Bool {
        return portfolio != nil
    }
    
    var isEmpty: Bool {
        return portfolio == nil && !isLoading
    }
}

// MARK: - Position Filtering and Sorting

extension PortfolioViewModel {
    enum SortOption: String, CaseIterable {
        case marketValue = "Market Value"
        case gainLoss = "Gain/Loss"
        case allocation = "Allocation"
        case symbol = "Symbol"
        
        var systemImage: String {
            switch self {
            case .marketValue: return "dollarsign.circle"
            case .gainLoss: return "chart.line.uptrend.xyaxis"
            case .allocation: return "chart.pie"
            case .symbol: return "textformat.abc"
            }
        }
    }
    
    func sortPositions(by option: SortOption) {
        switch option {
        case .marketValue:
            positions.sort { $0.marketValue > $1.marketValue }
        case .gainLoss:
            positions.sort { $0.totalGain > $1.totalGain }
        case .allocation:
            positions.sort { $0.allocation > $1.allocation }
        case .symbol:
            positions.sort { $0.assetSymbol < $1.assetSymbol }
        }
    }
    
    func filterPositions(by searchText: String) -> [Position] {
        if searchText.isEmpty {
            return positions
        }
        
        return positions.filter { position in
            position.assetSymbol.localizedCaseInsensitiveContains(searchText) ||
            position.assetName.localizedCaseInsensitiveContains(searchText)
        }
    }
}

// MARK: - Mock Data for Previews

#if DEBUG
extension PortfolioViewModel {
    static var preview: PortfolioViewModel {
        let mockService = MockPortfolioService()
        let viewModel = PortfolioViewModel(portfolioService: mockService)
        
        // Set up mock data
        let mockPortfolio = Portfolio.mockPortfolio(for: UUID())
        viewModel.portfolio = mockPortfolio
        viewModel.positions = mockPortfolio.positions
        viewModel.assetAllocation = mockPortfolio.assetAllocation
        
        return viewModel
    }
}

private class MockPortfolioService: PortfolioServiceProtocol {
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        return Portfolio.mockPortfolio(for: investorId)
    }
    
    func subscribeToPortfolioUpdates(investorId: UUID) -> AsyncStream<Portfolio> {
        return AsyncStream { _ in }
    }
    
    func refreshPortfolioData(for investorId: UUID) async throws -> Portfolio {
        return Portfolio.mockPortfolio(for: investorId)
    }
}
#endif
