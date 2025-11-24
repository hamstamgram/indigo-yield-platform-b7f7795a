//
//  StatementViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing statements and documents
//

import Foundation
import SwiftUI
import Combine

@MainActor
class StatementViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var statements: [Statement] = []
    @Published var filteredStatements: [Statement] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var availableYears: [Int] = []
    @Published var availableAssets: [AssetCode] = []
    @Published var selectedAsset: AssetCode?

    enum AssetCode: String, Codable, CaseIterable {
        case BTC = "BTC"
        case ETH = "ETH"
        case SOL = "SOL"
        case USDT = "USDT"
        case USDC = "USDC"
        case EURC = "EURC"

        var displayName: String {
            switch self {
            case .BTC: return "Bitcoin"
            case .ETH: return "Ethereum"
            case .SOL: return "Solana"
            case .USDT: return "Tether"
            case .USDC: return "USD Coin"
            case .EURC: return "Euro Coin"
            }
        }
    }
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Computed Properties
    
    var groupedStatements: [(key: String, value: [Statement])] {
        let grouped = Dictionary(grouping: filteredStatements) { statement in
            statement.date.formatted(.dateTime.year(.defaultDigits))
        }
        
        return grouped.sorted { first, second in
            first.key > second.key
        }
    }
    
    // MARK: - Initialization
    
    init() {
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Subscribe to real-time statement updates
        supabaseManager.subscribeToStatementUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] update in
                    self?.handleStatementUpdate(update)
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    func loadStatements() {
        Task {
            await fetchStatements()
        }
    }
    
    func refreshStatements() {
        Task {
            await fetchStatements()
        }
    }
    
    func refreshStatementsAsync() async {
        await fetchStatements()
    }
    
    private func fetchStatements() async {
        isLoading = true
        errorMessage = nil

        do {
            // Step 1: Get investor_id from profiles -> investors
            guard let userId = supabaseManager.currentUserId else {
                await MainActor.run {
                    self.errorMessage = "No authenticated user"
                    self.isLoading = false
                }
                return
            }

            let investorResponse = try await supabaseManager.client
                .from("investors")
                .select("id")
                .eq("profile_id", userId)
                .maybeSingle()
                .execute()

            guard !investorResponse.data.isEmpty else {
                await MainActor.run {
                    self.errorMessage = "Investor profile not found"
                    self.isLoading = false
                }
                return
            }

            let investor = try JSONDecoder().decode(InvestorId.self, from: investorResponse.data)

            // Step 2: Fetch from investor_monthly_reports
            let response = try await supabaseManager.client
                .from("investor_monthly_reports")
                .select("*")
                .eq("investor_id", investor.id.uuidString)
                .order("report_month", ascending: false)
                .execute()

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let fetchedStatements = try decoder.decode([MonthlyStatement].self, from: response.data)

            await MainActor.run {
                self.statements = fetchedStatements
                self.filteredStatements = fetchedStatements
                self.extractAvailableYears()
                self.extractAvailableAssets()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to load statements: \(error.localizedDescription)"
                print("Error fetching statements: \(error)")
            }
        }

        await MainActor.run {
            self.isLoading = false
        }
    }

    // Helper struct for decoding investor_id
    private struct InvestorId: Codable {
        let id: UUID
    }
    
    // MARK: - Filtering
    
    func filterStatements(year: Int?, type: StatementViewer.StatementType) {
        var filtered = statements
        
        // Filter by year
        if let year = year {
            filtered = filtered.filter { statement in
                Calendar.current.component(.year, from: statement.date) == year
            }
        }
        
        // Filter by type
        if type != .all {
            let statementType: Statement.StatementType
            switch type {
            case .monthly:
                statementType = .monthly
            case .quarterly:
                statementType = .quarterly
            case .annual:
                statementType = .annual
            case .tax:
                statementType = .tax
            default:
                statementType = .monthly
            }
            
            filtered = filtered.filter { $0.type == statementType }
        }
        
        filteredStatements = filtered
    }
    
    func getCount(for type: StatementViewer.StatementType) -> Int {
        if type == .all {
            return statements.count
        }
        
        let statementType: Statement.StatementType
        switch type {
        case .monthly:
            statementType = .monthly
        case .quarterly:
            statementType = .quarterly
        case .annual:
            statementType = .annual
        case .tax:
            statementType = .tax
        default:
            return 0
        }
        
        return statements.filter { $0.type == statementType }.count
    }
    
    // MARK: - Helper Methods

    private func extractAvailableYears() {
        let years = Set(statements.map { Calendar.current.component(.year, from: $0.date) })
        availableYears = Array(years).sorted(by: >)
    }

    private func extractAvailableAssets() {
        let assets = Set(statements.compactMap { AssetCode(rawValue: $0.assetCode) })
        availableAssets = Array(assets).sorted { $0.rawValue < $1.rawValue }
    }

    func filterByAsset(_ asset: AssetCode?) {
        selectedAsset = asset
        if let asset = asset {
            filteredStatements = statements.filter { $0.assetCode == asset.rawValue }
        } else {
            filteredStatements = statements
        }
    }
    
    private func handleStatementUpdate(_ update: StatementUpdate) {
        Task {
            await fetchStatements()
        }
    }
}

