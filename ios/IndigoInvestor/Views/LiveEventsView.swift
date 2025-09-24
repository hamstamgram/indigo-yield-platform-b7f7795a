//
//  LiveEventsView.swift
//  IndigoInvestor
//
//  Live events and market updates view
//  Updated to use Indigo Yield Design System
//

import SwiftUI

struct LiveEventsView: View {
    @StateObject private var viewModel = LiveEventsViewModel()
    @State private var selectedCategory: EventCategory = .all
    @State private var showingNotificationSettings = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Status Banner
                    if let statusMessage = viewModel.statusMessage {
                        StatusBanner(message: statusMessage, type: viewModel.statusType)
                            .screenMargins()
                            .padding(.bottom, DesignTokens.Spacing.md)
                    }

                    // Category Filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: DesignTokens.Spacing.md) {
                            ForEach(EventCategory.allCases, id: \.self) { category in
                                CategoryFilterChip(
                                    category: category,
                                    isSelected: selectedCategory == category,
                                    action: { selectedCategory = category }
                                )
                            }
                        }
                        .screenMargins()
                    }
                    .padding(.bottom, DesignTokens.Spacing.lg)

                    // Events Feed
                    LazyVStack(spacing: DesignTokens.Spacing.md) {
                        ForEach(viewModel.filteredEvents(for: selectedCategory)) { event in
                            LiveEventCard(event: event)
                                .screenMargins()
                                .onAppear {
                                    viewModel.markEventAsViewed(event.id)
                                }
                        }

                        if viewModel.hasMoreEvents {
                            LoadMoreButton {
                                Task {
                                    await viewModel.loadMoreEvents()
                                }
                            }
                            .screenMargins()
                        }
                    }
                }
            }
            .navigationTitle("Live Events")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: { showingNotificationSettings = true }) {
                            Image(systemName: viewModel.notificationsEnabled ? "bell.fill" : "bell")
                                .foregroundColor(viewModel.notificationsEnabled ? DesignTokens.Colors.indigoPrimary : DesignTokens.Colors.textSecondary)
                        }

                        Menu {
                            Button("Refresh", systemImage: "arrow.clockwise") {
                                Task {
                                    await viewModel.refresh()
                                }
                            }

                            Button("Mark All as Read", systemImage: "checkmark.circle") {
                                viewModel.markAllAsRead()
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
            .sheet(isPresented: $showingNotificationSettings) {
                EventNotificationSettingsView()
            }
        }
        .task {
            await viewModel.loadInitialEvents()
        }
    }
}

// MARK: - Event Card Component

struct LiveEventCard: View {
    let event: LiveEvent
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            // Header with timestamp and category
            HStack {
                EventCategoryBadge(category: event.category)

                Spacer()

                VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
                    Text(event.timestamp, style: .time)
                        .font(FinancialTypography.caption)
                        .foregroundColor(DesignTokens.Colors.textSecondary)

                    Text(event.timestamp, style: .relative)
                        .font(FinancialTypography.caption)
                        .foregroundColor(DesignTokens.Colors.textTertiary)
                }
            }

            // Priority Indicator
            if event.priority == .high {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(DesignTokens.Colors.warningOrange)
                    Text("High Priority")
                        .font(FinancialTypography.caption)
                        .foregroundColor(DesignTokens.Colors.warningOrange)
                    Spacer()
                }
            }

            // Title and Description
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(event.title)
                    .font(FinancialTypography.cardTitle)
                    .foregroundColor(DesignTokens.Colors.textPrimary)

                Text(event.description)
                    .font(FinancialTypography.bodyText)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
                    .lineLimit(isExpanded ? nil : 3)
                    .animation(DesignTokens.Animations.easeInOut, value: isExpanded)

                if event.description.count > 150 {
                    Button(isExpanded ? "Show Less" : "Show More") {
                        withAnimation(DesignTokens.Animations.easeInOut) {
                            isExpanded.toggle()
                        }
                    }
                    .font(FinancialTypography.caption)
                    .foregroundColor(DesignTokens.Colors.indigoPrimary)
                }
            }

            // Market Impact Indicator
            if let impact = event.marketImpact {
                MarketImpactView(impact: impact)
            }

            // Related Assets
            if !event.relatedAssets.isEmpty {
                RelatedAssetsView(assets: event.relatedAssets)
            }

            // Action Buttons
            if event.hasActionButton {
                HStack {
                    Button(event.actionButtonTitle ?? "View Details") {
                        // Handle action
                    }
                    .font(FinancialTypography.footnote)
                    .foregroundColor(DesignTokens.Colors.indigoPrimary)

                    Spacer()

                    Button("Share") {
                        // Share event
                    }
                    .font(FinancialTypography.footnote)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
                }
            }
        }
        .financialCardStyle()
        .overlay(
            // Priority color indicator
            Rectangle()
                .fill(event.priorityColor)
                .frame(width: 4)
                .cornerRadius(2, corners: [.topLeading, .bottomLeading])
        )
    }
}

