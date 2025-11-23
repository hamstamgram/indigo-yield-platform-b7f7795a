//
//  SecuritySettingsViewModel.swift
//  IndigoInvestor
//
//  ViewModel for SecuritySettingsView with comprehensive security management
//

import SwiftUI
import Combine

// MARK: - Data Models

struct SessionInfo: Identifiable, Hashable {
    let id: String
    let deviceName: String
    let deviceIcon: String
    let location: String
    let lastActive: Date
    let ipAddress: String
    let isCurrent: Bool

    var formattedLastActive: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastActive, relativeTo: Date())
    }
}

struct DeviceInfo: Identifiable, Hashable {
    let id: String
    let name: String
    let icon: String
    let addedDate: Date
    let lastActive: Date

    var formattedAddedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: addedDate)
    }

    var formattedLastActive: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastActive, relativeTo: Date())
    }
}

struct LoginHistoryItem: Identifiable, Hashable {
    let id: String
    let timestamp: Date
    let device: String
    let location: String
    let wasSuccessful: Bool

    var formattedTimestamp: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}

struct AuditEvent: Identifiable, Hashable {
    let id: String
    let action: String
    let timestamp: Date
    let icon: String
    let severity: AuditEventSeverity

    var formattedTimestamp: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}

enum AuditEventSeverity: String, Hashable {
    case info
    case warning
    case critical

    var color: Color {
        switch self {
        case .info:
            return IndigoTheme.Colors.primary
        case .warning:
            return IndigoTheme.Colors.warning
        case .critical:
            return IndigoTheme.Colors.error
        }
    }
}

// MARK: - ViewModel

@MainActor
final class SecuritySettingsViewModel: ObservableObject {
    // MARK: - Published Properties

    // Two-Factor Authentication
    @Published var has2FA: Bool = false
    @Published var backupCodesRemaining: Int = 10
    @Published var isEnabling2FA: Bool = false

    // Active Sessions
    @Published var sessions: [SessionInfo] = []
    @Published var isRevokingSession: Bool = false

    // Trusted Devices
    @Published var devices: [DeviceInfo] = []
    @Published var isRemovingDevice: Bool = false

    // Login History
    @Published var loginHistory: [LoginHistoryItem] = []

    // Security Audit Log
    @Published var auditLog: [AuditEvent] = []

    // State Management
    @Published var isLoading: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var successMessage: String = ""

