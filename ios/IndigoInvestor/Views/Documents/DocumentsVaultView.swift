//
//  DocumentsVaultView.swift
//  IndigoInvestor
//
//  Main documents vault for viewing and managing all investment documents
//

import SwiftUI
import PDFKit
import UniformTypeIdentifiers

struct DocumentsVaultView: View {
    @StateObject private var viewModel = DocumentsVaultViewModel()
    @State private var selectedCategory: DocumentCategory = .all
    @State private var searchText = ""
    @State private var selectedDocument: Document?
    @State private var showingUploadSheet = false
    @State private var showingFilterOptions = false
    @State private var sortOrder: SortOrder = .dateDescending
    
    enum DocumentCategory: String, CaseIterable {
        case all = "All Documents"
        case statements = "Statements"
        case tax = "Tax Documents"
        case agreements = "Agreements"
        case reports = "Reports"
        case kyc = "KYC Documents"
        
        var icon: String {
            switch self {
            case .all: return "doc.text"
            case .statements: return "doc.richtext"
            case .tax: return "doc.badge.gearshape"
            case .agreements: return "doc.badge.seal"
            case .reports: return "chart.bar.doc.horizontal"
            case .kyc: return "person.text.rectangle"
            }
        }
        
        var color: Color {
            switch self {
            case .all: return .blue
            case .statements: return .green
            case .tax: return .orange
            case .agreements: return .purple
            case .reports: return .indigo
            case .kyc: return .red
            }
        }
    }
    
    enum SortOrder: String, CaseIterable {
        case dateDescending = "Newest First"
        case dateAscending = "Oldest First"
        case nameAscending = "Name (A-Z)"
        case nameDescending = "Name (Z-A)"
        case sizeDescending = "Largest First"
        case sizeAscending = "Smallest First"
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.documents.isEmpty && !viewModel.isLoading {
                    EmptyDocumentsView()
                } else {
                    documentsList
                }
                
