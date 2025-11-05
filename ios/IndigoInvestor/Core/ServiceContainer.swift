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
            fatalError("Missing Supabase configuration")
        }

        return SupabaseClient(supabaseURL: supabaseURL, supabaseKey: anonKey)
    }()

    lazy var authService: AuthenticationServiceProtocol = {
        AuthenticationService(
            supabaseClient: supabaseClient,
            keychainManager: keychainManager
        )
    }()

    lazy var networkService: NetworkServiceProtocol = {
        NetworkService(supabaseClient: supabaseClient)
    }()

    lazy var keychainManager: KeychainManagerProtocol = {
        KeychainManager()
    }()

    lazy var notificationService: NotificationServiceProtocol = {
        NotificationService()
    }()

    // MARK: - Domain Services

    lazy var portfolioService: PortfolioServiceProtocol = {
        PortfolioService(networkService: networkService)
    }()

    lazy var transactionService: TransactionServiceProtocol = {
        TransactionService(networkService: networkService)
    }()

    lazy var documentService: DocumentServiceProtocol = {
        DocumentService(networkService: networkService, supabaseClient: supabaseClient)
    }()

    lazy var reportService: ReportServiceProtocol = {
        ReportService(networkService: networkService)
    }()

    lazy var supportService: SupportServiceProtocol = {
        SupportService(networkService: networkService)
    }()

    lazy var adminService: AdminServiceProtocol = {
        AdminService(networkService: networkService)
    }()

    // MARK: - Repositories

    lazy var portfolioRepository: PortfolioRepositoryProtocol = {
        PortfolioRepository(
            networkService: networkService,
            cacheService: cacheService
        )
    }()

    lazy var transactionRepository: TransactionRepositoryProtocol = {
        TransactionRepository(networkService: networkService)
    }()

    lazy var cacheService: CacheServiceProtocol = {
        CoreDataCacheService()
    }()
}

// MARK: - Service Protocols

protocol AuthenticationServiceProtocol {
    func signIn(email: String, password: String) async throws -> Session
    func signUp(email: String, password: String, fullName: String, company: String) async throws
    func signOut() async throws
    func verifyTOTP(code: String) async throws
    func resetPassword(email: String) async throws
}

protocol NetworkServiceProtocol {
    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T
    func upload(data: Data, to path: String) async throws -> URL
}

protocol KeychainManagerProtocol {
    func save(email: String, password: String) throws
    func retrieveCredentials() throws -> (email: String, password: String)?
    func setBiometricEnabled(_ enabled: Bool) throws
    func isBiometricEnabled() -> Bool
    func deleteCredentials() throws
}

protocol NotificationServiceProtocol {
    func requestAuthorization() async throws
    func registerForRemoteNotifications()
    func handleNotification(_ notification: [AnyHashable: Any])
}

protocol PortfolioServiceProtocol {
    func fetchPortfolio() async throws -> Portfolio
    func fetchAssets() async throws -> [Asset]
    func fetchAssetDetail(id: String) async throws -> AssetDetail
}

protocol TransactionServiceProtocol {
    func fetchTransactions(limit: Int, offset: Int) async throws -> [Transaction]
    func createDeposit(amount: Decimal, method: PaymentMethod) async throws -> Transaction
    func createWithdrawal(amount: Decimal, accountId: String) async throws -> Transaction
}

protocol DocumentServiceProtocol {
    func fetchDocuments() async throws -> [Document]
    func uploadDocument(data: Data, name: String, category: DocumentCategory) async throws -> Document
    func deleteDocument(id: String) async throws
}

protocol ReportServiceProtocol {
    func generateReport(type: ReportType, dateRange: DateRange) async throws -> Report
    func fetchReportHistory() async throws -> [Report]
    func exportReport(id: String, format: ExportFormat) async throws -> URL
}

protocol SupportServiceProtocol {
    func fetchTickets() async throws -> [SupportTicket]
    func createTicket(subject: String, message: String, category: String) async throws -> SupportTicket
    func sendMessage(ticketId: String, message: String) async throws
}

protocol AdminServiceProtocol {
    func fetchInvestors() async throws -> [Investor]
    func fetchPendingTransactions() async throws -> [Transaction]
    func approveWithdrawal(id: String) async throws
    func rejectWithdrawal(id: String, reason: String) async throws
}

protocol PortfolioRepositoryProtocol {
    func fetchPortfolio() async throws -> Portfolio
}

protocol TransactionRepositoryProtocol {
    func fetchTransactions() async throws -> [Transaction]
}

protocol CacheServiceProtocol {
    func save<T: Codable>(_ object: T, key: String) throws
    func retrieve<T: Codable>(key: String) throws -> T?
    func delete(key: String) throws
}

// MARK: - Supporting Types

enum PaymentMethod: String, Codable {
    case applePay
    case bankTransfer
    case wire
    case ach
}

enum DocumentCategory: String, Codable {
    case statement
    case tax
    case trade
    case kyc
    case other
}

enum ReportType: String, Codable {
    case performance
    case tax
    case activity
    case custom
}

enum ExportFormat: String {
    case pdf
    case csv
    case excel
}

struct DateRange {
    let startDate: Date
    let endDate: Date
}

struct APIEndpoint {
    let path: String
    let method: HTTPMethod
    let parameters: [String: Any]?

    enum HTTPMethod: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
    }
}
