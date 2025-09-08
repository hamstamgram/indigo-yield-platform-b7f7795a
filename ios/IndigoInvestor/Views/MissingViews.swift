//
//  MissingViews.swift
//  IndigoInvestor
//
//  Collection of views referenced but not yet fully implemented
//

import SwiftUI

// MARK: - Transaction Filter View
struct TransactionFilterView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var dateRange = DateRange.lastMonth
    @State private var transactionType = TransactionType.all
    @State private var minAmount: String = ""
    @State private var maxAmount: String = ""
    
    enum DateRange: String, CaseIterable {
        case lastWeek = "Last Week"
        case lastMonth = "Last Month"
        case lastQuarter = "Last Quarter"
        case lastYear = "Last Year"
        case custom = "Custom"
    }
    
    enum TransactionType: String, CaseIterable {
        case all = "All"
        case deposits = "Deposits"
        case withdrawals = "Withdrawals"
        case interest = "Interest"
        case fees = "Fees"
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Date Range") {
                    Picker("Period", selection: $dateRange) {
                        ForEach(DateRange.allCases, id: \.self) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                
                Section("Transaction Type") {
                    Picker("Type", selection: $transactionType) {
                        ForEach(TransactionType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                }
                
                Section("Amount Range") {
                    HStack {
                        TextField("Min", text: $minAmount)
                            .keyboardType(.decimalPad)
                        Text("to")
                        TextField("Max", text: $maxAmount)
                            .keyboardType(.decimalPad)
                    }
                }
            }
            .navigationTitle("Filter Transactions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") { 
                        // Apply filters
                        dismiss()
                    }
                    .bold()
                }
            }
        }
    }
}

// MARK: - Document Viewer View
struct DocumentViewerView: View {
    let documentId: String
    @State private var isLoading = true
    @State private var documentURL: URL?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading document...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let url = documentURL {
                    PDFViewer(url: url)
                } else {
                    ContentUnavailableView(
                        "Document Not Found",
                        systemImage: "doc.text",
                        description: Text("The requested document could not be loaded.")
                    )
                }
            }
            .navigationTitle("Document Viewer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .task {
            // Simulate loading
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            isLoading = false
            // In real app, would fetch document from Supabase
        }
    }
}

// MARK: - Profile Settings View
struct ProfileSettingsView: View {
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    
    var body: some View {
        Form {
            Section("Personal Information") {
                TextField("First Name", text: $firstName)
                TextField("Last Name", text: $lastName)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
            }
            
            Section("Address") {
                TextField("Street Address", text: $address)
            }
            
            Section {
                Button("Save Changes") {
                    // Save profile updates
                }
                .frame(maxWidth: .infinity)
                .bold()
            }
        }
        .navigationTitle("Profile Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Security Settings View
struct SecuritySettingsView: View {
    @State private var biometricsEnabled = true
    @State private var twoFactorEnabled = false
    @State private var showChangePassword = false
    @State private var sessionTimeout = 15
    
    var body: some View {
        Form {
            Section("Authentication") {
                Toggle("Face ID / Touch ID", isOn: $biometricsEnabled)
                Toggle("Two-Factor Authentication", isOn: $twoFactorEnabled)
                
                Button("Change Password") {
                    showChangePassword = true
                }
            }
            
            Section("Session") {
                Picker("Auto-Lock", selection: $sessionTimeout) {
                    Text("5 minutes").tag(5)
                    Text("15 minutes").tag(15)
                    Text("30 minutes").tag(30)
                    Text("1 hour").tag(60)
                }
            }
            
            Section("Security Log") {
                NavigationLink(destination: SecurityLogView()) {
                    Label("View Login History", systemImage: "clock.arrow.circlepath")
                }
            }
        }
        .navigationTitle("Security Settings")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordView()
        }
    }
}

// MARK: - Security Log View
struct SecurityLogView: View {
    var body: some View {
        List {
            ForEach(0..<5) { _ in
                VStack(alignment: .leading, spacing: 4) {
                    Text("Login from iOS App")
                        .font(.subheadline)
                    Text("IP: 192.168.1.1")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(Date(), style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Login History")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Change Password View
struct ChangePasswordView: View {
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Current Password") {
                    SecureField("Current Password", text: $currentPassword)
                }
                
                Section("New Password") {
                    SecureField("New Password", text: $newPassword)
                    SecureField("Confirm New Password", text: $confirmPassword)
                }
                
                Section {
                    Button("Update Password") {
                        // Update password
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .bold()
                    .disabled(newPassword.isEmpty || newPassword != confirmPassword)
                }
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Notification Settings View
struct NotificationSettingsView: View {
    @State private var pushEnabled = true
    @State private var emailEnabled = true
    @State private var transactionAlerts = true
    @State private var statementAlerts = true
    @State private var marketingEmails = false
    
    var body: some View {
        Form {
            Section("Notification Methods") {
                Toggle("Push Notifications", isOn: $pushEnabled)
                Toggle("Email Notifications", isOn: $emailEnabled)
            }
            
            Section("Alert Types") {
                Toggle("Transaction Alerts", isOn: $transactionAlerts)
                Toggle("Statement Available", isOn: $statementAlerts)
                Toggle("Marketing Updates", isOn: $marketingEmails)
            }
            
            Section {
                Button("Save Preferences") {
                    // Save notification preferences
                }
                .frame(maxWidth: .infinity)
                .bold()
            }
        }
        .navigationTitle("Notification Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Withdrawal History View
struct WithdrawalHistoryView: View {
    @State private var withdrawals: [WithdrawalRecord] = []
    
    struct WithdrawalRecord: Identifiable {
        let id = UUID()
        let date: Date
        let amount: Double
        let status: String
        let reference: String
    }
    
    var body: some View {
        List {
            if withdrawals.isEmpty {
                ContentUnavailableView(
                    "No Withdrawals",
                    systemImage: "arrow.down.circle",
                    description: Text("Your withdrawal history will appear here")
                )
                .listRowBackground(Color.clear)
            } else {
                ForEach(withdrawals) { withdrawal in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(withdrawal.amount, format: .currency(code: "USD"))
                                .font(.headline)
                            Spacer()
                            Badge(withdrawal.status)
                        }
                        Text("Ref: \(withdrawal.reference)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(withdrawal.date, style: .date)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Withdrawal History")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            // Load withdrawal history
        }
    }
}

// MARK: - Badge Helper
struct Badge: View {
    let text: String
    
    init(_ text: String) {
        self.text = text
    }
    
    var body: some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color.blue.opacity(0.1))
            .foregroundColor(.blue)
            .cornerRadius(4)
    }
}
