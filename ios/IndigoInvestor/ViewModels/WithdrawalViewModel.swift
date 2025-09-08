//
//  WithdrawalViewModel.swift
//  IndigoInvestor
//
//  Withdrawal view model for managing withdrawal requests
//

import Foundation
import SwiftUI
import Combine

@MainActor
class WithdrawalViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var withdrawalRequests: [WithdrawalRequest] = []
    @Published var pendingAmount: Decimal = 0
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var showConfirmation = false
    @Published var selectedRequest: WithdrawalRequest?
    
    // Withdrawal form
    @Published var withdrawalAmount = ""
    @Published var bankAccountName = ""
    @Published var bankAccountNumber = ""
    @Published var bankRoutingNumber = ""
    @Published var bankName = ""
    @Published var withdrawalReason = ""
    
    // MARK: - Dependencies
    private let withdrawalService: WithdrawalServiceProtocol
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private var currentInvestorId: UUID?
    
    // MARK: - Initialization
    
    init(withdrawalService: WithdrawalServiceProtocol) {
        self.withdrawalService = withdrawalService
        setupValidation()
    }
    
    // MARK: - Public Methods
    
    func loadWithdrawalRequests(for investorId: UUID) async {
        guard !isLoading else { return }
        
        isLoading = true
        currentInvestorId = investorId
        errorMessage = nil
        
        do {
            let requests = try await withdrawalService.fetchWithdrawalRequests(for: investorId)
            
            self.withdrawalRequests = requests
            self.pendingAmount = calculatePendingAmount(from: requests)
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func submitWithdrawalRequest() async {
        guard validateForm() else { return }
        guard let investorId = currentInvestorId else {
            showError(message: "User not authenticated")
            return
        }
        
        isSubmitting = true
        errorMessage = nil
        
        do {
            guard let amount = Decimal(string: withdrawalAmount) else {
                throw WithdrawalError.invalidAmount("Invalid amount format")
            }
            
            let bankDetails = WithdrawalRequest.BankDetails(
                accountName: bankAccountName,
                accountNumber: encryptAccountNumber(bankAccountNumber),
                routingNumber: encryptRoutingNumber(bankRoutingNumber),
                bankName: bankName
            )
            
            let request = WithdrawalRequest(
                id: UUID(),
                investorId: investorId,
                amount: amount,
                currency: "USD",
                status: .pending,
                requestedAt: Date(),
                processedAt: nil,
                approvedBy: nil,
                rejectionReason: withdrawalReason.isEmpty ? nil : withdrawalReason,
                bankDetails: bankDetails,
                twoFactorVerified: false // Will be verified separately
            )
            
            try await withdrawalService.submitWithdrawalRequest(request)
            
            // Clear form after successful submission
            clearForm()
            
            // Reload requests to show the new one
            await loadWithdrawalRequests(for: investorId)
            
            // Show success confirmation
            showConfirmation = true
            
        } catch {
            handleError(error)
        }
        
        isSubmitting = false
    }
    
    func cancelWithdrawalRequest(_ request: WithdrawalRequest) async {
        do {
            try await withdrawalService.cancelWithdrawalRequest(id: request.id)
            
            // Remove from local list
            withdrawalRequests.removeAll { $0.id == request.id }
            
            // Update pending amount
            pendingAmount = calculatePendingAmount(from: withdrawalRequests)
            
        } catch {
            handleError(error)
        }
    }
    
    func selectRequest(_ request: WithdrawalRequest) {
        selectedRequest = request
    }
    
    func clearSelection() {
        selectedRequest = nil
    }
    
    func clearForm() {
        withdrawalAmount = ""
        bankAccountName = ""
        bankAccountNumber = ""
        bankRoutingNumber = ""
        bankName = ""
        withdrawalReason = ""
    }
    
    // MARK: - Private Methods
    
    private func setupValidation() {
        // Amount validation
        $withdrawalAmount
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] amount in
                self?.validateAmount(amount)
            }
            .store(in: &cancellables)
    }
    
    private func validateForm() -> Bool {
        // Validate amount
        guard !withdrawalAmount.isEmpty,
              let amount = Decimal(string: withdrawalAmount),
              amount > 0 else {
            showError(message: "Please enter a valid withdrawal amount")
            return false
        }
        
        // Validate amount limits
        if amount > 1000000 {
            showError(message: "Withdrawal amount exceeds maximum limit of $1,000,000")
            return false
        }
        
        if amount < 100 {
            showError(message: "Minimum withdrawal amount is $100")
            return false
        }
        
        // Validate bank details
        guard !bankAccountName.isEmpty else {
            showError(message: "Please enter account holder name")
            return false
        }
        
        guard !bankAccountNumber.isEmpty else {
            showError(message: "Please enter account number")
            return false
        }
        
        guard !bankRoutingNumber.isEmpty else {
            showError(message: "Please enter routing number")
            return false
        }
        
        guard bankRoutingNumber.count == 9 else {
            showError(message: "Routing number must be 9 digits")
            return false
        }
        
        guard !bankName.isEmpty else {
            showError(message: "Please enter bank name")
            return false
        }
        
        return true
    }
    
    private func validateAmount(_ amount: String) {
        guard !amount.isEmpty else { return }
        
        if Decimal(string: amount) == nil {
            errorMessage = "Invalid amount format"
            showError = true
        } else {
            errorMessage = nil
            showError = false
        }
    }
    
    private func calculatePendingAmount(from requests: [WithdrawalRequest]) -> Decimal {
        return requests
            .filter { $0.status == .pending || $0.status == .processing }
            .reduce(Decimal(0)) { $0 + $1.amount }
    }
    
    private func encryptAccountNumber(_ number: String) -> String {
        // In production, use proper encryption
        // For now, mask all but last 4 digits
        let maskedCount = max(0, number.count - 4)
        let masked = String(repeating: "*", count: maskedCount)
        let lastFour = String(number.suffix(4))
        return masked + lastFour
    }
    
    private func encryptRoutingNumber(_ number: String) -> String {
        // In production, use proper encryption
        // For now, mask all but last 4 digits
        let maskedCount = max(0, number.count - 4)
        let masked = String(repeating: "*", count: maskedCount)
        let lastFour = String(number.suffix(4))
        return masked + lastFour
    }
    
    private func handleError(_ error: Error) {
        print("❌ Withdrawal error: \(error)")
        
        errorMessage = error.localizedDescription
        showError = true
        
        // Log error for analytics
        logError(error)
    }
    
    private func showError(message: String) {
        errorMessage = message
        showError = true
    }
    
    private func logError(_ error: Error) {
        let errorInfo = [
            "error": error.localizedDescription,
            "timestamp": Date().iso8601String,
            "investor_id": currentInvestorId?.uuidString ?? "unknown",
            "screen": "Withdrawal"
        ]
        
        print("📊 Error logged: \(errorInfo)")
    }
}

