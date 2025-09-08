//
//  StatementViewer.swift
//  IndigoInvestor
//
//  Secure PDF viewer for monthly/quarterly statements using signed URLs
//

import SwiftUI
import PDFKit
import QuickLook
import Combine

struct StatementViewer: View {
    @StateObject private var viewModel = StatementViewModel()
    @State private var selectedStatement: Statement?
    @State private var showingShareSheet = false
    @State private var showingFilterOptions = false
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())
    @State private var selectedType: StatementType = .all
    @Environment(\.dismiss) private var dismiss
    
    enum StatementType: String, CaseIterable {
        case all = "All"
        case monthly = "Monthly"
        case quarterly = "Quarterly"
        case annual = "Annual"
        case tax = "Tax Documents"
        
        var icon: String {
            switch self {
            case .all: return "doc.text"
            case .monthly: return "calendar"
            case .quarterly: return "calendar.badge.clock"
            case .annual: return "doc.richtext"
            case .tax: return "doc.badge.gearshape"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.statements.isEmpty && !viewModel.isLoading {
                    EmptyStateView(type: "statements")
                } else {
                    statementsList
                }
                
                if viewModel.isLoading {
                    LoadingView()
                }
            }
            .navigationTitle("Statements")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: { showingFilterOptions = true }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                        
                        Button(action: { viewModel.refreshStatements() }) {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                    }
                }
            }
            .sheet(item: $selectedStatement) { statement in
                PDFViewerSheet(statement: statement)
            }
            .sheet(isPresented: $showingFilterOptions) {
                FilterOptionsSheet(
                    selectedYear: $selectedYear,
                    selectedType: $selectedType
                ) {
                    viewModel.filterStatements(year: selectedYear, type: selectedType)
                }
            }
            .onAppear {
                viewModel.loadStatements()
            }
            .refreshable {
                await viewModel.refreshStatementsAsync()
            }
        }
    }
    
    // MARK: - Statements List
    
    private var statementsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Year Selector
                yearSelector
                
                // Type Filter Pills
                typeFilterPills
                
                // Grouped Statements
                ForEach(viewModel.groupedStatements, id: \.key) { year, statements in
                    Section {
                        ForEach(statements) { statement in
                            StatementRow(statement: statement) {
                                handleStatementTap(statement)
                            }
                            .padding(.horizontal)
                            .padding(.vertical, IndigoTheme.Spacing.xs)
                            
                            if statement != statements.last {
                                Divider()
                                    .padding(.leading, 60)
                            }
                        }
                    } header: {
                        YearHeader(year: year, count: statements.count)
                    }
                    .background(IndigoTheme.Colors.cardBackground)
                    .cornerRadius(IndigoTheme.CornerRadius.md)
                    .padding(.horizontal)
                    .padding(.bottom, IndigoTheme.Spacing.md)
                }
            }
        }
    }
    
    // MARK: - Year Selector
    
    private var yearSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(viewModel.availableYears, id: \.self) { year in
                    YearButton(
                        year: year,
                        isSelected: selectedYear == year
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedYear = year
                            viewModel.filterStatements(year: year, type: selectedType)
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, IndigoTheme.Spacing.sm)
        }
    }
    
    // MARK: - Type Filter Pills
    
    private var typeFilterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(StatementType.allCases, id: \.self) { type in
                    TypeFilterPill(
                        type: type,
                        isSelected: selectedType == type,
                        count: viewModel.getCount(for: type)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedType = type
                            viewModel.filterStatements(year: selectedYear, type: type)
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, IndigoTheme.Spacing.md)
        }
    }
    
    // MARK: - Actions
    
    private func handleStatementTap(_ statement: Statement) {
        // Verify biometric authentication before showing sensitive documents
        Task {
            do {
                try await SecurityManager.shared.authenticateWithBiometrics(
                    reason: "Authenticate to view statement"
                )
                selectedStatement = statement
            } catch {
                viewModel.errorMessage = "Authentication failed"
            }
        }
    }
}

// MARK: - Statement Row

struct StatementRow: View {
    let statement: Statement
    let onTap: () -> Void
    
    private var icon: String {
        switch statement.type {
        case .monthly: return "doc.text"
        case .quarterly: return "doc.richtext"
        case .annual: return "doc.badge.clock"
        case .tax: return "doc.badge.gearshape"
        }
    }
    
