//
//  AccountView.swift
//  IndigoInvestor
//
//  Main account management view for user profile and settings
//

import SwiftUI
import PhotosUI

struct AccountView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = AccountViewModel()
    @State private var showingImagePicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showingLogoutConfirmation = false
    @State private var navigateToSettings = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.lg) {
                    // Profile Header
                    profileHeader
                    
                    // Quick Stats
                    quickStatsSection
                    
                    // Menu Sections
                    menuSections
                    
                    // Support Section
                    supportSection
                    
                    // App Info
                    appInfoSection
                    
                    // Logout Button
                    logoutButton
                }
                .padding(.bottom, IndigoTheme.Spacing.xl)
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { navigateToSettings = true }) {
                        Image(systemName: "gearshape")
                            .foregroundColor(IndigoTheme.Colors.primary)
                    }
                }
            }
            .navigationDestination(isPresented: $navigateToSettings) {
                ProfileSettingsView()
            }
            .photosPicker(
                isPresented: $showingImagePicker,
                selection: $selectedPhotoItem,
                matching: .images
            )
            .onChange(of: selectedPhotoItem) { newItem in
                Task {
                    await handlePhotoSelection(newItem)
                }
            }
            .confirmationDialog(
                "Logout",
                isPresented: $showingLogoutConfirmation,
                titleVisibility: .visible
            ) {
                Button("Logout", role: .destructive) {
                    authViewModel.signOut()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to logout?")
            }
            .onAppear {
                viewModel.loadAccountData()
            }
        }
    }
    
    // MARK: - Profile Header
    
    private var profileHeader: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            // Profile Image
            Button(action: { showingImagePicker = true }) {
                ZStack {
                    if let profileImage = viewModel.profileImage {
                        Image(uiImage: profileImage)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 100, height: 100)
                            .clipShape(Circle())
                    } else {
                        Circle()
                            .fill(IndigoTheme.Colors.primary.opacity(0.1))
                            .frame(width: 100, height: 100)
                            .overlay(
                                Text(viewModel.initials)
                                    .font(.system(size: 36, weight: .medium))
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            )
                    }
                    
                    Circle()
                        .stroke(IndigoTheme.Colors.primary, lineWidth: 3)
                        .frame(width: 100, height: 100)
                    
                    // Edit indicator
                    Image(systemName: "camera.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.primary)
                        .background(Circle().fill(Color.white))
                        .offset(x: 35, y: 35)
                }
            }
            
            // Name and Account Info
            VStack(spacing: 4) {
                Text(viewModel.userName)
                    .font(IndigoTheme.Typography.title2)
                    .foregroundColor(IndigoTheme.Colors.text)
                
                Text(viewModel.userEmail)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                
                HStack(spacing: 4) {
                    Image(systemName: "shield.checkmark.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.green)
                    
                    Text("Verified Investor")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(.green)
                    
                    Text("•")
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                    
                    Text("Member since \(viewModel.memberSince)")
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
        .shadow(
            color: IndigoTheme.Shadows.sm.color,
            radius: IndigoTheme.Shadows.sm.radius,
            x: IndigoTheme.Shadows.sm.x,
            y: IndigoTheme.Shadows.sm.y
        )
        .padding(.horizontal)
    }
    
    // MARK: - Quick Stats Section
    
    private var quickStatsSection: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            QuickStatCard(
                title: "Total Invested",
                value: viewModel.totalInvested,
                icon: "dollarsign.circle.fill",
                color: .green
            )
            
            QuickStatCard(
                title: "Total Returns",
                value: viewModel.totalReturns,
                icon: "chart.line.uptrend.xyaxis",
                color: .blue
            )
            
            QuickStatCard(
                title: "Active Since",
                value: viewModel.activeDays,
                icon: "calendar",
                color: .orange
            )
        }
        .padding(.horizontal)
    }
    
    // MARK: - Menu Sections
    
    private var menuSections: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            // Account Settings
            MenuSection(title: "Account Settings") {
                NavigationLink(destination: ProfileSettingsView()) {
                    MenuRow(
                        icon: "person.circle",
                        title: "Profile Settings",
                        subtitle: "Update your personal information",
                        showChevron: true
                    )
                }
                
                NavigationLink(destination: SecuritySettingsView()) {
                    MenuRow(
                        icon: "lock.shield",
                        title: "Security",
                        subtitle: "Manage 2FA and biometric settings",
                        showChevron: true
                    )
                }
                
                NavigationLink(destination: NotificationSettingsView()) {
                    MenuRow(
                        icon: "bell",
                        title: "Notifications",
                        subtitle: "Configure notification preferences",
                        showChevron: true
                    )
                }
            }
            
            // Financial
            MenuSection(title: "Financial") {
                NavigationLink(destination: WithdrawalHistoryView()) {
                    MenuRow(
                        icon: "arrow.up.circle",
                        title: "Withdrawal History",
                        subtitle: "View past withdrawal requests",
                        showChevron: true
                    )
                }
                
                NavigationLink(destination: TaxDocumentsView()) {
                    MenuRow(
                        icon: "doc.text",
                        title: "Tax Documents",
                        subtitle: "Access your tax forms",
                        showChevron: true
                    )
                }
                
                NavigationLink(destination: BankAccountsView()) {
                    MenuRow(
                        icon: "building.columns",
                        title: "Bank Accounts",
                        subtitle: "Manage linked bank accounts",
                        showChevron: true
                    )
                }
            }
            
            // Legal
            MenuSection(title: "Legal") {
                Button(action: { viewModel.openPrivacyPolicy() }) {
                    MenuRow(
                        icon: "hand.raised",
                        title: "Privacy Policy",
                        subtitle: "How we protect your data",
                        showChevron: true
                    )
                }
                
                Button(action: { viewModel.openTermsOfService() }) {
                    MenuRow(
                        icon: "doc.plaintext",
                        title: "Terms of Service",
                        subtitle: "Terms and conditions",
                        showChevron: true
                    )
                }
                
                Button(action: { viewModel.openDisclosures() }) {
                    MenuRow(
                        icon: "info.circle",
                        title: "Disclosures",
                        subtitle: "Important investment disclosures",
                        showChevron: true
                    )
                }
            }
        }
    }
    
    // MARK: - Support Section
    
    private var supportSection: some View {
        MenuSection(title: "Support") {
            NavigationLink(destination: SupportView()) {
                MenuRow(
                    icon: "questionmark.circle",
                    title: "Help Center",
                    subtitle: "FAQs and support articles",
                    showChevron: true
                )
            }
            
            Button(action: { viewModel.contactSupport() }) {
                MenuRow(
                    icon: "envelope",
                    title: "Contact Support",
                    subtitle: "Get help from our team",
                    showChevron: true
                )
            }
            
            NavigationLink(destination: FeedbackView()) {
                MenuRow(
                    icon: "text.bubble",
                    title: "Send Feedback",
                    subtitle: "Help us improve the app",
                    showChevron: true
                )
            }
        }
    }
    
    // MARK: - App Info Section
    
    private var appInfoSection: some View {
        VStack(spacing: IndigoTheme.Spacing.sm) {
            HStack {
                Text("App Version")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                
                Spacer()
                
                Text(viewModel.appVersion)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
            
            HStack {
                Text("Build")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                
                Spacer()
                
                Text(viewModel.buildNumber)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
        }
        .padding()
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.md)
        .padding(.horizontal)
    }
    
    // MARK: - Logout Button
    
    private var logoutButton: some View {
        Button(action: { showingLogoutConfirmation = true }) {
            HStack {
                Image(systemName: "arrow.right.square")
                    .font(.system(size: 20))
                
                Text("Logout")
                    .font(IndigoTheme.Typography.bodyBold)
            }
            .foregroundColor(.red)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.1))
            .cornerRadius(IndigoTheme.CornerRadius.md)
        }
        .padding(.horizontal)
        .padding(.top, IndigoTheme.Spacing.lg)
    }
    
    // MARK: - Helper Methods
    
    private func handlePhotoSelection(_ item: PhotosPickerItem?) async {
        guard let item = item else { return }
        
        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                await viewModel.updateProfileImage(image)
            }
        } catch {
            print("Error loading photo: \(error)")
        }
    }
}