// MARK: - Supporting Components

struct EventCategoryBadge: View {
    let category: EventCategory

    var body: some View {
        CategoryBadge(category: category.rawValue, color: category.color)
    }
}

struct CategoryFilterChip: View {
    let category: EventCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(category == .all ? "All Events" : category.rawValue)
                .font(FinancialTypography.assetLabel)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? DesignTokens.Colors.indigoPrimary : DesignTokens.Colors.backgroundTertiary)
                )
                .foregroundColor(isSelected ? .white : DesignTokens.Colors.textPrimary)
        }
        .animation(DesignTokens.Animations.easeInOut, value: isSelected)
    }
}

struct MarketImpactView: View {
    let impact: Double

    var body: some View {
        HStack {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .foregroundColor(impact >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)

            Text("Market Impact:")
                .font(FinancialTypography.footnote)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            
            FinancialTypography.formattedPercentage(impact, style: .caption, showSign: true)

            Spacer()
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.backgroundTertiary)
        .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
}

struct RelatedAssetsView: View {
    let assets: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Related Assets")
                .font(FinancialTypography.caption)
                .foregroundColor(DesignTokens.Colors.textSecondary)

            LazyHStack {
                ForEach(assets.prefix(3), id: \.self) { asset in
                    Text(asset)
                        .tickerSymbol()
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, DesignTokens.Spacing.xxs)
                        .background(DesignTokens.Colors.backgroundQuaternary)
                        .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius / 2)
                }

                if assets.count > 3 {
                    Text("+\(assets.count - 3) more")
                        .font(FinancialTypography.caption)
                        .foregroundColor(DesignTokens.Colors.textSecondary)
                }
            }
        }
    }
}

struct StatusBanner: View {
    let message: String
    let type: StatusType

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: type.icon)
                .foregroundColor(type.color)

            Text(message)
                .font(FinancialTypography.bodyTextSecondary)
                .foregroundColor(type.color)

            Spacer()
        }
        .padding(DesignTokens.Spacing.md)
        .background(type.color.opacity(0.1))
        .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
}

struct LoadMoreButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ProgressView()
                    .scaleEffect(0.8)
                    .progressViewStyle(CircularProgressViewStyle(tint: DesignTokens.Colors.textSecondary))
                Text("Load More Events")
                    .font(FinancialTypography.bodyTextSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Colors.backgroundTertiary)
            .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
        }
        .foregroundColor(DesignTokens.Colors.textSecondary)
    }
}

// MARK: - Data Models

struct LiveEvent: Identifiable {
    let id: String
    let title: String
    let description: String
    let category: EventCategory
    let timestamp: Date
    let marketImpact: Double?
    let relatedAssets: [String]
    let hasActionButton: Bool
    let actionButtonTitle: String?
    let priority: EventPriority

    var priorityColor: Color {
        switch priority {
        case .high: return DesignTokens.Colors.errorRed
        case .medium: return DesignTokens.Colors.warningOrange
        case .low: return DesignTokens.Colors.indigoPrimary
        }
    }
}

enum EventCategory: String, CaseIterable {
    case all = "All"
    case market = "Market Update"
    case fund = "Fund News"
    case system = "System"
    case alert = "Alert"
    case maintenance = "Maintenance"

    var color: Color {
        switch self {
        case .all: return DesignTokens.Colors.textPrimary
        case .market: return DesignTokens.Colors.infoBlue
        case .fund: return DesignTokens.Colors.positiveGreen
        case .system: return DesignTokens.Colors.neutralGray
        case .alert: return DesignTokens.Colors.errorRed
        case .maintenance: return DesignTokens.Colors.warningOrange
        }
    }
}

enum EventPriority {
    case high, medium, low
}

enum StatusType {
    case info, warning, error

    var color: Color {
        switch self {
        case .info: return DesignTokens.Colors.infoBlue
        case .warning: return DesignTokens.Colors.warningOrange
        case .error: return DesignTokens.Colors.errorRed
        }
    }

