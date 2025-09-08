//
//  WithdrawalRequestView.swift
//  IndigoInvestor
//
//  View for creating new withdrawal requests
//

import SwiftUI

struct WithdrawalRequestView: View {
    @StateObject private var viewModel = WithdrawalRequestViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var withdrawalAmount = ""
    @State private var selectedBankAccount: BankAccount?
    @State private var withdrawalReason = ""
    @State private var showingConfirmation = false
    @State private var showingBankAccountPicker = false
    @State private var showingAddBankAccount = false
    @State private var agreedToTerms = false
    @FocusState private var isAmountFieldFocused: Bool
    
    private var formattedAmount: String {
        if let amount = Double(withdrawalAmount) {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = "USD"
            return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
        }
        return "$0.00"
    }
    
    private var isValidAmount: Bool {
        guard let amount = Double(withdrawalAmount) else { return false }
        return amount >= viewModel.minimumWithdrawal && amount <= viewModel.availableBalance
    }
    
    private var canSubmit: Bool {
        isValidAmount && selectedBankAccount != nil && agreedToTerms && !viewModel.isProcessing
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.lg) {
                    // Balance Card
                    balanceCard
                    
                    // Withdrawal Amount Input
                    amountInputSection
                    
                    // Bank Account Selection
                    bankAccountSection
                    
                    // Withdrawal Details
                    detailsSection
                    
                    // Fee Information
                    feeInformationCard
                    
                    // Terms Agreement
                    termsSection
                    
                    // Submit Button
                    submitButton
                }
                .padding(.bottom, IndigoTheme.Spacing.xl)
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Request Withdrawal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                
                ToolbarItem(placement: .keyboard) {
                    HStack {
                        Spacer()
                        Button("Done") {
                            isAmountFieldFocused = false
                        }
                    }
                }
            }
            .sheet(isPresented: $showingBankAccountPicker) {
                BankAccountPickerView(selectedAccount: $selectedBankAccount)
            }
            .sheet(isPresented: $showingAddBankAccount) {
                AddBankAccountView { newAccount in
                    selectedBankAccount = newAccount
                }
            }
            .confirmationDialog(
                "Confirm Withdrawal",
                isPresented: $showingConfirmation,
                titleVisibility: .visible
            ) {
                Button("Confirm Withdrawal") {
                    submitWithdrawal()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to withdraw \(formattedAmount)? This action cannot be undone.")
            }
            .alert("Success", isPresented: $viewModel.showingSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your withdrawal request has been submitted and will be processed within 3-5 business days.")
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
            .onAppear {
                viewModel.loadWithdrawalData()
            }
        }
    }
    
    // MARK: - Balance Card
    
    private var balanceCard: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Available Balance")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                    
                    Text(viewModel.formattedAvailableBalance)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(IndigoTheme.Colors.text)
                }
                
                Spacer()
                
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(IndigoTheme.Colors.primary)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Minimum Withdrawal")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                    
                    Text(viewModel.formattedMinimumWithdrawal)
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Processing Time")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                    
                    Text("3-5 Business Days")
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
        .shadow(
            color: IndigoTheme.Shadows.sm.color,
            radius: IndigoTheme.Shadows.sm.radius,
            x: IndigoTheme.Shadows.sm.x,
            y: IndigoTheme.Shadows.sm.y
        )
        .padding(.horizontal)
    }
    
    // MARK: - Amount Input Section
    
    private var amountInputSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("Withdrawal Amount")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            HStack {
                Text("$")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                
                TextField("0.00", text: $withdrawalAmount)
                    .font(.system(size: 24, weight: .medium))
                    .keyboardType(.decimalPad)
                    .focused($isAmountFieldFocused)
                    .onChange(of: withdrawalAmount) { newValue in
                        // Validate and format input
                        let filtered = newValue.filter { "0123456789.".contains($0) }
                        if filtered != newValue {
                            withdrawalAmount = filtered
                        }
                    }
            }
            .padding()
            .background(IndigoTheme.Colors.backgroundTertiary)
            .cornerRadius(IndigoTheme.CornerRadius.md)
            
            // Quick amount buttons
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach([100, 500, 1000, 5000], id: \.self) { amount in
                    Button(action: { withdrawalAmount = String(amount) }) {
                        Text("$\(amount)")
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.primary)
                            .padding(.horizontal, IndigoTheme.Spacing.md)
                            .padding(.vertical, IndigoTheme.Spacing.sm)
                            .background(IndigoTheme.Colors.primary.opacity(0.1))
                            .cornerRadius(IndigoTheme.CornerRadius.sm)
                    }
                }
                
                Spacer()
                
                Button(action: { withdrawalAmount = String(Int(viewModel.availableBalance)) }) {
                    Text("Max")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(.orange)
                        .padding(.horizontal, IndigoTheme.Spacing.md)
                        .padding(.vertical, IndigoTheme.Spacing.sm)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(IndigoTheme.CornerRadius.sm)
                }
            }
            
            // Validation message
            if !withdrawalAmount.isEmpty && !isValidAmount {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                    
                    Text(validationMessage)
                        .font(IndigoTheme.Typography.caption2)
                }
                .foregroundColor(.red)
            }
        }
        .padding(.horizontal)
    }
    
    private var validationMessage: String {
        guard let amount = Double(withdrawalAmount) else {
            return "Please enter a valid amount"
        }
        
        if amount < viewModel.minimumWithdrawal {
            return "Minimum withdrawal amount is \(viewModel.formattedMinimumWithdrawal)"
        }
        
        if amount > viewModel.availableBalance {
            return "Amount exceeds available balance"
        }
        
        return ""
    }
    
    // MARK: - Bank Account Section
    
    private var bankAccountSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("Destination Account")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            if let account = selectedBankAccount {
                BankAccountCard(account: account) {
                    showingBankAccountPicker = true
                }
            } else {
                Button(action: { 
                    if viewModel.bankAccounts.isEmpty {
                        showingAddBankAccount = true
                    } else {
                        showingBankAccountPicker = true
                    }
                }) {
                    HStack {
                        Image(systemName: "building.columns")
                            .font(.system(size: 20))
                        
                        Text(viewModel.bankAccounts.isEmpty ? "Add Bank Account" : "Select Bank Account")
                            .font(IndigoTheme.Typography.body)
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                    }
                    .foregroundColor(IndigoTheme.Colors.primary)
                    .padding()
                    .background(IndigoTheme.Colors.primary.opacity(0.1))
                    .cornerRadius(IndigoTheme.CornerRadius.md)
                }
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - Details Section
    
    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("Reason for Withdrawal (Optional)")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            TextEditor(text: $withdrawalReason)
                .frame(minHeight: 100)
                .padding(8)
                .background(IndigoTheme.Colors.backgroundTertiary)
                .cornerRadius(IndigoTheme.CornerRadius.md)
        }
        .padding(.horizontal)
    }
    
    // MARK: - Fee Information Card
    
    private var feeInformationCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)
                
                Text("Fee Information")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.text)
            }
            
            VStack(spacing: IndigoTheme.Spacing.sm) {
                FeeRow(label: "Withdrawal Amount", value: formattedAmount)
                FeeRow(label: "Processing Fee", value: viewModel.formattedProcessingFee, isNegative: true)
                
                Divider()
                
                FeeRow(
                    label: "You Will Receive",
                    value: calculateNetAmount(),
                    isTotal: true
                )
            }
        }
        .padding()
        .background(Color.blue.opacity(0.05))
        .cornerRadius(IndigoTheme.CornerRadius.md)
        .padding(.horizontal)
    }
    
    private func calculateNetAmount() -> String {
        guard let amount = Double(withdrawalAmount) else { return "$0.00" }
        let netAmount = max(0, amount - viewModel.processingFee)
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: netAmount)) ?? "$0.00"
    }
    
    // MARK: - Terms Section
    
    private var termsSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Toggle(isOn: $agreedToTerms) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("I agree to the withdrawal terms")
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.text)
                    
                    Text("Withdrawals are subject to our terms and may take 3-5 business days to process.")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
            }
            .toggleStyle(CheckboxToggleStyle())
        }
        .padding(.horizontal)
    }
    
    // MARK: - Submit Button
    
    private var submitButton: some View {
        Button(action: { showingConfirmation = true }) {
            if viewModel.isProcessing {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            } else {
                Text("Submit Withdrawal Request")
                    .font(IndigoTheme.Typography.bodyBold)
            }
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background(canSubmit ? IndigoTheme.Colors.primary : Color.gray)
        .cornerRadius(IndigoTheme.CornerRadius.md)
        .disabled(!canSubmit)
        .padding(.horizontal)
        .padding(.top, IndigoTheme.Spacing.lg)
    }
    
    // MARK: - Actions
    
    private func submitWithdrawal() {
        guard let amount = Double(withdrawalAmount),
              let account = selectedBankAccount else { return }
        
        Task {
            await viewModel.submitWithdrawal(
                amount: amount,
                bankAccount: account,
                reason: withdrawalReason.isEmpty ? nil : withdrawalReason
            )
        }
    }
}