                if viewModel.isLoading {
                    LoadingView()
                }
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Documents")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: { showingFilterOptions = true }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                        
                        Button(action: { showingUploadSheet = true }) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search documents...")
            .onChange(of: searchText) { newValue in
                viewModel.searchDocuments(query: newValue)
            }
            .onChange(of: selectedCategory) { newCategory in
                viewModel.filterByCategory(newCategory)
            }
            .onChange(of: sortOrder) { newOrder in
                viewModel.sortDocuments(by: newOrder)
            }
            .sheet(item: $selectedDocument) { document in
                DocumentViewerSheet(document: document)
            }
            .sheet(isPresented: $showingUploadSheet) {
                DocumentUploadView { uploadedDocument in
                    viewModel.addDocument(uploadedDocument)
                }
            }
            .sheet(isPresented: $showingFilterOptions) {
                DocumentFilterSheet(
                    selectedCategory: $selectedCategory,
                    sortOrder: $sortOrder,
                    dateRange: $viewModel.dateRange
                )
            }
            .onAppear {
                viewModel.loadDocuments()
            }
            .refreshable {
                await viewModel.refreshDocuments()
            }
        }
    }
    
    // MARK: - Documents List
    
    private var documentsList: some View {
        ScrollView {
            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Storage Usage Card
                storageUsageCard
                
                // Category Pills
                categoryPills
                
                // Quick Stats
                if !viewModel.filteredDocuments.isEmpty {
                    quickStats
                }
                
                // Documents Grid/List
                documentsGrid
            }
            .padding(.bottom, IndigoTheme.Spacing.xl)
        }
    }
    
    // MARK: - Storage Usage Card
    
    private var storageUsageCard: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Storage Usage")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                    
                    Text("\(viewModel.formattedUsedStorage) of \(viewModel.formattedTotalStorage)")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.text)
                }
                
                Spacer()
                
                CircularProgressView(
                    progress: viewModel.storagePercentage,
                    lineWidth: 8,
                    size: 50
                )
            }
            
            // Storage breakdown
            HStack(spacing: IndigoTheme.Spacing.md) {
                StorageTypeIndicator(
                    type: "Documents",
                    size: viewModel.documentsSize,
                    color: .blue
                )
                
                StorageTypeIndicator(
                    type: "Statements",
                    size: viewModel.statementsSize,
                    color: .green
                )
                
                StorageTypeIndicator(
                    type: "Tax Forms",
                    size: viewModel.taxFormsSize,
                    color: .orange
                )
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
    
    // MARK: - Category Pills
    
    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(DocumentCategory.allCases, id: \.self) { category in
                    CategoryPill(
                        category: category,
                        isSelected: selectedCategory == category,
                        count: viewModel.getCategoryCount(category)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedCategory = category
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Quick Stats
    
    private var quickStats: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            QuickStatView(
                title: "Total",
                value: "\(viewModel.filteredDocuments.count)",
                icon: "doc.fill"
            )
            
            QuickStatView(
                title: "This Month",
                value: "\(viewModel.thisMonthCount)",
                icon: "calendar"
            )
            
            QuickStatView(
                title: "Unread",
                value: "\(viewModel.unreadCount)",
                icon: "envelope.badge"
            )
        }
        .padding(.horizontal)
    }
    
    // MARK: - Documents Grid
    
    private var documentsGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ],
            spacing: IndigoTheme.Spacing.md
        ) {
            ForEach(viewModel.filteredDocuments) { document in
                DocumentCard(document: document) {
                    handleDocumentTap(document)
                }
                .contextMenu {
                    documentContextMenu(for: document)
                }
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - Context Menu
    
    @ViewBuilder
    private func documentContextMenu(for document: Document) -> some View {
        Button(action: { viewModel.downloadDocument(document) }) {
            Label("Download", systemImage: "arrow.down.circle")
        }
        
        Button(action: { viewModel.shareDocument(document) }) {
            Label("Share", systemImage: "square.and.arrow.up")
        }
        
        if !document.isRead {
            Button(action: { viewModel.markAsRead(document) }) {
                Label("Mark as Read", systemImage: "checkmark.circle")
            }
        }
        
        Divider()
        
        Button(role: .destructive, action: { viewModel.deleteDocument(document) }) {
            Label("Delete", systemImage: "trash")
        }
    }
    
    // MARK: - Actions
    
    private func handleDocumentTap(_ document: Document) {
        // Mark as read if unread
        if !document.isRead {
            viewModel.markAsRead(document)
        }
        
        // Verify authentication for sensitive documents
        if document.requiresAuth {
            Task {
                do {
                    try await SecurityManager.shared.authenticateWithBiometrics(
                        reason: "Authenticate to view document"
                    )
                    selectedDocument = document
                } catch {
                    viewModel.errorMessage = "Authentication failed"
                }
            }
        } else {
            selectedDocument = document
        }
    }
}

// MARK: - Supporting Views

struct DocumentCard: View {
    let document: Document
    let onTap: () -> Void
    
    private var iconName: String {
        switch document.type {
        case .pdf: return "doc.text.fill"
        case .image: return "photo.fill"
        case .spreadsheet: return "tablecells.fill"
        case .text: return "doc.plaintext.fill"
        }
    }
    
    private var categoryColor: Color {
        switch document.category {
        case .statement: return .green
        case .tax: return .orange
        case .agreement: return .purple
        case .report: return .indigo
        case .kyc: return .red
        case .other: return .gray
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: IndigoTheme.Spacing.sm) {
                // Document Icon
                ZStack {
                    RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.md)
                        .fill(categoryColor.opacity(0.1))
                        .frame(height: 120)
                    
                    VStack(spacing: 8) {
                        Image(systemName: iconName)
                            .font(.system(size: 32))
                            .foregroundColor(categoryColor)
                        
                        Text(document.fileExtension.uppercased())
                            .font(IndigoTheme.Typography.caption2)
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }
                    
                    // Unread indicator
                    if !document.isRead {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 12, height: 12)
                            .offset(x: -8, y: -8)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    }
                }
                
                // Document Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(document.name)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.text)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 10))
                        
                        Text(document.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(IndigoTheme.Typography.caption2)
                        
                        Spacer()
                        
                        Text(document.formattedSize)
                            .font(IndigoTheme.Typography.caption2)
                    }
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(IndigoTheme.Spacing.md)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
            .shadow(
                color: IndigoTheme.Shadows.xs.color,
                radius: IndigoTheme.Shadows.xs.radius,
                x: IndigoTheme.Shadows.xs.x,
                y: IndigoTheme.Shadows.xs.y
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct CategoryPill: View {
    let category: DocumentsVaultView.DocumentCategory
    let isSelected: Bool
    let count: Int
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.system(size: 14))
                
                Text(category.rawValue)
                    .font(IndigoTheme.Typography.caption1)
                
                if count > 0 {
                    Text("\(count)")
                        .font(IndigoTheme.Typography.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : category.color.opacity(0.1))
                        .cornerRadius(IndigoTheme.CornerRadius.xs)
                }
            }
            .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
            .padding(.horizontal, IndigoTheme.Spacing.md)
            .padding(.vertical, IndigoTheme.Spacing.sm)
            .background(isSelected ? category.color : IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.pill)
        }
    }
}

