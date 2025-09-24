import SwiftUI

struct NewsletterView: View {
    @StateObject private var viewModel = NewsletterViewModel()
    @State private var selectedCategory = "All"
    @State private var searchText = ""

    let categories = ["All", "Weekly Insights", "Personal Deep Dive", "Future of Finance", "Events"]

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // Upcoming Section
                        upcomingSection

                        // Category Filters
                        categoryFilters

                        // Newsletter List
                        newsletterList
                    }
                    .padding(.top, 100)
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
        VStack(spacing: IndigoTheme.Spacing.md) {
            HStack {
                Button(action: {}) {
                    Image(systemName: "arrow.left")
                        .font(.title3)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }

                Spacer()

                Text("Newsletters")
                    .font(IndigoTheme.Typography.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Spacer()

                Button(action: {}) {
                    Image(systemName: "bell")
                        .font(.title3)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                }
            }
            .padding(.horizontal, IndigoTheme.Spacing.md)
            .padding(.top, 60)
        }
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Upcoming Section
    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("Upcoming / Past")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Toggle("", isOn: .constant(true))
                    .labelsHidden()
                    .scaleEffect(0.8)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: IndigoTheme.Spacing.md) {
                    UpcomingCard(
                        title: "Weekly Of Insights",
                        date: "Jul 16",
                        time: "13:00",
                        icon: "newspaper.fill",
                        color: IndigoTheme.Colors.primaryGradientStart
                    )

                    UpcomingCard(
                        title: "Personal Deep Dive",
                        date: "Dec 2",
                        time: "14:00",
                        icon: "person.fill",
                        color: IndigoTheme.Colors.info
                    )

                    UpcomingCard(
                        title: "Yield Farming Deep Dive",
                        date: "Jul 7",
                        time: "15:00",
                        icon: "chart.line.uptrend.xyaxis",
                        color: IndigoTheme.Colors.success
                    )
                }
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
    }

    // MARK: - Category Filters
    private var categoryFilters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(categories, id: \.self) { category in
                    CategoryChip(
                        title: category,
                        isSelected: selectedCategory == category,
                        action: { selectedCategory = category }
                    )
                }
            }
            .padding(.horizontal, IndigoTheme.Spacing.md)
        }
    }

    // MARK: - Newsletter List
    private var newsletterList: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            // Subscribe to Newsletter Card
            SubscribeCard()

            // Newsletter Items
            ForEach(viewModel.newsletters) { newsletter in
                NewsletterCard(newsletter: newsletter)
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
    }
}

// MARK: - Supporting Views
struct UpcomingCard: View {
    let title: String
    let date: String
    let time: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)

                Spacer()

                Text("Upcoming")
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, IndigoTheme.Spacing.sm)
                    .padding(.vertical, 2)
                    .background(color)
                    .cornerRadius(IndigoTheme.CornerRadius.small)
            }

            Text(title)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)
                .lineLimit(2)

            HStack {
                Label(date, systemImage: "calendar")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Label(time, systemImage: "clock")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .frame(width: 160, height: 120)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
        .shadow(
            color: IndigoTheme.Shadow.small.color,
            radius: IndigoTheme.Shadow.small.radius,
            x: IndigoTheme.Shadow.small.x,
            y: IndigoTheme.Shadow.small.y
        )
    }
}

struct CategoryChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(IndigoTheme.Typography.footnote)
                .foregroundColor(isSelected ? .white : IndigoTheme.Colors.primaryText)
                .padding(.horizontal, IndigoTheme.Spacing.md)
                .padding(.vertical, IndigoTheme.Spacing.sm)
                .background(
                    isSelected ?
                    IndigoTheme.Colors.primaryGradient :
                    AnyView(IndigoTheme.Colors.secondaryBackground)
                )
                .cornerRadius(IndigoTheme.CornerRadius.pill)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SubscribeCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                    Text("Subscribe to Newsletter")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(.white)

                    Text("Get weekly insights delivered to your inbox")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(.white.opacity(0.8))
                }

                Spacer()

                Button(action: {}) {
                    Text("Subscribe")
                        .font(IndigoTheme.Typography.footnote)
                        .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                        .padding(.horizontal, IndigoTheme.Spacing.md)
                        .padding(.vertical, IndigoTheme.Spacing.sm)
                        .background(Color.white)
                        .cornerRadius(IndigoTheme.CornerRadius.medium)
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.primaryGradient)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }
}

struct NewsletterCard: View {
    let newsletter: Newsletter

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                // Icon
                ZStack {
                    Circle()
                        .fill(newsletter.color.opacity(0.1))
                        .frame(width: 40, height: 40)

                    Image(systemName: newsletter.icon)
                        .font(.callout)
                        .foregroundColor(newsletter.color)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(newsletter.title)
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text(newsletter.subtitle)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(newsletter.date, style: .date)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.tertiaryText)

                    if newsletter.isNew {
                        Text("NEW")
                            .font(IndigoTheme.Typography.caption2)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(IndigoTheme.Colors.error)
                            .cornerRadius(IndigoTheme.CornerRadius.small)
                    }
                }
            }

            Text(newsletter.preview)
                .font(IndigoTheme.Typography.footnote)
                .foregroundColor(IndigoTheme.Colors.secondaryText)
                .lineLimit(2)
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }
}

// MARK: - Data Models
struct Newsletter: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let preview: String
    let date: Date
    let isNew: Bool
    let icon: String
    let color: Color
}

// MARK: - View Model
class NewsletterViewModel: ObservableObject {
    @Published var newsletters: [Newsletter] = [
        Newsletter(
            title: "Future of Finance Summit",
            subtitle: "Exclusive insights from industry leaders",
            preview: "Join us for an exclusive discussion on the evolving landscape of decentralized finance and its impact on traditional investment strategies...",
            date: Date(),
            isNew: true,
            icon: "chart.line.uptrend.xyaxis",
            color: IndigoTheme.Colors.primaryGradientStart
        ),
        Newsletter(
            title: "Weekly Market Analysis",
            subtitle: "Your portfolio performance breakdown",
            preview: "This week saw significant movements in cryptocurrency markets, with Bitcoin reaching new highs while traditional markets showed volatility...",
            date: Date().addingTimeInterval(-86400),
            isNew: false,
            icon: "chart.bar.fill",
            color: IndigoTheme.Colors.info
        ),
        Newsletter(
            title: "Yield Farming Deep Dive",
            subtitle: "Maximizing returns in DeFi",
            preview: "Explore advanced strategies for optimizing your yield farming positions across multiple protocols and chains...",
            date: Date().addingTimeInterval(-172800),
            isNew: false,
            icon: "leaf.fill",
            color: IndigoTheme.Colors.success
        )
    ]
}