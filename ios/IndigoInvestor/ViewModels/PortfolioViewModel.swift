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
    @Published var assets: [AssetPosition] = []
    @Published var selectedAsset: AssetPosition?
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var selectedTab = 0 // 0: Assets, 1: Performance
    
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
            self.assets = portfolio.assets
            
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
            self.assets = portfolio.assets
            
        } catch {
            handleError(error)
        }
        
        isRefreshing = false
    }
    
    func selectAsset(_ asset: AssetPosition) {
        selectedAsset = asset
    }
    
    func clearSelection() {
        selectedAsset = nil
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
                    self.assets = updatedPortfolio.assets
                    
                    // Update selected asset if it exists
                    if let selected = self.selectedAsset,
                       let updated = updatedPortfolio.assets.first(where: { $0.id == selected.id }) {
                        self.selectedAsset = updated
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
    var totalYieldDisplay: String {
        return portfolio?.totalYieldAllTimeFormatted ?? "0"
    }
    
    var monthlyYieldDisplay: String {
        return portfolio?.latestYieldFormatted ?? "0"
    }
    
    var yieldUnit: String {
        return portfolio?.yieldUnitLabel ?? ""
    }
    
    var activePositionsCount: Int {
        return portfolio?.activePositionsCount ?? 0
    }
    
    var sortedAssets: [AssetPosition] {
        // Default sort by balance descending
        return assets.sorted { $0.balance > $1.balance }
    }
    
    var hasData: Bool {
        return portfolio != nil
    }
    
    var isEmpty: Bool {
        return portfolio == nil && !isLoading
    }
}

// MARK: - Asset Filtering and Sorting

extension PortfolioViewModel {
    enum SortOption: String, CaseIterable {
        case balance = "Balance"
        case yield = "Yield Earned"
        case fund = "Fund Name"
        case asset = "Asset"
        
        var systemImage: String {
            switch self {
            case .balance: return "scalemass"
            case .yield: return "chart.line.uptrend.xyaxis"
            case .fund: return "building.2"
            case .asset: return "bitcoinsign.circle"
            }
        }
    }
    
    func sortAssets(by option: SortOption) {
        switch option {
        case .balance:
            assets.sort { $0.balance > $1.balance }
        case .yield:
            assets.sort { $0.yieldEarned > $1.yieldEarned }
        case .fund:
            assets.sort { $0.fundName < $1.fundName }
        case .asset:
            assets.sort { $0.assetCode < $1.assetCode }
        }
    }
    
    func filterAssets(by searchText: String) -> [AssetPosition] {
        if searchText.isEmpty {
            return assets
        }
        
        return assets.filter { asset in
            asset.fundName.localizedCaseInsensitiveContains(searchText) ||
            asset.assetCode.localizedCaseInsensitiveContains(searchText)
        }
    }
}
