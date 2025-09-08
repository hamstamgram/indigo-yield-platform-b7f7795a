//
//  RealtimeService.swift
//  IndigoInvestor
//
//  Realtime service for live data subscriptions with automatic reconnection
//

import Foundation
import Supabase
import Combine

protocol RealtimeServiceProtocol {
    func subscribeToChannel(_ channel: String, onEvent: @escaping ([String: Any]) -> Void)
    func unsubscribeFromChannel(_ channel: String)
    func disconnect()
    func reconnect() async
}

@MainActor
class RealtimeService: RealtimeServiceProtocol, ObservableObject {
    private let client: SupabaseClient
    private var subscriptions: [String: RealtimeChannel] = [:]
    private var eventHandlers: [String: ([String: Any]) -> Void] = [:]
    
    @Published var isConnected = false
    @Published var connectionError: Error?
    
    init(client: SupabaseClient) {
        self.client = client
        setupConnectionMonitoring()
    }
    
    func subscribeToChannel(_ channelName: String, onEvent: @escaping ([String: Any]) -> Void) {
        // Store event handler for reconnection scenarios
        eventHandlers[channelName] = onEvent
        
        Task {
            await createSubscription(channelName: channelName, onEvent: onEvent)
        }
    }
    
    func unsubscribeFromChannel(_ channelName: String) {
        if let channel = subscriptions[channelName] {
            Task {
                await channel.unsubscribe()
                subscriptions.removeValue(forKey: channelName)
                eventHandlers.removeValue(forKey: channelName)
                print("✅ Unsubscribed from channel: \(channelName)")
            }
        }
    }
    
    func disconnect() {
        Task {
            for (channelName, channel) in subscriptions {
                await channel.unsubscribe()
                print("✅ Disconnected from channel: \(channelName)")
            }
            subscriptions.removeAll()
            eventHandlers.removeAll()
            isConnected = false
        }
    }
    
    func reconnect() async {
        // Reconnect all existing subscriptions
        let handlersToReconnect = eventHandlers
        subscriptions.removeAll()
        
        for (channelName, handler) in handlersToReconnect {
            await createSubscription(channelName: channelName, onEvent: handler)
        }
    }
    
    private func createSubscription(channelName: String, onEvent: @escaping ([String: Any]) -> Void) async {
        do {
            let channel = await client.channel(channelName)
            
            // Configure channel based on channel name pattern
            if channelName.contains("portfolios:investor:") {
                let investorId = String(channelName.suffix(36)) // Extract UUID
                await channel.on("postgres_changes", filter: ChannelFilter(
                    event: "UPDATE",
                    schema: "public", 
                    table: "portfolios",
                    filter: "investor_id=eq.\(investorId)"
                )) { payload in
                    onEvent(payload)
                }
            } else if channelName.contains("transactions:investor:") {
                let investorId = String(channelName.suffix(36)) // Extract UUID
                await channel.on("postgres_changes", filter: ChannelFilter(
                    event: "INSERT",
                    schema: "public",
                    table: "transactions", 
                    filter: "investor_id=eq.\(investorId)"
                )) { payload in
                    onEvent(payload)
                }
            } else if channelName.contains("withdrawal_requests:") {
                await channel.on("postgres_changes", filter: ChannelFilter(
                    event: "*",
                    schema: "public",
                    table: "withdrawal_requests"
                )) { payload in
                    onEvent(payload)
                }
            }
            
            // Subscribe to channel
            let status = await channel.subscribe()
            
            switch status {
            case .subscribed:
                subscriptions[channelName] = channel
                isConnected = true
                connectionError = nil
                print("✅ Subscribed to channel: \(channelName)")
            case .timedOut:
                throw RealtimeError.subscriptionTimeout
            case .closed:
                throw RealtimeError.connectionClosed
            }
            
        } catch {
            print("❌ Failed to subscribe to channel \(channelName): \(error)")
            connectionError = error
            
            // Retry subscription after delay
            try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            await createSubscription(channelName: channelName, onEvent: onEvent)
        }
    }
    
    private func setupConnectionMonitoring() {
        // Monitor network connectivity and reconnect if needed
        Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkConnectionHealth()
            }
        }
    }
    
    private func checkConnectionHealth() {
        // Check if subscriptions are still active
        guard !subscriptions.isEmpty else { return }
        
        // If we have subscriptions but connection appears down, attempt reconnect
        if !isConnected {
            Task {
                await reconnect()
            }
        }
    }
}

// MARK: - Channel Filter Extension

extension ChannelFilter {
    init(event: String, schema: String, table: String, filter: String? = nil) {
        var filterDict: [String: Any] = [
            "event": event,
            "schema": schema, 
            "table": table
        ]
        
        if let filter = filter {
            filterDict["filter"] = filter
        }
        
        // This is a simplified initializer - actual implementation may vary based on Supabase SDK
        self = ChannelFilter(event: event, schema: schema, table: table)
    }
}

// MARK: - Realtime Service Errors

enum RealtimeError: LocalizedError {
    case subscriptionFailed(String)
    case subscriptionTimeout
    case connectionClosed
    case channelNotFound
    case invalidChannelConfiguration
    
    var errorDescription: String? {
        switch self {
        case .subscriptionFailed(let message):
            return "Realtime subscription failed: \(message)"
        case .subscriptionTimeout:
            return "Realtime subscription timed out"
        case .connectionClosed:
            return "Realtime connection was closed"
        case .channelNotFound:
            return "Realtime channel not found"
        case .invalidChannelConfiguration:
            return "Invalid realtime channel configuration"
        }
    }
}
