import Foundation
import Combine
import SwiftUI

// MARK: - Supporting Types

struct BankAccount: Identifiable {
    let id: UUID
    let accountName: String
    let accountNumber: String
    let bankName: String
    let isVerified: Bool
}

enum WithdrawalError: LocalizedError {
    case invalidInput
    case insufficientFunds
    case accountNotVerified
    
    var errorDescription: String? {
        switch self {
        case .invalidInput:
            return "Please enter a valid withdrawal amount and select a bank account"
        case .insufficientFunds:
            return "Insufficient funds in your portfolio"
        case .accountNotVerified:
            return "Please verify your bank account before requesting a withdrawal"
        }
    }
}
