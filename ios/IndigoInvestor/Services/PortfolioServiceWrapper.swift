//
//  PortfolioServiceWrapper.swift
//  IndigoInvestor
//
//  Wrapper to bridge Core/Services/PortfolioService with simpler API
//

import Foundation
import Supabase
import Combine

@MainActor
class PortfolioService: ObservableObject {
    @Published var portfolio: Portfolio?
    @Published var isLoading = false
    @Published var error: String?

    private let supabase: SupabaseClient
    private let authService: AuthService

    init(supabase: SupabaseClient, authService: AuthService) {
        self.supabase = supabase
        self.authService = authService
    }

    func fetchPortfolio() async throws {
        print("📊 PortfolioService: Starting fetchPortfolio")

        guard let userId = authService.currentUser?.id else {
            print("❌ PortfolioService: User not authenticated")
            throw PortfolioError.userNotAuthenticated
        }

        print("✅ PortfolioService: User ID: \(userId)")
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            print("🔍 PortfolioService: Fetching portfolio data for user: \(userId.uuidString)")

            // First check if database tables exist by testing profiles table
            do {
                let profileResponse = try await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", value: userId.uuidString)
                    .execute()

                print("✅ PortfolioService: Profile check - found \(profileResponse.data.count) bytes")
            } catch {
                if let postgrestError = error as? PostgrestError {
                    if postgrestError.code == "42P01" || postgrestError.message.contains("does not exist") {
                        print("❌ PortfolioService: Database tables missing - need to run database setup")
                        self.error = "Database not properly initialized. Please contact support to set up your account."
                        throw PortfolioError.databaseNotInitialized
                    }
                }
                throw error
            }

            // Fetch portfolio data
            let response = try await supabase
                .from("portfolios")
                .select("*")
                .eq("investor_id", value: userId.uuidString)
                .execute()

            print("✅ PortfolioService: Portfolio query returned \(response.data.count) bytes")

            if response.data.isEmpty {
                print("⚠️ PortfolioService: No portfolio found for user")
                self.error = "No portfolio found. Please contact support to set up your investment account."
                return
            }

            // Try to decode the first portfolio
            if let portfolioData = response.data.first {
                print("📊 PortfolioService: Raw portfolio data: \(portfolioData)")

                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                decoder.dateDecodingStrategy = .iso8601

                portfolio = try decoder.decode(Portfolio.self, from: Data(String(describing: portfolioData).utf8))
                print("✅ PortfolioService: Portfolio decoded successfully")

                // Fetch positions
                if let portfolioId = portfolio?.id.uuidString {
                    print("🔍 PortfolioService: Fetching positions for portfolio: \(portfolioId)")

                    let positionsResponse = try await supabase
                        .from("positions")
                        .select("*")
                        .eq("portfolio_id", value: portfolioId)
                        .execute()

                    print("✅ PortfolioService: Positions query returned \(positionsResponse.data.count) positions")

                    if var updatedPortfolio = portfolio {
                        updatedPortfolio.positions = try decoder.decode([Position].self, from: Data(String(describing: positionsResponse.data).utf8))
                        portfolio = updatedPortfolio
                        print("✅ PortfolioService: Portfolio updated with \(updatedPortfolio.positions.count) positions")
                    }
                }
            }
        } catch {
            print("❌ PortfolioService: Error fetching portfolio: \(error)")
            print("❌ PortfolioService: Error details: \(error.localizedDescription)")
            self.error = "Failed to load portfolio: \(error.localizedDescription)"
            throw PortfolioError.fetchFailed(error)
        }

        print("✅ PortfolioService: fetchPortfolio completed successfully")
    }

    func refreshPortfolio() async throws {
        try await fetchPortfolio()
    }

    func getPerformanceData(for period: TimePeriod) async throws -> [PerformanceDataPoint] {
        guard let userId = authService.currentUser?.id else {
            throw PortfolioError.userNotAuthenticated
        }

        // Calculate date range based on period
        let endDate = Date()
        let startDate: Date

        switch period {
        case .day:
            startDate = Calendar.current.date(byAdding: .day, value: -1, to: endDate) ?? endDate
        case .week:
            startDate = Calendar.current.date(byAdding: .day, value: -7, to: endDate) ?? endDate
        case .month:
            startDate = Calendar.current.date(byAdding: .month, value: -1, to: endDate) ?? endDate
        case .threeMonths:
            startDate = Calendar.current.date(byAdding: .month, value: -3, to: endDate) ?? endDate
        case .sixMonths:
            startDate = Calendar.current.date(byAdding: .month, value: -6, to: endDate) ?? endDate
        case .year:
            startDate = Calendar.current.date(byAdding: .year, value: -1, to: endDate) ?? endDate
        case .all:
            startDate = Calendar.current.date(byAdding: .year, value: -10, to: endDate) ?? endDate
        }

        // Fetch performance data
        let response = try await supabase
            .from("performance_history")
            .select()
            .eq("investor_id", value: userId.uuidString)
            .gte("date", value: ISO8601DateFormatter().string(from: startDate))
            .lte("date", value: ISO8601DateFormatter().string(from: endDate))
            .order("date", ascending: true)
            .execute()

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode([PerformanceDataPoint].self, from: response.data)
    }

    // Stub methods for compatibility
    func subscribeToUpdates() {
        // Real-time updates would be implemented here
    }

    func unsubscribeFromUpdates() {
        // Clean up real-time subscriptions
    }
}

enum PortfolioError: LocalizedError {
    case userNotAuthenticated
    case databaseNotInitialized
    case fetchFailed(Error)
    case refreshFailed(Error)

    var errorDescription: String? {
        switch self {
        case .userNotAuthenticated:
            return "User not authenticated"
        case .databaseNotInitialized:
            return "Database tables are missing. Please run the database setup script in Supabase."
        case .fetchFailed(let error):
            return "Failed to fetch portfolio: \(error.localizedDescription)"
        case .refreshFailed(let error):
            return "Failed to refresh portfolio: \(error.localizedDescription)"
        }
    }
}