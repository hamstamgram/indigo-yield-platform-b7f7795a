//
//  ServiceContainer.swift
//  IndigoInvestor
//
//  Dependency Injection Container for all services
//

import Foundation
import Supabase

/// Main service container providing centralized access to all app services
final class ServiceContainer {
    static let shared = ServiceContainer()

    private init() {}

    // MARK: - Core Services

    lazy var supabaseClient: SupabaseClient = {
        guard let url = ProcessInfo.processInfo.environment["SUPABASE_URL"],
              let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"],
              let supabaseURL = URL(string: url) else {
            // Fallback or fatal error
            return SupabaseClient(supabaseURL: URL(string: "https://placeholder.supabase.co")!, supabaseKey: "placeholder")
        }

        return SupabaseClient(supabaseURL: supabaseURL, supabaseKey: anonKey)
    }()

    lazy var authService: AuthenticationServiceProtocol = {
        // Placeholder - Auth service usually needs complex init
        // Assuming AuthService is initialized elsewhere or we need to adapt
        // For now, return a mock or simple implementation if available
        fatalError("AuthService initialization requires Keychain/Biometric managers")
    }()

    // MARK: - Repositories

    lazy var portfolioRepository: PortfolioRepository = {
        PortfolioRepositoryImpl(
            client: supabaseClient,
            coreDataStack: CoreDataStack(),
            offlineManager: OfflineManager(coreDataStack: CoreDataStack())
        )
    }()

    lazy var transactionRepository: TransactionRepository = {
        TransactionRepositoryImpl(
            client: supabaseClient,
            coreDataStack: CoreDataStack(),
            offlineManager: OfflineManager(coreDataStack: CoreDataStack())
        )
    }()
    
    lazy var statementRepository: StatementRepository = {
        StatementRepositoryImpl(
            client: supabaseClient,
            coreDataStack: CoreDataStack(),
            offlineManager: OfflineManager(coreDataStack: CoreDataStack())
        )
    }()
    
    lazy var withdrawalRepository: WithdrawalRepository = {
        WithdrawalRepositoryImpl(
            client: supabaseClient,
            coreDataStack: CoreDataStack(),
            offlineManager: OfflineManager(coreDataStack: CoreDataStack())
        )
    }()

    // MARK: - Domain Services

    lazy var portfolioService: PortfolioServiceProtocol = {
        // PortfolioService needs to be updated to use Repository
        // For now, assuming Mock or updated class exists
        // Since we didn't refactor PortfolioService class itself (it was in Backup or ViewModels?)
        // We'll leave this as a placeholder or manual init in ViewModels
        fatalError("PortfolioService not fully refactored")
    }()

    lazy var transactionService: TransactionServiceProtocol = {
        TransactionService(repository: transactionRepository)
    }()

    lazy var documentService: DocumentServiceProtocol = {
        DocumentService(
            repository: statementRepository,
            storageService: StorageService(client: supabaseClient)
        )
    }()
    
    lazy var withdrawalService: WithdrawalServiceProtocol = {
        WithdrawalService(repository: withdrawalRepository)
    }()
}

// MARK: - Service Protocols

protocol AuthenticationServiceProtocol {
    // ...
}

protocol PortfolioServiceProtocol {
    func fetchPortfolio(for investorId: UUID) async throws -> Portfolio
    func refreshPortfolioData(for investorId: UUID) async throws -> Portfolio
    func subscribeToPortfolioUpdates(investorId: UUID) -> AsyncStream<Portfolio>
}

protocol TransactionServiceProtocol {
    func fetchTransactions(for investorId: UUID, limit: Int) async throws -> [Transaction]
    func createTransaction(_ transaction: Transaction) async throws
    func subscribeToTransactionUpdates(for investorId: UUID) -> AsyncStream<Transaction>
}

protocol DocumentServiceProtocol {
    func fetchStatements(for userId: UUID) async throws -> [Statement]
    func getSignedUrl(for statement: Statement) async throws -> URL
}

protocol WithdrawalServiceProtocol {
    func fetchWithdrawalRequests(for userId: UUID) async throws -> [WithdrawalRequest]
    func requestWithdrawal(amount: Decimal, bankAccountId: UUID, userId: UUID) async throws
}

