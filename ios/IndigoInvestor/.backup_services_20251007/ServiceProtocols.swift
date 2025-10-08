//
//  ServiceProtocols.swift
//  IndigoInvestor
//
//  Protocol definitions for services
//

import Foundation
import Supabase

// Re-export Supabase types
typealias PostgresChangePayload = Any // Placeholder for Supabase Realtime payload
typealias RealtimeChannel = Any // Placeholder for Supabase Realtime channel

// MARK: - Service Protocols

protocol PortfolioServiceProtocol {
    func fetchPortfolio() async
    func refreshPortfolio() async
    func getPerformanceData(for period: TimePeriod) async throws -> [PerformanceDataPoint]
    func getYieldHistory() async throws -> [YieldEntry]
    func subscribeToUpdates()
    func unsubscribeFromUpdates()
}

protocol TransactionServiceProtocol {
    func fetchTransactions(limit: Int) async throws
}

protocol DocumentServiceProtocol {
    func fetchStatements() async throws
    // func getSignedUrl(for statement: Statement) async throws -> URL
}

protocol WithdrawalServiceProtocol {
    func requestWithdrawal(amount: Double, bankAccountId: UUID) async throws
    func fetchWithdrawalRequests() async throws
}

protocol AdminServiceProtocol {
    func fetchAllInvestors() async throws
    func approveWithdrawal(_ withdrawalId: UUID) async throws
    func processDeposit(investorId: UUID, amount: Double) async throws
    func processInterestPayment(investorId: UUID, amount: Double, apy: Double) async throws
}
