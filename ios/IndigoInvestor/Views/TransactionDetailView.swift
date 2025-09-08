//
//  TransactionDetailView.swift
//  IndigoInvestor
//
//  Detailed view for displaying transaction information
//

import SwiftUI

struct TransactionDetailView: View {
    let transaction: Transaction
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var showShareSheet = false
    @State private var showDocuments = false
    
    private var amountColor: Color {
        switch transaction.type {
        case .deposit, .interest:
            return .green
        case .withdrawal, .fee:
            return .red
        case .adjustment:
            return transaction.amount >= 0 ? .green : .red
        }
    }
    
    private var statusColor: Color {
        switch transaction.status {
        case .completed:
            return .green
        case .pending:
            return IndigoTheme.secondaryColor
        case .failed:
            return .red
        case .cancelled:
            return .gray
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Section
                    headerSection
                    
                    // Amount Section
                    amountSection
                    
                    // Details Section
                    detailsSection
                    
                    // Timeline Section
                    if transaction.status == .pending {
                        timelineSection
                    }
                    
                    // Related Documents
                    if hasRelatedDocuments {
                        documentsSection
                    }
                    
                    // Actions Section
                    if transaction.status == .pending {
                        actionsSection
                    }
                }
                .padding()
            }
            .background(IndigoTheme.backgroundColor(for: colorScheme))
            .navigationTitle("Transaction Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [generateTransactionSummary()])
        }
        .sheet(isPresented: $showDocuments) {
            DocumentsListView(transactionId: transaction.id)
        }
    }
    
    // MARK: - View Components
    
    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: transaction.type.icon)
                .font(.system(size: 48))
                .foregroundColor(amountColor)
            
            Text(transaction.type.displayName)
                .font(.title2)
                .fontWeight(.semibold)
            
            HStack {
                Image(systemName: "circle.fill")
                    .font(.system(size: 8))
                    .foregroundColor(statusColor)
                
                Text(transaction.status.rawValue.capitalized)
                    .font(.subheadline)
                    .foregroundColor(statusColor)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(statusColor.opacity(0.1))
            .cornerRadius(12)
        }
        .frame(maxWidth: .infinity)
    }
    
    private var amountSection: some View {
        VStack(spacing: 8) {
            Text(transaction.formattedAmount)
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundColor(amountColor)
            
            if let balanceAfter = transaction.balanceAfter {
                Text("Balance after: \(formatCurrency(balanceAfter))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(amountColor.opacity(0.05))
        )
    }
    
    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("TRANSACTION DETAILS")
                .font(.caption)
                .foregroundColor(.secondary)
            
            VStack(spacing: 12) {
                DetailRow(label: "Transaction ID", value: transaction.id.uuidString.prefix(8).uppercased())
                DetailRow(label: "Date", value: formatDate(transaction.createdAt))
                DetailRow(label: "Time", value: formatTime(transaction.createdAt))
                
                if let description = transaction.description {
                    DetailRow(label: "Description", value: description)
                }
                
                if let reference = transaction.referenceNumber {
                    DetailRow(label: "Reference", value: reference)
                }
                
                if transaction.type == .withdrawal || transaction.type == .deposit {
                    DetailRow(label: "Bank Account", value: "****\(transaction.bankAccountLast4 ?? "N/A")")
                }
                
                if let method = transaction.paymentMethod {
                    DetailRow(label: "Payment Method", value: method)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.05))
        )
    }
    
    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("PROCESSING TIMELINE")
                .font(.caption)
                .foregroundColor(.secondary)
            
            VStack(alignment: .leading, spacing: 12) {
                TimelineItem(
                    title: "Request Submitted",
                    date: transaction.createdAt,
                    isCompleted: true
                )
                
                TimelineItem(
                    title: "Under Review",
                    date: Date().addingTimeInterval(86400),
                    isCompleted: false,
                    isCurrent: true
                )
                
                TimelineItem(
                    title: "Processing",
                    date: Date().addingTimeInterval(172800),
                    isCompleted: false
                )
                
                TimelineItem(
                    title: "Completed",
                    date: Date().addingTimeInterval(432000),
                    isCompleted: false
                )
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(IndigoTheme.secondaryColor.opacity(0.05))
            )
        }
    }
    
    private var documentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("RELATED DOCUMENTS")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Button {
                showDocuments = true
            } label: {
                HStack {
                    Image(systemName: "doc.text")
                    Text("View Documents")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.05))
                )
            }
            .foregroundColor(.primary)
        }
    }
    
    private var actionsSection: some View {
        VStack(spacing: 12) {
            if transaction.type == .withdrawal && transaction.status == .pending {
                Button {
                    cancelTransaction()
                } label: {
                    Label("Cancel Withdrawal", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(12)
                }
            }
            
            Button {
                contactSupport()
            } label: {
                Label("Contact Support", systemImage: "questionmark.circle")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(IndigoTheme.primaryColor.opacity(0.1))
                    .foregroundColor(IndigoTheme.primaryColor)
                    .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Helper Views
    
    private struct DetailRow: View {
        let label: String
        let value: String
        
        var body: some View {
            HStack {
                Text(label)
                    .foregroundColor(.secondary)
                Spacer()
                Text(value)
                    .fontWeight(.medium)
            }
        }
    }
    
    private struct TimelineItem: View {
        let title: String
        let date: Date
        let isCompleted: Bool
        var isCurrent: Bool = false
        
        var body: some View {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(isCompleted ? Color.green : (isCurrent ? IndigoTheme.secondaryColor : Color.gray.opacity(0.3)))
                        .frame(width: 12, height: 12)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 6, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .offset(y: 2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(isCurrent ? .semibold : .regular)
                    
                    Text(formatDate(date))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private var hasRelatedDocuments: Bool {
        // Check if transaction has related documents
        return transaction.type == .withdrawal || 
               transaction.type == .deposit ||
               transaction.amount > 10000
    }
    
    private func generateTransactionSummary() -> String {
        """
        Transaction Details
        
        Type: \(transaction.type.displayName)
        Amount: \(transaction.formattedAmount)
        Date: \(formatDate(transaction.createdAt))
        Status: \(transaction.status.rawValue.capitalized)
        Transaction ID: \(transaction.id.uuidString.prefix(8))
        """
    }
    
    private func cancelTransaction() {
        // Implement transaction cancellation
    }
    
    private func contactSupport() {
        // Navigate to support
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

// MARK: - Supporting Views

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

struct DocumentsListView: View {
    let transactionId: UUID
    
    var body: some View {
        NavigationView {
            List {
                // Mock documents list
                Text("Transaction Confirmation")
                Text("Bank Transfer Receipt")
            }
            .navigationTitle("Related Documents")
        }
    }
}

// MARK: - Transaction Type Extension

extension Transaction.TransactionType {
    var icon: String {
        switch self {
        case .deposit:
            return "arrow.down.circle.fill"
        case .withdrawal:
            return "arrow.up.circle.fill"
        case .interest:
            return "percent"
        case .fee:
            return "dollarsign.circle"
        case .adjustment:
            return "arrow.left.arrow.right"
        }
    }
    
    var displayName: String {
        switch self {
        case .deposit:
            return "Deposit"
        case .withdrawal:
            return "Withdrawal"
        case .interest:
            return "Interest Payment"
        case .fee:
            return "Fee"
        case .adjustment:
            return "Adjustment"
        }
    }
}
