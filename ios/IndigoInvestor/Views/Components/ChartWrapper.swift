//
//  ChartWrapper.swift
//  IndigoInvestor
//
//  Universal chart component supporting iOS 14+ with Swift Charts and DGCharts fallback
//

import SwiftUI
import Charts
import DGCharts

// MARK: - Chart Data Model

struct ChartDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
    let label: String?
    
    init(date: Date, value: Double, label: String? = nil) {
        self.date = date
        self.value = value
        self.label = label
    }
}

// MARK: - Chart Configuration

struct ChartConfiguration {
    var type: ChartType = .line
    var showGrid = true
    var showLegend = false
    var showTooltips = true
    var animationDuration: Double = 0.3
    var lineWidth: CGFloat = 2
    var gradientEnabled = true
    var interactionEnabled = true
    var timeRange: TimeRange = .month
    
    enum ChartType {
        case line
        case bar
        case area
        case candlestick
    }
    
    enum TimeRange: String, CaseIterable {
        case day = "1D"
        case week = "1W"
        case month = "1M"
        case threeMonths = "3M"
        case year = "1Y"
        case all = "All"
    }
}

// MARK: - Main Chart Wrapper

struct ChartWrapper: View {
    let data: [ChartDataPoint]
    let configuration: ChartConfiguration
    @State private var selectedDataPoint: ChartDataPoint?
    @State private var isDragging = false
    
    var body: some View {
        Group {
            if #available(iOS 16.0, *) {
                SwiftChartsView(
                    data: data,
                    configuration: configuration,
                    selectedDataPoint: $selectedDataPoint
                )
            } else {
                DGChartsView(
                    data: data,
                    configuration: configuration,
                    selectedDataPoint: $selectedDataPoint
                )
            }
        }
        .overlay(alignment: .topTrailing) {
            if let selected = selectedDataPoint {
                TooltipView(dataPoint: selected)
                    .padding()
                    .transition(.opacity)
            }
        }
    }
}

// MARK: - Swift Charts Implementation (iOS 16+)

@available(iOS 16.0, *)
struct SwiftChartsView: View {
    let data: [ChartDataPoint]
    let configuration: ChartConfiguration
    @Binding var selectedDataPoint: ChartDataPoint?
    @State private var dragLocation: CGPoint?
    
    var body: some View {
        Chart(data) { point in
            switch configuration.type {
            case .line:
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(IndigoTheme.Colors.primary)
                .lineStyle(StrokeStyle(lineWidth: configuration.lineWidth))
                .interpolationMethod(.catmullRom)
                
                if configuration.gradientEnabled {
                    AreaMark(
                        x: .value("Date", point.date),
                        y: .value("Value", point.value)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                IndigoTheme.Colors.primary.opacity(0.3),
                                IndigoTheme.Colors.primary.opacity(0.05)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
                
            case .bar:
                BarMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(IndigoTheme.Colors.primary)
                
            case .area:
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(IndigoTheme.Colors.primary.opacity(0.3))
                
            case .candlestick:
                // Simplified candlestick representation
                RectangleMark(
                    x: .value("Date", point.date),
                    yStart: .value("Low", point.value * 0.98),
                    yEnd: .value("High", point.value * 1.02)
                )
                .foregroundStyle(point.value > 0 ? Color.green : Color.red)
            }
            
            // Selected point indicator
            if let selected = selectedDataPoint, selected.id == point.id {
                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(IndigoTheme.Colors.primary)
                .symbolSize(100)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel(format: dateFormat(for: configuration.timeRange))
            }
        }
        .chartYAxis {
            AxisMarks { _ in
                AxisGridLine()
                AxisValueLabel(format: .currency(code: "USD"))
            }
        }
        .chartBackground { chartProxy in
            GeometryReader { geometry in
                Rectangle()
                    .fill(Color.clear)
                    .contentShape(Rectangle())
                    .onTapGesture { location in
                        handleTap(location: location, geometry: geometry, chartProxy: chartProxy)
                    }
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                handleDrag(location: value.location, geometry: geometry, chartProxy: chartProxy)
                            }
                            .onEnded { _ in
                                selectedDataPoint = nil
                            }
                    )
            }
        }
        .animation(.easeInOut(duration: configuration.animationDuration), value: data)
    }
    
    private func handleTap(location: CGPoint, geometry: GeometryProxy, chartProxy: ChartProxy) {
        guard configuration.interactionEnabled else { return }
        
        let xPosition = location.x
        let frame = geometry.frame(in: .local)
        let plotWidth = frame.width
        
        // Find nearest data point
        let index = Int((xPosition / plotWidth) * CGFloat(data.count))
        if index >= 0 && index < data.count {
            selectedDataPoint = data[index]
            IndigoTheme.HapticFeedback.selection.trigger()
        }
    }
    
    private func handleDrag(location: CGPoint, geometry: GeometryProxy, chartProxy: ChartProxy) {
        guard configuration.interactionEnabled else { return }
        handleTap(location: location, geometry: geometry, chartProxy: chartProxy)
    }
    
    private func dateFormat(for range: ChartConfiguration.TimeRange) -> Date.FormatStyle {
        switch range {
        case .day:
            return .dateTime.hour()
        case .week, .month:
            return .dateTime.month(.abbreviated).day()
        case .threeMonths, .year, .all:
            return .dateTime.month(.abbreviated)
        }
    }
}

// MARK: - DGCharts Implementation (iOS 14-15)

struct DGChartsView: UIViewRepresentable {
    let data: [ChartDataPoint]
    let configuration: ChartConfiguration
    @Binding var selectedDataPoint: ChartDataPoint?
    
