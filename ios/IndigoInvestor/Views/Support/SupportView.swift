//
//  SupportView.swift
//  IndigoInvestor
//
//  Support center with FAQ, help articles, and contact options
//

import SwiftUI
import MessageUI

struct SupportView: View {
    @StateObject private var viewModel = SupportViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: SupportCategory = .all
    @State private var expandedFAQs: Set<UUID> = []
    @State private var showingContactForm = false
    @State private var showingEmailComposer = false
    @State private var selectedArticle: HelpArticle?
    
    enum SupportCategory: String, CaseIterable {
        case all = "All Topics"
        case gettingStarted = "Getting Started"
        case account = "Account"
        case investments = "Investments"
        case withdrawals = "Withdrawals"
        case documents = "Documents"
        case security = "Security"
        case technical = "Technical"
        
        var icon: String {
            switch self {
            case .all: return "questionmark.circle"
            case .gettingStarted: return "play.circle"
            case .account: return "person.circle"
            case .investments: return "chart.line.uptrend.xyaxis"
            case .withdrawals: return "arrow.up.circle"
            case .documents: return "doc.text"
            case .security: return "lock.shield"
            case .technical: return "gear"
            }
        }
        
        var color: Color {
            switch self {
            case .all: return .blue
            case .gettingStarted: return .green
            case .account: return .orange
            case .investments: return .purple
            case .withdrawals: return .red
            case .documents: return .indigo
            case .security: return .pink
            case .technical: return .gray
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.lg) {
                    // Help Center Header
                    helpCenterHeader
                    
                    // Quick Actions
                    quickActionsSection
                    
                    // Category Pills
                    categoryPills
                    
                    // Popular Articles
                    if !viewModel.popularArticles.isEmpty {
                        popularArticlesSection
                    }
                    
                    // FAQ Section
                    faqSection
                    
                    // Contact Support
                    contactSupportSection
                    
                    // Resources
                    resourcesSection
                }
                .padding(.bottom, IndigoTheme.Spacing.xl)
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Help Center")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $searchText, prompt: "Search for help...")
            .onChange(of: searchText) { newValue in
                viewModel.searchContent(query: newValue)
            }
            .onChange(of: selectedCategory) { newCategory in
                viewModel.filterByCategory(newCategory)
            }
            .sheet(isPresented: $showingContactForm) {
                ContactFormView()
            }
            .sheet(item: $selectedArticle) { article in
                ArticleDetailView(article: article)
            }
            .sheet(isPresented: $showingEmailComposer) {
                if MFMailComposeViewController.canSendMail() {
                    MailComposerView(
                        subject: "Support Request",
                        recipients: ["support@indigoyield.com"],
                        messageBody: viewModel.generateSupportEmailBody()
                    )
                } else {
                    Text("Email is not configured on this device")
                        .padding()
                }
            }
            .onAppear {
                viewModel.loadSupportContent()
            }
        }
    }
    
    // MARK: - Help Center Header
    
    private var helpCenterHeader: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: "questionmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(IndigoTheme.Colors.primary)
            
            Text("How can we help you?")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text("Find answers to common questions or contact our support team")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [
                    IndigoTheme.Colors.primary.opacity(0.1),
                    IndigoTheme.Colors.primary.opacity(0.05)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .cornerRadius(IndigoTheme.CornerRadius.lg)
        .padding(.horizontal)
    }
    
    // MARK: - Quick Actions Section
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Quick Actions")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: IndigoTheme.Spacing.md) {
                    QuickActionCard(
                        title: "Live Chat",
                        icon: "message.fill",
                        color: .green,
                        available: viewModel.isChatAvailable
                    ) {
                        viewModel.startLiveChat()
                    }
                    
                    QuickActionCard(
                        title: "Call Support",
                        icon: "phone.fill",
                        color: .blue,
                        available: viewModel.isPhoneAvailable
                    ) {
                        viewModel.callSupport()
                    }
                    