// MARK: - Supporting Types

struct MonthlyStatement: Identifiable, Codable {
    let id: UUID
    let investorId: UUID
    let reportMonth: Date
    let assetCode: String
    let openingBalance: Decimal
    let closingBalance: Decimal
    let additions: Decimal
    let withdrawals: Decimal
    let yieldEarned: Decimal
    let entryDate: Date?
    let exitDate: Date?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case investorId = "investor_id"
        case reportMonth = "report_month"
        case assetCode = "asset_code"
        case openingBalance = "opening_balance"
        case closingBalance = "closing_balance"
        case additions
        case withdrawals
        case yieldEarned = "yield_earned"
        case entryDate = "entry_date"
        case exitDate = "exit_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var rateOfReturn: Decimal {
        guard openingBalance > 0 else { return 0 }
        return (yieldEarned / openingBalance) * 100
    }

    // For compatibility with existing UI
    var date: Date { reportMonth }
    var title: String { "\(assetCode) Fund - \(reportMonth.formatted(.dateTime.month(.wide).year()))" }
}

// Legacy Statement type for backward compatibility
typealias Statement = MonthlyStatement

struct StatementUpdate {
    let type: UpdateType
    let statementId: UUID
    let data: Any?
    
    enum UpdateType {
        case added
        case updated
        case deleted
    }
}

// MARK: - Filter Options Sheet

struct FilterOptionsSheet: View {
    @Binding var selectedYear: Int
    @Binding var selectedType: StatementViewer.StatementType
    let onApply: () -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Year") {
                    Picker("Year", selection: $selectedYear) {
                        ForEach(2020...Calendar.current.component(.year, from: Date()), id: \.self) { year in
                            Text(String(year)).tag(year)
                        }
                    }
                    .pickerStyle(WheelPickerStyle())
                }
                
                Section("Document Type") {
                    ForEach(StatementViewer.StatementType.allCases, id: \.self) { type in
                        HStack {
                            Image(systemName: type.icon)
                                .foregroundColor(IndigoTheme.Colors.primary)
                                .frame(width: 30)
                            
                            Text(type.rawValue)
                            
                            Spacer()
                            
                            if selectedType == type {
                                Image(systemName: "checkmark")
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedType = type
                        }
                    }
                }
            }
            .navigationTitle("Filter Statements")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Apply") {
                        onApply()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let type: String
    
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: iconForType)
                .font(.system(size: 60))
                .foregroundColor(IndigoTheme.Colors.textTertiary)
            
            Text("No \\(type.capitalized) Found")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text(messageForType)
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
    
    private var iconForType: String {
        switch type {
        case "statements":
            return "doc.text.magnifyingglass"
        case "transactions":
            return "list.bullet.rectangle"
        case "notifications":
            return "bell.slash"
        default:
            return "magnifyingglass"
        }
    }
    
    private var messageForType: String {
        switch type {
        case "statements":
            return "Your statements and documents will appear here when they become available"
        case "transactions":
            return "Your transaction history will appear here"
        case "notifications":
            return "You don't have any notifications at the moment"
        default:
            return "No data available"
        }
    }
}
