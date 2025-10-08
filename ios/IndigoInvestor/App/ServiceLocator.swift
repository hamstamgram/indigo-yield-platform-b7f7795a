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
        print("🔧 Configuring Supabase with URL: \(url)")

        // Validate configuration first
        let config = SupabaseConfig.current
        guard config.isConfigurationValid else {
            fatalError("❌ Invalid Supabase configuration. Check URL and anon key.")
        }

        guard let supabaseURL = URL(string: url) else {
            fatalError("❌ Invalid Supabase URL: \(url)")
        }

        // Use KeychainLocalStorage for secure token storage
        let storage = KeychainLocalStorage(service: "com.indigo.investor")

        // Create URLSession with proper timeout and retry configuration
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 30
        sessionConfig.timeoutIntervalForResource = 60
        sessionConfig.waitsForConnectivity = true
        sessionConfig.requestCachePolicy = .reloadIgnoringLocalCacheData

        do {
            supabaseClient = SupabaseClient(
                supabaseURL: supabaseURL,
                supabaseKey: anonKey,
                options: SupabaseClientOptions(
                    db: .init(schema: "public"),
                    auth: .init(
                        storage: storage,
                        autoRefreshToken: true  // Enable auto refresh for production
                    ),
                    global: .init(
                        headers: [
                            "apikey": anonKey,
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        ],
                        session: URLSession(configuration: sessionConfig)
                    )
                )
            )

            print("✅ Supabase client configured successfully")

            // Initialize services with Supabase client
            initializeServices()

        } catch {
            print("❌ Failed to configure Supabase client: \(error)")
            fatalError("Failed to configure Supabase client: \(error.localizedDescription)")
        }
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

        // Initialize repositories with proper dependencies
        portfolioRepository = PortfolioRepository(
            supabase: client,
            coreData: coreDataStack,
            offlineManager: offlineManager
        )
        transactionRepository = TransactionRepository(coreDataStack: coreDataStack)
        statementRepository = StatementRepository(coreDataStack: coreDataStack)
        withdrawalRepository = WithdrawalRepository(coreDataStack: coreDataStack)

        // Initialize auth service first (as other services depend on it)
        authService = AuthService(
            client: client,
            keychainManager: keychainManager,
            biometricManager: biometricManager
        )

        // Initialize business services with proper dependencies
        portfolioService = PortfolioService(
            repository: portfolioRepository,
            realtimeService: realtimeService
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

        // Run diagnostics in DEBUG mode
        #if DEBUG
        Task {
            await SupabaseDebugger.runFullDiagnostics(client: client)
        }
        #endif
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
