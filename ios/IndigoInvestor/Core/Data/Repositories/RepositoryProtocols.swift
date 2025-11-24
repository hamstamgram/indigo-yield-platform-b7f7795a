//
//  RepositoryProtocols.swift
//  IndigoInvestor
//
//  Repository protocol definitions - Phase 1 placeholders to unblock compilation
//  TODO: Implement proper repository pattern in Phase 2
//

import Foundation
import Supabase

// MARK: - Repository Protocols

protocol PortfolioRepositoryProtocol {
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio
    func refreshPortfolioFromNetwork(for investorId: UUID) async throws -> Portfolio
    func cachePortfolio(_ portfolio: Portfolio) async throws
}

protocol TransactionRepositoryProtocol {
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction]
    func fetchTransaction(id: UUID) async throws -> Transaction
}

protocol StatementRepositoryProtocol {
    func fetchStatements(for investorId: UUID) async throws -> [Statement]
}

protocol WithdrawalRepositoryProtocol {
    func fetchWithdrawalRequests(for investorId: UUID) async throws -> [WithdrawalRequest]
    func submitWithdrawalRequest(_ request: WithdrawalRequest) async throws
    func cancelWithdrawalRequest(id: UUID) async throws
    func getWithdrawalRequest(id: UUID) async throws -> WithdrawalRequest
}

protocol StorageServiceProtocol {
    func createSignedURL(path: String, expiresIn: Int) async throws -> URL
    func uploadFile(path: String, data: Data) async throws
    func downloadFile(path: String) async throws -> Data
}