    var icon: String {
        switch self {
        case .info: return "info.circle"
        case .warning: return "exclamationmark.triangle"
        case .error: return "xmark.circle"
        }
    }
}

// MARK: - View Model

@MainActor
class LiveEventsViewModel: ObservableObject {
    @Published var events: [LiveEvent] = []
    @Published var isLoading = false
    @Published var hasMoreEvents = true
    @Published var notificationsEnabled = true
    @Published var statusMessage: String?
    @Published var statusType: StatusType = .info

    private var currentPage = 0
    private let pageSize = 20

    func loadInitialEvents() async {
        isLoading = true

        // Simulate API call
        try? await Task.sleep(nanoseconds: 1_000_000_000)

        events = generateMockEvents()
        isLoading = false

        // Check market status
        updateStatusMessage()
    }

    func refresh() async {
        currentPage = 0
        hasMoreEvents = true
        await loadInitialEvents()
    }

    func loadMoreEvents() async {
        guard !isLoading && hasMoreEvents else { return }

        isLoading = true
        currentPage += 1

        // Simulate API call
        try? await Task.sleep(nanoseconds: 500_000_000)

        let newEvents = generateMockEvents(page: currentPage)
        events.append(contentsOf: newEvents)

        hasMoreEvents = newEvents.count == pageSize
        isLoading = false
    }

    func filteredEvents(for category: EventCategory) -> [LiveEvent] {
        if category == .all {
            return events
        }
        return events.filter { $0.category == category }
    }

    func markEventAsViewed(_ eventId: String) {
        // Mark as viewed in analytics/backend
    }

    func markAllAsRead() {
        // Mark all events as read
    }

    private func updateStatusMessage() {
        let hour = Calendar.current.component(.hour, from: Date())

        if hour < 9 || hour >= 16 {
            statusMessage = "Markets are currently closed. Live updates will resume during market hours."
            statusType = .info
        } else {
            statusMessage = nil
        }
    }

    private func generateMockEvents(page: Int = 0) -> [LiveEvent] {
        let mockEvents = [
            LiveEvent(
                id: "1",
                title: "S&P 500 Reaches New All-Time High",
                description: "The S&P 500 index has broken through the 4,800 level for the first time, driven by strong tech earnings and positive economic data.",
                category: .market,
                timestamp: Date().addingTimeInterval(-3600),
                marketImpact: 1.2,
                relatedAssets: ["SPY", "QQQ", "VTI"],
                hasActionButton: true,
                actionButtonTitle: "View Analysis",
                priority: .high
            ),
            LiveEvent(
                id: "2",
                title: "Fund Performance Update",
                description: "Our Global Equity Fund has outperformed the benchmark by 2.1% this quarter, driven by strong performance in technology and healthcare sectors.",
                category: .fund,
                timestamp: Date().addingTimeInterval(-7200),
                marketImpact: nil,
                relatedAssets: ["GOOGL", "AAPL", "JNJ"],
                hasActionButton: true,
                actionButtonTitle: "View Fund Details",
                priority: .medium
            ),
            LiveEvent(
                id: "3",
                title: "Scheduled Maintenance Tonight",
                description: "We'll be performing scheduled maintenance on our systems tonight from 11 PM to 2 AM EST. Some features may be temporarily unavailable.",
                category: .maintenance,
                timestamp: Date().addingTimeInterval(-10800),
                marketImpact: nil,
                relatedAssets: [],
                hasActionButton: false,
                actionButtonTitle: nil,
                priority: .low
            )
        ]

        return Array(mockEvents.prefix(pageSize))
    }
}

// MARK: - Extensions

extension RoundedRectangle {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Notification Settings

struct EventNotificationSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var marketUpdates = true
    @State private var fundNews = true
    @State private var systemAlerts = true
    @State private var maintenance = false

    var body: some View {
        NavigationView {
            Form {
                Section("Event Notifications") {
                    Toggle("Market Updates", isOn: $marketUpdates)
                    Toggle("Fund News", isOn: $fundNews)
                    Toggle("System Alerts", isOn: $systemAlerts)
                    Toggle("Maintenance Notices", isOn: $maintenance)
                }

                Section("Delivery") {
                    NavigationLink("Push Notification Settings") {
                        Text("Push notification settings")
                    }
                }
            }
            .navigationTitle("Event Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    LiveEventsView()
}