//
//  PushNotificationManager.swift
//  IndigoInvestor
//
//  Manages push notifications, APNs registration, and notification handling
//

import Foundation
import UserNotifications
import UIKit
import Combine

class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()
    
    // MARK: - Published Properties
    @Published var isAuthorized = false
    @Published var pushToken: String?
    @Published var pendingNotification: UNNotificationResponse?
    @Published var notificationSettings: UNNotificationSettings?
    
    // MARK: - Private Properties
    private let authService = ServiceLocator.shared.authService
    private let supabase = ServiceLocator.shared.supabase
    private var cancellables = Set<AnyCancellable>()
    
    // Notification Categories
    enum NotificationCategory: String {
        case transaction = "TRANSACTION_CATEGORY"
        case portfolio = "PORTFOLIO_CATEGORY"
        case statement = "STATEMENT_CATEGORY"
        case security = "SECURITY_CATEGORY"
        case withdrawal = "WITHDRAWAL_CATEGORY"
    }
    
    // Notification Actions
    enum NotificationAction: String {
        case view = "VIEW_ACTION"
        case approve = "APPROVE_ACTION"
        case reject = "REJECT_ACTION"
        case download = "DOWNLOAD_ACTION"
    }
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        setupNotificationCategories()
    }
    
    // MARK: - Setup
    
    private func setupNotificationCategories() {
        // Transaction Category
        let viewAction = UNNotificationAction(
            identifier: NotificationAction.view.rawValue,
            title: "View Details",
            options: [.foreground]
        )
        
        let transactionCategory = UNNotificationCategory(
            identifier: NotificationCategory.transaction.rawValue,
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )
        
        // Withdrawal Category
        let approveAction = UNNotificationAction(
            identifier: NotificationAction.approve.rawValue,
            title: "Approve",
            options: [.authenticationRequired]
        )
        
        let rejectAction = UNNotificationAction(
            identifier: NotificationAction.reject.rawValue,
            title: "Reject",
            options: [.destructive, .authenticationRequired]
        )
        
        let withdrawalCategory = UNNotificationCategory(
            identifier: NotificationCategory.withdrawal.rawValue,
            actions: [approveAction, rejectAction, viewAction],
            intentIdentifiers: [],
            options: []
        )
        
        // Statement Category
        let downloadAction = UNNotificationAction(
            identifier: NotificationAction.download.rawValue,
            title: "Download",
            options: [.foreground]
        )
        
        let statementCategory = UNNotificationCategory(
            identifier: NotificationCategory.statement.rawValue,
            actions: [downloadAction, viewAction],
            intentIdentifiers: [],
            options: []
        )
        
        // Set categories
        UNUserNotificationCenter.current().setNotificationCategories([
            transactionCategory,
            withdrawalCategory,
            statementCategory
        ])
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound, .provisional]
        ) { [weak self] granted, error in
            if let error = error {
                print("Notification authorization error: \(error)")
            }
            
            DispatchQueue.main.async {
                self?.isAuthorized = granted
                if granted {
                    self?.registerForRemoteNotifications()
                }
            }
        }
    }
    
    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.notificationSettings = settings
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }
    
    private func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    // MARK: - Token Management
    
    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        pushToken = token
        
        // Send token to backend
        Task {
            await registerTokenWithBackend(token)
        }
    }
    
    func didFailToRegisterForRemoteNotifications(withError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
    
    private func registerTokenWithBackend(_ token: String) async {
        do {
            // Register token with Supabase
            let data: [String: Any] = [
                "user_id": authService.currentUser?.id.uuidString ?? "",
                "push_token": token,
                "platform": "ios",
                "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0",
                "device_model": UIDevice.current.model,
                "os_version": UIDevice.current.systemVersion,
                "updated_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            
            _ = try await supabase
                .from("push_tokens")
                .upsert(jsonData)
                .execute()
            
            print("Successfully registered push token")
        } catch {
            print("Failed to register push token: \(error)")
        }
    }
    
    func unregisterToken() async {
        guard let token = pushToken,
              let userId = authService.currentUser?.id.uuidString else { return }
        
        do {
            _ = try await supabase
                .from("push_tokens")
                .delete()
                .eq("user_id", value: userId)
                .eq("push_token", value: token)
                .execute()
            
            pushToken = nil
        } catch {
            print("Failed to unregister push token: \(error)")
        }
    }
    
    // MARK: - Notification Handling
    
    func handleNotification(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        
        switch response.actionIdentifier {
        case NotificationAction.view.rawValue:
            handleViewAction(userInfo)
        case NotificationAction.approve.rawValue:
            handleApproveAction(userInfo)
        case NotificationAction.reject.rawValue:
            handleRejectAction(userInfo)
        case NotificationAction.download.rawValue:
            handleDownloadAction(userInfo)
        case UNNotificationDefaultActionIdentifier:
            handleDefaultAction(userInfo)
        default:
            break
        }
        
        // Track notification interaction
        trackNotificationInteraction(response)
    }
    
    private func handleViewAction(_ userInfo: [AnyHashable: Any]) {
        if let type = userInfo["type"] as? String,
           let id = userInfo["id"] as? String {
            navigateToContent(type: type, id: id)
        }
    }
    
    private func handleApproveAction(_ userInfo: [AnyHashable: Any]) {
        if let withdrawalId = userInfo["withdrawal_id"] as? String {
            Task {
                await approveWithdrawal(withdrawalId)
            }
        }
    }
    
    private func handleRejectAction(_ userInfo: [AnyHashable: Any]) {
        if let withdrawalId = userInfo["withdrawal_id"] as? String {
            Task {
                await rejectWithdrawal(withdrawalId)
            }
        }
    }
    
    private func handleDownloadAction(_ userInfo: [AnyHashable: Any]) {
        if let statementId = userInfo["statement_id"] as? String {
            Task {
                await downloadStatement(statementId)
            }
        }
    }
    
    private func handleDefaultAction(_ userInfo: [AnyHashable: Any]) {
        // Store for app to handle when it becomes active
        pendingNotification = nil
        
        if let type = userInfo["type"] as? String,
           let id = userInfo["id"] as? String {
            navigateToContent(type: type, id: id)
        }
    }
    
    // MARK: - Navigation
    
    private func navigateToContent(type: String, id: String) {
        // Post notification for the app to handle navigation
        NotificationCenter.default.post(
            name: .navigateToContent,
            object: nil,
            userInfo: ["type": type, "id": id]
        )
    }
    
    // MARK: - Actions
    
    private func approveWithdrawal(_ withdrawalId: String) async {
        // Implement withdrawal approval
        print("Approving withdrawal: \(withdrawalId)")
    }
    
    private func rejectWithdrawal(_ withdrawalId: String) async {
        // Implement withdrawal rejection
        print("Rejecting withdrawal: \(withdrawalId)")
    }
    
    private func downloadStatement(_ statementId: String) async {
        // Implement statement download
        print("Downloading statement: \(statementId)")
    }
    
    // MARK: - Badge Management
    
    func updateBadgeCount(_ count: Int) {
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
        }
    }
    
    func clearBadge() {
        updateBadgeCount(0)
    }
    
    // MARK: - Local Notifications
    
    func scheduleLocalNotification(
        title: String,
        body: String,
        subtitle: String? = nil,
        userInfo: [String: Any] = [:],
        trigger: UNNotificationTrigger? = nil,
        category: NotificationCategory? = nil
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        
        if let subtitle = subtitle {
            content.subtitle = subtitle
        }
        
        if let category = category {
            content.categoryIdentifier = category.rawValue
        }
        
        content.sound = .default
        content.userInfo = userInfo
        
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Failed to schedule local notification: \(error)")
            }
        }
    }
    
    // MARK: - Analytics
    
    private func trackNotificationInteraction(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        
        Task {
            do {
                let data: [String: Any] = [
                    "user_id": authService.currentUser?.id.uuidString ?? "",
                    "notification_id": response.notification.request.identifier,
                    "action": response.actionIdentifier,
                    "category": response.notification.request.content.categoryIdentifier,
                    "metadata": try JSONSerialization.data(withJSONObject: userInfo),
                    "interacted_at": ISO8601DateFormatter().string(from: Date())
                ]
                
                let jsonData = try JSONSerialization.data(withJSONObject: data)
                
                _ = try await supabase
                    .from("notification_interactions")
                    .insert(jsonData)
                    .execute()
            } catch {
                print("Failed to track notification interaction: \(error)")
            }
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        handleNotification(response)
        completionHandler()
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let navigateToContent = Notification.Name("navigateToContent")
}

// MARK: - Rich Notification Content

struct RichNotificationContent {
    let title: String
    let body: String
    let subtitle: String?
    let imageURL: String?
    let category: PushNotificationManager.NotificationCategory
    let userInfo: [String: Any]
    
    func createContent() -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        
        if let subtitle = subtitle {
            content.subtitle = subtitle
        }
        
        content.categoryIdentifier = category.rawValue
        content.userInfo = userInfo
        content.sound = .default
        
        return content
    }
}
