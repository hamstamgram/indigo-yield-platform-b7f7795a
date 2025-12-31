//
//  AdminReportsView.swift
//  IndigoInvestor
//
//  Admin reports management view
//

import SwiftUI

struct AdminReportsView: View {
    @State private var selectedReportType = ReportType.monthly
    @State private var showingExportSheet = false
    @State private var isGenerating = false

    enum ReportType: String, CaseIterable {
        case monthly = "Monthly"
        case quarterly = "Quarterly"
        case annual = "Annual"
        case custom = "Custom"
    }

    var body: some View {
        ScrollView {
                VStack(spacing: 20) {
                    // Report Type Selector
                    Picker("Report Type", selection: $selectedReportType) {
                        ForEach(ReportType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)

                    // Recent Reports
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Recent Reports")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(0..<5) { index in
                            ReportRow(
                                title: "Q3 2024 Investment Report",
                                date: Date().addingTimeInterval(TimeInterval(-86400 * index)),
                                status: index == 0 ? "New" : "Viewed"
                            )
                        }
                    }
                    .padding(.top)

                    // Generate New Report Button
                    Button(action: generateReport) {
                        HStack {
                            if isGenerating {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "doc.badge.plus")
                            }
                            Text("Generate New Report")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .disabled(isGenerating)

                    // Analytics Section
                    AnalyticsCard()
                        .padding(.horizontal)

                    Spacer(minLength: 50)
                }
                .padding(.top)
            }
            .navigationTitle("Reports")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingExportSheet = true }) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        .sheet(isPresented: $showingExportSheet) {
            ExportReportView()
        }
    }

    private func generateReport() {
        isGenerating = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isGenerating = false
        }
    }
}

struct ReportRow: View {
    let title: String
    let date: Date
    let status: String

    var body: some View {
        HStack {
            Image(systemName: "doc.text.fill")
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 44, height: 44)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if status == "New" {
                Text(status)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

struct AnalyticsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Report Analytics")
                .font(.headline)

            HStack(spacing: 20) {
                StatItem(title: "Generated", value: "47", icon: "doc.fill")
                StatItem(title: "Exported", value: "38", icon: "square.and.arrow.up.fill")
                StatItem(title: "Scheduled", value: "12", icon: "calendar")
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ExportReportView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Export Report")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Select export format")
                    .foregroundColor(.secondary)

                VStack(spacing: 12) {
                    ExportOption(format: "PDF", icon: "doc.fill")
                    ExportOption(format: "Excel", icon: "tablecells.fill")
                    ExportOption(format: "CSV", icon: "doc.text.fill")
                }
                .padding()

                Spacer()
            }
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

struct ExportOption: View {
    let format: String
    let icon: String

    var body: some View {
        Button(action: {}) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)

                Text(format)
                    .fontWeight(.medium)

                Spacer()

                Image(systemName: "arrow.down.circle")
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AdminReportsView()
}