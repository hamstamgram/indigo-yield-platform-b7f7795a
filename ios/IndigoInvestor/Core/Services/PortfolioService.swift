//
//  PortfolioService.swift
//  IndigoInvestor
//
//  Portfolio service for fetching and managing portfolio data
//

import Foundation
import Supabase
import Combine

protocol PortfolioServiceProtocol {
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio
    func subscribeToPortfolioUpdates(investorId: UUID) -> AsyncStream<Portfolio>
    func refreshPortfolioData(for investorId: UUID) async throws -> Portfolio
}

@MainActor
class PortfolioService: PortfolioServiceProtocol, ObservableObject {
    private let repository: PortfolioRepositoryProtocol
    private let realtimeService: RealtimeServiceProtocol
    private var portfolioSubscriptions: [UUID: Task<Void, Never>] = [:]
    
    init(repository: PortfolioRepositoryProtocol, realtimeService: RealtimeServiceProtocol) {
        self.repository = repository
        self.realtimeService = realtimeService
    }
    
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        do {
            return try await repository.fetchPortfolio(for: investorId)
        } catch {
            // Log error and handle specific error types
            print("❌ Portfolio fetch failed for investor \(investorId): \(error)")
            throw PortfolioError.fetchFailed(error)
        }
    }
    
    func subscribeToPortfolioUpdates(investorId: UUID) -> AsyncStream<Portfolio> {
        return AsyncStream { continuation in
            let task = Task {
                await withTaskCancellation {
                    // Subscribe to realtime updates
                    realtimeService.subscribeToChannel("portfolios:investor:\(investorId.uuidString)") { payload in
                        Task {
                            do {
                                // Parse updated portfolio data
                                if let updatedPortfolio = try await self.parsePortfolioUpdate(payload) {
                                    continuation.yield(updatedPortfolio)
                                }
                            } catch {
                                print("❌ Failed to parse portfolio update: \(error)")
                            }
                        }
                    }
                } onCancel: {
                    self.realtimeService.unsubscribeFromChannel("portfolios:investor:\(investorId.uuidString)")
                    continuation.finish()
                }
            }
            
            portfolioSubscriptions[investorId] = task
            
            continuation.onTermination = { @Sendable _ in
                task.cancel()
                self.portfolioSubscriptions.removeValue(forKey: investorId)
            }
        }
    }
    
    func refreshPortfolioData(for investorId: UUID) async throws -> Portfolio {
        do {
            let portfolio = try await repository.refreshPortfolioFromNetwork(for: investorId)
            return portfolio
        } catch {
            print("❌ Portfolio refresh failed for investor \(investorId): \(error)")
            throw PortfolioError.refreshFailed(error)
        }
    }
    
    private func parsePortfolioUpdate(_ payload: [String: Any]) async throws -> Portfolio? {
        // Convert realtime payload to Portfolio model
        guard let data = try? JSONSerialization.data(withJSONObject: payload["new"] ?? [:]) else {
            return nil
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode(Portfolio.self, from: data)
    }
}

// MARK: - Portfolio Service Errors

enum PortfolioError: LocalizedError {
    case fetchFailed(Error)
    case refreshFailed(Error)
    case subscriptionFailed(Error)
    case invalidData
    
    var errorDescription: String? {
        switch self {
        case .fetchFailed(let error):
            return "Failed to fetch portfolio: \(error.localizedDescription)"
        case .refreshFailed(let error):
            return "Failed to refresh portfolio: \(error.localizedDescription)"
        case .subscriptionFailed(let error):
            return "Failed to subscribe to portfolio updates: \(error.localizedDescription)"
        case .invalidData:
            return "Invalid portfolio data received"
        }
    }
}
