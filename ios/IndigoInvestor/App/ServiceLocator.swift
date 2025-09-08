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
        
        // Initialize core services first
        realtimeService = RealtimeService(client: client)
        storageService = StorageService(client: client)
        offlineManager = OfflineManager(coreDataStack: coreDataStack)
        
        // Initialize repositories with dependencies
        // Note: These repository protocols need to be implemented in Phase 2
        // For now, we'll create placeholder implementations to unblock compilation
        portfolioRepository = PortfolioRepositoryImpl(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        transactionRepository = TransactionRepositoryImpl(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        statementRepository = StatementRepositoryImpl(
            supabase: client,
            storageService: storageService,
            coreData: coreDataStack
        )
        
        withdrawalRepository = WithdrawalRepositoryImpl(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        
        // Initialize business services with repository dependencies
        portfolioService = PortfolioService(
            repository: portfolioRepository,
            realtimeService: realtimeService
        )
        
        transactionService = TransactionService(
            repository: transactionRepository,
            realtimeService: realtimeService
        )
        
        documentService = DocumentService(
            repository: statementRepository,
            storageService: storageService
        )
        
        withdrawalService = WithdrawalService(
            repository: withdrawalRepository
        )
        
        adminService = AdminService(
            supabaseClient: client
        )
        
        authService = AuthService(
            client: client,
            keychainManager: keychainManager
        )
        
        print("✅ All services initialized successfully")
    }
    
    // MARK: - ViewModel Factory Methods
    
    func makeDashboardViewModel() -> DashboardViewModel {
        return DashboardViewModel(
            portfolioService: portfolioService,
            transactionService: transactionService,
            authViewModel: AuthViewModel() // TODO: Inject shared instance
        )
    }
    
    func makePortfolioViewModel() -> PortfolioViewModel {
        return PortfolioViewModel(
            portfolioService: portfolioService
        )
    }
    
    func makeTransactionViewModel() -> TransactionViewModel {
        return TransactionViewModel(
            transactionService: transactionService
        )
    }
    
    func makeAdminDashboardViewModel() -> AdminDashboardViewModel {
        return AdminDashboardViewModel(
            adminService: adminService
        )
    }
    
    func makeWithdrawalViewModel() -> WithdrawalViewModel {
        return WithdrawalViewModel(
            withdrawalService: withdrawalService
        )
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