// MARK: - Supporting Views

struct BankAccountCard: View {
    let account: BankAccount
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: "building.columns")
                    .font(.system(size: 24))
                    .foregroundColor(IndigoTheme.Colors.primary)
                    .frame(width: 40, height: 40)
                    .background(IndigoTheme.Colors.primary.opacity(0.1))
                    .cornerRadius(IndigoTheme.CornerRadius.sm)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(account.bankName)
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.text)
                    
                    Text("•••• \(account.lastFourDigits)")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
                
                Spacer()
                
                Text("Change")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.primary)
            }
            .padding()
            .background(IndigoTheme.Colors.backgroundTertiary)
            .cornerRadius(IndigoTheme.CornerRadius.md)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FeeRow: View {
    let label: String
    let value: String
    var isNegative: Bool = false
    var isTotal: Bool = false
    
    var body: some View {
        HStack {
            Text(label)
                .font(isTotal ? IndigoTheme.Typography.bodyBold : IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Spacer()
            
            Text(isNegative ? "-\(value)" : value)
                .font(isTotal ? IndigoTheme.Typography.bodyBold : IndigoTheme.Typography.body)
                .foregroundColor(isNegative ? .red : IndigoTheme.Colors.text)
        }
    }
}

struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                .font(.system(size: 20))
                .foregroundColor(configuration.isOn ? IndigoTheme.Colors.primary : IndigoTheme.Colors.textTertiary)
                .onTapGesture {
                    configuration.isOn.toggle()
                }
            
            configuration.label
        }
    }
}

// MARK: - Placeholder Views

struct BankAccountPickerView: View {
    @Binding var selectedAccount: BankAccount?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Select Bank Account")
                .navigationTitle("Bank Accounts")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

struct AddBankAccountView: View {
    let onComplete: (BankAccount) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Add Bank Account")
                .navigationTitle("Add Account")
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
    }
}

// MARK: - Bank Account Model

struct BankAccount: Identifiable {
    let id: UUID
    let bankName: String
    let accountType: String
    let lastFourDigits: String
    let isVerified: Bool
}
