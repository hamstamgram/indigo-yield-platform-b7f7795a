//
//  AdminInvestorsView.swift
//  IndigoInvestor
//
//  Admin view for managing investor accounts
//

import SwiftUI
import Charts

struct AdminInvestorsView: View {
    @StateObject private var viewModel = AdminInvestorsViewModel()
    @State private var searchText = ""
    @State private var selectedFilter = InvestorFilter.all
    @State private var selectedInvestor: InvestorAccount?
    @State private var showingInvestorDetail = false
    @State private var showingAddInvestor = false
    @State private var showingExportOptions = false
    @State private var selectedSortOption = SortOption.name
    @Environment(\.dismiss) private var dismiss
    
    enum InvestorFilter: String, CaseIterable {
        case all = "All"
        case active = "Active"
        case pending = "Pending"
        case suspended = "Suspended"
        case highValue = "High Value"
        
        var icon: String {
            switch self {
            case .all: return "person.3"
            case .active: return "checkmark.circle"
            case .pending: return "clock"
            case .suspended: return "pause.circle"
            case .highValue: return "star.circle"
            }
        }
    }
    
    enum SortOption: String, CaseIterable {
        case name = "Name"
        case invested = "Amount Invested"
        case joinDate = "Join Date"
        case lastActivity = "Last Activity"
    }
    
