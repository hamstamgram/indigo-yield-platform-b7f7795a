import SwiftUI
import Charts

struct YieldGeneratedView: View {
    @StateObject private var viewModel = YieldViewModel()
    @State private var selectedTimeRange = "30D"
    @State private var selectedAsset = "All Assets"

    let timeRanges = ["7D", "30D", "90D", "1Y", "All"]
    let assets = ["All Assets", "BTC", "ETH", "USDC", "EUROC"]

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // Total Yield Card
                        totalYieldCard

                        // Yield Chart
                        yieldChartCard

                        // Asset Performance
                        assetPerformanceCard

                        // Recent Yields
                        recentYieldsCard
                    }
                    .padding(IndigoTheme.Spacing.md)
                    .padding(.bottom, 100)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .top) {
                customNavigationBar
            }
        }
    }

    // MARK: - Navigation Bar
    private var customNavigationBar: some View {
        HStack {
            Text("Yield Generated")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()

            Button(action: {}) {
                Image(systemName: "calendar")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Total Yield Card
    private var totalYieldCard: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            HStack {
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                    Text("Total Yield Generated")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)

                    Text("$45,678.90")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    HStack(spacing: IndigoTheme.Spacing.sm) {
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(IndigoTheme.Colors.success)

                        Text("+5.2% this month")
                            .font(IndigoTheme.Typography.footnote)
                            .foregroundColor(IndigoTheme.Colors.success)
                    }
                }

                Spacer()

                // APY Display
                VStack(spacing: IndigoTheme.Spacing.sm) {
                    Text("Current APY")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)

                    Text("8.5%")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }

            // Time Range Selector
            HStack {
                ForEach(timeRanges, id: \.self) { range in
                    Button(action: { selectedTimeRange = range }) {
                        Text(range)
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
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }

    // MARK: - Yield Chart Card
    private var yieldChartCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("Yield Trend")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Spacer()

                Menu {
                    ForEach(assets, id: \.self) { asset in
                        Button(action: { selectedAsset = asset }) {
                            Text(asset)
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(selectedAsset)
                            .font(IndigoTheme.Typography.footnote)
                            .foregroundColor(IndigoTheme.Colors.primaryGradientStart)

                        Image(systemName: "chevron.down")
                            .font(.caption2)
                            .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                    }
                    .padding(.horizontal, IndigoTheme.Spacing.sm)
                    .padding(.vertical, 4)
                    .background(IndigoTheme.Colors.primaryGradient.opacity(0.1))
                    .cornerRadius(IndigoTheme.CornerRadius.small)
                }
            }

            Chart(viewModel.yieldData) { data in
                BarMark(
                    x: .value("Date", data.date),
                    y: .value("Yield", data.amount)
                )
                .foregroundStyle(IndigoTheme.Colors.primaryGradient)
                .cornerRadius(4)
            }
            .frame(height: 200)
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisGridLine()
                        .foregroundStyle(Color.clear)
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine()
                        .foregroundStyle(IndigoTheme.Colors.secondaryBackground)
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }

    // MARK: - Asset Performance Card
    private var assetPerformanceCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Asset Performance")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            VStack(spacing: IndigoTheme.Spacing.md) {
                AssetPerformanceRow(
                    asset: "BTC",
                    icon: "₿",
                    color: IndigoTheme.Colors.btc,
                    totalYield: "$18,450.00",
                    apy: "8.50%",
                    percentage: 40
                )

                AssetPerformanceRow(
                    asset: "ETH",
                    icon: "Ξ",
                    color: IndigoTheme.Colors.eth,
                    totalYield: "$12,340.00",
                    apy: "9.50%",
                    percentage: 27
                )

                AssetPerformanceRow(
                    asset: "USDC",
                    icon: "$",
                    color: IndigoTheme.Colors.usdc,
                    totalYield: "$8,888.90",
                    apy: "7.00%",
                    percentage: 19
                )

                AssetPerformanceRow(
                    asset: "EUROC",
                    icon: "€",
                    color: IndigoTheme.Colors.info,
                    totalYield: "$6,000.00",
                    apy: "6.50%",
                    percentage: 14
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }

    // MARK: - Recent Yields Card
    private var recentYieldsCard: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("Recent Yields")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Spacer()

                Button(action: {}) {
                    Text("View All")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }

            VStack(spacing: IndigoTheme.Spacing.sm) {
                RecentYieldRow(
                    date: Date(),
                    asset: "BTC",
                    amount: "$267.80",
                    apy: "8.5%"
                )

                RecentYieldRow(
                    date: Date().addingTimeInterval(-86400),
                    asset: "ETH",
                    amount: "$189.50",
                    apy: "9.5%"
                )

                RecentYieldRow(
                    date: Date().addingTimeInterval(-172800),
                    asset: "USDC",
                    amount: "$125.00",
                    apy: "7.0%"
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }
}

// MARK: - Supporting Views
struct AssetPerformanceRow: View {
    let asset: String
    let icon: String
    let color: Color
    let totalYield: String
    let apy: String
    let percentage: Int

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(color.opacity(0.1))
                    .frame(width: 40, height: 40)

                Text(icon)
                    .font(.title3)
                    .foregroundColor(color)
            }

            // Asset Info
            VStack(alignment: .leading, spacing: 4) {
                Text(asset)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text("APY: \(apy)")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()

            // Performance
            VStack(alignment: .trailing, spacing: 4) {
                Text(totalYield)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                ProgressView(value: Double(percentage), total: 100)
                    .progressViewStyle(LinearProgressViewStyle(tint: color))
                    .scaleEffect(x: 1, y: 0.5)
                    .frame(width: 60)
            }
        }
    }
}

struct RecentYieldRow: View {
    let date: Date
    let asset: String
    let amount: String
    let apy: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(date, style: .date)
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                HStack(spacing: 4) {
                    Text(asset)
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text("• APY: \(apy)")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }
            }

            Spacer()

            Text(amount)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.success)
        }
        .padding(.vertical, IndigoTheme.Spacing.sm)
    }
}

// MARK: - View Model
class YieldViewModel: ObservableObject {
    @Published var totalYield: Double = 45678.90
    @Published var currentAPY: Double = 8.5
    @Published var yieldData: [YieldDataPoint] = []

    init() {
        generateSampleData()
    }

    private func generateSampleData() {
        let amounts: [Double] = [245, 267, 189, 298, 312, 278, 325]
        yieldData = amounts.enumerated().map { index, amount in
            YieldDataPoint(
                date: Date().addingTimeInterval(Double(-6 + index) * 86400),
                amount: amount
            )
        }
    }
}

struct YieldDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let amount: Double
}