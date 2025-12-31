//
//  DashboardViewModel.swift
//  IndigoInvestor
//
//  Refactored to support Passive Investment Reporting:
//  - No Fiat Totals (No USD portfolio value)
//  - Asset-based Ledger view
//  - Yield-focused metrics
//

import Foundation
import SwiftUI
import Combine
import Supabase

@MainActor
class DashboardViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var portfolio: Portfolio?
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showError = false
    
    // MARK: - Dependencies
    private let serviceLocator = ServiceLocator.shared
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupSubscriptions()
    }
    
    // MARK: - Public Methods
    
    func loadData() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        
        do {
            guard let investorId = getCurrentInvestorId() else {
                throw DashboardError.userNotAuthenticated
            }
            
            // Fetch Portfolio with Asset Ledger Details
            // Note: This assumes PortfolioService has been updated to fetch
            // `investor_positions` and `investor_monthly_reports` logic
            // matching the web's "No Fiat" approach.
            
            if let portfolioService = serviceLocator.portfolioService {
                try await portfolioService.fetchPortfolio()
                self.portfolio = portfolioService.portfolio
            }
            
            print("✅ Dashboard data loaded successfully")
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        
        // Force refresh logic
        if let portfolioService = serviceLocator.portfolioService {
            try? await portfolioService.refreshPortfolio()
            self.portfolio = portfolioService.portfolio
        }
        
        isRefreshing = false
    }
    
    // MARK: - Private Methods
    
    private func setupSubscriptions() {
        NotificationCenter.default.publisher(for: .authStateChanged)
            .sink { [weak self] _ in
                Task { await self?.loadData() }
            }
            .store(in: &cancellables)
    }
    
    private func getCurrentInvestorId() -> UUID? {
        if let userIdString = try? serviceLocator.keychainManager.getUserID(),
           let userId = UUID(uuidString: userIdString) {
            return userId
        }
        return nil
    }
    
    private func handleError(_ error: Error) {
        print("❌ Dashboard error: \(error)")
        errorMessage = error.localizedDescription
        showError = true
    }
}

// MARK: - Dashboard Errors
enum DashboardError: LocalizedError {
    case userNotAuthenticated
    case dataLoadFailed(Error)
    
    var errorDescription: String? {
        switch self {
        case .userNotAuthenticated: return "User is not authenticated"
        case .dataLoadFailed(let error): return "Failed to load dashboard data: \(error.localizedDescription)"
        }
    }
}