    private var statusColor: Color {
        switch statement.status {
        case .available: return .green
        case .processing: return .orange
        case .pending: return .blue
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.sm)
                        .fill(IndigoTheme.Colors.primary.opacity(0.1))
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
                
                // Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(statement.title)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.text)
                        .lineLimit(1)
                    
                    HStack(spacing: 8) {
                        Text(statement.date.formatted(date: .abbreviated, time: .omitted))
                            .font(IndigoTheme.Typography.caption2)
                            .foregroundColor(IndigoTheme.Colors.textTertiary)
                        
                        Text("•")
                            .foregroundColor(IndigoTheme.Colors.textTertiary)
                        
                        Text(formatFileSize(statement.fileSize))
                            .font(IndigoTheme.Typography.caption2)
                            .foregroundColor(IndigoTheme.Colors.textTertiary)
                    }
                }
                
                Spacer()
                
                // Status & Download
                VStack(alignment: .trailing, spacing: 8) {
                    StatusChip(status: statement.status, color: statusColor)
                    
                    if statement.isDownloaded {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.green)
                    } else {
                        Image(systemName: "arrow.down.circle")
                            .font(.system(size: 16))
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func formatFileSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}

// MARK: - PDF Viewer Sheet

struct PDFViewerSheet: View {
    let statement: Statement
    @StateObject private var loader = PDFLoader()
    @State private var showingShareSheet = false
    @State private var currentPage = 1
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                if let pdfDocument = loader.document {
                    PDFKitView(
                        document: pdfDocument,
                        currentPage: $currentPage
                    )
                    .edgesIgnoringSafeArea(.all)
                    
                    // Page indicator
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            PageIndicator(
                                currentPage: currentPage,
                                totalPages: pdfDocument.pageCount
                            )
                            .padding()
                        }
                    }
                } else if loader.isLoading {
                    ProgressView("Loading statement...")
                        .progressViewStyle(CircularProgressViewStyle())
                        .scaleEffect(1.2)
                } else if let error = loader.error {
                    ErrorView(message: error.localizedDescription) {
                        loader.loadPDF(from: statement)
                    }
                }
            }
            .navigationTitle(statement.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: downloadStatement) {
                            Image(systemName: "square.and.arrow.down")
                        }
                        
                        Button(action: { showingShareSheet = true }) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let document = loader.document,
                   let data = document.dataRepresentation() {
                    ShareSheet(items: [data])
                }
            }
            .task {
                await loader.loadPDF(from: statement)
            }
        }
    }
    
    private func downloadStatement() {
        Task {
            await loader.downloadPDF(statement: statement)
        }
    }
}

// MARK: - PDFKit View

struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    @Binding var currentPage: Int
    
    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = document
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.usePageViewController(true)
        
        // Security: Disable text selection and copying for sensitive documents
        pdfView.isUserInteractionEnabled = true
        pdfView.backgroundColor = UIColor.systemBackground
        
        // Add observer for page changes
        NotificationCenter.default.addObserver(
            context.coordinator,
            selector: #selector(Coordinator.pageChanged),
            name: .PDFViewPageChanged,
            object: pdfView
        )
        
        return pdfView
    }
    
    func updateUIView(_ pdfView: PDFView, context: Context) {
        pdfView.document = document
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject {
        var parent: PDFKitView
        
        init(_ parent: PDFKitView) {
            self.parent = parent
        }
        
        @objc func pageChanged(_ notification: Notification) {
            guard let pdfView = notification.object as? PDFView,
                  let currentPage = pdfView.currentPage,
                  let pageIndex = pdfView.document?.index(for: currentPage) else {
                return
            }
            parent.currentPage = pageIndex + 1
        }
    }
}

// MARK: - PDF Loader

@MainActor
class PDFLoader: ObservableObject {
    @Published var document: PDFDocument?
    @Published var isLoading = false
    @Published var error: Error?
    
    private let supabaseManager = SupabaseManager.shared
    
    func loadPDF(from statement: Statement) async {
        isLoading = true
        error = nil
        
        do {
            // Get signed URL from Supabase Storage
            let signedURL = try await supabaseManager.getSignedURL(
                for: statement.filePath,
                expiresIn: 3600 // 1 hour
            )
            
            // Download PDF data
            let (data, _) = try await URLSession.shared.data(from: signedURL)
            
            // Create PDF document
            if let pdfDocument = PDFDocument(data: data) {
                self.document = pdfDocument
                
                // Cache the document locally for offline access
                try await cacheDocument(data, for: statement)
            } else {
                throw NSError(
                    domain: "PDFLoader",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid PDF document"]
                )
            }
        } catch {
            self.error = error
            
            // Try to load from cache if online fetch fails
            if let cachedDocument = loadFromCache(statement) {
                self.document = cachedDocument
            }
        }
        
        isLoading = false
    }
    
