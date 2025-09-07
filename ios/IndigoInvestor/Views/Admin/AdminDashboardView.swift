//
//  AdminDashboardView.swift
//  IndigoInvestor
//
//  Admin dashboard with overview and quick actions
//

import SwiftUI
import Charts

struct AdminDashboardView: View {
    @StateObject private var viewModel = AdminDashboardViewModel()
    @State private var selectedMetric = MetricType.totalAUM
    @State private var showingPendingApprovals = false
    @State private var showingInvestorDetails = false
    
    enum MetricType: String, CaseIterable {
        case totalAUM = "Total AUM"
        case activeInvestors = "Active Investors"
        case pendingWithdrawals = "Pending"
        case monthlyGrowth = "Growth"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Metrics
                    AdminMetricsGrid(metrics: viewModel.metrics)
                        .padding(.horizontal)
                    
                    // Quick Actions
                    QuickActionsSection(
                        pendingCount: viewModel.pendingApprovalsCount,
                        onApprovalsPressed: {
                            showingPendingApprovals = true
                        },
                        onInvestorsPressed: {
                            showingInvestorDetails = true
                        }
                    )
                    .padding(.horizontal)
                    
                    // AUM Chart
                    if #available(iOS 16.0, *) {
                        AUMChartView(data: viewModel.aumHistory)
                            .frame(height: 250)
                            .padding(.horizontal)
                    }
                    
                    // Recent Activity
                    RecentActivitySection(activities: viewModel.recentActivities)
                        .padding(.horizontal)
                    
                    // Investor Distribution
                    InvestorDistributionCard(distribution: viewModel.investorDistribution)
                        .padding(.horizontal)
                    
                    // System Health
                    SystemHealthCard(health: viewModel.systemHealth)
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Admin Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { viewModel.exportReport() }) {
                            Label("Export Report", systemImage: "doc.text")
                        }
                        Button(action: { viewModel.refreshData() }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                        Divider()
                        Button(action: { viewModel.toggleTestMode() }) {
                            Label(viewModel.isTestMode ? "Disable Test Mode" : "Enable Test Mode", 
                                  systemImage: "hammer")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refreshData()
            }
            .sheet(isPresented: $showingPendingApprovals) {
                AdminApprovalsView()
            }
            .sheet(isPresented: $showingInvestorDetails) {
                AdminInvestorsView()
            }
        }
        .task {
            await viewModel.loadDashboard()
        }
    }
}

// MARK: - Metrics Grid

struct AdminMetricsGrid: View {
    let metrics: AdminMetrics
    
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                MetricCard(
                    title: "Total AUM",
                    value: metrics.totalAUM.formatted(.currency(code: "USD")),
                    change: metrics.aumChange,
                    icon: "dollarsign.circle.fill",
                    color: .green
                )
                
                MetricCard(
                    title: "Active Investors",
                    value: "\(metrics.activeInvestors)",
                    change: nil,
                    icon: "person.3.fill",
                    color: .blue
                )
            }
            
            HStack(spacing: 16) {
                MetricCard(
                    title: "Pending Approvals",
                    value: "\(metrics.pendingApprovals)",
                    change: nil,
                    icon: "clock.fill",
                    color: .orange
                )
                
                MetricCard(
                    title: "Monthly Growth",
                    value: "\(String(format: "%.1f", metrics.monthlyGrowthRate))%",
                    change: metrics.growthRateChange,
                    icon: "chart.line.uptrend.xyaxis",
                    color: .purple
                )
            }
        }
    }
}

// MARK: - Metric Card

struct MetricCard: View {
    let title: String
    let value: String
    let change: Double?
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                
                Spacer()
                
                if let change = change {
                    ChangeIndicator(value: change)
                }
            }
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title3)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Change Indicator

struct ChangeIndicator: View {
    let value: Double
    
    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: value >= 0 ? "arrow.up.right" : "arrow.down.right")
                .font(.caption)
            Text("\(String(format: "%.1f", abs(value)))%")
                .font(.caption)
                .fontWeight(.semibold)
        }
        .foregroundColor(value >= 0 ? .green : .red)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(value >= 0 ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
        .cornerRadius(4)
    }
}

// MARK: - Quick Actions Section

struct QuickActionsSection: View {
    let pendingCount: Int
    let onApprovalsPressed: () -> Void
    let onInvestorsPressed: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
            