    func makeUIView(context: Context) -> LineChartView {
        let chartView = LineChartView()
        setupChart(chartView)
        chartView.delegate = context.coordinator
        return chartView
    }
    
    func updateUIView(_ chartView: LineChartView, context: Context) {
        updateChartData(chartView)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    private func setupChart(_ chartView: LineChartView) {
        // Chart appearance
        chartView.backgroundColor = .clear
        chartView.gridBackgroundColor = .clear
        chartView.drawGridBackgroundEnabled = false
        chartView.drawBordersEnabled = false
        
        // Interaction
        chartView.dragEnabled = configuration.interactionEnabled
        chartView.setScaleEnabled(false)
        chartView.pinchZoomEnabled = false
        chartView.highlightPerTapEnabled = configuration.interactionEnabled
        chartView.highlightPerDragEnabled = configuration.interactionEnabled
        
        // Grid
        chartView.xAxis.drawGridLinesEnabled = configuration.showGrid
        chartView.leftAxis.drawGridLinesEnabled = configuration.showGrid
        chartView.rightAxis.enabled = false
        
        // Legend
        chartView.legend.enabled = configuration.showLegend
        
        // X-Axis
        chartView.xAxis.labelPosition = .bottom
        chartView.xAxis.labelTextColor = UIColor(IndigoTheme.Colors.textSecondary)
        chartView.xAxis.valueFormatter = DateValueFormatter(timeRange: configuration.timeRange)
        
        // Y-Axis
        chartView.leftAxis.labelTextColor = UIColor(IndigoTheme.Colors.textSecondary)
        chartView.leftAxis.valueFormatter = CurrencyValueFormatter()
        
        // Animation
        if configuration.animationDuration > 0 {
            chartView.animate(xAxisDuration: configuration.animationDuration)
        }
    }
    
    private func updateChartData(_ chartView: LineChartView) {
        let entries = data.enumerated().map { index, point in
            ChartDataEntry(x: Double(index), y: point.value)
        }
        
        let dataSet = LineChartDataSet(entries: entries, label: nil)
        
        // Line style
        dataSet.lineWidth = configuration.lineWidth
        dataSet.setColor(UIColor(IndigoTheme.Colors.primary))
        dataSet.drawCirclesEnabled = false
        dataSet.drawValuesEnabled = false
        dataSet.highlightEnabled = configuration.showTooltips
        
        // Gradient fill
        if configuration.gradientEnabled {
            let gradientColors = [
                UIColor(IndigoTheme.Colors.primary.opacity(0.3)).cgColor,
                UIColor(IndigoTheme.Colors.primary.opacity(0.05)).cgColor
            ]
            let gradient = CGGradient(colorsSpace: nil, colors: gradientColors as CFArray, locations: nil)!
            dataSet.fillAlpha = 1
            dataSet.fill = LinearGradientFill(gradient: gradient, angle: 90)
            dataSet.drawFilledEnabled = true
        }
        
        let lineData = LineChartData(dataSet: dataSet)
        chartView.data = lineData
    }
    
    class Coordinator: NSObject, ChartViewDelegate {
        var parent: DGChartsView
        
        init(_ parent: DGChartsView) {
            self.parent = parent
        }
        
        func chartValueSelected(_ chartView: ChartViewBase, entry: ChartDataEntry, highlight: Highlight) {
            let index = Int(entry.x)
            if index >= 0 && index < parent.data.count {
                parent.selectedDataPoint = parent.data[index]
                IndigoTheme.HapticFeedback.selection.trigger()
            }
        }
        
        func chartValueNothingSelected(_ chartView: ChartViewBase) {
            parent.selectedDataPoint = nil
        }
    }
}

// MARK: - Tooltip View

struct TooltipView: View {
    let dataPoint: ChartDataPoint
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(dataPoint.date.formatted(date: .abbreviated, time: .omitted))
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
            
            Text(formatValue(dataPoint.value))
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            if let label = dataPoint.label {
                Text(label)
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
        }
        .padding(IndigoTheme.Spacing.sm)
        .background(IndigoTheme.Colors.background)
        .cornerRadius(IndigoTheme.CornerRadius.sm)
        .shadow(
            color: IndigoTheme.Shadows.md.color,
            radius: IndigoTheme.Shadows.md.radius,
            x: IndigoTheme.Shadows.md.x,
            y: IndigoTheme.Shadows.md.y
        )
    }
    
    private func formatValue(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: value)) ?? "$0.00"
    }
}

// MARK: - DGCharts Formatters

class DateValueFormatter: NSObject, AxisValueFormatter {
    let timeRange: ChartConfiguration.TimeRange
    private let dateFormatter = DateFormatter()
    
    init(timeRange: ChartConfiguration.TimeRange) {
        self.timeRange = timeRange
        super.init()
        setupDateFormatter()
    }
    
    private func setupDateFormatter() {
        switch timeRange {
        case .day:
            dateFormatter.dateFormat = "HH:mm"
        case .week, .month:
            dateFormatter.dateFormat = "MMM d"
        case .threeMonths, .year, .all:
            dateFormatter.dateFormat = "MMM"
        }
    }
    
    func stringForValue(_ value: Double, axis: AxisBase?) -> String {
        return dateFormatter.string(from: Date())
    }
}

class CurrencyValueFormatter: NSObject, AxisValueFormatter {
    private let formatter = NumberFormatter()
    
    override init() {
        super.init()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
    }
    
    func stringForValue(_ value: Double, axis: AxisBase?) -> String {
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}
