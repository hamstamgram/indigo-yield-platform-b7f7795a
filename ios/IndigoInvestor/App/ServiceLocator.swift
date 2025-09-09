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
    private(set) var networkMonitor: NetworkMonitor!
    
    // MARK: - Repositories
    private(set) var portfolioRepository: PortfolioRepository!
    private(set) var transactionRepository: TransactionRepository!
    private(set) var statementRepository: StatementRepository!
    private(set) var withdrawalRepository: WithdrawalRepository!
    
    // MARK: - Core Data
    private(set) var coreDataStack: CoreDataStack!
    
    // MARK: - Convenience accessors
    var supabase: SupabaseClient {
        guard let client = supabaseClient else {
            fatalError("Supabase client not configured. Call configureSupabase first.")
        }
        return client
    }
    
    private init() {
        setupServices()
    }
    
    func configureSupabase(url: String, anonKey: String) {
        guard let url = URL(string: url) else {
            fatalError("Invalid Supabase URL: \(url)")
        }
        
        // Create a simple in-memory storage for development
        let storage = InMemoryLocalStorage()
        
        supabaseClient = SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey,
            options: SupabaseClientOptions(
                db: .init(schema: "public"),
                auth: .init(
                    storage: storage,
                    autoRefreshToken: true
                ),
                global: .init(
                    headers: ["apikey": anonKey],
                    session: URLSession(configuration: .default)
                )
            )
        )
        
        // Initialize services with Supabase client
        initializeServices()
    }
    
    private func setupServices() {
        // Initialize Core Data
        coreDataStack = CoreDataStack.shared
        
        // Initialize security services
        keychainManager = KeychainManager.shared
        biometricManager = BiometricAuthManager()
        
        // Initialize network monitor
        networkMonitor = NetworkMonitor()
    }
    
    private func initializeServices() {
        guard let client = supabaseClient else { return }
        
        // Initialize offline manager
        offlineManager = OfflineManager(coreDataStack: coreDataStack, networkMonitor: networkMonitor)
        
        // Initialize core services first
        realtimeService = RealtimeService(supabase: client)
        storageService = StorageService(supabase: client)
        
        // Initialize repositories
        portfolioRepository = PortfolioRepository(coreDataStack: coreDataStack)
        transactionRepository = TransactionRepository(coreDataStack: coreDataStack)
        statementRepository = StatementRepository(coreDataStack: coreDataStack)
        withdrawalRepository = WithdrawalRepository(coreDataStack: coreDataStack)
        
        // Initialize auth service first (as other services depend on it)
        authService = AuthService(supabase: client)
        
        // Initialize business services
        portfolioService = PortfolioService(
            supabase: client,
            authService: authService
        )
        
        transactionService = TransactionService(
            supabase: client,
            authService: authService
        )
        
        documentService = DocumentService(
            supabase: client,
            authService: authService
        )
        
        withdrawalService = WithdrawalService(
            supabase: client,
            authService: authService
        )
        
        adminService = AdminService(supabase: client)
        
        print("✅ All services initialized successfully")
    }
    
    // MARK: - ViewModel Factory Methods
    
    @MainActor
    func makeDashboardViewModel() -> DashboardViewModel {
        return DashboardViewModel()
    }
    
    func makePortfolioViewModel() -> PortfolioViewModel {
        return PortfolioViewModel(
            portfolioService: portfolioService,
            transactionService: transactionService
        )
    }
    
    func makeTransactionViewModel() -> TransactionViewModel {
        return TransactionViewModel(transactionService: transactionService)
    }
    
    func makeAdminDashboardViewModel() -> AdminDashboardViewModel {
        return AdminDashboardViewModel(adminService: adminService)
    }
    
    func makeWithdrawalViewModel() -> WithdrawalViewModel {
        return WithdrawalViewModel(withdrawalService: withdrawalService)
    }
    
    private func setupRealtimeSubscriptions() {
        // Real-time subscriptions will be set up per user after authentication
        // This ensures subscriptions are specific to authenticated users
    }
}
