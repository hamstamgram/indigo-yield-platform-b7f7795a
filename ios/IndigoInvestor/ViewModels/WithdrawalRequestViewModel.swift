//
//  WithdrawalRequestViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing withdrawal requests
//

import Foundation
import SwiftUI
import Combine

@MainActor
class WithdrawalRequestViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var availableBalance: Double = 0
    @Published var minimumWithdrawal: Double = 100
    @Published var processingFee: Double = 0
    @Published var bankAccounts: [BankAccount] = []
    @Published var isProcessing = false
    @Published var showingSuccess = false
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private let withdrawalService: WithdrawalService
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Computed Properties
    
    var formattedAvailableBalance: String {
        formatCurrency(availableBalance)
    }
    
    var formattedMinimumWithdrawal: String {
        formatCurrency(minimumWithdrawal)
    }
    
    var formattedProcessingFee: String {
        formatCurrency(processingFee)
    }
    
    // MARK: - Initialization
    
    init() {
        self.withdrawalService = WithdrawalService()
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Subscribe to balance updates
        supabaseManager.subscribeToPortfolioUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.loadWithdrawalData()
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    func loadWithdrawalData() {
        Task {
            await fetchAvailableBalance()
            await fetchBankAccounts()
            await fetchWithdrawalSettings()
        }
    }
    
    private func fetchAvailableBalance() async {
        do {
            let response = try await supabaseManager.client
                .from("portfolios")
                .select("available_balance")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .single()
                .execute()
            
            let portfolio = try JSONDecoder().decode(PortfolioBalance.self, from: response.data)
            
            await MainActor.run {
                self.availableBalance = portfolio.availableBalance
            }
        } catch {
            print("Error fetching available balance: \(error)")
        }
    }
    
    private func fetchBankAccounts() async {
        do {
            let response = try await supabaseManager.client
                .from("bank_accounts")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .eq("is_active", true)
                .execute()
            
            let accounts = try JSONDecoder().decode([BankAccountDB].self, from: response.data)
            
            await MainActor.run {
                self.bankAccounts = accounts.map { account in
                    BankAccount(
                        id: account.id,
                        bankName: account.bankName,
                        accountType: account.accountType,
                        lastFourDigits: account.lastFourDigits,
                        isVerified: account.isVerified
                    )
                }
            }
        } catch {
            print("Error fetching bank accounts: \(error)")
        }
    }
    
    private func fetchWithdrawalSettings() async {
        do {
            let response = try await supabaseManager.client
                .from("withdrawal_settings")
                .select("*")
                .single()
                .execute()
            
            let settings = try JSONDecoder().decode(WithdrawalSettings.self, from: response.data)
            
            await MainActor.run {
                self.minimumWithdrawal = settings.minimumAmount
                self.processingFee = settings.processingFee
            }
        } catch {
            // Use default values if settings not found
            print("Error fetching withdrawal settings: \(error)")
        }
    }
    
    // MARK: - Actions
    
    func submitWithdrawal(amount: Double, bankAccount: BankAccount, reason: String?) async {
        isProcessing = true
        errorMessage = nil
        
        do {
            // Validate withdrawal
            try validateWithdrawal(amount: amount, bankAccount: bankAccount)
            
            // Create withdrawal request
            let request = WithdrawalRequestDTO(
                id: UUID(),
                userId: UUID(uuidString: supabaseManager.currentUserId ?? "") ?? UUID(),
                amount: amount,
                processingFee: processingFee,
                netAmount: amount - processingFee,
                bankAccountId: bankAccount.id,
                reason: reason,
                status: .pending,
                requestedAt: Date(),
                processedAt: nil
            )
            
            // Submit to Supabase
            let requestData = try JSONEncoder().encode(request)
            
            _ = try await supabaseManager.client
                .from("withdrawal_requests")
                .insert(requestData)
                .execute()
            
            // Send notification
            await sendWithdrawalNotification(amount: amount)
            
            await MainActor.run {
                self.showingSuccess = true
                self.isProcessing = false
            }
            
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isProcessing = false
            }
        }
    }
    
    private func validateWithdrawal(amount: Double, bankAccount: BankAccount) throws {
        // Check minimum amount
        if amount < minimumWithdrawal {
            throw WithdrawalError.belowMinimum(minimum: minimumWithdrawal)
        }
        
        // Check available balance
        if amount > availableBalance {
            throw WithdrawalError.insufficientFunds
        }
        
        // Check bank account verification
        if !bankAccount.isVerified {
            throw WithdrawalError.unverifiedAccount
        }
        
        // Check for pending withdrawals
        Task {
            let hasPending = try await checkPendingWithdrawals()
            if hasPending {
                throw WithdrawalError.pendingWithdrawal
            }
        }
    }
    
    private func checkPendingWithdrawals() async throws -> Bool {
        let response = try await supabaseManager.client
            .from("withdrawal_requests")
            .select("id")
            .eq("user_id", supabaseManager.currentUserId ?? "")
            .eq("status", "PENDING")
            .execute()
        
        let requests = try JSONDecoder().decode([WithdrawalCheck].self, from: response.data)
        return !requests.isEmpty
    }
    
    private func sendWithdrawalNotification(amount: Double) async {
        // Create in-app notification
        let notification = [
            "user_id": supabaseManager.currentUserId ?? "",
            "title": "Withdrawal Request Submitted",
            "message": "Your withdrawal request for \(formatCurrency(amount)) has been submitted and will be processed within 3-5 business days.",
            "type": "WITHDRAWAL",
            "is_read": false
        ]
        
        do {
            _ = try await supabaseManager.client
                .from("notifications")
                .insert(notification)
                .execute()
        } catch {
            print("Error sending notification: \(error)")
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

// MARK: - Supporting Types

struct PortfolioBalance: Codable {
    let availableBalance: Double
    
    enum CodingKeys: String, CodingKey {
        case availableBalance = "available_balance"
    }
}

struct BankAccountDB: Codable {
    let id: UUID
    let userId: UUID
    let bankName: String
    let accountType: String
    let lastFourDigits: String
    let routingNumber: String
    let accountNumber: String // Encrypted
    let isVerified: Bool
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case bankName = "bank_name"
        case accountType = "account_type"
        case lastFourDigits = "last_four_digits"
        case routingNumber = "routing_number"
        case accountNumber = "account_number"
        case isVerified = "is_verified"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct WithdrawalSettings: Codable {
    let minimumAmount: Double
    let maximumAmount: Double
    let processingFee: Double
    let processingDays: Int
    
    enum CodingKeys: String, CodingKey {
        case minimumAmount = "minimum_amount"
        case maximumAmount = "maximum_amount"
        case processingFee = "processing_fee"
        case processingDays = "processing_days"
    }
}

struct WithdrawalRequestDTO: Codable {
    let id: UUID
    let userId: UUID
    let amount: Double
    let processingFee: Double
    let netAmount: Double
    let bankAccountId: UUID
    let reason: String?
    let status: WithdrawalStatus
    let requestedAt: Date
    let processedAt: Date?

    enum WithdrawalStatus: String, Codable {
        case pending = "PENDING"
        case processing = "PROCESSING"
        case approved = "APPROVED"
        case completed = "COMPLETED"
        case rejected = "REJECTED"
        case cancelled = "CANCELLED"
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case amount
        case processingFee = "processing_fee"
        case netAmount = "net_amount"
        case bankAccountId = "bank_account_id"
        case reason
        case status
        case requestedAt = "requested_at"
        case processedAt = "processed_at"
    }
}

struct WithdrawalCheck: Codable {
    let id: UUID
}

// MARK: - Errors

enum WithdrawalError: LocalizedError {
    case belowMinimum(minimum: Double)
    case insufficientFunds
    case unverifiedAccount
    case pendingWithdrawal
    case processingError(String)
    
    var errorDescription: String? {
        switch self {
        case .belowMinimum(let minimum):
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = "USD"
            let minAmount = formatter.string(from: NSNumber(value: minimum)) ?? "$0"
            return "Minimum withdrawal amount is \(minAmount)"
        case .insufficientFunds:
            return "Insufficient funds available for withdrawal"
        case .unverifiedAccount:
            return "Please verify your bank account before making a withdrawal"
        case .pendingWithdrawal:
            return "You have a pending withdrawal request. Please wait for it to be processed before submitting another."
        case .processingError(let message):
            return message
        }
    }
}
