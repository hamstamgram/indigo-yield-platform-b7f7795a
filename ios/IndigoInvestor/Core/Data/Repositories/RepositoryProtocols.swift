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

// MARK: - Placeholder Implementations (Phase 1)
// TODO: Replace with proper implementations in Phase 2

class PortfolioRepositoryImpl: PortfolioRepositoryProtocol {
    private let supabase: SupabaseClient
    private let coreData: CoreDataStack
    private let offlineManager: OfflineManagerProtocol
    
    init(supabase: SupabaseClient, coreData: CoreDataStack, offlineManager: OfflineManagerProtocol) {
        self.supabase = supabase
        self.coreData = coreData
        self.offlineManager = offlineManager
    }
    
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio {
        // Placeholder implementation - returns mock data
        return Portfolio.mockPortfolio(for: investorId)
    }
    
    func refreshPortfolioFromNetwork(for investorId: UUID) async throws -> Portfolio {
        // Placeholder implementation - returns mock data
        return Portfolio.mockPortfolio(for: investorId)
    }
    
    func cachePortfolio(_ portfolio: Portfolio) async throws {
        // Placeholder implementation
        print("📝 Caching portfolio: \(portfolio.id)")
    }
}

class TransactionRepositoryImpl: TransactionRepositoryProtocol {
    private let supabase: SupabaseClient
    private let coreData: CoreDataStack
    private let offlineManager: OfflineManagerProtocol
    
    init(supabase: SupabaseClient, coreData: CoreDataStack, offlineManager: OfflineManagerProtocol) {
        self.supabase = supabase
        self.coreData = coreData
        self.offlineManager = offlineManager
    }
    
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction] {
        // Placeholder implementation - returns mock data
        return Transaction.mockTransactions(for: investorId, limit: limit)
    }
    
    func fetchTransaction(id: UUID) async throws -> Transaction {
        // Placeholder implementation - returns mock data
        return Transaction.mockTransaction(id: id)
    }
}

class StatementRepositoryImpl: StatementRepositoryProtocol {
    private let supabase: SupabaseClient
    private let storageService: StorageServiceProtocol
    private let coreData: CoreDataStack
    
    init(supabase: SupabaseClient, storageService: StorageServiceProtocol, coreData: CoreDataStack) {
        self.supabase = supabase
        self.storageService = storageService
        self.coreData = coreData
    }
    
    func fetchStatements(for investorId: UUID) async throws -> [Statement] {
        // Placeholder implementation - returns mock data
        return Statement.mockStatements(for: investorId)
    }
}

class WithdrawalRepositoryImpl: WithdrawalRepositoryProtocol {
    private let supabase: SupabaseClient
    private let coreData: CoreDataStack
    private let offlineManager: OfflineManagerProtocol
    
    init(supabase: SupabaseClient, coreData: CoreDataStack, offlineManager: OfflineManagerProtocol) {
        self.supabase = supabase
        self.coreData = coreData
        self.offlineManager = offlineManager
    }
    
    func fetchWithdrawalRequests(for investorId: UUID) async throws -> [WithdrawalRequest] {
        // Placeholder implementation - returns mock data
        return WithdrawalRequest.mockRequests(for: investorId)
    }
    
    func submitWithdrawalRequest(_ request: WithdrawalRequest) async throws {
        // Placeholder implementation
        print("📝 Submitting withdrawal request: \(request.id)")
    }
    
    func cancelWithdrawalRequest(id: UUID) async throws {
        // Placeholder implementation
        print("📝 Cancelling withdrawal request: \(id)")
    }
    
    func getWithdrawalRequest(id: UUID) async throws -> WithdrawalRequest {
        // Placeholder implementation - returns mock data
        return WithdrawalRequest.mockRequest(id: id)
    }
}

class StorageService: StorageServiceProtocol {
    private let client: SupabaseClient
    
    init(client: SupabaseClient) {
        self.client = client
    }
    
