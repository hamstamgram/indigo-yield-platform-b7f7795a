//
//  NotificationsView.swift
//  IndigoInvestor
//
//  View for displaying notifications about statements, interest payments, and updates
//

import SwiftUI
import UserNotifications

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    @State private var selectedFilter: NotificationFilter = .all
    @State private var showingSettings = false
    @Environment(\.dismiss) private var dismiss
    
    enum NotificationFilter: String, CaseIterable {
        case all = "All"
        case unread = "Unread"
        case statements = "Statements"
        case transactions = "Transactions"
        case security = "Security"
        case marketing = "Marketing"
        
        var icon: String {
            switch self {
            case .all: return "bell"
            case .unread: return "bell.badge"
            case .statements: return "doc.text"
            case .transactions: return "arrow.left.arrow.right"
            case .security: return "lock.shield"
            case .marketing: return "megaphone"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.notifications.isEmpty && !viewModel.isLoading {
                    EmptyStateView(type: "notifications")
                } else {
                    notificationsList
                }
                
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                        .scaleEffect(1.2)
                }
            }
            .background(IndigoTheme.Colors.backgroundSecondary)
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        if viewModel.hasUnreadNotifications {
                            Button(action: { viewModel.markAllAsRead() }) {
                                Text("Mark All Read")
                                    .font(IndigoTheme.Typography.caption1)
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            }
                        }
                        
                        Button(action: { showingSettings = true }) {
                            Image(systemName: "gearshape")
                                .foregroundColor(IndigoTheme.Colors.primary)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingSettings) {
                NotificationSettingsView()
            }
            .onAppear {
                viewModel.loadNotifications()
            }
            .refreshable {
                await viewModel.refreshNotifications()
            }
        }
    }
    
    // MARK: - Notifications List
    
    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Filter Pills
                filterPills
                    .padding(.bottom, IndigoTheme.Spacing.md)
                
                // Grouped Notifications
                ForEach(viewModel.groupedNotifications, id: \.key) { date, notifications in
                    Section {
                        ForEach(notifications) { notification in
                            NotificationRow(notification: notification) {
                                viewModel.handleNotificationTap(notification)
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    viewModel.deleteNotification(notification)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                
                                if !notification.isRead {
                                    Button {
                                        viewModel.markAsRead(notification)
                                    } label: {
                                        Label("Mark Read", systemImage: "envelope.open")
                                    }
                                    .tint(IndigoTheme.Colors.primary)
                                }
                            }
                            
                            if notification != notifications.last {
                                Divider()
                                    .padding(.leading, 60)
                            }
                        }
                    } header: {
                        DateHeader(date: date)
                    }
                    .background(IndigoTheme.Colors.cardBackground)
                    .cornerRadius(IndigoTheme.CornerRadius.md)
                    .padding(.horizontal)
                    .padding(.bottom, IndigoTheme.Spacing.md)
                }
            }
        }
    }
    
    // MARK: - Filter Pills
    
    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(NotificationFilter.allCases, id: \.self) { filter in
                    FilterPill(
                        title: filter.rawValue,
                        icon: filter.icon,
                        isSelected: selectedFilter == filter,
                        count: viewModel.getCount(for: filter)
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedFilter = filter
                            viewModel.filterNotifications(by: filter)
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Notification Row

struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void
    
    private var icon: String {
        switch notification.type {
        case .statement: return "doc.text.fill"
        case .transaction: return "arrow.left.arrow.right.circle.fill"
        case .interest: return "percent"
        case .security: return "lock.shield.fill"
        case .marketing: return "megaphone.fill"
        case .system: return "gear"
        }
    }
    
    private var iconColor: Color {
        switch notification.type {
        case .statement: return .blue
        case .transaction: return .green
        case .interest: return .orange
        case .security: return .red
        case .marketing: return .purple
        case .system: return .gray
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: IndigoTheme.Spacing.md) {
                // Unread indicator
                Circle()
                    .fill(notification.isRead ? Color.clear : IndigoTheme.Colors.primary)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)
                
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.1))
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(iconColor)
                }
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(notification.title)
                        .font(notification.isRead ? IndigoTheme.Typography.body : IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.text)
                        .multilineTextAlignment(.leading)
                    
                    if let message = notification.message {
                        Text(message)
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                    
                    Text(notification.timestamp.formatted(.relative(presentation: .named)))
                        .font(IndigoTheme.Typography.caption2)
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                }
                
                Spacer()
                
                // Action indicator
                if notification.hasAction {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(IndigoTheme.Colors.textTertiary)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(notification.isRead ? Color.clear : IndigoTheme.Colors.primary.opacity(0.05))
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Date Header

struct DateHeader: View {
    let date: String
    
    var body: some View {
        HStack {
            Text(date)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.text)
            
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, IndigoTheme.Spacing.sm)
        .background(IndigoTheme.Colors.backgroundSecondary)
    }
}

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @StateObject private var settings = NotificationSettings()
    @Environment(\.dismiss) private var dismiss
    @State private var showingPermissionAlert = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("Push Notifications") {
                    Toggle("Enable Notifications", isOn: $settings.pushEnabled)
                        .onChange(of: settings.pushEnabled) { enabled in
                            if enabled {
                                requestNotificationPermission()
                            }
                        }
                    
                    if settings.pushEnabled {
                        Toggle("Statements", isOn: $settings.statementsEnabled)
                        Toggle("Transactions", isOn: $settings.transactionsEnabled)
                        Toggle("Interest Payments", isOn: $settings.interestEnabled)
                        Toggle("Security Alerts", isOn: $settings.securityEnabled)
                        Toggle("Marketing", isOn: $settings.marketingEnabled)
                    }
                }
                
                Section("Email Notifications") {
                    Toggle("Enable Email", isOn: $settings.emailEnabled)
                    
                    if settings.emailEnabled {
                        Toggle("Monthly Statements", isOn: $settings.monthlyEmailEnabled)
                        Toggle("Transaction Confirmations", isOn: $settings.transactionEmailEnabled)
                        Toggle("Security Alerts", isOn: $settings.securityEmailEnabled)
                    }
                }
                
                Section("Notification Schedule") {
                    Toggle("Do Not Disturb", isOn: $settings.doNotDisturb)
                    
                    if settings.doNotDisturb {
                        DatePicker("Start Time", selection: $settings.dndStartTime, displayedComponents: .hourAndMinute)
                        DatePicker("End Time", selection: $settings.dndEndTime, displayedComponents: .hourAndMinute)
                    }
                }
                
                Section {
                    Button(action: { settings.resetToDefaults() }) {
                        Text("Reset to Defaults")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Notification Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        settings.cancel()
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        settings.save()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .alert("Notification Permission", isPresented: $showingPermissionAlert) {
                Button("Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {
                    settings.pushEnabled = false
                }
            } message: {
                Text("Please enable notifications in Settings to receive alerts about your investments.")
            }
        }
    }
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                if !granted {
                    showingPermissionAlert = true
                }
            }
        }
    }
}

