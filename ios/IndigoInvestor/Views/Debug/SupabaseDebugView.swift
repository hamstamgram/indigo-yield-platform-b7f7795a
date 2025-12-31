//
//  SupabaseDebugView.swift
//  IndigoInvestor
//
//  Debug interface for Supabase connectivity issues
//

import SwiftUI
import Network

struct SupabaseDebugView: View {
    @StateObject private var debugger = SupabaseConnectivityDebugger()
    @State private var showingDetailView = false
    @State private var selectedResult: SupabaseConnectivityDebugger.DebugResult?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with quick stats
                headerView

                if debugger.isDebugging {
                    loadingView
                } else if debugger.debugResults.isEmpty {
                    emptyStateView
                } else {
                    resultsListView
                }

                Spacer()
            }
            .navigationTitle("Supabase Debug")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(debugger.isDebugging ? "Running..." : "Run Tests") {
                        Task {
                            await debugger.runComprehensiveDebugging()
                        }
                    }
                    .disabled(debugger.isDebugging)
                }
            }
        }
        .sheet(item: $selectedResult) { result in
            DebugResultDetailView(result: result)
        }
    }

    private var headerView: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Connectivity Status")
                        .font(.headline)
                        .foregroundColor(.primary)

                    if !debugger.debugResults.isEmpty {
                        let stats = getStats()
                        HStack(spacing: 16) {
                            StatView(title: "Passed", value: stats.success, color: .green)
                            StatView(title: "Warnings", value: stats.warnings, color: .orange)
                            StatView(title: "Failed", value: stats.failures, color: .red)
                        }
                    }
                }

                Spacer()

                VStack(alignment: .trailing) {
                    NetworkStatusView()
                }
            }

            Divider()
        }
        .padding()
        .background(Color(.systemGroupedBackground))
    }

    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView("Running connectivity tests...")
                .progressViewStyle(CircularProgressViewStyle())

            Text("This may take up to 60 seconds")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "network.slash")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Test Results")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Tap 'Run Tests' to diagnose Supabase connectivity issues")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var resultsListView: some View {
        List {
            ForEach(SupabaseConnectivityDebugger.DebugResult.DebugCategory.allCases, id: \.self) { category in
                let categoryResults = debugger.debugResults.filter { $0.category == category }

                if !categoryResults.isEmpty {
                    Section(header: Text(category.rawValue).font(.headline)) {
                        ForEach(categoryResults) { result in
                            DebugResultRow(result: result) {
                                selectedResult = result
                            }
                        }
                    }
                }
            }
        }
        .listStyle(InsetGroupedListStyle())
    }

    private func getStats() -> (success: Int, warnings: Int, failures: Int) {
        let success = debugger.debugResults.filter { $0.status == .success }.count
        let warnings = debugger.debugResults.filter { $0.status == .warning }.count
        let failures = debugger.debugResults.filter { $0.status == .failure }.count
        return (success, warnings, failures)
    }
}

struct StatView: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct NetworkStatusView: View {
    @StateObject private var networkMonitor = NetworkMonitor()

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            HStack(spacing: 6) {
                Circle()
                    .fill(networkMonitor.isConnected ? Color.green : Color.red)
                    .frame(width: 8, height: 8)

                Text(networkMonitor.isConnected ? "Connected" : "Disconnected")
                    .font(.caption)
                    .fontWeight(.medium)
            }

            Text(connectionTypeText)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    private var connectionTypeText: String {
        switch networkMonitor.connectionType {
        case .wifi:
            return "WiFi"
        case .cellular:
            return "Cellular"
        case .ethernet:
            return "Ethernet"
        case .unknown:
            return "Unknown"
        }
    }
}

struct DebugResultRow: View {
    let result: SupabaseConnectivityDebugger.DebugResult
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            Text(result.status.rawValue)
                .font(.title2)

            VStack(alignment: .leading, spacing: 4) {
                Text(result.test)
                    .font(.body)
                    .fontWeight(.medium)

                Text(result.message)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            if result.details != nil {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
    }
}

struct DebugResultDetailView: View {
    let result: SupabaseConnectivityDebugger.DebugResult

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Status header
                    HStack {
                        Text(result.status.rawValue)
                            .font(.largeTitle)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(result.test)
                                .font(.title2)
                                .fontWeight(.semibold)

                            Text(result.category.rawValue)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()
                    }

                    Divider()

                    // Message
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Result")
                            .font(.headline)

                        Text(result.message)
                            .font(.body)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }

                    // Details
                    if let details = result.details {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Technical Details")
                                .font(.headline)

                            ForEach(Array(details.keys.sorted()), id: \.self) { key in
                                HStack(alignment: .top) {
                                    Text(key)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.secondary)
                                        .frame(minWidth: 80, alignment: .leading)

                                    Text(String(describing: details[key] ?? ""))
                                        .font(.caption)
                                        .fontFamily(.monospaced)
                                }
                                .padding(.vertical, 2)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }

                    // Timestamp
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Timestamp")
                            .font(.headline)

                        Text(result.timestamp, style: .date) + Text(" at ") + Text(result.timestamp, style: .time)
                    }

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Test Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        // Dismiss sheet
                    }
                }
            }
        }
    }
}

#if DEBUG
struct SupabaseDebugView_Previews: PreviewProvider {
    static var previews: some View {
        SupabaseDebugView()
    }
}
#endif