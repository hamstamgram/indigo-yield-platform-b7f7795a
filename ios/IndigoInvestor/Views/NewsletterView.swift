//
//  NewsletterView.swift
//  IndigoInvestor
//
//  Newsletter subscription and archive view
//

import SwiftUI

struct NewsletterView: View {
    @StateObject private var viewModel = NewsletterViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: NewsletterCategory = .all
    @State private var showingSubscriptionSettings = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Subscription Status Card
                    NewsletterSubscriptionCard(
                        isSubscribed: $viewModel.isSubscribed,
                        email: viewModel.subscribedEmail
                    )
                    .padding(.horizontal)

                    // Newsletter Stats
                    if viewModel.isSubscribed {
                        NewsletterStatsView(
                            totalIssues: viewModel.totalIssues,
                            readIssues: viewModel.readIssues,
                            averageReadTime: viewModel.averageReadTime
                        )
                        .padding(.horizontal)
                    }

                    // Category Filter
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: 12) {
                            ForEach(NewsletterCategory.allCases, id: \.self) { category in
                                CategoryFilterChip(
                                    title: category.displayName,
                                    isSelected: selectedCategory == category,
                                    color: category.color
                                ) {
                                    selectedCategory = category
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Search Bar (if needed)
                    if !searchText.isEmpty || viewModel.newsletters.count > 5 {
                        SearchBar(text: $searchText)
                            .padding(.horizontal)
                    }

                    // Newsletter Archive
                    LazyVStack(spacing: 16) {
                        let filteredNewsletters = viewModel.filteredNewsletters(
                            category: selectedCategory,
                            searchText: searchText
                        )

                        if filteredNewsletters.isEmpty {
                            NewsletterEmptyState(
                                category: selectedCategory,
                                searchText: searchText
                            )
                        } else {
                            ForEach(filteredNewsletters) { newsletter in
                                NewsletterIssueCard(newsletter: newsletter) {
                                    viewModel.selectedNewsletter = newsletter
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Load More Button
                    if viewModel.hasMoreIssues {
                        LoadMoreButton {
                            Task {
                                await viewModel.loadMoreIssues()
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Newsletter")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Subscription Settings", systemImage: "gear") {
                            showingSubscriptionSettings = true
                        }

                        Button("Download All", systemImage: "square.and.arrow.down") {
                            Task {
                                await viewModel.downloadAllIssues()
                            }
                        }

                        if !searchText.isEmpty {
                            Button("Clear Search", systemImage: "xmark.circle") {
                                searchText = ""
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search newsletters...")
            .refreshable {
                await viewModel.refresh()
            }
            .sheet(isPresented: $showingSubscriptionSettings) {
                NewsletterSubscriptionSettingsView(viewModel: viewModel)
            }
            .sheet(item: $viewModel.selectedNewsletter) { newsletter in
                NewsletterReaderView(newsletter: newsletter, viewModel: viewModel)
            }
        }
        .task {
            await viewModel.loadNewsletters()
        }
    }
}

// MARK: - Subscription Card

struct NewsletterSubscriptionCard: View {
    @Binding var isSubscribed: Bool
    let email: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(.indigoPrimary)
                            .font(.title2)

                        Text("Stay Informed")
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }

                    Text("Get weekly market insights, fund updates, and investment analysis")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                Toggle("", isOn: $isSubscribed)
                    .toggleStyle(SwitchToggleStyle(tint: .indigoPrimary))
            }

            if isSubscribed {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Subscribed")
                            .font(.footnote)
                            .fontWeight(.medium)
                            .foregroundColor(.green)
                    }

                    if let email = email {
                        Text("Delivered to \(email) every Tuesday")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text("Next issue: Tuesday, \(nextTuesday(), style: .date)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 8)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSubscribed ? Color.green.opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }

    private func nextTuesday() -> Date {
        let calendar = Calendar.current
        let today = Date()
        let weekday = calendar.component(.weekday, from: today)
        let daysUntilTuesday = (3 - weekday + 7) % 7
        return calendar.date(byAdding: .day, value: daysUntilTuesday == 0 ? 7 : daysUntilTuesday, to: today) ?? today
    }
}

// MARK: - Stats View

struct NewsletterStatsView: View {
    let totalIssues: Int
    let readIssues: Int
    let averageReadTime: Int

    var body: some View {
        HStack(spacing: 20) {
            StatItem(
                title: "Issues",
                value: "\(totalIssues)",
                subtitle: "Total",
                icon: "doc.text",
                color: .blue
            )

            StatItem(
                title: "Read",
                value: "\(readIssues)",
                subtitle: "Completed",
                icon: "checkmark.circle",
                color: .green
            )

            StatItem(
                title: "Avg Time",
                value: "\(averageReadTime)m",
                subtitle: "Per issue",
                icon: "clock",
                color: .orange
            )
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            VStack(spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)

                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Newsletter Issue Card

struct NewsletterIssueCard: View {
    let newsletter: NewsletterIssue
    let onTap: () -> Void
    @State private var showingShareSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(newsletter.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                CategoryBadge(category: newsletter.category)
            }

            // Title
            Text(newsletter.title)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            // Excerpt
            Text(newsletter.excerpt)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(3)
                .multilineTextAlignment(.leading)

            // Tags
            if !newsletter.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(newsletter.tags.prefix(3), id: \.self) { tag in
                            Text(tag)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color(.quaternarySystemFill))
                                .cornerRadius(4)
                        }

                        if newsletter.tags.count > 3 {
                            Text("+\(newsletter.tags.count - 3)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            // Footer
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text("\(newsletter.readTime) min read")
                        .font(.caption)
                }
                .foregroundColor(.secondary)

                Spacer()

                HStack(spacing: 16) {
                    if newsletter.isRead {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.green)
                            Text("Read")
                                .font(.caption2)
                                .foregroundColor(.green)
                        }
                    }

                    Button("Share") {
                        showingShareSheet = true
                    }
                    .font(.caption)
                    .foregroundColor(.indigoPrimary)

                    Button("Read") {
                        onTap()
                    }
                    .font(.callout)
                    .fontWeight(.medium)
                    .foregroundColor(.indigoPrimary)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .onTapGesture {
            onTap()
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(activityItems: [newsletter.shareURL])
        }
    }
}

// MARK: - Newsletter Reader

struct NewsletterReaderView: View {
    let newsletter: NewsletterIssue
    let viewModel: NewsletterViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var scrollOffset: CGFloat = 0
    @State private var showingShareSheet = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    NewsletterHeader(newsletter: newsletter)
                        .padding(.horizontal)

                    Divider()

                    // Content Sections
                    VStack(alignment: .leading, spacing: 20) {
                        ForEach(newsletter.sections) { section in
                            NewsletterSection(section: section)
                                .padding(.horizontal)
                        }
                    }

                    // Footer
                    NewsletterFooter(newsletter: newsletter)
                        .padding(.horizontal)

                    Spacer(minLength: 50)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        viewModel.markAsRead(newsletter.id)
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Share", systemImage: "square.and.arrow.up") {
                            showingShareSheet = true
                        }

                        Button("Save to Reading List", systemImage: "bookmark") {
                            viewModel.saveToReadingList(newsletter.id)
                        }

                        Button("Download PDF", systemImage: "doc.fill") {
                            Task {
                                await viewModel.downloadPDF(newsletter.id)
                            }
                        }

                        Button("Print", systemImage: "printer") {
                            // Print functionality
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .onAppear {
            viewModel.trackNewsletterOpened(newsletter.id)
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSheet(activityItems: [newsletter.shareURL])
        }
    }
}

// MARK: - Newsletter Components

struct NewsletterHeader: View {
    let newsletter: NewsletterIssue

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(newsletter.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                CategoryBadge(category: newsletter.category)
            }

            Text(newsletter.title)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            HStack {
                Text("\(newsletter.readTime) min read")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text("•")
                    .foregroundColor(.secondary)

                Text("\(newsletter.wordCount) words")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()
            }
        }
    }
}

struct NewsletterSection: View {
    let section: NewsletterSection

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title = section.title {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
            }

            Text(section.content)
                .font(.body)
                .foregroundColor(.primary)
                .lineSpacing(4)

            if let imageURL = section.imageURL {
                AsyncImage(url: imageURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    Rectangle()
                        .fill(Color(.systemGray6))
                        .frame(height: 200)
                        .overlay(
                            ProgressView()
                        )
                }
                .cornerRadius(8)
            }

            if !section.highlights.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(section.highlights, id: \.self) { highlight in
                        HStack(alignment: .top) {
                            Text("•")
                                .foregroundColor(.indigoPrimary)
                                .fontWeight(.bold)

                            Text(highlight)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding()
                .background(Color(.tertiarySystemBackground))
                .cornerRadius(8)
            }
        }
    }
}

struct NewsletterFooter: View {
    let newsletter: NewsletterIssue

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text("About Indigo Yield")
                    .font(.headline)
                    .foregroundColor(.primary)

                Text("Indigo Yield provides institutional-grade investment management services with a focus on sustainable returns and risk management.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Published on \(newsletter.date, style: .date)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Button("View Archive") {
                    // Navigate to archive
                }
                .font(.caption)
                .foregroundColor(.indigoPrimary)
            }
        }
    }
}

// MARK: - Supporting Views

struct CategoryBadge: View {
    let category: NewsletterCategory

    var body: some View {
        Text(category.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(category.color.opacity(0.1))
            .foregroundColor(category.color)
            .cornerRadius(6)
    }
}

struct CategoryFilterChip: View {
    let title: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(isSelected ? color : Color(.tertiarySystemBackground))
                )
                .foregroundColor(isSelected ? .white : .primary)
        }
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

struct NewsletterEmptyState: View {
    let category: NewsletterCategory
    let searchText: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            VStack(spacing: 8) {
                Text(searchText.isEmpty ? "No newsletters found" : "No search results")
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(searchText.isEmpty ?
                     "Check back later for new \(category.displayName.lowercased()) newsletters" :
                     "Try adjusting your search terms or filters")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, 60)
    }
}

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField("Search newsletters...", text: $text)
                .textFieldStyle(PlainTextFieldStyle())

            if !text.isEmpty {
                Button("Clear") {
                    text = ""
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(10)
    }
}

struct LoadMoreButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Load More Issues")
                    .font(.subheadline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.tertiarySystemBackground))
            .cornerRadius(8)
        }
    }
}