    var filteredInvestors: [InvestorAccount] {
        let filtered = viewModel.investors.filter { investor in
            // Apply search filter
            let matchesSearch = searchText.isEmpty || 
                investor.name.localizedCaseInsensitiveContains(searchText) ||
                investor.email.localizedCaseInsensitiveContains(searchText)
            
            // Apply status filter
            let matchesFilter: Bool = {
                switch selectedFilter {
                case .all:
                    return true
                case .active:
                    return investor.status == .active
                case .pending:
                    return investor.status == .pending
                case .suspended:
                    return investor.status == .suspended
                case .highValue:
                    return investor.totalInvested >= 1000000
                }
            }()
            
            return matchesSearch && matchesFilter
        }
        
        // Apply sorting
        return filtered.sorted { lhs, rhs in
            switch selectedSortOption {
            case .name:
                return lhs.name < rhs.name
            case .invested:
                return lhs.totalInvested > rhs.totalInvested
            case .joinDate:
                return lhs.joinDate > rhs.joinDate
            case .lastActivity:
                return lhs.lastActivityDate > rhs.lastActivityDate
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Statistics Header
                InvestorStatisticsHeader(
                    totalInvestors: viewModel.investors.count,
                    activeCount: viewModel.activeCount,
                    totalAUM: viewModel.totalAUM,
                    avgInvestment: viewModel.averageInvestment
                )
                .padding()
                
                // Search and Filter Bar
                VStack(spacing: 12) {
                    // Search Field
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("Search by name or email...", text: $searchText)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                    .padding(.horizontal)
                    
                    // Filter Tabs
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(InvestorFilter.allCases, id: \.self) { filter in
                                FilterChip(
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
                    
                    // Sort Options
                    HStack {
                        Text("Sort by:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Picker("Sort", selection: $selectedSortOption) {
                            ForEach(SortOption.allCases, id: \.self) { option in
                                Text(option.rawValue).tag(option)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        
                        Spacer()
                    }
                    .padding(.horizontal)
                }
                
                // Investors List
                if filteredInvestors.isEmpty {
                    EmptyInvestorsView(filter: selectedFilter, searchText: searchText)
                } else {
                    List {
                        ForEach(filteredInvestors) { investor in
                            InvestorRow(
                                investor: investor,
                                onTap: {
                                    selectedInvestor = investor
                                    showingInvestorDetail = true
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
            .navigationTitle("Investor Management")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { showingAddInvestor = true }) {
                            Label("Add Investor", systemImage: "person.badge.plus")
                        }
                        
                        Button(action: { viewModel.refreshInvestors() }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                        
                        Divider()
                        
                        Button(action: { showingExportOptions = true }) {
                            Label("Export Data", systemImage: "square.and.arrow.up")
                        }
                        
                        Button(action: { viewModel.generateReport() }) {
                            Label("Generate Report", systemImage: "doc.text")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshInvestors()
            }
            .sheet(isPresented: $showingInvestorDetail) {
                if let investor = selectedInvestor {
                    InvestorDetailView(investor: investor)
                }
            }
            .sheet(isPresented: $showingAddInvestor) {
                AddInvestorView()
            }
            .sheet(isPresented: $showingExportOptions) {
                ExportOptionsView()
            }
        }
        .task {
            await viewModel.loadInvestors()
        }
    }
    
    private func countForFilter(_ filter: InvestorFilter) -> Int {
        switch filter {
        case .all:
            return viewModel.investors.count
        case .active:
            return viewModel.activeCount
        case .pending:
            return viewModel.pendingCount
        case .suspended:
            return viewModel.suspendedCount
        case .highValue:
            return viewModel.investors.filter { $0.totalInvested >= 1000000 }.count
        }
    }
}

// MARK: - Statistics Header

struct InvestorStatisticsHeader: View {
    let totalInvestors: Int
    let activeCount: Int
    let totalAUM: Decimal
    let avgInvestment: Decimal
    
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                StatCard(
                    title: "Total Investors",
                    value: "\(totalInvestors)",
                    icon: "person.3.fill",
                    color: .indigoBrand
                )
                
                StatCard(
                    title: "Active",
                    value: "\(activeCount)",
                    icon: "checkmark.circle.fill",
                    color: .green
                )
            }
            
            HStack(spacing: 16) {
                StatCard(
                    title: "Total AUM",
                    value: totalAUM.formatted(.currency(code: "USD").notation(.compactName)),
                    icon: "dollarsign.circle.fill",
                    color: .blue
                )
                
                StatCard(
                    title: "Avg Investment",
                    value: avgInvestment.formatted(.currency(code: "USD").notation(.compactName)),
                    icon: "chart.bar.fill",
                    color: .orange
                )
            }
        }
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 40, height: 40)
                .background(color.opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let filter: AdminInvestorsView.InvestorFilter
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
                    .fill(isSelected ? Color.indigoBrand : Color(.secondarySystemFill))
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Investor Row

struct InvestorRow: View {
    let investor: InvestorAccount
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                HStack {
                    // Avatar
                    Circle()
                        .fill(Color.indigoBrand.opacity(0.15))
                        .frame(width: 50, height: 50)
                        .overlay(
                            Text(investor.initials)
                                .font(.headline)
                                .foregroundColor(.indigoBrand)
                        )
                    
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(investor.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            if investor.isVerified {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                        }
                        
                        Text(investor.email)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack(spacing: 8) {
                            StatusBadge(status: investor.status)
                            
                            if investor.totalInvested >= 1000000 {
                                Label("High Value", systemImage: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.orange.opacity(0.1))
                                    .cornerRadius(4)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(investor.totalInvested.formatted(.currency(code: "USD").notation(.compactName)))
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Text("Joined \(investor.joinDate, style: .date)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        if let lastActivity = investor.lastActivityDate {
                            Text("Active \(lastActivity, style: .relative)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Quick Actions
                HStack(spacing: 12) {
                    QuickActionButton(title: "View", icon: "eye", color: .blue) {
                        onTap()
                    }
                    
                    QuickActionButton(title: "Message", icon: "envelope", color: .indigoBrand) {
                        // Send message
                    }
                    
                    QuickActionButton(title: "Statement", icon: "doc.text", color: .green) {
                        // Generate statement
                    }
                    
                    if investor.status == .suspended {
                        QuickActionButton(title: "Activate", icon: "play.circle", color: .orange) {
                            // Activate account
                        }
                    } else {
                        QuickActionButton(title: "Suspend", icon: "pause.circle", color: .red) {
                            // Suspend account
                        }
                    }
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                
                Text(title)
                    .font(.caption2)
            }
            .foregroundColor(color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(color.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: InvestorAccount.Status
    
    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(status.color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(status.color.opacity(0.1))
            .cornerRadius(4)
    }
}

// MARK: - Empty View

struct EmptyInvestorsView: View {
    let filter: AdminInvestorsView.InvestorFilter
    let searchText: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Investors Found")
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
        if !searchText.isEmpty {
            return "No investors match your search criteria"
        }
        
        switch filter {
        case .all:
            return "No investors in the system"
        case .active:
            return "No active investors"
        case .pending:
            return "No pending investor applications"
        case .suspended:
            return "No suspended accounts"
        case .highValue:
            return "No high-value investors (>$1M)"
        }
    }
}

// MARK: - Investor Detail View

struct InvestorDetailView: View {
    let investor: InvestorAccount
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            TabView(selection: $selectedTab) {
                // Overview Tab
                ScrollView {
                    VStack(spacing: 20) {
                        InvestorHeaderView(investor: investor)
                        InvestorMetricsView(investor: investor)
                        RecentActivityView(investor: investor)
                    }
                    .padding()
                }
                .tabItem {
                    Label("Overview", systemImage: "person.crop.circle")
                }
                .tag(0)
                
                // Portfolio Tab
                InvestorPortfolioView(investor: investor)
                    .tabItem {
                        Label("Portfolio", systemImage: "chart.pie")
                    }
                    .tag(1)
                
                // Transactions Tab
                InvestorTransactionsView(investor: investor)
                    .tabItem {
                        Label("Transactions", systemImage: "arrow.left.arrow.right")
                    }
                    .tag(2)
                
                // Documents Tab
                InvestorDocumentsView(investor: investor)
                    .tabItem {
                        Label("Documents", systemImage: "doc.text")
                    }
                    .tag(3)
                
                // Settings Tab
                InvestorSettingsView(investor: investor)
                    .tabItem {
                        Label("Settings", systemImage: "gearshape")
                    }
                    .tag(4)
            }
            .navigationTitle(investor.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Models

struct InvestorAccount: Identifiable {
    let id = UUID()
    let name: String
    let email: String
    let status: Status
    let totalInvested: Decimal
    let currentValue: Decimal
    let joinDate: Date
    let lastActivityDate: Date?
    let isVerified: Bool
    let riskProfile: String
    
    var initials: String {
        let components = name.split(separator: " ")
        let firstInitial = components.first?.first ?? "?"
        let lastInitial = components.count > 1 ? components.last?.first ?? "" : ""
        return "\(firstInitial)\(lastInitial)".uppercased()
    }
    
    enum Status: String {
        case active, pending, suspended, inactive
        
        var color: Color {
            switch self {
            case .active: return .green
            case .pending: return .orange
            case .suspended: return .red
            case .inactive: return .gray
            }
        }
    }
}

// MARK: - View Model

@MainActor
class AdminInvestorsViewModel: ObservableObject {
    @Published var investors: [InvestorAccount] = []
    @Published var activeCount = 0
    @Published var pendingCount = 0
    @Published var suspendedCount = 0
    @Published var totalAUM: Decimal = 0
    @Published var averageInvestment: Decimal = 0
    
    func loadInvestors() async {
        // Mock data
        investors = [
            InvestorAccount(
                name: "John Smith",
                email: "john.smith@email.com",
                status: .active,
                totalInvested: 1500000,
                currentValue: 1750000,
                joinDate: Date().addingTimeInterval(-365 * 24 * 60 * 60),
                lastActivityDate: Date().addingTimeInterval(-3600),
                isVerified: true,
                riskProfile: "Moderate"
            ),
            InvestorAccount(
                name: "Sarah Johnson",
                email: "sarah.j@email.com",
                status: .active,
                totalInvested: 750000,
                currentValue: 825000,
                joinDate: Date().addingTimeInterval(-180 * 24 * 60 * 60),
                lastActivityDate: Date().addingTimeInterval(-7200),
                isVerified: true,
                riskProfile: "Conservative"
            ),
            InvestorAccount(
                name: "Michael Chen",
                email: "m.chen@email.com",
                status: .pending,
                totalInvested: 250000,
                currentValue: 250000,
                joinDate: Date().addingTimeInterval(-7 * 24 * 60 * 60),
                lastActivityDate: nil,
                isVerified: false,
                riskProfile: "Aggressive"
            ),
            InvestorAccount(
                name: "Emily Davis",
                email: "emily.d@email.com",
                status: .suspended,
                totalInvested: 500000,
                currentValue: 480000,
                joinDate: Date().addingTimeInterval(-90 * 24 * 60 * 60),
                lastActivityDate: Date().addingTimeInterval(-30 * 24 * 60 * 60),
                isVerified: true,
                riskProfile: "Moderate"
            )
        ]
        
        updateStatistics()
    }
    
    func refreshInvestors() async {
        await loadInvestors()
    }
    
    func generateReport() {
        // Generate investor report
    }
    
    private func updateStatistics() {
        activeCount = investors.filter { $0.status == .active }.count
        pendingCount = investors.filter { $0.status == .pending }.count
        suspendedCount = investors.filter { $0.status == .suspended }.count
        totalAUM = investors.map { $0.currentValue }.reduce(0, +)
        averageInvestment = investors.isEmpty ? 0 : totalAUM / Decimal(investors.count)
    }
}

// MARK: - Supporting Views (Placeholders)

struct InvestorHeaderView: View {
    let investor: InvestorAccount
    
    var body: some View {
        VStack {
            Text("Investor Details")
                .font(.headline)
        }
    }
}

struct InvestorMetricsView: View {
    let investor: InvestorAccount
    
    var body: some View {
        VStack {
            Text("Metrics")
                .font(.headline)
        }
    }
}

struct RecentActivityView: View {
    let investor: InvestorAccount
    
    var body: some View {
        VStack {
            Text("Recent Activity")
                .font(.headline)
        }
    }
}

struct InvestorPortfolioView: View {
    let investor: InvestorAccount
    
    var body: some View {
        Text("Portfolio Details")
    }
}

struct InvestorTransactionsView: View {
    let investor: InvestorAccount
    
    var body: some View {
        Text("Transaction History")
    }
}

struct InvestorDocumentsView: View {
    let investor: InvestorAccount
    
    var body: some View {
        Text("Documents")
    }
}

struct InvestorSettingsView: View {
    let investor: InvestorAccount
    
    var body: some View {
        Text("Settings")
    }
}

struct AddInvestorView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Add New Investor")
                .navigationTitle("Add Investor")
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

struct ExportOptionsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Export Options")
                .navigationTitle("Export Data")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
        }
    }
}

// MARK: - Preview

#Preview {
    AdminInvestorsView()
}