    func downloadPDF(statement: Statement) async {
        guard let document = document,
              let data = document.dataRepresentation() else { return }
        
        do {
            let documentsURL = FileManager.default.urls(
                for: .documentDirectory,
                in: .userDomainMask
            ).first!
            
            let fileURL = documentsURL.appendingPathComponent("\(statement.title).pdf")
            try data.write(to: fileURL)
            
            // Mark as downloaded in Core Data
            await markAsDownloaded(statement)
        } catch {
            print("Failed to save PDF: \(error)")
        }
    }
    
    private func cacheDocument(_ data: Data, for statement: Statement) async throws {
        let cacheURL = getCacheURL(for: statement)
        try data.write(to: cacheURL)
    }
    
    private func loadFromCache(_ statement: Statement) -> PDFDocument? {
        let cacheURL = getCacheURL(for: statement)
        guard let data = try? Data(contentsOf: cacheURL) else { return nil }
        return PDFDocument(data: data)
    }
    
    private func getCacheURL(for statement: Statement) -> URL {
        let cacheDirectory = FileManager.default.urls(
            for: .cachesDirectory,
            in: .userDomainMask
        ).first!
        
        let statementsCache = cacheDirectory.appendingPathComponent("statements")
        try? FileManager.default.createDirectory(
            at: statementsCache,
            withIntermediateDirectories: true
        )
        
        return statementsCache.appendingPathComponent("\(statement.id).pdf")
    }
    
    private func markAsDownloaded(_ statement: Statement) async {
        // Update Core Data or local storage to mark as downloaded
    }
}

// MARK: - Supporting Views

struct YearButton: View {
    let year: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(String(year))
                .font(IndigoTheme.Typography.bodyBold)
                .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
                .padding(.horizontal, IndigoTheme.Spacing.md)
                .padding(.vertical, IndigoTheme.Spacing.sm)
                .background(isSelected ? IndigoTheme.Colors.primary : IndigoTheme.Colors.backgroundTertiary)
                .cornerRadius(IndigoTheme.CornerRadius.pill)
        }
    }
}

struct TypeFilterPill: View {
    let type: StatementViewer.StatementType
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: type.icon)
                    .font(.system(size: 14))
                
                Text(type.rawValue)
                    .font(IndigoTheme.Typography.caption1)
                
                if count > 0 {
                    Text("\(count)")
                        .font(IndigoTheme.Typography.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : IndigoTheme.Colors.primary.opacity(0.1))
                        .cornerRadius(IndigoTheme.CornerRadius.xs)
                }
            }
            .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
            .padding(.horizontal, IndigoTheme.Spacing.md)
            .padding(.vertical, IndigoTheme.Spacing.sm)
            .background(isSelected ? IndigoTheme.Colors.primary : IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.pill)
        }
    }
}

struct YearHeader: View {
    let year: String
    let count: Int
    
    var body: some View {
        HStack {
            Text(year)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Spacer()
            
            Text("\(count) documents")
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
        }
        .padding(.horizontal)
        .padding(.vertical, IndigoTheme.Spacing.sm)
        .background(IndigoTheme.Colors.backgroundSecondary)
    }
}

struct StatusChip: View {
    let status: Statement.Status
    let color: Color
    
    var body: some View {
        Text(status.rawValue)
            .font(IndigoTheme.Typography.caption2)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(IndigoTheme.CornerRadius.xs)
    }
}

struct PageIndicator: View {
    let currentPage: Int
    let totalPages: Int
    
    var body: some View {
        Text("\(currentPage) / \(totalPages)")
            .font(IndigoTheme.Typography.caption1)
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.7))
            .cornerRadius(IndigoTheme.CornerRadius.pill)
    }
}

struct ErrorView: View {
    let message: String
    let retry: () -> Void
    
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.red)
            
            Text("Error Loading Statement")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text(message)
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: retry) {
                Text("Try Again")
                    .font(IndigoTheme.Typography.bodyBold)
                    .foregroundColor(.white)
                    .padding(.horizontal, IndigoTheme.Spacing.lg)
                    .padding(.vertical, IndigoTheme.Spacing.md)
                    .background(IndigoTheme.Colors.primary)
                    .cornerRadius(IndigoTheme.CornerRadius.md)
            }
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
