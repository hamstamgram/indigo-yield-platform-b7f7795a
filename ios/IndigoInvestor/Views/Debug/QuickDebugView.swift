//
//  QuickDebugView.swift
//  IndigoInvestor
//
//  Quick debug interface for immediate troubleshooting
//

import SwiftUI
import Supabase

struct QuickDebugView: View {
    @State private var debugResults: [String] = []
    @State private var isTesting = false

    var body: some View {
        NavigationView {
            VStack {
                // Quick test buttons
                VStack(spacing: 16) {
                    Button("Test Network Connectivity") {
                        Task {
                            await testNetworkConnectivity()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isTesting)

                    Button("Test Supabase Client") {
                        Task {
                            await testSupabaseClient()
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(isTesting)

                    Button("Test Portfolio Query") {
                        Task {
                            await testPortfolioQuery()
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(isTesting)

                    Button("Clear Results") {
                        debugResults.removeAll()
                    }
                    .buttonStyle(.borderless)
                }
                .padding()

                Divider()

                // Results
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(debugResults.enumerated()), id: \.offset) { index, result in
                            Text(result)
                                .font(.system(.caption, design: .monospaced))
                                .padding(.horizontal)
                        }
                    }
                }
            }
            .navigationTitle("Quick Debug")
        }
    }

    private func addResult(_ message: String) {
        DispatchQueue.main.async {
            debugResults.append("\(Date().formatted(.dateTime.hour().minute().second())): \(message)")
        }
    }

    private func testNetworkConnectivity() async {
        isTesting = true
        addResult("🔍 Testing network connectivity...")

        do {
            let url = URL(string: "https://nkfimvovosdehmyyjubn.supabase.co")!
            let (_, response) = try await URLSession.shared.data(from: url)

            if let httpResponse = response as? HTTPURLResponse {
                addResult("✅ HTTP Status: \(httpResponse.statusCode)")
                addResult("✅ Network connectivity working")
            }
        } catch {
            addResult("❌ Network error: \(error.localizedDescription)")
        }

        isTesting = false
    }

    private func testSupabaseClient() async {
        isTesting = true
        addResult("🔍 Testing Supabase client...")

        let serviceLocator = ServiceLocator.shared
        guard let supabase = serviceLocator.supabaseClient else {
            addResult("❌ Supabase client not configured")
            isTesting = false
            return
        }

        do {
            // Test basic REST endpoint
            let response = try await supabase
                .from("profiles")
                .select("id")
                .limit(1)
                .execute()

            addResult("✅ Supabase client working")
            addResult("✅ Response size: \(response.data.count) bytes")
        } catch {
            addResult("❌ Supabase error: \(error.localizedDescription)")

            // More detailed error information
            if let postgrestError = error as? PostgrestError {
                addResult("❌ PostgREST error code: \(postgrestError.code ?? "unknown")")
                addResult("❌ PostgREST message: \(postgrestError.message)")
            }
        }

        isTesting = false
    }

    private func testPortfolioQuery() async {
        isTesting = true
        addResult("🔍 Testing portfolio query...")

        let serviceLocator = ServiceLocator.shared
        guard let supabase = serviceLocator.supabaseClient else {
            addResult("❌ Supabase client not configured")
            isTesting = false
            return
        }

        // Get current user ID
        guard let userIdString = try? serviceLocator.keychainManager.getUserID(),
              let userId = UUID(uuidString: userIdString) else {
            addResult("❌ No authenticated user found")
            isTesting = false
            return
        }

        addResult("ℹ️ Using user ID: \(userId)")

        do {
            // Test direct portfolio query
            let response = try await supabase
                .from("portfolios")
                .select("*")
                .eq("investor_id", value: userId.uuidString)
                .execute()

            addResult("✅ Portfolio query executed")
            addResult("✅ Response size: \(response.data.count) bytes")

            // Try to decode response
            if let jsonString = String(data: response.data, encoding: .utf8) {
                addResult("📄 Raw response: \(jsonString)")

                // Check if empty array
                if jsonString.trimmingCharacters(in: .whitespacesAndNewlines) == "[]" {
                    addResult("⚠️ Query returned empty array - check RLS policies")
                }
            }

        } catch {
            addResult("❌ Portfolio query error: \(error.localizedDescription)")

            // Specific error analysis
            if let postgrestError = error as? PostgrestError {
                addResult("❌ PostgREST code: \(postgrestError.code ?? "unknown")")

                if postgrestError.message.contains("permission denied") ||
                   postgrestError.message.contains("insufficient_privilege") {
                    addResult("🔒 This looks like a Row Level Security (RLS) policy issue")
                    addResult("💡 Suggestion: Check RLS policies for portfolios table")
                }
            }
        }

        isTesting = false
    }
}

#if DEBUG
#Preview {
    QuickDebugView()
}
#endif