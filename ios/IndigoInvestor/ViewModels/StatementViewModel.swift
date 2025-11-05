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
            let response = try await supabaseManager.client
                .from("statements")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .order("date", ascending: false)
                .execute()
            
            let fetchedStatements = try JSONDecoder().decode([Statement].self, from: response.data)
            
            await MainActor.run {
                self.statements = fetchedStatements
                self.filteredStatements = fetchedStatements
                self.extractAvailableYears()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                print("Error fetching statements: \\(error)")
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
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
    
    private func handleStatementUpdate(_ update: StatementUpdate) {
        Task {
            await fetchStatements()
        }
    }
}

// MARK: - Supporting Types

struct Statement: Identifiable, Codable {
    let id: UUID
    let userId: UUID
    let title: String
    let type: StatementType
    let date: Date
    let filePath: String
    let fileSize: Int64
    let status: Status
    let isDownloaded: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum StatementType: String, Codable {
        case monthly = "MONTHLY"
        case quarterly = "QUARTERLY"
        case annual = "ANNUAL"
        case tax = "TAX"
    }
    
    enum Status: String, Codable {
        case available = "Available"
        case processing = "Processing"
        case pending = "Pending"
    }
}

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

// MARK: - Loading View

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            VStack(spacing: IndigoTheme.Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: IndigoTheme.Colors.primary))
                    .scaleEffect(1.5)
                
                Text("Loading statements...")
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.text)
            }
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
            .shadow(
                color: IndigoTheme.Shadows.md.color,
                radius: IndigoTheme.Shadows.md.radius,
                x: IndigoTheme.Shadows.md.x,
                y: IndigoTheme.Shadows.md.y
            )
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
