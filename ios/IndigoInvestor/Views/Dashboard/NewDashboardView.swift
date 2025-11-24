import SwiftUI
import Charts

struct NewDashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedTimeRange = TimeRange.thirtyDays

    enum TimeRange: String, CaseIterable {
        case sevenDays = "7D"
        case thirtyDays = "30D"
        case ninetyDays = "90D"
        case oneYear = "1Y"
        case all = "All"
    }

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // Portfolio Value Card
                        portfolioValueCard

                        // Asset Distribution
                        assetDistributionCard

                        // Recent Activity
                        recentActivityCard
                    }
                    .padding(IndigoTheme.Spacing.md)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .top) {
                customNavigationBar
            }
        }
    }

    // MARK: - Custom Navigation Bar
    private var customNavigationBar: some View {
        HStack {
            Text("Portfolio")
                .font(IndigoTheme.Typography.title1)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()

            HStack(spacing: IndigoTheme.Spacing.md) {
                Button(action: {}) {
                    Image(systemName: "bell")
                        .font(.title3)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }

                Button(action: {}) {
                    Image(systemName: "person.circle.fill")
                        .font(.title2)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Portfolio Value Card
    private var portfolioValueCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            Text("Total Portfolio Value")
                .font(IndigoTheme.Typography.subheadline)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            HStack(alignment: .bottom, spacing: IndigoTheme.Spacing.sm) {
                Text("$1,375,123.45")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                    Text("+12.5%")
                        .font(IndigoTheme.Typography.caption1)
                }
                .foregroundColor(IndigoTheme.Colors.success)
                .padding(.horizontal, IndigoTheme.Spacing.sm)
                .padding(.vertical, IndigoTheme.Spacing.xs)
                .background(IndigoTheme.Colors.success.opacity(0.1))
                .cornerRadius(IndigoTheme.CornerRadius.small)
            }

            // Time Range Selector
            HStack {
                ForEach(TimeRange.allCases, id: \.self) { range in
                    Button(action: { selectedTimeRange = range }) {
                        Text(range.rawValue)
                            .font(IndigoTheme.Typography.footnote)
                            .foregroundColor(selectedTimeRange == range ? .white : IndigoTheme.Colors.secondaryText)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, IndigoTheme.Spacing.sm)
                            .background(
                                selectedTimeRange == range ?
                                IndigoTheme.Colors.primaryGradient :
                                Color.clear
                            )
                            .cornerRadius(IndigoTheme.CornerRadius.small)
                    }
                }
            }
            .padding(4)
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.medium)

            // Chart
            portfolioChart
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Portfolio Chart
    private var portfolioChart: some View {
        Chart {
            ForEach(sampleChartData) { item in
                LineMark(
                    x: .value("Date", item.date),
                    y: .value("Value", item.value)
                )
                .foregroundStyle(IndigoTheme.Colors.primaryGradient)

                AreaMark(
                    x: .value("Date", item.date),
                    y: .value("Value", item.value)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            IndigoTheme.Colors.primaryGradientStart.opacity(0.3),
                            IndigoTheme.Colors.primaryGradientEnd.opacity(0.05)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .frame(height: 200)
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                    .foregroundStyle(Color.clear)
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                    .foregroundStyle(IndigoTheme.Colors.secondaryBackground)
            }
        }
    }

    // MARK: - Asset Distribution Card
    private var assetDistributionCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Asset Distribution")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            VStack(spacing: IndigoTheme.Spacing.md) {
                AssetRowView(
                    icon: "₿",
                    name: "Bitcoin",
                    symbol: "BTC",
                    amount: "2.345",
                    value: "$140,123.45",
                    percentage: 35.2,
                    change: 5.2,
                    color: IndigoTheme.Colors.btc
                )

                AssetRowView(
                    icon: "Ξ",
                    name: "Ethereum",
                    symbol: "ETH",
                    amount: "45.678",
                    value: "$85,432.10",
                    percentage: 28.5,
                    change: -2.1,
                    color: IndigoTheme.Colors.eth
                )

                AssetRowView(
                    icon: "$",
                    name: "USD Coin",
                    symbol: "USDC",
                    amount: "50,000",
                    value: "$50,000.00",
                    percentage: 20.0,
                    change: 0.0,
                    color: IndigoTheme.Colors.usdc
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Recent Activity Card
    private var recentActivityCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("Recent Activity")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Spacer()

                Button(action: {}) {
                    Text("View All")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }

            VStack(spacing: IndigoTheme.Spacing.md) {
                ActivityRowView(
                    type: .yieldGenerated,
                    title: "Daily Yield Generated",
                    subtitle: "+0.05 BTC",
                    amount: "+$3,250.00",
                    date: Date()
                )

                ActivityRowView(
                    type: .deposit,
                    title: "Deposit Received",
                    subtitle: "100,000 USDC",
                    amount: "+$100,000.00",
                    date: Date().addingTimeInterval(-86400)
                )

                ActivityRowView(
                    type: .withdrawal,
                    title: "Withdrawal Processed",
                    subtitle: "0.5 ETH",
                    amount: "-$1,250.00",
                    date: Date().addingTimeInterval(-172800)
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // Sample data for chart
    private var sampleChartData: [ChartDataPoint] {
        let values: [Double] = [1200000, 1250000, 1230000, 1280000, 1320000, 1350000, 1375123]
        return values.enumerated().map { index, value in
            ChartDataPoint(
                date: Date().addingTimeInterval(Double(-6 + index) * 86400),
                value: value
            )
        }
    }
}

// MARK: - Supporting Views
struct AssetRowView: View {
    let icon: String
    let name: String
    let symbol: String
    let amount: String
    let value: String
    let percentage: Double
    let change: Double
    let color: Color

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(color.opacity(0.1))
                    .frame(width: 48, height: 48)

                Text(icon)
                    .font(.title2)
                    .foregroundColor(color)
            }

            // Asset Info
            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text("\(amount) \(symbol)")
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()

            // Value Info
            VStack(alignment: .trailing, spacing: 4) {
                Text(value)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                HStack(spacing: 4) {
                    Text("\(percentage, specifier: "%.1f")%")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)

                    if change != 0 {
                        HStack(spacing: 2) {
                            Image(systemName: change > 0 ? "arrow.up" : "arrow.down")
                                .font(.system(size: 10))
                            Text("\(abs(change), specifier: "%.1f")%")
                                .font(IndigoTheme.Typography.caption2)
                        }
                        .foregroundColor(change > 0 ? IndigoTheme.Colors.success : IndigoTheme.Colors.error)
                    }
                }
            }
        }
        .padding(.vertical, IndigoTheme.Spacing.sm)
    }
}

struct ActivityRowView: View {
    enum ActivityType {
        case yieldGenerated
        case deposit
        case withdrawal

        var icon: String {
            switch self {
            case .yieldGenerated: return "chart.line.uptrend.xyaxis"
            case .deposit: return "arrow.down.circle"
            case .withdrawal: return "arrow.up.circle"
            }
        }

        var color: Color {
            switch self {
            case .yieldGenerated: return IndigoTheme.Colors.primaryGradientStart
            case .deposit: return IndigoTheme.Colors.success
            case .withdrawal: return IndigoTheme.Colors.warning
            }
        }
    }

    let type: ActivityType
    let title: String
    let subtitle: String
    let amount: String
    let date: Date

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(type.color.opacity(0.1))
                    .frame(width: 40, height: 40)

                Image(systemName: type.icon)
                    .font(.callout)
                    .foregroundColor(type.color)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(IndigoTheme.Typography.subheadline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(subtitle)
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()

            // Amount & Date
            VStack(alignment: .trailing, spacing: 4) {
                Text(amount)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(date, style: .relative)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }
        }
    }
}

// MARK: - Chart Data Model
struct ChartDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}