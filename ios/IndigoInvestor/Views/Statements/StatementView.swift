//
//  StatementView.swift
//  IndigoInvestor
//
//  View for displaying account statements
//

import SwiftUI
import PDFKit

struct StatementView: View {
    let statementId: String
    @StateObject private var viewModel = StatementViewModel()
    @State private var showingShareSheet = false
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            if viewModel.isLoading {
                ProgressView("Loading statement...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.red)
                    Text("Failed to load statement")
                        .font(.headline)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Button("Retry") {
                        Task {
                            await viewModel.loadStatement(id: statementId)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            } else if let pdfURL = viewModel.pdfURL {
                PDFViewer(url: pdfURL)
                    .navigationTitle(viewModel.statementTitle)
                    .navigationBarTitleDisplayMode(.inline)
                    .accessibilityAddTraits(.isHeader)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button(action: { showingShareSheet = true }) {
                                Image(systemName: "square.and.arrow.up")
                            }
                            .accessibilityLabel("Share statement")
                            .accessibilityHint("Opens sharing options for this statement")
                        }
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Done") {
                                dismiss()
                            }
                            .accessibilityLabel("Close statement")
                            .accessibilityHint("Returns to statements list")
                        }
                    }
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            if let pdfURL = viewModel.pdfURL {
                ShareSheet(items: [pdfURL])
            }
        }
        .task {
            await viewModel.loadStatement(id: statementId)
        }
    }
}

struct PDFViewer: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.document = PDFDocument(url: url)
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        return pdfView
    }
    
    func updateUIView(_ uiView: PDFView, context: Context) {
        // No updates needed
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {
        // No updates needed
    }
}