// MARK: - Notification Settings Model

@MainActor
class NotificationSettings: ObservableObject {
    @Published var pushEnabled = true
    @Published var statementsEnabled = true
    @Published var transactionsEnabled = true
    @Published var interestEnabled = true
    @Published var securityEnabled = true
    @Published var marketingEnabled = false
    
    @Published var emailEnabled = true
    @Published var monthlyEmailEnabled = true
    @Published var transactionEmailEnabled = false
    @Published var securityEmailEnabled = true
    
    @Published var doNotDisturb = false
    @Published var dndStartTime = Date()
    @Published var dndEndTime = Date()
    
    init() {
        load()
    }
    
    func load() {
        // Load settings from UserDefaults or Keychain
        pushEnabled = UserDefaults.standard.bool(forKey: "notifications.push.enabled")
        // Load other settings...
    }
    
    func save() {
        // Save settings to UserDefaults or Keychain
        UserDefaults.standard.set(pushEnabled, forKey: "notifications.push.enabled")
        // Save other settings...
        
        // Update notification settings in Supabase
        Task {
            await updateRemoteSettings()
        }
    }
    
    func cancel() {
        load()
    }
    
    func resetToDefaults() {
        pushEnabled = true
        statementsEnabled = true
        transactionsEnabled = true
        interestEnabled = true
        securityEnabled = true
        marketingEnabled = false
        emailEnabled = true
        monthlyEmailEnabled = true
        transactionEmailEnabled = false
        securityEmailEnabled = true
        doNotDisturb = false
    }
    
    private func updateRemoteSettings() async {
        // Update notification preferences in Supabase
        do {
            let settings = [
                "push_enabled": pushEnabled,
                "statements_enabled": statementsEnabled,
                "transactions_enabled": transactionsEnabled,
                "interest_enabled": interestEnabled,
                "security_enabled": securityEnabled,
                "marketing_enabled": marketingEnabled,
                "email_enabled": emailEnabled
            ]
            
            try await SupabaseManager.shared.client
                .from("user_preferences")
                .upsert(settings)
                .eq("user_id", SupabaseManager.shared.currentUserId ?? "")
                .execute()
        } catch {
            print("Failed to update notification settings: \\(error)")
        }
    }
}