// MARK: - Supporting Views

struct QuickStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            
            Text(value)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Text(title)
                .font(IndigoTheme.Typography.caption2)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.cardBackground)
        .cornerRadius(IndigoTheme.CornerRadius.md)
        .shadow(
            color: IndigoTheme.Shadows.xs.color,
            radius: IndigoTheme.Shadows.xs.radius,
            x: IndigoTheme.Shadows.xs.x,
            y: IndigoTheme.Shadows.xs.y
        )
    }
}

struct MenuSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text(title)
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
                .padding(.horizontal)
            
            VStack(spacing: 0) {
                content
            }
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.md)
            .padding(.horizontal)
        }
    }
}

struct MenuRow: View {
    let icon: String
    let title: String
    let subtitle: String?
    let showChevron: Bool
    var badgeCount: Int? = nil
    
    init(icon: String, title: String, subtitle: String? = nil, showChevron: Bool = false, badgeCount: Int? = nil) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.showChevron = showChevron
        self.badgeCount = badgeCount
    }
    
    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 28)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.text)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
            }
            
            Spacer()
            
            if let count = badgeCount, count > 0 {
                Text("\(count)")
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .cornerRadius(IndigoTheme.CornerRadius.xs)
            }
            
            if showChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(IndigoTheme.Colors.textTertiary)
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - Placeholder Views

struct BankAccountsView: View {
    var body: some View {
        Text("Bank Accounts Management")
            .navigationTitle("Bank Accounts")
    }
}

struct FeedbackView: View {
    var body: some View {
        Text("Send Feedback")
            .navigationTitle("Feedback")
    }
}