// MARK: - Computed Properties

extension WithdrawalViewModel {
    var formattedPendingAmount: String {
        return pendingAmount.formatted(.currency(code: "USD"))
    }
    
    var hasRequests: Bool {
        return !withdrawalRequests.isEmpty
    }
    
    var pendingRequests: [WithdrawalRequest] {
        return withdrawalRequests.filter { $0.status == .pending }
    }
    
    var processingRequests: [WithdrawalRequest] {
        return withdrawalRequests.filter { $0.status == .processing }
    }
    
    var completedRequests: [WithdrawalRequest] {
        return withdrawalRequests.filter { $0.status == .completed }
    }
    
    var rejectedRequests: [WithdrawalRequest] {
        return withdrawalRequests.filter { $0.status == .rejected }
    }
    
    var canSubmitNewRequest: Bool {
        // Check if there's no pending request already
        return pendingRequests.isEmpty && !isSubmitting
    }
    
    var withdrawalAmountDecimal: Decimal? {
        return Decimal(string: withdrawalAmount)
    }
    
    var formattedWithdrawalAmount: String {
        guard let amount = withdrawalAmountDecimal else { return "$0.00" }
        return amount.formatted(.currency(code: "USD"))
    }
}

// MARK: - Mock Data for Previews

#if DEBUG
extension WithdrawalViewModel {
    static var preview: WithdrawalViewModel {
        let mockService = MockWithdrawalService()
        let viewModel = WithdrawalViewModel(withdrawalService: mockService)
        
        // Set up mock data
        viewModel.withdrawalRequests = WithdrawalRequest.mockRequests(for: UUID())
        viewModel.pendingAmount = 10000
        
        return viewModel
    }
}

private class MockWithdrawalService: WithdrawalServiceProtocol {
    func fetchWithdrawalRequests(for investorId: UUID) async throws -> [WithdrawalRequest] {
        return WithdrawalRequest.mockRequests(for: investorId)
    }
    
    func submitWithdrawalRequest(_ request: WithdrawalRequest) async throws {
        // Mock implementation
    }
    
    func cancelWithdrawalRequest(id: UUID) async throws {
        // Mock implementation
    }
    
    func getWithdrawalRequest(id: UUID) async throws -> WithdrawalRequest {
        return WithdrawalRequest.mockRequest(id: id)
    }
}
#endif