                    QuickActionCard(
                        title: "Email Us",
                        icon: "envelope.fill",
                        color: .orange,
                        available: true
                    ) {
                        showingEmailComposer = true
                    }
                    
                    QuickActionCard(
                        title: "Schedule Call",
                        icon: "calendar",
                        color: .purple,
                        available: true
                    ) {
                        viewModel.scheduleCallback()
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    // MARK: - Category Pills
    
    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(SupportCategory.allCases, id: \.self) { category in
                    CategoryButton(
                        category: category,
                        isSelected: selectedCategory == category
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedCategory = category
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Popular Articles Section
    
    private var popularArticlesSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("Popular Articles")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.text)
                
                Spacer()
                
                NavigationLink(destination: AllArticlesView()) {
                    Text("See All")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
            .padding(.horizontal)
            
            VStack(spacing: 0) {
                ForEach(viewModel.popularArticles.prefix(5)) { article in
                    ArticleRow(article: article) {
                        selectedArticle = article
                    }
                    
                    if article != viewModel.popularArticles.prefix(5).last {
                        Divider()
                            .padding(.leading, 56)
                    }
                }
            }
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
            .padding(.horizontal)
        }
    }
    
    // MARK: - FAQ Section
    
    private var faqSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Frequently Asked Questions")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
                .padding(.horizontal)
            
            VStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(viewModel.filteredFAQs) { faq in
                    FAQCard(
                        faq: faq,
                        isExpanded: expandedFAQs.contains(faq.id)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            if expandedFAQs.contains(faq.id) {
                                expandedFAQs.remove(faq.id)
                            } else {
                                expandedFAQs.insert(faq.id)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Contact Support Section
    
    private var contactSupportSection: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Still need help?")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.text)
                    
                    Text("Our support team is here to assist you")
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "headphones.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(IndigoTheme.Colors.primary)
            }
            
            Button(action: { showingContactForm = true }) {
                HStack {
                    Image(systemName: "text.bubble.fill")
                    Text("Contact Support")
                        .font(IndigoTheme.Typography.bodyBold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(IndigoTheme.Colors.primary)
                .cornerRadius(IndigoTheme.CornerRadius.md)
            }
            
            // Support Hours
            HStack(spacing: IndigoTheme.Spacing.md) {
                InfoItem(
                    icon: "clock.fill",
                    title: "Support Hours",
                    value: "Mon-Fri, 9AM-6PM EST"
                )
                
                InfoItem(
                    icon: "timer",
                    title: "Response Time",
                    value: "< 24 hours"
                )
            }
        }
        .padding()
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
        .padding(.horizontal)
    }
    
    // MARK: - Resources Section
    
    private var resourcesSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Resources")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
                .padding(.horizontal)
            
            VStack(spacing: IndigoTheme.Spacing.sm) {
                ResourceLink(
                    title: "Investment Guide",
                    description: "Learn about our investment strategies",
                    icon: "book.fill",
                    color: .blue
                ) {
                    viewModel.openResource(.investmentGuide)
                }
                
                ResourceLink(
                    title: "Tax Center",
                    description: "Tax forms and documentation",
                    icon: "doc.badge.gearshape.fill",
                    color: .orange
                ) {
                    viewModel.openResource(.taxCenter)
                }
                
                ResourceLink(
                    title: "Security Center",
                    description: "Learn how we protect your account",
                    icon: "lock.shield.fill",
                    color: .green
                ) {
                    viewModel.openResource(.securityCenter)
                }
                
                ResourceLink(
                    title: "Video Tutorials",
                    description: "Watch how-to videos",
                    icon: "play.rectangle.fill",
                    color: .red
                ) {
                    viewModel.openResource(.videoTutorials)
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Supporting Views

struct QuickActionCard: View {
    let title: String
    let icon: String
    let color: Color
    let available: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: IndigoTheme.Spacing.sm) {
                ZStack {
                    Circle()
                        .fill(color.opacity(available ? 0.1 : 0.05))
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24))
                        .foregroundColor(available ? color : Color.gray)
                }
                
                Text(title)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(available ? IndigoTheme.Colors.text : IndigoTheme.Colors.textTertiary)
                
                if !available {
                    Text("Offline")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(.red)
                }
            }
            .frame(width: 90)
        }
        .disabled(!available)
    }
}

struct CategoryButton: View {
    let category: SupportView.SupportCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.system(size: 14))
                