struct StorageTypeIndicator: View {
    let type: String
    let size: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 0) {
                Text(type)
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                
                Text(size)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.text)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct CircularProgressView: View {
    let progress: Double
    let lineWidth: CGFloat
    let size: CGFloat
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(IndigoTheme.Colors.backgroundTertiary, lineWidth: lineWidth)
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    LinearGradient(
                        colors: [IndigoTheme.Colors.primary, IndigoTheme.Colors.primary.opacity(0.7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.spring(), value: progress)
            
            Text("\(Int(progress * 100))%")
                .font(IndigoTheme.Typography.caption2)
                .foregroundColor(IndigoTheme.Colors.text)
        }
        .frame(width: size, height: size)
    }
}

struct QuickStatView: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(IndigoTheme.Colors.primary)
            
            Text(value)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text(title)
                .font(IndigoTheme.Typography.caption2)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(IndigoTheme.Spacing.sm)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.sm)
    }
}

struct EmptyDocumentsView: View {
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(IndigoTheme.Colors.textTertiary)
            
            Text("No Documents Yet")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text("Your investment documents and statements will appear here")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
}

// MARK: - Document Viewer Sheet

struct DocumentViewerSheet: View {
    let document: Document
    @Environment(\.dismiss) private var dismiss
    @StateObject private var loader = DocumentLoader()
    @State private var showingShareSheet = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if let data = loader.documentData {
                    DocumentContentView(data: data, type: document.type)
                } else if loader.isLoading {
                    ProgressView("Loading document...")
                        .progressViewStyle(CircularProgressViewStyle())
                } else if let error = loader.error {
                    ErrorView(message: error.localizedDescription) {
                        Task {
                            await loader.loadDocument(document)
                        }
                    }
                }
            }
            .navigationTitle(document.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: { Task { await loader.downloadDocument(document) } }) {
                            Image(systemName: "arrow.down.circle")
                        }
                        
                        Button(action: { showingShareSheet = true }) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let data = loader.documentData {
                    ShareSheet(items: [data])
                }
            }
            .task {
                await loader.loadDocument(document)
            }
        }
    }
}

struct DocumentContentView: View {
    let data: Data
    let type: Document.DocumentType
    
    var body: some View {
        switch type {
        case .pdf:
            if let pdfDocument = PDFDocument(data: data) {
                PDFKitView(document: pdfDocument, currentPage: .constant(1))
            } else {
                Text("Unable to load PDF")
            }
        case .image:
            if let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
            } else {
                Text("Unable to load image")
            }
        default:
            Text("Document preview not available")
        }
    }
}

// MARK: - Placeholder Views

struct DocumentUploadView: View {
    let onUpload: (Document) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Upload Document")
                .navigationTitle("Upload")
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
    }
}

struct DocumentFilterSheet: View {
    @Binding var selectedCategory: DocumentsVaultView.DocumentCategory
    @Binding var sortOrder: DocumentsVaultView.SortOrder
    @Binding var dateRange: DateRange?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section("Category") {
                    ForEach(DocumentsVaultView.DocumentCategory.allCases, id: \.self) { category in
                        HStack {
                            Image(systemName: category.icon)
                                .foregroundColor(category.color)
                                .frame(width: 30)
                            
                            Text(category.rawValue)
                            
                            Spacer()
                            
                            if selectedCategory == category {
                                Image(systemName: "checkmark")
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedCategory = category
                        }
                    }
                }
                
                Section("Sort Order") {
                    ForEach(DocumentsVaultView.SortOrder.allCases, id: \.self) { order in
                        HStack {
                            Text(order.rawValue)
                            
                            Spacer()
                            
                            if sortOrder == order {
                                Image(systemName: "checkmark")
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            sortOrder = order
                        }
                    }
                }
            }
            .navigationTitle("Filter & Sort")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
