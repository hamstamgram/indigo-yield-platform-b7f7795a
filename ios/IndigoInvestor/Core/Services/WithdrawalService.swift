//
//  WithdrawalService.swift
//  IndigoInvestor
//
//  Withdrawal service for managing withdrawal requests with admin approval workflow
//

import Foundation
import Supabase
import Combine

protocol WithdrawalServiceProtocol {
    func fetchWithdrawalRequests(for investorId: UUID) async throws -> [WithdrawalRequest]
    func submitWithdrawalRequest(_ request: WithdrawalRequest) async throws
    func cancelWithdrawalRequest(id: UUID) async throws
    func getWithdrawalRequest(id: UUID) async throws -> WithdrawalRequest
}

@MainActor
class WithdrawalService: WithdrawalServiceProtocol, ObservableObject {
    private let repository: WithdrawalRepositoryProtocol
    
    init(repository: WithdrawalRepositoryProtocol) {
        self.repository = repository
    }
    
    func fetchWithdrawalRequests(for investorId: UUID) async throws -> [WithdrawalRequest] {
        do {
            return try await repository.fetchWithdrawalRequests(for: investorId)
        } catch {
            print("❌ Withdrawal requests fetch failed for investor \(investorId): \(error)")
            throw WithdrawalError.fetchFailed(error)
        }
    }
    
    func submitWithdrawalRequest(_ request: WithdrawalRequest) async throws {
        // Validate withdrawal request before submission
        try validateWithdrawalRequest(request)
        
        do {
            try await repository.submitWithdrawalRequest(request)
            print("✅ Withdrawal request submitted: \(request.id)")
        } catch {
            print("❌ Withdrawal request submission failed: \(error)")
            throw WithdrawalError.submissionFailed(error)
        }
    }
    
    func cancelWithdrawalRequest(id: UUID) async throws {
        do {
            // Only allow cancellation of pending requests
            let request = try await repository.getWithdrawalRequest(id: id)
            
            guard request.status == .pending else {
                throw WithdrawalError.cannotCancel("Request is not in pending status")
            }
            
            try await repository.cancelWithdrawalRequest(id: id)
            print("✅ Withdrawal request cancelled: \(id)")
        } catch {
            print("❌ Withdrawal request cancellation failed: \(error)")
            throw WithdrawalError.cancellationFailed(error)
        }
    }
    
    func getWithdrawalRequest(id: UUID) async throws -> WithdrawalRequest {
        do {
            return try await repository.getWithdrawalRequest(id: id)
        } catch {
            print("❌ Withdrawal request fetch failed for id \(id): \(error)")
            throw WithdrawalError.fetchFailed(error)
        }
    }
    
    private func validateWithdrawalRequest(_ request: WithdrawalRequest) throws {
        // Basic validation rules
        guard request.amount > 0 else {
            throw WithdrawalError.invalidAmount("Withdrawal amount must be greater than zero")
        }
        
        guard request.amount <= Decimal(1_000_000) else {
            throw WithdrawalError.invalidAmount("Withdrawal amount exceeds maximum limit")
        }
        
        guard request.currency == "USD" else {
            throw WithdrawalError.invalidCurrency("Only USD withdrawals are currently supported")
        }
        
        // Bank details validation (if provided)
        if let bankDetails = request.bankDetails {
            guard !bankDetails.accountName.isEmpty else {
                throw WithdrawalError.invalidBankDetails("Account name is required")
            }
            
            guard !bankDetails.accountNumber.isEmpty else {
                throw WithdrawalError.invalidBankDetails("Account number is required")
            }
            
            guard !bankDetails.routingNumber.isEmpty else {
                throw WithdrawalError.invalidBankDetails("Routing number is required")
            }
            
            guard !bankDetails.bankName.isEmpty else {
                throw WithdrawalError.invalidBankDetails("Bank name is required")
            }
        }
    }
}

// MARK: - Withdrawal Service Errors

enum WithdrawalError: LocalizedError {
    case fetchFailed(Error)
    case submissionFailed(Error)
    case cancellationFailed(Error)
    case cannotCancel(String)
    case invalidAmount(String)
    case invalidCurrency(String)
    case invalidBankDetails(String)
    case insufficientBalance
    case twoFactorRequired
    
    var errorDescription: String? {
        switch self {
        case .fetchFailed(let error):
            return "Failed to fetch withdrawal requests: \(error.localizedDescription)"
        case .submissionFailed(let error):
            return "Failed to submit withdrawal request: \(error.localizedDescription)"
        case .cancellationFailed(let error):
            return "Failed to cancel withdrawal request: \(error.localizedDescription)"
        case .cannotCancel(let message):
            return "Cannot cancel withdrawal: \(message)"
        case .invalidAmount(let message):
            return "Invalid withdrawal amount: \(message)"
        case .invalidCurrency(let message):
            return "Invalid currency: \(message)"
        case .invalidBankDetails(let message):
            return "Invalid bank details: \(message)"
        case .insufficientBalance:
            return "Insufficient balance for withdrawal"
        case .twoFactorRequired:
            return "Two-factor authentication is required for withdrawal requests"
        }
    }
}