                Text(category.rawValue)
                    .font(IndigoTheme.Typography.caption1)
            }
            .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
            .padding(.horizontal, IndigoTheme.Spacing.md)
            .padding(.vertical, IndigoTheme.Spacing.sm)
            .background(isSelected ? category.color : IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.pill)
        }
    }
}

struct ArticleRow: View {
    let article: HelpArticle
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: article.icon)
                    .font(.system(size: 20))
                    .foregroundColor(IndigoTheme.Colors.primary)
                    .frame(width: 36, height: 36)
                    .background(IndigoTheme.Colors.primary.opacity(0.1))
                    .cornerRadius(IndigoTheme.CornerRadius.sm)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(article.title)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.text)
                        .multilineTextAlignment(.leading)
                    
                    Text("\(article.readTime) min read • \(article.views) views")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
            .padding(IndigoTheme.Spacing.md)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FAQCard: View {
    let faq: FAQ
    let isExpanded: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                HStack {
                    Text(faq.question)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.text)
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14))
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
                
                if isExpanded {
                    Text(faq.answer)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    
                    if faq.helpful != nil {
                        HStack(spacing: IndigoTheme.Spacing.md) {
                            Text("Was this helpful?")
                                .font(IndigoTheme.Typography.caption2)
                                .foregroundColor(IndigoTheme.Colors.textTertiary)
                            
                            Button(action: { /* Mark as helpful */ }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "hand.thumbsup")
                                    Text("Yes")
                                }
                                .font(IndigoTheme.Typography.caption2)
                                .foregroundColor(.green)
                            }
                            
                            Button(action: { /* Mark as not helpful */ }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "hand.thumbsdown")
                                    Text("No")
                                }
                                .font(IndigoTheme.Typography.caption2)
                                .foregroundColor(.red)
                            }
                            
                            Spacer()
                        }
                        .padding(.top, IndigoTheme.Spacing.xs)
                    }
                }
            }
            .padding()
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct InfoItem: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(IndigoTheme.Colors.primary)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
                
                Text(value)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.text)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ResourceLink: View {
    let title: String
    let description: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.1))
                    .cornerRadius(IndigoTheme.CornerRadius.sm)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.text)
                    
                    Text(description)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "arrow.right")
                    .font(.system(size: 14))
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
            .padding()
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Placeholder Views

struct ContactFormView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            Text("Contact Form")
                .navigationTitle("Contact Support")
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
    }
}

struct ArticleDetailView: View {
    let article: HelpArticle
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
                    Text(article.title)
                        .font(IndigoTheme.Typography.title2)
                    
                    Text(article.content)
                        .font(IndigoTheme.Typography.body)
                }
                .padding()
            }
            .navigationTitle("Help Article")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct AllArticlesView: View {
    var body: some View {
        Text("All Help Articles")
            .navigationTitle("Help Articles")
    }
}

// MARK: - Mail Composer

struct MailComposerView: UIViewControllerRepresentable {
    let subject: String
    let recipients: [String]
    let messageBody: String
    
    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let composer = MFMailComposeViewController()
        composer.mailComposeDelegate = context.coordinator
        composer.setSubject(subject)
        composer.setToRecipients(recipients)
        composer.setMessageBody(messageBody, isHTML: false)
        return composer
    }
    
    func updateUIViewController(_ uiViewController: MFMailComposeViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        let parent: MailComposerView
        
        init(_ parent: MailComposerView) {
            self.parent = parent
        }
        
        func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
            controller.dismiss(animated: true)
        }
    }
}
