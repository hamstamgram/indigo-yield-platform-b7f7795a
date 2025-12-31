import SwiftUI

struct NotificationsInboxView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    @State private var selectedTab = 0

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Custom Tab Selector
                    tabSelector

                    // Content
                    if selectedTab == 0 {
                        notificationsList
                    } else {
                        inboxList
                    }
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
            Button(action: {}) {
                Image(systemName: "arrow.left")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }

            Spacer()

            Text("Notifications & Inbox")
                .font(IndigoTheme.Typography.title3)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()

            Button(action: {}) {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Tab Selector
    private var tabSelector: some View {
        HStack(spacing: 0) {
            TabButton(title: "Notifications", isSelected: selectedTab == 0, badge: 3) {
                selectedTab = 0
            }

            TabButton(title: "Inbox", isSelected: selectedTab == 1, badge: nil) {
                selectedTab = 1
            }
        }
        .padding(4)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.medium)
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 110)
    }

    // MARK: - Notifications List
    private var notificationsList: some View {
        ScrollView {
            VStack(spacing: IndigoTheme.Spacing.md) {
                ForEach(viewModel.notifications) { notification in
                    NotificationCard(notification: notification)
                }
            }
            .padding(IndigoTheme.Spacing.md)
        }
    }

    // MARK: - Inbox List
    private var inboxList: some View {
        ScrollView {
            VStack(spacing: IndigoTheme.Spacing.md) {
                ForEach(viewModel.messages) { message in
                    MessageCard(message: message)
                }
            }
            .padding(IndigoTheme.Spacing.md)
        }
    }
}

// MARK: - Supporting Views
struct TabButton: View {
    let title: String
    let isSelected: Bool
    let badge: Int?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(isSelected ? .white : IndigoTheme.Colors.secondaryText)

                if let badge = badge, badge > 0 {
                    Text("\(badge)")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(.white)
                        .frame(minWidth: 20, minHeight: 20)
                        .background(IndigoTheme.Colors.error)
                        .clipShape(Circle())
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, IndigoTheme.Spacing.sm)
            .background(
                isSelected ? IndigoTheme.Colors.primaryGradient : Color.clear
            )
            .cornerRadius(IndigoTheme.CornerRadius.small)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct NotificationCard: View {
    let notification: NotificationItem

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(notification.color.opacity(0.1))
                    .frame(width: 48, height: 48)

                Image(systemName: notification.icon)
                    .font(.title3)
                    .foregroundColor(notification.color)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(notification.message)
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
                    .lineLimit(2)

                Text(notification.time, style: .relative)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }

            Spacer()

            if !notification.isRead {
                Circle()
                    .fill(IndigoTheme.Colors.error)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .background(notification.isRead ? Color.clear : IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.medium)
    }
}

struct MessageCard: View {
    let message: Message

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                // Avatar
                Circle()
                    .fill(IndigoTheme.Colors.primaryGradient)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(message.sender.prefix(1))
                            .font(IndigoTheme.Typography.headline)
                            .foregroundColor(.white)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(message.sender)
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text(message.subject)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(message.date, style: .date)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.tertiaryText)

                    if !message.isRead {
                        Circle()
                            .fill(IndigoTheme.Colors.primaryGradientStart)
                            .frame(width: 8, height: 8)
                    }
                }
            }

            Text(message.preview)
                .font(IndigoTheme.Typography.footnote)
                .foregroundColor(IndigoTheme.Colors.secondaryText)
                .lineLimit(2)

            if !message.attachments.isEmpty {
                HStack {
                    Image(systemName: "paperclip")
                        .font(.caption)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)

                    Text("\(message.attachments.count) attachment\(message.attachments.count > 1 ? "s" : "")")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }
}

// MARK: - Data Models
struct NotificationItem: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let time: Date
    let icon: String
    let color: Color
    let isRead: Bool
}

struct Message: Identifiable {
    let id = UUID()
    let sender: String
    let subject: String
    let preview: String
    let date: Date
    let isRead: Bool
    let attachments: [String]
}

// MARK: - View Model
class NotificationsViewModel: ObservableObject {
    @Published var notifications: [NotificationItem] = [
        NotificationItem(
            title: "Withdrawal Successful",
            message: "Your withdrawal of 2,850.00 USDT has been processed",
            time: Date().addingTimeInterval(-1800),
            icon: "checkmark.circle.fill",
            color: IndigoTheme.Colors.success,
            isRead: false
        ),
        NotificationItem(
            title: "New Investor Insights Available",
            message: "Monthly insights report is now ready for viewing",
            time: Date().addingTimeInterval(-7200),
            icon: "doc.text.fill",
            color: IndigoTheme.Colors.info,
            isRead: false
        ),
        NotificationItem(
            title: "Security Alert",
            message: "New device login detected from New York, USA",
            time: Date().addingTimeInterval(-86400),
            icon: "shield.fill",
            color: IndigoTheme.Colors.warning,
            isRead: false
        ),
        NotificationItem(
            title: "Yield Distributed",
            message: "Your daily yield of $125.50 has been added to your portfolio",
            time: Date().addingTimeInterval(-172800),
            icon: "chart.line.uptrend.xyaxis",
            color: IndigoTheme.Colors.primaryGradientStart,
            isRead: true
        )
    ]

    @Published var messages: [Message] = [
        Message(
            sender: "Indigo Support",
            subject: "Welcome to Indigo Yield Platform",
            preview: "We're thrilled to have you join our investment community. Your journey to passive income starts here...",
            date: Date(),
            isRead: false,
            attachments: ["Getting_Started_Guide.pdf"]
        ),
        Message(
            sender: "Portfolio Manager",
            subject: "Q4 2024 Performance Review",
            preview: "Your portfolio has shown exceptional growth this quarter with a 15.8% increase in total value...",
            date: Date().addingTimeInterval(-86400),
            isRead: true,
            attachments: []
        ),
        Message(
            sender: "Compliance Team",
            subject: "Annual KYC Update Required",
            preview: "As part of our regulatory requirements, please update your KYC information by December 31st...",
            date: Date().addingTimeInterval(-259200),
            isRead: true,
            attachments: ["KYC_Form_2025.pdf", "Instructions.pdf"]
        )
    ]
}