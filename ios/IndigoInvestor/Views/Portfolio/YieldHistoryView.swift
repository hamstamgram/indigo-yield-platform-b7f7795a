//
//  YieldHistoryView.swift
//  IndigoInvestor
//
//  Shows historical yield data for the portfolio
//

import SwiftUI
import Charts

struct YieldHistoryView: View {
    @StateObject private var viewModel = YieldHistoryViewModel()
    @State private var selectedTimeframe = TimeFrame.threeMonths
    @State private var showingExportSheet = false
    
    enum TimeFrame: String, CaseIterable {
        case oneMonth = "1M"
        case threeMonths = "3M"
        case sixMonths = "6M"
        case oneYear = "1Y"
        case all = "All"
        
        var months: Int? {
            switch self {
            case .oneMonth: return 1
            case .threeMonths: return 3
            case .sixMonths: return 6
            case .oneYear: return 12
            case .all: return nil
            }
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Summary Card
                summaryCard
                
                // Timeframe Selector
                timeframeSelector
                
                // Yield Chart
                if !viewModel.yieldData.isEmpty {
                    yieldChart
                }
                
                // Monthly Breakdown
                monthlyBreakdown
            }
            .padding()
        }
        .navigationTitle("Yield History")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingExportSheet = true }) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .refreshable {
            await viewModel.loadYieldHistory(timeframe: selectedTimeframe)
        }
        .sheet(isPresented: $showingExportSheet) {
            YieldHistoryExportView(
                data: viewModel.yieldData,
                dismiss: { showingExportSheet = false }
            )
        }
        .task {
            await viewModel.loadYieldHistory(timeframe: selectedTimeframe)
        }
    }
    
    private var summaryCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Yield")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.totalYield, format: .currency(code: "USD"))
                        .font(.title2.bold())
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Average APY")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(viewModel.averageAPY, specifier: "%.2f")%")
                        .font(.title2.bold())
                        .foregroundColor(.green)
                }
            }
            
            Divider()
            
            HStack {
                Label("\(viewModel.monthCount) months", systemImage: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Label("Last updated \(viewModel.lastUpdated, style: .relative)", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
    
    private var timeframeSelector: some View {
        Picker("Timeframe", selection: $selectedTimeframe) {
            ForEach(TimeFrame.allCases, id: \.self) { timeframe in
                Text(timeframe.rawValue).tag(timeframe)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: selectedTimeframe) { newValue in
            Task {
                await viewModel.loadYieldHistory(timeframe: newValue)
            }
        }
    }
    
    @ViewBuilder
    private var yieldChart: some View {
        if #available(iOS 16.0, *) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Cumulative Yield")
                    .font(.headline)

                Chart(viewModel.yieldData) { dataPoint in
                    LineMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Yield", dataPoint.cumulativeYield)
                    )
                    .foregroundStyle(Color.green.gradient)

                    AreaMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Yield", dataPoint.cumulativeYield)
                    )
                    .foregroundStyle(Color.green.opacity(0.1).gradient)
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .automatic) { _ in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel(format: .dateTime.month().year())
                    }
                }
                .chartYAxis {
                    AxisMarks(values: .automatic) { value in
                        AxisGridLine()
                        AxisTick()
                        AxisValueLabel {
                            if let intValue = value.as(Double.self) {
                                Text(intValue, format: .currency(code: "USD").precision(.fractionLength(0)))
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        } else {
            // iOS 15 fallback - Simple list view
            VStack(alignment: .leading, spacing: 8) {
                Text("Cumulative Yield")
                    .font(.headline)
                Text("Chart requires iOS 16+")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }
    
    private var monthlyBreakdown: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Monthly Breakdown")
                .font(.headline)
            
            ForEach(viewModel.monthlyBreakdown) { month in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(month.date, format: .dateTime.year().month(.wide))
                            .font(.subheadline)
                        Text("\(month.apy, specifier: "%.2f")% APY")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text(month.yield, format: .currency(code: "USD"))
                        .font(.subheadline.bold())
                        .foregroundColor(.green)
                }
                .padding(.vertical, 8)
                
                if month.id != viewModel.monthlyBreakdown.last?.id {
                    Divider()
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// View Model
class YieldHistoryViewModel: ObservableObject {
    @Published var yieldData: [HistoricalYieldPoint] = []
    @Published var monthlyBreakdown: [MonthlyYield] = []
    @Published var totalYield: Double = 0
    @Published var averageAPY: Double = 0
    @Published var monthCount: Int = 0
    @Published var lastUpdated = Date()
    
    func loadYieldHistory(timeframe: YieldHistoryView.TimeFrame) async {
        // Implementation would fetch from Supabase
        // This is mock data for now
        await MainActor.run {
            self.yieldData = generateMockData(months: timeframe.months ?? 24)
            self.calculateSummary()
        }
    }

    private func generateMockData(months: Int) -> [HistoricalYieldPoint] {
        var data: [HistoricalYieldPoint] = []
        let calendar = Calendar.current
        var cumulativeYield: Double = 0

        for i in 0..<months {
            let date = calendar.date(byAdding: .month, value: -months + i + 1, to: Date())!
            let monthlyYield = Double.random(in: 800...1200)
            cumulativeYield += monthlyYield

            data.append(HistoricalYieldPoint(
                id: UUID().uuidString,
                date: date,
                monthlyYield: monthlyYield,
                cumulativeYield: cumulativeYield,
                apy: Double.random(in: 11.5...12.5)
            ))
        }

        return data
    }
    
    private func calculateSummary() {
        totalYield = yieldData.last?.cumulativeYield ?? 0
        monthCount = yieldData.count
        
        if !yieldData.isEmpty {
            averageAPY = yieldData.map { $0.apy }.reduce(0, +) / Double(yieldData.count)
        }
        
        // Generate monthly breakdown
        monthlyBreakdown = yieldData.suffix(12).map { dataPoint in
            MonthlyYield(
                id: dataPoint.id,
                date: dataPoint.date,
                yield: dataPoint.monthlyYield,
                apy: dataPoint.apy
            )
        }.reversed()
    }
}

// MARK: - Models
struct HistoricalYieldPoint: Identifiable {
    let id: String
    let date: Date
    let monthlyYield: Double
    let cumulativeYield: Double
    let apy: Double
}

struct MonthlyYield: Identifiable {
    let id: String
    let date: Date
    let yield: Double
    let apy: Double
}

// MARK: - Export Options View
struct YieldHistoryExportView: View {
    let data: [HistoricalYieldPoint]
    let dismiss: () -> Void
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    Button(action: exportCSV) {
                        Label("Export as CSV", systemImage: "doc.text")
                    }
                    
                    Button(action: exportPDF) {
                        Label("Export as PDF", systemImage: "doc.richtext")
                    }
                    
                    Button(action: shareData) {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                }
            }
            .navigationTitle("Export Options")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
    
    private func exportCSV() {
        // Implementation
        dismiss()
    }

    private func exportPDF() {
        // Implementation
        dismiss()
    }

    private func shareData() {
        // Implementation
        dismiss()
    }
}
