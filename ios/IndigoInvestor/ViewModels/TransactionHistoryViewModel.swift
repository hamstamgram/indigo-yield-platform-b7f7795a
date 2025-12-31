//
//  TransactionHistoryViewModel.swift
//  IndigoInvestor
//
//  ViewModel for transaction history management with filtering and export
//

import Foundation
import SwiftUI
import Combine
import PDFKit
import UniformTypeIdentifiers

@MainActor
class TransactionHistoryViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var transactions: [Transaction] = []
    @Published var filteredTransactions: [Transaction] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Filtering
    @Published var dateRange: DateRange?
    @Published var minAmount: Double?
    @Published var maxAmount: Double?
    @Published var currentFilter: Transaction.TransactionType?
    @Published var searchQuery = ""
    
    // Statistics
    @Published var totalDeposits: Double = 0
    @Published var totalWithdrawals: Double = 0
    @Published var totalInterest: Double = 0
    @Published var totalFees: Double = 0
    @Published var netAmount: Double = 0
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()
    private let currencyFormatter = NumberFormatter()
    
    // MARK: - Computed Properties
    
    var groupedTransactions: [(key: String, value: [Transaction])] {
        let grouped = Dictionary(grouping: filteredTransactions) { transaction in
            transaction.date.formatted(.dateTime.year().month(.wide))
        }
        
        return grouped.sorted { first, second in
            // Sort by month/year in descending order
            if let firstDate = filteredTransactions.first(where: { 
                $0.date.formatted(.dateTime.year().month(.wide)) == first.key 
            })?.date,
               let secondDate = filteredTransactions.first(where: { 
                $0.date.formatted(.dateTime.year().month(.wide)) == second.key 
            })?.date {
                return firstDate > secondDate
            }
            return false
        }
    }
    
    var formattedTotalDeposits: String {
        formatCurrency(totalDeposits)
    }
    
    var formattedTotalWithdrawals: String {
        formatCurrency(totalWithdrawals)
    }
    
    var formattedNetAmount: String {
        formatCurrency(netAmount)
    }
    
    // MARK: - Initialization
    
    init() {
        setupFormatters()
        setupSubscriptions()
    }
    
    private func setupFormatters() {
        currencyFormatter.numberStyle = .currency
        currencyFormatter.currencyCode = "USD"
        currencyFormatter.maximumFractionDigits = 2
    }
    
    private func setupSubscriptions() {
        // Subscribe to search query changes
        $searchQuery
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .sink { [weak self] query in
                self?.applyFilters()
            }
            .store(in: &cancellables)
        
        // Subscribe to real-time transaction updates
        supabaseManager.subscribeToTransactionUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] update in
                    self?.handleTransactionUpdate(update)
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    func loadTransactions() {
        Task {
            await fetchTransactions()
        }
    }
    
    @MainActor
    func refreshTransactions() async {
        await fetchTransactions()
    }
    
    private func fetchTransactions() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await supabaseManager.client
                .from("transactions")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .order("date", ascending: false)
                .execute()
            
            let fetchedTransactions = try JSONDecoder().decode([Transaction].self, from: response.data)
            
            await MainActor.run {
                self.transactions = fetchedTransactions
                self.applyFilters()
                self.calculateStatistics()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                print("Error fetching transactions: \\(error)")
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    // MARK: - Filtering
    
    func filterTransactions(by type: Transaction.TransactionType?) {
        currentFilter = type
        applyFilters()
    }
    
    func searchTransactions(query: String) {
        searchQuery = query
    }
    
    func getCount(for type: Transaction.TransactionType?) -> Int {
        if let type = type {
            return transactions.filter { $0.type == type }.count
        }
        return transactions.count
    }
    
    private func applyFilters() {
        var filtered = transactions
        
        // Filter by type
        if let type = currentFilter {
            filtered = filtered.filter { $0.type == type }
        }
        
        // Filter by search query
        if !searchQuery.isEmpty {
            filtered = filtered.filter { transaction in
                transaction.description.localizedCaseInsensitiveContains(searchQuery) ||
                transaction.formattedAmount.contains(searchQuery) ||
                (transaction.referenceNumber?.localizedCaseInsensitiveContains(searchQuery) ?? false)
            }
        }
        
        // Filter by date range
        if let dateRange = dateRange {
            filtered = filtered.filter { transaction in
                transaction.date >= dateRange.start && transaction.date <= dateRange.end
            }
        }
        
        // Filter by amount range
        if let minAmount = minAmount {
            filtered = filtered.filter { $0.amount >= minAmount }
        }
        
        if let maxAmount = maxAmount {
            filtered = filtered.filter { $0.amount <= maxAmount }
        }
        
        filteredTransactions = filtered
        calculateStatistics()
    }
    
    // MARK: - Statistics
    
    private func calculateStatistics() {
        totalDeposits = filteredTransactions
            .filter { $0.type == .deposit }
            .reduce(0) { $0 + $1.amount }
        
        totalWithdrawals = filteredTransactions
            .filter { $0.type == .withdrawal }
            .reduce(0) { $0 + $1.amount }
        
        totalInterest = filteredTransactions
            .filter { $0.type == .interest }
            .reduce(0) { $0 + $1.amount }
        
        totalFees = filteredTransactions
            .filter { $0.type == .fee }
            .reduce(0) { $0 + $1.amount }
        
        netAmount = totalDeposits + totalInterest - totalWithdrawals - totalFees
    }
    
    // MARK: - Export Functions
    
    func exportAsPDF() {
        Task {
            do {
                let pdfData = try await generatePDF()
                await sharePDF(pdfData)
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to export PDF: \\(error.localizedDescription)"
                }
            }
        }
    }
    
    func exportAsCSV() {
        Task {
            do {
                let csvData = try generateCSV()
                await shareCSV(csvData)
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to export CSV: \\(error.localizedDescription)"
                }
            }
        }
    }
    
    private func generatePDF() async throws -> Data {
        let pdfMetaData = [
            kCGPDFContextCreator: "IndigoInvestor",
            kCGPDFContextAuthor: supabaseManager.currentUserEmail ?? "User",
            kCGPDFContextTitle: "Transaction History"
        ]
        
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]
        
        let pageWidth = 8.5 * 72.0
        let pageHeight = 11 * 72.0
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)
        
        let data = renderer.pdfData { context in
            context.beginPage()
            
            // Header
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 24),
                .foregroundColor: UIColor.label
            ]
            
            let title = "Transaction History"
            title.draw(at: CGPoint(x: 50, y: 50), withAttributes: titleAttributes)
            
            // Date range
            let dateText = "Generated: \\(Date().formatted(date: .complete, time: .omitted))"
            let dateAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor.secondaryLabel
            ]
            dateText.draw(at: CGPoint(x: 50, y: 85), withAttributes: dateAttributes)
            
            // Summary statistics
            var yPosition: CGFloat = 130
            let statAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14),
                .foregroundColor: UIColor.label
            ]
            
            "Total Deposits: \\(formattedTotalDeposits)".draw(
                at: CGPoint(x: 50, y: yPosition),
                withAttributes: statAttributes
            )
            yPosition += 25
            
            "Total Withdrawals: \\(formattedTotalWithdrawals)".draw(
                at: CGPoint(x: 50, y: yPosition),
                withAttributes: statAttributes
            )
            yPosition += 25
            
            "Net Amount: \\(formattedNetAmount)".draw(
                at: CGPoint(x: 50, y: yPosition),
                withAttributes: statAttributes
            )
            yPosition += 40
            
            // Transaction list header
            let headerAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 12),
                .foregroundColor: UIColor.label
            ]
            
            "Date".draw(at: CGPoint(x: 50, y: yPosition), withAttributes: headerAttributes)
            "Description".draw(at: CGPoint(x: 150, y: yPosition), withAttributes: headerAttributes)
            "Type".draw(at: CGPoint(x: 350, y: yPosition), withAttributes: headerAttributes)
            "Amount".draw(at: CGPoint(x: 450, y: yPosition), withAttributes: headerAttributes)
            
            yPosition += 20
            
            // Transaction rows
            let rowAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor.label
            ]
            
            for transaction in filteredTransactions {
                if yPosition > pageHeight - 100 {
                    context.beginPage()
                    yPosition = 50
                }
                
                transaction.date.formatted(date: .abbreviated, time: .omitted).draw(
                    at: CGPoint(x: 50, y: yPosition),
                    withAttributes: rowAttributes
                )
                
                let description = String(transaction.description.prefix(30))
                description.draw(
                    at: CGPoint(x: 150, y: yPosition),
                    withAttributes: rowAttributes
                )
                
                transaction.type.displayName.draw(
                    at: CGPoint(x: 350, y: yPosition),
                    withAttributes: rowAttributes
                )
                
                transaction.formattedAmount.draw(
                    at: CGPoint(x: 450, y: yPosition),
                    withAttributes: rowAttributes
                )
                
                yPosition += 18
            }
        }
        
        return data
    }
    
    private func generateCSV() throws -> Data {
        var csvString = "Date,Description,Type,Amount,Status,Reference\\n"
        
        for transaction in filteredTransactions {
            let date = transaction.date.formatted(date: .numeric, time: .omitted)
            let description = transaction.description.replacingOccurrences(of: ",", with: ";")
            let type = transaction.type.displayName
            let amount = String(format: "%.2f", transaction.amount)
            let status = transaction.status.displayName
            let reference = transaction.referenceNumber ?? ""
            
            csvString += "\\(date),\\(description),\\(type),\\(amount),\\(status),\\(reference)\\n"
        }
        
        guard let data = csvString.data(using: .utf8) else {
            throw NSError(domain: "CSV", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to generate CSV data"
            ])
        }
        
        return data
    }
    
    @MainActor
    private func sharePDF(_ data: Data) async {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("transactions_\\(Date().timeIntervalSince1970).pdf")
        
        do {
            try data.write(to: tempURL)
            
            let activityVC = UIActivityViewController(
                activityItems: [tempURL],
                applicationActivities: nil
            )
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(activityVC, animated: true)
            }
        } catch {
            errorMessage = "Failed to share PDF: \\(error.localizedDescription)"
        }
    }
    
    @MainActor
    private func shareCSV(_ data: Data) async {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("transactions_\\(Date().timeIntervalSince1970).csv")
        
        do {
            try data.write(to: tempURL)
            
            let activityVC = UIActivityViewController(
                activityItems: [tempURL],
                applicationActivities: nil
            )
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(activityVC, animated: true)
            }
        } catch {
            errorMessage = "Failed to share CSV: \\(error.localizedDescription)"
        }
    }
    
    // MARK: - Real-time Updates
    
    private func handleTransactionUpdate(_ update: TransactionUpdate) {
        Task {
            await fetchTransactions()
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatCurrency(_ amount: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

// MARK: - Supporting Types

struct TransactionUpdate {
    let type: UpdateType
    let transactionId: UUID
    let data: Any?
    
    enum UpdateType {
        case added
        case updated
        case deleted
    }
}
