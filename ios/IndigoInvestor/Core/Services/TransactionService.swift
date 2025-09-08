//
//  TransactionService.swift
//  IndigoInvestor
//
//  Transaction service for fetching and managing transaction data
//

import Foundation
import Supabase
import Combine

protocol TransactionServiceProtocol {
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction]
    func fetchTransaction(id: UUID) async throws -> Transaction
    func fetchRecentTransactions(for investorId: UUID) async throws -> [Transaction]
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction>
}

@MainActor
class TransactionService: TransactionServiceProtocol, ObservableObject {
    private let repository: TransactionRepositoryProtocol
    private let realtimeService: RealtimeServiceProtocol
    private var transactionSubscriptions: [UUID: Task<Void, Never>] = [:]
    
    init(repository: TransactionRepositoryProtocol, realtimeService: RealtimeServiceProtocol) {
        self.repository = repository
        self.realtimeService = realtimeService
    }
    
    func fetchTransactions(for investorId: UUID, limit: Int = 50) async throws -> [Transaction] {
        do {
            return try await repository.fetchTransactions(for: investorId, limit: limit)
        } catch {
            print("❌ Transaction fetch failed for investor \(investorId): \(error)")
            throw TransactionError.fetchFailed(error)
        }
    }
    
    func fetchTransaction(id: UUID) async throws -> Transaction {
        do {
            return try await repository.fetchTransaction(id: id)
        } catch {
            print("❌ Single transaction fetch failed for id \(id): \(error)")
            throw TransactionError.fetchFailed(error)
        }
    }
    
    func fetchRecentTransactions(for investorId: UUID) async throws -> [Transaction] {
        do {
            return try await repository.fetchTransactions(for: investorId, limit: 10)
        } catch {
            print("❌ Recent transactions fetch failed for investor \(investorId): \(error)")
            throw TransactionError.fetchFailed(error)
        }
    }
    
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction> {
        return AsyncStream { continuation in
            let task = Task {
                await withTaskCancellation {
                    // Subscribe to new transactions for this investor
                    realtimeService.subscribeToChannel("transactions:investor:\(investorId.uuidString)") { payload in
                        Task {
                            do {
                                if let newTransaction = try await self.parseTransactionUpdate(payload) {
                                    continuation.yield(newTransaction)
                                }
                            } catch {
                                print("❌ Failed to parse transaction update: \(error)")
                            }
                        }
                    }
                } onCancel: {
                    self.realtimeService.unsubscribeFromChannel("transactions:investor:\(investorId.uuidString)")
                    continuation.finish()
                }
            }
            
            transactionSubscriptions[investorId] = task
            
            continuation.onTermination = { @Sendable _ in
                task.cancel()
                self.transactionSubscriptions.removeValue(forKey: investorId)
            }
        }
    }
    
    private func parseTransactionUpdate(_ payload: [String: Any]) async throws -> Transaction? {
        // Convert realtime payload to Transaction model
        guard let data = try? JSONSerialization.data(withJSONObject: payload["new"] ?? [:]) else {
            return nil
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        return try decoder.decode(Transaction.self, from: data)
    }
}

// MARK: - Transaction Service Errors

enum TransactionError: LocalizedError {
    case fetchFailed(Error)
    case subscriptionFailed(Error)
    case invalidData
    
    var errorDescription: String? {
        switch self {
        case .fetchFailed(let error):
            return "Failed to fetch transactions: \(error.localizedDescription)"
        case .subscriptionFailed(let error):
            return "Failed to subscribe to transaction updates: \(error.localizedDescription)"
        case .invalidData:
            return "Invalid transaction data received"
        }
    }
}