            HStack(spacing: 12) {
                QuickActionButton(
                    title: "Pending Approvals",
                    subtitle: "\(pendingCount) items",
                    icon: "checkmark.shield.fill",
                    color: pendingCount > 0 ? .orange : .green,
                    badge: pendingCount > 0 ? "\(pendingCount)" : nil,
                    action: onApprovalsPressed
                )
                
                QuickActionButton(
                    title: "Manage Investors",
                    subtitle: "View all",
                    icon: "person.crop.circle.badge.plus",
                    color: .blue,
                    badge: nil,
                    action: onInvestorsPressed
                )
            }
            
            HStack(spacing: 12) {
                QuickActionButton(
                    title: "Generate Report",
                    subtitle: "Monthly",
                    icon: "doc.chart.fill",
                    color: .purple,
                    badge: nil,
                    action: {}
                )
                
                QuickActionButton(
                    title: "System Settings",
                    subtitle: "Configure",
                    icon: "gearshape.fill",
                    color: .gray,
                    badge: nil,
                    action: {}
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let badge: String?
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(color)
                        .frame(width: 40, height: 40)
                        .background(color.opacity(0.1))
                        .cornerRadius(10)
                    
                    if let badge = badge {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(4)
                            .background(Color.red)
                            .clipShape(Circle())
                            .offset(x: 8, y: -8)
                    }
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(12)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - AUM Chart

@available(iOS 16.0, *)
struct AUMChartView: View {
    let data: [AUMDataPoint]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Assets Under Management")
                .font(.headline)
            
            Chart(data) { point in
                LineMark(
                    x: .value("Date", point.date),
                    y: .value("AUM", point.value)
                )
                .foregroundStyle(Color.accentColor)
                .interpolationMethod(.catmullRom)
                
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("AUM", point.value)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color.accentColor.opacity(0.3),
                            Color.accentColor.opacity(0.05)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisGridLine()
                    AxisTick()
                    AxisValueLabel(format: .dateTime.month().day())
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine()
                    AxisValueLabel(format: .currency(code: "USD").notation(.compactName))
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Recent Activity Section

struct RecentActivitySection: View {
    let activities: [AdminActivity]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Activity")
                    .font(.headline)
                
                Spacer()
                
                Button("View All") {
                    // Navigate to activity log
                }
                .font(.caption)
                .foregroundColor(.accentColor)
            }
            
            VStack(spacing: 8) {
                ForEach(activities.prefix(5)) { activity in
                    ActivityRow(activity: activity)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    let activity: AdminActivity
    
    var body: some View {
        HStack {
            Circle()
                .fill(activity.color.opacity(0.15))
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: activity.icon)
                        .foregroundColor(activity.color)
                        .font(.system(size: 16))
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(activity.title)
                    .font(.subheadline)
                    .lineLimit(1)
                
                Text(activity.timestamp, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if let value = activity.value {
                Text(value)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Investor Distribution Card

struct InvestorDistributionCard: View {
    let distribution: [InvestorSegment]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Investor Distribution")
                .font(.headline)
            
            VStack(spacing: 8) {
                ForEach(distribution) { segment in
                    HStack {
                        Circle()
                            .fill(Color(segment.color))
                            .frame(width: 12, height: 12)
                        
                        Text(segment.name)
                            .font(.subheadline)
                        
                        Spacer()
                        
                        Text("\(segment.count) (\(String(format: "%.1f", segment.percentage))%)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(segment.totalValue.formatted(.currency(code: "USD").notation(.compactName)))
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - System Health Card

struct SystemHealthCard: View {
    let health: SystemHealth
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("System Health")
                    .font(.headline)
                
                Spacer()
                
                Circle()
                    .fill(health.overallStatus.color)
                    .frame(width: 12, height: 12)
                
                Text(health.overallStatus.rawValue.capitalized)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(health.overallStatus.color)
            }
            
            VStack(spacing: 8) {
                HealthMetricRow(title: "API Response Time", value: "\(health.apiResponseTime)ms", status: health.apiStatus)
                HealthMetricRow(title: "Database Load", value: "\(health.databaseLoad)%", status: health.databaseStatus)
                HealthMetricRow(title: "Storage Usage", value: "\(health.storageUsage)%", status: health.storageStatus)
                HealthMetricRow(title: "Active Sessions", value: "\(health.activeSessions)", status: .healthy)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Health Metric Row

struct HealthMetricRow: View {
    let title: String
    let value: String
    let status: SystemHealth.Status
    
    var body: some View {
        HStack {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
            
            Circle()
                .fill(status.color)
                .frame(width: 8, height: 8)
        }
    }
}

// MARK: - Models

struct AdminMetrics {
    let totalAUM: Decimal
    let aumChange: Double
    let activeInvestors: Int
    let pendingApprovals: Int
    let monthlyGrowthRate: Double
    let growthRateChange: Double
}

struct AUMDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}

struct AdminActivity: Identifiable {
    let id = UUID()
    let title: String
    let timestamp: Date
    let icon: String
    let color: Color
    let value: String?
}

struct InvestorSegment: Identifiable {
    let id = UUID()
    let name: String
    let count: Int
    let percentage: Double
    let totalValue: Decimal
    let color: String
}

struct SystemHealth {
    enum Status {
        case healthy, warning, critical
        
        var color: Color {
            switch self {
            case .healthy: return .green
            case .warning: return .orange
            case .critical: return .red
            }
        }
    }
    
    let overallStatus: Status
    let apiResponseTime: Int
    let apiStatus: Status
    let databaseLoad: Int
    let databaseStatus: Status
    let storageUsage: Int
    let storageStatus: Status
    let activeSessions: Int
}

// MARK: - View Model

@MainActor
class AdminDashboardViewModel: ObservableObject {
    @Published var metrics = AdminMetrics(
        totalAUM: 125_000_000,
        aumChange: 5.2,
        activeInvestors: 142,
        pendingApprovals: 3,
        monthlyGrowthRate: 8.5,
        growthRateChange: 1.2
    )
    
    @Published var pendingApprovalsCount = 3
    @Published var aumHistory: [AUMDataPoint] = []
    @Published var recentActivities: [AdminActivity] = []
    @Published var investorDistribution: [InvestorSegment] = []
    @Published var systemHealth = SystemHealth(
        overallStatus: .healthy,
        apiResponseTime: 45,
        apiStatus: .healthy,
        databaseLoad: 35,
        databaseStatus: .healthy,
        storageUsage: 62,
        storageStatus: .warning,
        activeSessions: 89
    )
    
    @Published var isTestMode = false
    
    func loadDashboard() async {
        // Load dashboard data
        generateMockData()
    }
    
    func refreshData() async {
        await loadDashboard()
    }
    
    func exportReport() {
        // Export admin report
    }
    
    func toggleTestMode() {
        isTestMode.toggle()
    }
    
    private func generateMockData() {
        // Generate AUM history
        var history: [AUMDataPoint] = []
        let baseValue = 100_000_000.0
        
        for i in 0..<30 {
            let date = Calendar.current.date(byAdding: .day, value: -30 + i, to: Date())!
            let variation = Double.random(in: -2_000_000...3_000_000)
            let value = baseValue + variation + Double(i * 800_000)
            history.append(AUMDataPoint(date: date, value: value))
        }
        aumHistory = history
        
        // Generate recent activities
        recentActivities = [
            AdminActivity(title: "New investor onboarded", timestamp: Date().addingTimeInterval(-3600), icon: "person.badge.plus", color: .green, value: "$500K"),
            AdminActivity(title: "Withdrawal approved", timestamp: Date().addingTimeInterval(-7200), icon: "checkmark.circle", color: .blue, value: "$75K"),
            AdminActivity(title: "Statement generated", timestamp: Date().addingTimeInterval(-10800), icon: "doc.text", color: .purple, value: "Q3 2024"),
            AdminActivity(title: "System backup completed", timestamp: Date().addingTimeInterval(-14400), icon: "externaldrive", color: .gray, value: nil),
            AdminActivity(title: "Interest distributed", timestamp: Date().addingTimeInterval(-18000), icon: "percent", color: .orange, value: "$1.2M")
        ]
        
        // Generate investor distribution
        investorDistribution = [
            InvestorSegment(name: "Premium", count: 15, percentage: 10.6, totalValue: 45_000_000, color: "purple"),
            InvestorSegment(name: "Standard", count: 87, percentage: 61.3, totalValue: 65_000_000, color: "blue"),
            InvestorSegment(name: "Basic", count: 40, percentage: 28.1, totalValue: 15_000_000, color: "green")
        ]
    }
}

// MARK: - Preview

#Preview {
    AdminDashboardView()
}
