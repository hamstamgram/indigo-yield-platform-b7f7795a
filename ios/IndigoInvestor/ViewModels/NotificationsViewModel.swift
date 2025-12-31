//
//  NotificationsViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing notifications and alerts
//

import Foundation
import SwiftUI
import Combine
import UserNotifications

@MainActor
class NotificationsViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var notifications: [AppNotification] = []
    @Published var filteredNotifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasUnreadNotifications = false
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()
    private var currentFilter: NotificationsView.NotificationFilter = .all
    
    // MARK: - Computed Properties
    
    var groupedNotifications: [(key: String, value: [AppNotification])] {
        let grouped = Dictionary(grouping: filteredNotifications) { notification in
            formatDate(notification.timestamp)
        }
        
        return grouped.sorted { first, second in
            // Sort by date in descending order
            if let firstDate = filteredNotifications.first(where: { 
                formatDate($0.timestamp) == first.key 
            })?.timestamp,
               let secondDate = filteredNotifications.first(where: { 
                formatDate($0.timestamp) == second.key 
            })?.timestamp {
                return firstDate > secondDate
            }
            return false
        }
    }
    
    // MARK: - Initialization
    
    init() {
        setupSubscriptions()
        registerForPushNotifications()
    }
    
    private func setupSubscriptions() {
        // Subscribe to real-time notification updates
        supabaseManager.subscribeToNotificationUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.loadNotifications()
                }
            )
            .store(in: &cancellables)
    }
    
    private func registerForPushNotifications() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            if settings.authorizationStatus == .authorized {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }
    
    // MARK: - Data Loading
    
    func loadNotifications() {
        Task {
            await fetchNotifications()
        }
    }
    
    func refreshNotifications() async {
        await fetchNotifications()
    }
    
    private func fetchNotifications() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await supabaseManager.client
                .from("notifications")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .order("created_at", ascending: false)
                .execute()
            
            let fetchedNotifications = try JSONDecoder().decode([AppNotification].self, from: response.data)
            
            await MainActor.run {
                self.notifications = fetchedNotifications
                self.filteredNotifications = fetchedNotifications
                self.hasUnreadNotifications = fetchedNotifications.contains { !$0.isRead }
                self.updateBadgeCount()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                print("Error fetching notifications: \\(error)")
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    // MARK: - Filtering
    
    func filterNotifications(by filter: NotificationsView.NotificationFilter) {
        currentFilter = filter
        
        switch filter {
        case .all:
            filteredNotifications = notifications
        case .unread:
            filteredNotifications = notifications.filter { !$0.isRead }
        case .statements:
            filteredNotifications = notifications.filter { $0.type == .statement }
        case .transactions:
            filteredNotifications = notifications.filter { $0.type == .transaction }
        case .security:
            filteredNotifications = notifications.filter { $0.type == .security }
        case .marketing:
            filteredNotifications = notifications.filter { $0.type == .marketing }
        }
    }
    
    func getCount(for filter: NotificationsView.NotificationFilter) -> Int {
        switch filter {
        case .all:
            return notifications.count
        case .unread:
            return notifications.filter { !$0.isRead }.count
        case .statements:
            return notifications.filter { $0.type == .statement }.count
        case .transactions:
            return notifications.filter { $0.type == .transaction }.count
        case .security:
            return notifications.filter { $0.type == .security }.count
        case .marketing:
            return notifications.filter { $0.type == .marketing }.count
        }
    }
    
    // MARK: - Actions
    
    func handleNotificationTap(_ notification: AppNotification) {
        // Mark as read
        if !notification.isRead {
            markAsRead(notification)
        }
        
        // Handle navigation based on notification type
        switch notification.type {
        case .statement:
            // Navigate to statements
            break
        case .transaction:
            // Navigate to transaction history
            break
        case .interest:
            // Navigate to portfolio
            break
        case .security:
            // Show security alert
            break
        default:
            break
        }
    }
    
    func markAsRead(_ notification: AppNotification) {
        Task {
            do {
                try await supabaseManager.client
                    .from("notifications")
                    .update(["is_read": true])
                    .eq("id", notification.id.uuidString)
                    .execute()
                
                await MainActor.run {
                    if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                        notifications[index].isRead = true
                    }
                    if let index = filteredNotifications.firstIndex(where: { $0.id == notification.id }) {
                        filteredNotifications[index].isRead = true
                    }
                    hasUnreadNotifications = notifications.contains { !$0.isRead }
                    updateBadgeCount()
                }
            } catch {
                print("Error marking notification as read: \\(error)")
            }
        }
    }
    
    func markAllAsRead() {
        Task {
            do {
                try await supabaseManager.client
                    .from("notifications")
                    .update(["is_read": true])
                    .eq("user_id", supabaseManager.currentUserId ?? "")
                    .eq("is_read", false)
                    .execute()
                
                await MainActor.run {
                    for index in notifications.indices {
                        notifications[index].isRead = true
                    }
                    for index in filteredNotifications.indices {
                        filteredNotifications[index].isRead = true
                    }
                    hasUnreadNotifications = false
                    updateBadgeCount()
                }
            } catch {
                print("Error marking all notifications as read: \\(error)")
            }
        }
    }
    
    func deleteNotification(_ notification: AppNotification) {
        Task {
            do {
                try await supabaseManager.client
                    .from("notifications")
                    .delete()
                    .eq("id", notification.id.uuidString)
                    .execute()
                
                await MainActor.run {
                    notifications.removeAll { $0.id == notification.id }
                    filteredNotifications.removeAll { $0.id == notification.id }
                    hasUnreadNotifications = notifications.contains { !$0.isRead }
                    updateBadgeCount()
                }
            } catch {
                print("Error deleting notification: \\(error)")
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatDate(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if let weekAgo = calendar.date(byAdding: .day, value: -7, to: Date()),
                  date > weekAgo {
            return date.formatted(.dateTime.weekday(.wide))
        } else {
            return date.formatted(.dateTime.month(.wide).day())
        }
    }
    
    private func updateBadgeCount() {
        let unreadCount = notifications.filter { !$0.isRead }.count
        UNUserNotificationCenter.current().setBadgeCount(unreadCount)
    }
}

// MARK: - Supporting Types

struct AppNotification: Identifiable, Codable {
    let id: UUID
    let userId: UUID
    let title: String
    let message: String?
    let type: NotificationType
    let timestamp: Date
    var isRead: Bool
    let hasAction: Bool
    let actionUrl: String?
    let metadata: [String: String]?
    let createdAt: Date
    let updatedAt: Date
    
    enum NotificationType: String, Codable {
        case statement = "STATEMENT"
        case transaction = "TRANSACTION"
        case interest = "INTEREST"
        case security = "SECURITY"
        case marketing = "MARKETING"
        case system = "SYSTEM"
    }
}
