//
//  AdminApprovalsView.swift
//  IndigoInvestor
//
//  Admin view for managing pending approvals
//

import SwiftUI

struct AdminApprovalsView: View {
    @StateObject private var viewModel = AdminApprovalsViewModel()
    @State private var selectedFilter = ApprovalFilter.all
    @State private var selectedApproval: PendingApproval?
    @State private var showingApprovalDetail = false
    @State private var showingBulkActions = false
    @Environment(\.dismiss) private var dismiss
    
    enum ApprovalFilter: String, CaseIterable {
        case all = "All"
        case withdrawals = "Withdrawals"
        case onboarding = "Onboarding"
        case documents = "Documents"
        case urgent = "Urgent"
        
        var icon: String {
            switch self {
            case .all: return "tray.2"
            case .withdrawals: return "arrow.up.circle"
            case .onboarding: return "person.badge.plus"
            case .documents: return "doc.text"
            case .urgent: return "exclamationmark.triangle"
            }
        }
    }
    
    var filteredApprovals: [PendingApproval] {
        viewModel.pendingApprovals.filter { approval in
            switch selectedFilter {
            case .all:
                return true
            case .withdrawals:
                return approval.type == .withdrawal
            case .onboarding:
                return approval.type == .onboarding
            case .documents:
                return approval.type == .document
            case .urgent:
                return approval.priority == .urgent
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Summary Header
                ApprovalsSummaryHeader(
                    totalCount: viewModel.pendingApprovals.count,
                    urgentCount: viewModel.urgentCount,
                    totalValue: viewModel.totalPendingValue
                )
                .padding()
                
                // Filter Tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(ApprovalFilter.allCases, id: \.self) { filter in
                            FilterTab(
                                filter: filter,
                                isSelected: selectedFilter == filter,
                                count: countForFilter(filter)
                            ) {
                                withAnimation {
                                    selectedFilter = filter
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom)
                
                // Approvals List
                if filteredApprovals.isEmpty {
                    EmptyApprovalsView(filter: selectedFilter)
                } else {
                    List {
                        ForEach(filteredApprovals) { approval in
                            ApprovalCard(
                                approval: approval,
                                onApprove: {
                                    viewModel.approve(approval)
                                },
                                onReject: {
                                    viewModel.reject(approval)
                                },
                                onDetail: {
                                    selectedApproval = approval
                                    showingApprovalDetail = true
                                }
                            )
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Pending Approvals")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { showingBulkActions = true }) {
                            Label("Bulk Actions", systemImage: "checklist")
                        }
                        
                        Button(action: { viewModel.refreshApprovals() }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                        
                        Divider()
                        
                        Button(action: { viewModel.exportPending() }) {
                            Label("Export List", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshApprovals()
            }
            .sheet(isPresented: $showingApprovalDetail) {
                if let approval = selectedApproval {
                    ApprovalDetailView(
                        approval: approval,
                        onApprove: {
                            viewModel.approve(approval)
                            showingApprovalDetail = false
                        },
                        onReject: {
                            viewModel.reject(approval)
                            showingApprovalDetail = false
                        }
                    )
                }
            }
            .sheet(isPresented: $showingBulkActions) {
                BulkActionsView(approvals: filteredApprovals)
            }
        }
        .task {
            await viewModel.loadApprovals()
        }
    }
    
    private func countForFilter(_ filter: ApprovalFilter) -> Int {
        switch filter {
        case .all:
            return viewModel.pendingApprovals.count
        case .withdrawals:
            return viewModel.pendingApprovals.filter { $0.type == .withdrawal }.count
        case .onboarding:
            return viewModel.pendingApprovals.filter { $0.type == .onboarding }.count
        case .documents:
            return viewModel.pendingApprovals.filter { $0.type == .document }.count
        case .urgent:
            return viewModel.urgentCount
        }
    }
}

// MARK: - Summary Header

struct ApprovalsSummaryHeader: View {
    let totalCount: Int
    let urgentCount: Int
    let totalValue: Decimal
    
    var body: some View {
        HStack(spacing: 20) {
            SummaryMetric(
                title: "Pending",
                value: "\(totalCount)",
                icon: "clock.fill",
                color: .blue
            )
            
            SummaryMetric(
                title: "Urgent",
                value: "\(urgentCount)",
                icon: "exclamationmark.triangle.fill",
                color: .orange
            )
            
            SummaryMetric(
                title: "Total Value",
                value: totalValue.formatted(.currency(code: "USD").notation(.compactName)),
                icon: "dollarsign.circle.fill",
                color: .green
            )
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Summary Metric

struct SummaryMetric: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Filter Tab

struct FilterTab: View {
    let filter: AdminApprovalsView.ApprovalFilter
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: filter.icon)
                    .font(.subheadline)
                
                Text(filter.rawValue)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : Color.secondary.opacity(0.2))
                        .cornerRadius(6)
                }
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(isSelected ? Color.accentColor : Color(.secondarySystemFill))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Approval Card

struct ApprovalCard: View {
    let approval: PendingApproval
    let onApprove: () -> Void
    let onReject: () -> Void
    let onDetail: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Circle()
                    .fill(approval.type.color.opacity(0.15))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Image(systemName: approval.type.icon)
                            .foregroundColor(approval.type.color)
                    )
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(approval.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    
                    Text(approval.requester)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    if approval.priority == .urgent {
                        Label("Urgent", systemImage: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    
                    Text(approval.requestDate, style: .relative)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Details
            VStack(alignment: .leading, spacing: 8) {
                if let amount = approval.amount {
                    HStack {
                        Text("Amount:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(amount.formatted(.currency(code: "USD")))
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                }
                
                if let reason = approval.reason {
                    Text(reason)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Actions
            HStack(spacing: 12) {
                Button(action: onDetail) {
                    Text("View Details")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.accentColor)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.accentColor.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Button(action: onReject) {
                    Text("Reject")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Button(action: onApprove) {
                    Text("Approve")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.green)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Empty Approvals View

struct EmptyApprovalsView: View {
    let filter: AdminApprovalsView.ApprovalFilter
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("All Caught Up!")
                .font(.headline)
            
            Text(emptyMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyMessage: String {
        switch filter {
        case .all:
            return "No pending approvals at the moment"
        case .withdrawals:
            return "No withdrawal requests pending approval"
        case .onboarding:
            return "No onboarding requests to review"
        case .documents:
            return "No documents waiting for approval"
        case .urgent:
            return "No urgent items requiring immediate attention"
        }
    }
}

// MARK: - Approval Detail View

struct ApprovalDetailView: View {
    let approval: PendingApproval
    let onApprove: () -> Void
    let onReject: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var rejectionReason = ""
    @State private var showingRejectionForm = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 16) {
                        Circle()
                            .fill(approval.type.color.opacity(0.15))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Image(systemName: approval.type.icon)
                                    .font(.largeTitle)
                                    .foregroundColor(approval.type.color)
                            )
                        
                        Text(approval.title)
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        if approval.priority == .urgent {
                            Label("Urgent Request", systemImage: "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.orange)
                                .cornerRadius(20)
                        }
                    }
                    .padding()
                    
                    // Details
                    VStack(spacing: 16) {
                        DetailRow(label: "Requester", value: approval.requester)
                        DetailRow(label: "Type", value: approval.type.rawValue.capitalized)
                        DetailRow(label: "Request Date", value: approval.requestDate.formatted(date: .complete, time: .shortened))
                        
                        if let amount = approval.amount {
                            DetailRow(label: "Amount", value: amount.formatted(.currency(code: "USD")))
                        }
                        
                        if let reason = approval.reason {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Reason")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                Text(reason)
                                    .font(.subheadline)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        
                        // Additional documents or info
                        if approval.hasDocuments {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Supporting Documents")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                ForEach(["Bank Statement.pdf", "ID Verification.pdf"], id: \.self) { doc in
                                    HStack {
                                        Image(systemName: "doc.text")
                                            .foregroundColor(.blue)
                                        Text(doc)
                                            .font(.subheadline)
                                        Spacer()
                                        Button("View") {
                                            // View document
                                        }
                                        .font(.caption)
                                        .foregroundColor(.accentColor)
                                    }
                                    .padding(8)
                                    .background(Color(.tertiarySystemBackground))
                                    .cornerRadius(8)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(16)
                    .padding(.horizontal)
                    
                    // Audit Trail
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Audit Trail")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            ForEach(approval.auditTrail) { entry in
                                AuditTrailRow(entry: entry)
                            }
                        }
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                    
                    // Action Buttons
                    HStack(spacing: 16) {
                        Button(action: {
                            showingRejectionForm = true
                        }) {
                            Text("Reject")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(12)
                        }
                        
                        Button(action: {
                            onApprove()
                        }) {
                            Text("Approve")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .navigationTitle("Approval Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingRejectionForm) {
                RejectionFormView(
                    reason: $rejectionReason,
                    onReject: {
                        onReject()
                        dismiss()
                    }
                )
            }
        }
    }
}

// MARK: - Audit Trail Row

struct AuditTrailRow: View {
    let entry: AuditTrailEntry
    
    var body: some View {
        HStack {
            Circle()
                .fill(entry.action.color.opacity(0.15))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: entry.action.icon)
                        .font(.caption)
                        .foregroundColor(entry.action.color)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.action.description)
                    .font(.subheadline)
                
                Text("\(entry.user) • \(entry.timestamp, style: .relative)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding()
    }
}

// MARK: - Models

struct PendingApproval: Identifiable {
    let id = UUID()
    let title: String
    let requester: String
    let type: ApprovalType
    let priority: Priority
    let requestDate: Date
    let amount: Decimal?
    let reason: String?
    let hasDocuments: Bool
    let auditTrail: [AuditTrailEntry]
    
    enum ApprovalType: String {
        case withdrawal, onboarding, document
        
        var icon: String {
            switch self {
            case .withdrawal: return "arrow.up.circle"
            case .onboarding: return "person.badge.plus"
            case .document: return "doc.text"
            }
        }
        
        var color: Color {
            switch self {
            case .withdrawal: return .blue
            case .onboarding: return .green
            case .document: return .purple
            }
        }
    }
    
    enum Priority {
        case normal, urgent
    }
}

struct AuditTrailEntry: Identifiable {
    let id = UUID()
    let action: AuditAction
    let user: String
    let timestamp: Date
    
    enum AuditAction {
        case created, reviewed, escalated, commented
        
        var description: String {
            switch self {
            case .created: return "Request created"
            case .reviewed: return "Reviewed by compliance"
            case .escalated: return "Escalated to senior admin"
            case .commented: return "Comment added"
            }
        }
        
        var icon: String {
            switch self {
            case .created: return "plus.circle"
            case .reviewed: return "eye"
            case .escalated: return "arrow.up.right.circle"
            case .commented: return "text.bubble"
            }
        }
        
        var color: Color {
            switch self {
            case .created: return .blue
            case .reviewed: return .green
            case .escalated: return .orange
            case .commented: return .purple
            }
        }
    }
}

// MARK: - View Model

@MainActor
class AdminApprovalsViewModel: ObservableObject {
    @Published var pendingApprovals: [PendingApproval] = []
    @Published var urgentCount = 0
    @Published var totalPendingValue: Decimal = 0
    
    func loadApprovals() async {
        // Generate mock data
        pendingApprovals = [
            PendingApproval(
                title: "Withdrawal Request - John Smith",
                requester: "john.smith@email.com",
                type: .withdrawal,
                priority: .urgent,
                requestDate: Date().addingTimeInterval(-3600),
                amount: 75000,
                reason: "Urgent family medical expenses",
                hasDocuments: true,
                auditTrail: [
                    AuditTrailEntry(action: .created, user: "John Smith", timestamp: Date().addingTimeInterval(-3600)),
                    AuditTrailEntry(action: .reviewed, user: "Compliance Bot", timestamp: Date().addingTimeInterval(-1800))
                ]
            ),
            PendingApproval(
                title: "New Investor Onboarding",
                requester: "sarah.jones@email.com",
                type: .onboarding,
                priority: .normal,
                requestDate: Date().addingTimeInterval(-7200),
                amount: 250000,
                reason: "Initial investment",
                hasDocuments: true,
                auditTrail: [
                    AuditTrailEntry(action: .created, user: "Sarah Jones", timestamp: Date().addingTimeInterval(-7200))
                ]
            ),
            PendingApproval(
                title: "Document Verification",
                requester: "mike.wilson@email.com",
                type: .document,
                priority: .normal,
                requestDate: Date().addingTimeInterval(-14400),
                amount: nil,
                reason: "Annual KYC update",
                hasDocuments: true,
                auditTrail: [
                    AuditTrailEntry(action: .created, user: "Mike Wilson", timestamp: Date().addingTimeInterval(-14400)),
                    AuditTrailEntry(action: .commented, user: "Admin", timestamp: Date().addingTimeInterval(-7200))
                ]
            )
        ]
        
        urgentCount = pendingApprovals.filter { $0.priority == .urgent }.count
        totalPendingValue = pendingApprovals.compactMap { $0.amount }.reduce(0, +)
    }
    
    func refreshApprovals() async {
        await loadApprovals()
    }
    
    func approve(_ approval: PendingApproval) {
        pendingApprovals.removeAll { $0.id == approval.id }
        // Process approval
    }
    
    func reject(_ approval: PendingApproval) {
        pendingApprovals.removeAll { $0.id == approval.id }
        // Process rejection
    }
    
    func exportPending() {
        // Export pending approvals
    }
}

// MARK: - Helper Views

struct BulkActionsView: View {
    let approvals: [PendingApproval]
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Select approvals for bulk action")
                    .font(.headline)
                    .padding()
                
                // Implementation for bulk selection
                
                Spacer()
            }
            .navigationTitle("Bulk Actions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct RejectionFormView: View {
    @Binding var reason: String
    let onReject: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Rejection Reason") {
                    TextEditor(text: $reason)
                        .frame(minHeight: 100)
                }
                
                Section {
                    Button(action: {
                        onReject()
                    }) {
                        Text("Confirm Rejection")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.white)
                    }
                    .listRowBackground(Color.red)
                }
            }
            .navigationTitle("Reject Approval")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    AdminApprovalsView()
}