    func createSignedURL(path: String, expiresIn: Int) async throws -> URL {
        // Placeholder implementation - returns mock URL
        return URL(string: "https://example.com/signed/\(path)?expires=\(expiresIn)")!
    }
    
    func uploadFile(path: String, data: Data) async throws {
        // Placeholder implementation
        print("📝 Uploading file to: \(path)")
    }
    
    func downloadFile(path: String) async throws -> Data {
        // Placeholder implementation - returns empty data
        return Data()
    }
}

// MARK: - Mock Data Extensions

extension Portfolio {
    static func mockPortfolio(for investorId: UUID) -> Portfolio {
        return Portfolio(
            id: UUID(),
            investorId: investorId,
            totalValue: 250000.00,
            totalCost: 200000.00,
            totalGain: 50000.00,
            totalGainPercent: 25.0,
            dayChange: 1250.00,
            dayChangePercent: 0.5,
            weekChange: 3750.00,
            weekChangePercent: 1.5,
            monthChange: 12500.00,
            monthChangePercent: 5.0,
            yearChange: 50000.00,
            yearChangePercent: 25.0,
            lastUpdated: Date(),
            positions: [],
            assetAllocation: [],
            performanceHistory: []
        )
    }
}

extension Transaction {
    static func mockTransactions(for investorId: UUID, limit: Int) -> [Transaction] {
        return (0..<min(limit, 10)).map { index in
            return Transaction(
                id: UUID(),
                investorId: investorId,
                type: index % 2 == 0 ? .deposit : .interest,
                amount: Decimal(Double.random(in: 100...10000)),
                currency: "USD",
                status: .completed,
                description: "Mock transaction \(index + 1)",
                date: Date().addingTimeInterval(-TimeInterval(index * 86400)),
                settledDate: Date().addingTimeInterval(-TimeInterval(index * 86400 - 3600)),
                reference: "REF\(String(format: "%06d", index + 1))",
                metadata: nil
            )
        }
    }
    
    static func mockTransaction(id: UUID) -> Transaction {
        return Transaction(
            id: id,
            investorId: UUID(),
            type: .deposit,
            amount: 5000.00,
            currency: "USD",
            status: .completed,
            description: "Mock single transaction",
            date: Date(),
            settledDate: Date(),
            reference: "REF000001",
            metadata: nil
        )
    }
}

extension Statement {
    static func mockStatements(for investorId: UUID) -> [Statement] {
        return (1...6).map { monthOffset in
            let date = Calendar.current.date(byAdding: .month, value: -monthOffset, to: Date())!
            return Statement(
                id: UUID(),
                investorId: investorId,
                period: DateFormatter().string(from: date),
                startDate: Calendar.current.date(byAdding: .day, value: -30, to: date)!,
                endDate: date,
                fileUrl: "statements/\(investorId)/\(monthOffset).pdf",
                signedUrl: nil,
                generatedAt: date,
                type: .monthly,
                status: .ready
            )
        }
    }
}

extension WithdrawalRequest {
    static func mockRequests(for investorId: UUID) -> [WithdrawalRequest] {
        return [
            WithdrawalRequest(
                id: UUID(),
                investorId: investorId,
                amount: 10000.00,
                currency: "USD",
                status: .pending,
                requestedAt: Date().addingTimeInterval(-86400),
                processedAt: nil,
                approvedBy: nil,
                rejectionReason: nil,
                bankDetails: nil,
                twoFactorVerified: true
            )
        ]
    }
    
    static func mockRequest(id: UUID) -> WithdrawalRequest {
        return WithdrawalRequest(
            id: id,
            investorId: UUID(),
            amount: 5000.00,
            currency: "USD",
            status: .pending,
            requestedAt: Date(),
            processedAt: nil,
            approvedBy: nil,
            rejectionReason: nil,
            bankDetails: nil,
            twoFactorVerified: true
        )
    }
}