    // MARK: - Private Properties
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
    }

    // MARK: - Data Loading
    func loadSecurityData() async {
        isLoading = true

        do {
            // TODO: Load from Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 800_000_000)

            // Placeholder data - replace with actual Supabase queries

            // Load 2FA status
            has2FA = true
            backupCodesRemaining = 8

            // Load active sessions
            sessions = [
                SessionInfo(
                    id: UUID().uuidString,
                    deviceName: "iPhone 15 Pro",
                    deviceIcon: "iphone",
                    location: "San Francisco, CA",
                    lastActive: Date(),
                    ipAddress: "192.168.1.100",
                    isCurrent: true
                ),
                SessionInfo(
                    id: UUID().uuidString,
                    deviceName: "MacBook Pro",
                    deviceIcon: "laptopcomputer",
                    location: "San Francisco, CA",
                    lastActive: Date().addingTimeInterval(-3600),
                    ipAddress: "192.168.1.101",
                    isCurrent: false
                ),
                SessionInfo(
                    id: UUID().uuidString,
                    deviceName: "iPad Air",
                    deviceIcon: "ipad",
                    location: "Oakland, CA",
                    lastActive: Date().addingTimeInterval(-7200),
                    ipAddress: "10.0.1.50",
                    isCurrent: false
                )
            ]

            // Load trusted devices
            devices = [
                DeviceInfo(
                    id: UUID().uuidString,
                    name: "iPhone 15 Pro",
                    icon: "iphone",
                    addedDate: Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date(),
                    lastActive: Date()
                ),
                DeviceInfo(
                    id: UUID().uuidString,
                    name: "MacBook Pro",
                    icon: "laptopcomputer",
                    addedDate: Calendar.current.date(byAdding: .month, value: -6, to: Date()) ?? Date(),
                    lastActive: Date().addingTimeInterval(-3600)
                ),
                DeviceInfo(
                    id: UUID().uuidString,
                    name: "iPad Air",
                    icon: "ipad",
                    addedDate: Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date(),
                    lastActive: Date().addingTimeInterval(-7200)
                )
            ]

            // Load login history
            loginHistory = [
                LoginHistoryItem(
                    id: UUID().uuidString,
                    timestamp: Date(),
                    device: "iPhone 15 Pro",
                    location: "San Francisco, CA",
                    wasSuccessful: true
                ),
                LoginHistoryItem(
                    id: UUID().uuidString,
                    timestamp: Date().addingTimeInterval(-3600),
                    device: "MacBook Pro",
                    location: "San Francisco, CA",
                    wasSuccessful: true
                ),
                LoginHistoryItem(
                    id: UUID().uuidString,
                    timestamp: Date().addingTimeInterval(-7200),
                    device: "Unknown Device",
                    location: "New York, NY",
                    wasSuccessful: false
                ),
                LoginHistoryItem(
                    id: UUID().uuidString,
                    timestamp: Date().addingTimeInterval(-86400),
                    device: "iPad Air",
                    location: "Oakland, CA",
                    wasSuccessful: true
                ),
                LoginHistoryItem(
                    id: UUID().uuidString,
                    timestamp: Date().addingTimeInterval(-172800),
                    device: "iPhone 15 Pro",
                    location: "San Francisco, CA",
                    wasSuccessful: true
                )
            ]

            // Load security audit log
            auditLog = [
                AuditEvent(
                    id: UUID().uuidString,
                    action: "Two-factor authentication enabled",
                    timestamp: Date(),
                    icon: "lock.shield.fill",
                    severity: .info
                ),
                AuditEvent(
                    id: UUID().uuidString,
                    action: "Password changed",
                    timestamp: Date().addingTimeInterval(-3600),
                    icon: "key.fill",
                    severity: .info
                ),
                AuditEvent(
                    id: UUID().uuidString,
                    action: "Failed login attempt from New York, NY",
                    timestamp: Date().addingTimeInterval(-7200),
                    icon: "exclamationmark.triangle.fill",
                    severity: .warning
                ),
                AuditEvent(
                    id: UUID().uuidString,
                    action: "New device added: iPad Air",
                    timestamp: Date().addingTimeInterval(-86400),
                    icon: "plus.circle.fill",
                    severity: .info
                ),
                AuditEvent(
                    id: UUID().uuidString,
                    action: "Email address updated",
                    timestamp: Date().addingTimeInterval(-172800),
                    icon: "envelope.fill",
                    severity: .info
                )
            ]

            isLoading = false

        } catch {
            isLoading = false
            errorMessage = "Failed to load security data: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Two-Factor Authentication
    func toggle2FA(_ enabled: Bool) async {
        guard enabled != has2FA else { return }

        isEnabling2FA = true

        do {
            // TODO: Update 2FA status via Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_500_000_000)

            /*
            // Example Supabase implementation:
            if enabled {
                // Enable 2FA
                try await supabase.rpc(
                    "enable_2fa",
                    params: ["user_id": userId]
                ).execute()

                // Generate backup codes
                let response = try await supabase.rpc(
                    "generate_backup_codes",
                    params: ["user_id": userId]
                ).execute()

                backupCodesRemaining = response.count
            } else {
                // Disable 2FA
                try await supabase.rpc(
                    "disable_2fa",
                    params: ["user_id": userId]
                ).execute()

                backupCodesRemaining = 0
            }
            */

            has2FA = enabled
            if enabled {
                backupCodesRemaining = 10
            }

            isEnabling2FA = false

            // Add audit log entry
            let event = AuditEvent(
                id: UUID().uuidString,
                action: enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
                timestamp: Date(),
                icon: "lock.shield.fill",
                severity: enabled ? .info : .warning
            )
            auditLog.insert(event, at: 0)

            successMessage = enabled ? "Two-factor authentication has been enabled" : "Two-factor authentication has been disabled"
            showSuccess = true

        } catch {
            isEnabling2FA = false
            errorMessage = "Failed to update 2FA settings: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Session Management
    func revokeSession(_ session: SessionInfo) async {
        guard !session.isCurrent else {
            errorMessage = "Cannot revoke current session"
            showError = true
            return
        }

        isRevokingSession = true

        do {
            // TODO: Revoke session via Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase implementation:
            try await supabase.rpc(
                "revoke_session",
                params: [
                    "session_id": session.id,
                    "user_id": userId
                ]
            ).execute()
            */

            // Remove from local array
            sessions.removeAll { $0.id == session.id }

            isRevokingSession = false

            // Add audit log entry
            let event = AuditEvent(
                id: UUID().uuidString,
                action: "Session revoked for \(session.deviceName)",
                timestamp: Date(),
                icon: "xmark.circle.fill",
                severity: .info
            )
            auditLog.insert(event, at: 0)

            successMessage = "Session has been revoked"
            showSuccess = true

        } catch {
            isRevokingSession = false
            errorMessage = "Failed to revoke session: \(error.localizedDescription)"
            showError = true
        }
    }

    func revokeAllOtherSessions() async {
        let otherSessions = sessions.filter { !$0.isCurrent }

        guard !otherSessions.isEmpty else {
            errorMessage = "No other sessions to revoke"
            showError = true
            return
        }

        isRevokingSession = true

        do {
            // TODO: Revoke all other sessions via Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_500_000_000)

            /*
            // Example Supabase implementation:
            try await supabase.rpc(
                "revoke_all_other_sessions",
                params: ["user_id": userId]
            ).execute()
            */

            // Keep only current session
            sessions = sessions.filter { $0.isCurrent }

            isRevokingSession = false

            // Add audit log entry
            let event = AuditEvent(
                id: UUID().uuidString,
                action: "All other sessions revoked (\(otherSessions.count) sessions)",
                timestamp: Date(),
                icon: "xmark.circle.fill",
                severity: .warning
            )
            auditLog.insert(event, at: 0)

            successMessage = "\(otherSessions.count) session(s) have been revoked"
            showSuccess = true

        } catch {
            isRevokingSession = false
            errorMessage = "Failed to revoke sessions: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Device Management
    func removeDevice(_ device: DeviceInfo) async {
        isRemovingDevice = true

        do {
            // TODO: Remove device via Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase implementation:
            try await supabase.rpc(
                "remove_trusted_device",
                params: [
                    "device_id": device.id,
                    "user_id": userId
                ]
            ).execute()
            */

            // Remove from local array
            devices.removeAll { $0.id == device.id }

            isRemovingDevice = false

            // Add audit log entry
            let event = AuditEvent(
                id: UUID().uuidString,
                action: "Device removed: \(device.name)",
                timestamp: Date(),
                icon: "trash.fill",
                severity: .warning
            )
            auditLog.insert(event, at: 0)

            successMessage = "Device has been removed"
            showSuccess = true

        } catch {
            isRemovingDevice = false
            errorMessage = "Failed to remove device: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Backup Codes
    func regenerateBackupCodes() async {
        do {
            // TODO: Regenerate backup codes via Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_000_000_000)

            /*
            // Example Supabase implementation:
            let response = try await supabase.rpc(
                "regenerate_backup_codes",
                params: ["user_id": userId]
            ).execute()

            backupCodesRemaining = response.count
            */

            backupCodesRemaining = 10

            // Add audit log entry
            let event = AuditEvent(
                id: UUID().uuidString,
                action: "Backup codes regenerated",
                timestamp: Date(),
                icon: "arrow.clockwise.circle.fill",
                severity: .info
            )
            auditLog.insert(event, at: 0)

            successMessage = "New backup codes have been generated"
            showSuccess = true

        } catch {
            errorMessage = "Failed to regenerate backup codes: \(error.localizedDescription)"
            showError = true
        }
    }
}