// MARK: - Data Models

struct NewsletterIssue: Identifiable {
    let id: String
    let title: String
    let excerpt: String
    let date: Date
    let category: NewsletterCategory
    let readTime: Int
    let wordCount: Int
    let isRead: Bool
    let tags: [String]
    let sections: [NewsletterContentSection]
    let shareURL: URL

    init(id: String, title: String, excerpt: String, date: Date, category: NewsletterCategory, readTime: Int, wordCount: Int, isRead: Bool = false, tags: [String] = [], sections: [NewsletterContentSection] = [], shareURL: URL? = nil) {
        self.id = id
        self.title = title
        self.excerpt = excerpt
        self.date = date
        self.category = category
        self.readTime = readTime
        self.wordCount = wordCount
        self.isRead = isRead
        self.tags = tags
        self.sections = sections
        self.shareURL = shareURL ?? URL(string: "https://app.indigo-yield.com/newsletter/\(id)")!
    }
}

struct NewsletterContentSection: Identifiable {
    let id = UUID()
    let title: String?
    let content: String
    let imageURL: URL?
    let highlights: [String]

    init(title: String? = nil, content: String, imageURL: URL? = nil, highlights: [String] = []) {
        self.title = title
        self.content = content
        self.imageURL = imageURL
        self.highlights = highlights
    }
}

