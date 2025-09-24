import SwiftUI

struct UpdatedRootView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var tabViewModel = TabViewModel()
    @State private var selectedTab = 0

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                mainTabView
            } else {
                AuthenticationView()
                    .environmentObject(authViewModel)
            }
        }
        .onAppear {
            setupAppearance()
        }
    }

    // MARK: - Main Tab View
    private var mainTabView: some View {
        ZStack(alignment: .bottom) {
            // Content
            TabView(selection: $selectedTab) {
                NewDashboardView()
                    .tag(0)

                YieldGeneratedView()
                    .tag(1)

                TransactionsView()
                    .tag(2)

                WithdrawalsView()
                    .tag(3)

                MoreMenuView()
                    .tag(4)
            }

            // Custom Tab Bar
            customTabBar
        }
        .ignoresSafeArea(.keyboard)
    }

    // MARK: - Custom Tab Bar
    private var customTabBar: some View {
        HStack(spacing: 0) {
            TabBarButton(
                icon: "house.fill",
                title: "Dashboard",
                isSelected: selectedTab == 0,
                action: { selectedTab = 0 }
            )

            TabBarButton(
                icon: "chart.line.uptrend.xyaxis",
                title: "Yield",
                isSelected: selectedTab == 1,
                action: { selectedTab = 1 }
            )

            TabBarButton(
                icon: "list.bullet.rectangle",
                title: "Transactions",
                isSelected: selectedTab == 2,
                action: { selectedTab = 2 }
            )

            TabBarButton(
                icon: "arrow.up.circle",
                title: "Withdraw",
                isSelected: selectedTab == 3,
                action: { selectedTab = 3 }
            )

            TabBarButton(
                icon: "ellipsis",
                title: "More",
                isSelected: selectedTab == 4,
                action: { selectedTab = 4 }
            )
        }
        .padding(.top, IndigoTheme.Spacing.sm)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(
            IndigoTheme.Colors.cardBackground
                .shadow(
                    color: IndigoTheme.Shadow.medium.color,
                    radius: IndigoTheme.Shadow.medium.radius,
                    x: 0,
                    y: -4
                )
        )
    }

    // MARK: - Setup
    private func setupAppearance() {
        // Navigation Bar Appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor(IndigoTheme.Colors.background)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(IndigoTheme.Colors.primaryText)
        ]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        // Tab Bar Appearance
        UITabBar.appearance().isHidden = true
    }
}

// MARK: - Tab Bar Button
struct TabBarButton: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(
                        isSelected ?
                        IndigoTheme.Colors.primaryGradientStart :
                        IndigoTheme.Colors.tertiaryText
                    )

                Text(title)
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(
                        isSelected ?
                        IndigoTheme.Colors.primaryGradientStart :
                        IndigoTheme.Colors.tertiaryText
                    )
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - More Menu View
struct MoreMenuView: View {
    @State private var showSettings = false
    @State private var showNotifications = false
    @State private var showNewsletter = false
    @State private var showProfile = false
    @State private var showSupport = false
    @State private var showDocuments = false

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // User Profile Card
                        userProfileCard

                        // Menu Items
                        VStack(spacing: 1) {
                            MenuRow(
                                icon: "bell",
                                title: "Notifications & Inbox",
                                badge: 3,
                                action: { showNotifications = true }
                            )

                            MenuRow(
                                icon: "newspaper",
                                title: "Newsletter",
                                action: { showNewsletter = true }
                            )

                            MenuRow(
                                icon: "doc.text",
                                title: "Documents",
                                action: { showDocuments = true }
                            )

                            MenuRow(
                                icon: "person.circle",
                                title: "Profile & Settings",
                                action: { showSettings = true }
                            )

                            MenuRow(
                                icon: "questionmark.circle",
                                title: "Support",
                                action: { showSupport = true }
                            )

                            MenuRow(
                                icon: "arrow.right.square",
                                title: "Sign Out",
                                isDestructive: true,
                                action: { }
                            )
                        }
                        .background(IndigoTheme.Colors.cardBackground)
                        .cornerRadius(IndigoTheme.CornerRadius.large)
                    }
                    .padding(IndigoTheme.Spacing.md)
                    .padding(.top, 100)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .top) {
                moreMenuHeader
            }
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsInboxView()
        }
        .sheet(isPresented: $showNewsletter) {
            NewsletterView()
        }
        .sheet(isPresented: $showSettings) {
            ProfileSettingsView()
        }
    }

    private var moreMenuHeader: some View {
        HStack {
            Text("More")
                .font(IndigoTheme.Typography.title2)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    private var userProfileCard: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Avatar
            ZStack {
                Circle()
                    .fill(IndigoTheme.Colors.primaryGradient)
                    .frame(width: 60, height: 60)

                Text("JD")
                    .font(IndigoTheme.Typography.title3)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("John Doe")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text("john.doe@example.com")
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption)
                        .foregroundColor(IndigoTheme.Colors.success)

                    Text("Verified Investor")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.success)
                }
            }

            Spacer()
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.large)
    }
}

// MARK: - Menu Row
struct MenuRow: View {
    let icon: String
    let title: String
    var badge: Int? = nil
    var isDestructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(
                        isDestructive ?
                        IndigoTheme.Colors.error :
                        IndigoTheme.Colors.primaryGradientStart
                    )
                    .frame(width: 24)

                Text(title)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(
                        isDestructive ?
                        IndigoTheme.Colors.error :
                        IndigoTheme.Colors.primaryText
                    )

                Spacer()

                if let badge = badge, badge > 0 {
                    Text("\(badge)")
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(.white)
                        .frame(minWidth: 24, minHeight: 24)
                        .background(IndigoTheme.Colors.error)
                        .clipShape(Circle())
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }
            .padding(IndigoTheme.Spacing.md)
            .background(IndigoTheme.Colors.cardBackground)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Tab View Model
class TabViewModel: ObservableObject {
    @Published var selectedTab = 0
    @Published var showTabBar = true
}