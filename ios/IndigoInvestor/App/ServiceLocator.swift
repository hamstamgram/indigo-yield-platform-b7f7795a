//
//  ServiceLocator.swift
//  IndigoInvestor
//
//  Central service locator for dependency injection
//

import Foundation
import Supabase
import Combine

class ServiceLocator: ObservableObject {
    // MARK: - Singleton Instance
    static let shared = ServiceLocator()
    
    // MARK: - Services
    private(set) var supabaseClient: SupabaseClient?
    private(set) var authService: AuthService!
    private(set) var portfolioService: PortfolioService!
    private(set) var transactionService: TransactionService!
    private(set) var documentService: DocumentService!
    private(set) var withdrawalService: WithdrawalService!
    private(set) var adminService: AdminService!
    private(set) var storageService: StorageService!
    private(set) var realtimeService: RealtimeService!
    private(set) var offlineManager: OfflineManager!
    private(set) var keychainManager: KeychainManager!
    private(set) var biometricManager: BiometricAuthManager!
    
    // MARK: - Repositories
    private(set) var portfolioRepository: PortfolioRepository!
    private(set) var transactionRepository: TransactionRepository!
    private(set) var statementRepository: StatementRepository!
    private(set) var withdrawalRepository: WithdrawalRepository!
    
    // MARK: - Core Data
    private(set) var coreDataStack: CoreDataStack!
    
    override init() {
        super.init()
        setupServices()
    }
    
    func configureSupabase(url: String, anonKey: String) {
        guard let url = URL(string: url) else {
            fatalError("Invalid Supabase URL")
        }
        
        supabaseClient = SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey,
            options: SupabaseClientOptions(
                db: .init(schema: "public"),
                auth: .init(
                    storage: KeychainLocalStorage(),
                    autoRefreshToken: true
                ),
                global: .init(
                    headers: ["apikey": anonKey],
                    session: URLSession(configuration: .default, delegate: CertificatePinningDelegate(), delegateQueue: nil)
                )
            )
        )
        
        // Initialize services with Supabase client
        initializeServices()
    }
    
    private func setupServices() {
        // Initialize Core Data
        coreDataStack = CoreDataStack()
        
        // Initialize security services
        keychainManager = KeychainManager.shared
        biometricManager = BiometricAuthManager()
        
        // Initialize offline manager
        offlineManager = OfflineManager(coreDataStack: coreDataStack)
    }
    
    private func initializeServices() {
        guard let client = supabaseClient else { return }
        
        // Initialize services
        authService = AuthService(client: client, keychainManager: keychainManager)
        storageService = StorageService(client: client)
        realtimeService = RealtimeService(client: client)
        
        // Initialize repositories
        portfolioRepository = PortfolioRepository(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        transactionRepository = TransactionRepository(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        statementRepository = StatementRepository(
            supabase: client,
            storageService: storageService,
            coreData: coreDataStack
        )
        
        withdrawalRepository = WithdrawalRepository(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        // Initialize business services
        portfolioService = PortfolioService(repository: portfolioRepository)
        transactionService = TransactionService(repository: transactionRepository)
        documentService = DocumentService(
            statementRepository: statementRepository,
            storageService: storageService
        )
        withdrawalService = WithdrawalService(repository: withdrawalRepository)
        adminService = AdminService(
            supabase: client,
            withdrawalRepository: withdrawalRepository
        )
        
        // Set up realtime subscriptions
        setupRealtimeSubscriptions()
    }
    
    private func setupRealtimeSubscriptions() {
        // Portfolio updates
        realtimeService.subscribeToChannel("portfolios:updates") { [weak self] event in
            Task {
                await self?.portfolioRepository.refreshCache()
            }
        }
        
        // Withdrawal status updates
        realtimeService.subscribeToChannel("withdrawal_requests:status") { [weak self] event in
            Task {
                await self?.withdrawalRepository.refreshCache()
            }
        }
    }
}