enum NewsletterCategory: String, CaseIterable {
    case all = "all"
    case weekly = "weekly"
    case market = "market"
    case funds = "funds"
    case insights = "insights"
    case company = "company"

    var displayName: String {
        switch self {
        case .all: return "All"
        case .weekly: return "Market Weekly"
        case .market: return "Market Updates"
        case .funds: return "Fund Updates"
        case .insights: return "Investment Insights"
        case .company: return "Company News"
        }
    }

    var color: Color {
        switch self {
        case .all: return .primary
        case .weekly: return .blue
        case .market: return .green
        case .funds: return .purple
        case .insights: return .orange
        case .company: return .red
        }
    }
}

// MARK: - View Model

@MainActor
class NewsletterViewModel: ObservableObject {
    @Published var newsletters: [NewsletterIssue] = []
    @Published var isSubscribed = false
    @Published var subscribedEmail: String?
    @Published var isLoading = false
    @Published var hasMoreIssues = true
    @Published var selectedNewsletter: NewsletterIssue?

    // Stats
    @Published var totalIssues = 0
    @Published var readIssues = 0
    @Published var averageReadTime = 0

    private var currentPage = 0
    private let pageSize = 10

    func loadNewsletters() async {
        isLoading = true

        // Simulate API call
        try? await Task.sleep(nanoseconds: 1_000_000_000)

        newsletters = generateMockNewsletters()
        updateStats()

        isLoading = false
    }

    func refresh() async {
        currentPage = 0
        hasMoreIssues = true
        await loadNewsletters()
    }

    func loadMoreIssues() async {
        guard !isLoading && hasMoreIssues else { return }

        isLoading = true
        currentPage += 1

        // Simulate API call
        try? await Task.sleep(nanoseconds: 500_000_000)

        let newIssues = generateMockNewsletters(page: currentPage)
        newsletters.append(contentsOf: newIssues)

        hasMoreIssues = newIssues.count == pageSize
        isLoading = false
    }

    func filteredNewsletters(category: NewsletterCategory, searchText: String) -> [NewsletterIssue] {
        var filtered = newsletters

        if category != .all {
            filtered = filtered.filter { $0.category == category }
        }

        if !searchText.isEmpty {
            filtered = filtered.filter { newsletter in
                newsletter.title.localizedCaseInsensitiveContains(searchText) ||
                newsletter.excerpt.localizedCaseInsensitiveContains(searchText) ||
                newsletter.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }

        return filtered
    }

    func markAsRead(_ newsletterId: String) {
        // Mark newsletter as read
        if let index = newsletters.firstIndex(where: { $0.id == newsletterId }) {
            newsletters[index] = NewsletterIssue(
                id: newsletters[index].id,
                title: newsletters[index].title,
                excerpt: newsletters[index].excerpt,
                date: newsletters[index].date,
                category: newsletters[index].category,
                readTime: newsletters[index].readTime,
                wordCount: newsletters[index].wordCount,
                isRead: true,
                tags: newsletters[index].tags,
                sections: newsletters[index].sections,
                shareURL: newsletters[index].shareURL
            )
            updateStats()
        }
    }

    func saveToReadingList(_ newsletterId: String) {
        // Save to reading list
    }

    func downloadPDF(_ newsletterId: String) async {
        // Download PDF version
    }

    func downloadAllIssues() async {
        // Download all issues
    }

    func trackNewsletterOpened(_ newsletterId: String) {
        // Track analytics
    }

    private func updateStats() {
        totalIssues = newsletters.count
        readIssues = newsletters.filter { $0.isRead }.count
        averageReadTime = Int(newsletters.map { $0.readTime }.reduce(0, +) / max(newsletters.count, 1))
    }

    private func generateMockNewsletters(page: Int = 0) -> [NewsletterIssue] {
        let mockNewsletters = [
            NewsletterIssue(
                id: "1",
                title: "Market Weekly: Tech Earnings Drive Rally",
                excerpt: "Strong earnings from major tech companies pushed markets higher this week, with the S&P 500 reaching new all-time highs.",
                date: Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date(),
                category: .weekly,
                readTime: 8,
                wordCount: 1200,
                tags: ["markets", "tech", "earnings"],
                sections: [
                    NewsletterContentSection(
                        title: "Market Overview",
                        content: "The markets had an exceptional week with strong performance across all major indices...",
                        highlights: [
                            "S&P 500 up 2.1% for the week",
                            "Tech sector led with 3.4% gains",
                            "Small caps outperformed large caps"
                        ]
                    )
                ]
            ),
            NewsletterIssue(
                id: "2",
                title: "Fund Update: Q3 Performance Review",
                excerpt: "Our Global Equity Fund delivered strong returns in Q3, outperforming the benchmark by 180 basis points.",
                date: Calendar.current.date(byAdding: .day, value: -14, to: Date()) ?? Date(),
                category: .funds,
                readTime: 6,
                wordCount: 950,
                tags: ["performance", "quarterly", "equity"],
                sections: [
                    NewsletterContentSection(
                        title: "Performance Highlights",
                        content: "The third quarter brought significant outperformance across our core strategies...",
                        highlights: [
                            "Global Equity Fund: +12.4% (vs benchmark +10.6%)",
                            "Fixed Income Fund: +3.2% (vs benchmark +2.8%)",
                            "Alternative Strategies: +8.7%"
                        ]
                    )
                ]
            )
        ]

        return Array(mockNewsletters.prefix(pageSize))
    }
}

// MARK: - Subscription Settings

struct NewsletterSubscriptionSettingsView: View {
    @ObservedObject var viewModel: NewsletterViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var frequency = NewsletterFrequency.weekly
    @State private var categories: Set<NewsletterCategory> = [.weekly, .market, .funds]

    var body: some View {
        NavigationView {
            Form {
                Section("Email Address") {
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }

                Section("Frequency") {
                    Picker("Delivery Frequency", selection: $frequency) {
                        ForEach(NewsletterFrequency.allCases, id: \.self) { freq in
                            Text(freq.displayName).tag(freq)
                        }
                    }
                }

                Section("Categories") {
                    ForEach(NewsletterCategory.allCases.filter { $0 != .all }, id: \.self) { category in
                        Toggle(category.displayName, isOn: Binding(
                            get: { categories.contains(category) },
                            set: { isSelected in
                                if isSelected {
                                    categories.insert(category)
                                } else {
                                    categories.remove(category)
                                }
                            }
                        ))
                    }
                }

                Section {
                    Button("Save Preferences") {
                        // Save preferences
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .disabled(email.isEmpty)
                }
            }
            .navigationTitle("Newsletter Settings")
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

enum NewsletterFrequency: String, CaseIterable {
    case daily = "daily"
    case weekly = "weekly"
    case monthly = "monthly"

    var displayName: String {
        switch self {
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NewsletterView()
}