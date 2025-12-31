//
//  SupabaseDebugger.swift
//  IndigoInvestor
//
//  Debug utilities for Supabase integration and RLS policy testing
//

import Foundation
import Supabase

struct SupabaseDebugger {

    static func testConnection(client: SupabaseClient) async -> Bool {
        print("🔍 Testing Supabase connection...")

        do {
            // Test basic connectivity with a simple health check
            let response = try await client
                .from("profiles")
                .select("count", count: .exact)
                .limit(1)
                .execute()

            print("✅ Supabase connection test successful")
            return true
        } catch {
            print("❌ Supabase connection test failed: \(error)")

            if let postgrestError = error as? PostgrestError {
                print("❌ PostgREST error code: \(postgrestError.code ?? "unknown")")
                print("❌ PostgREST error message: \(postgrestError.message)")
            }

            return false
        }
    }

    static func testAuthentication(client: SupabaseClient) async -> Bool {
        print("🔍 Testing Supabase authentication state...")

        do {
            let session = try await client.auth.session
            print("✅ Authentication session found for user: \(session.user.email ?? "unknown")")
            print("📋 User ID: \(session.user.id)")
            print("🔑 Token expires at: \(session.expiresAt)")

            // Check if token is close to expiry
            let timeUntilExpiry = session.expiresAt.timeIntervalSinceNow
            if timeUntilExpiry < 300 { // Less than 5 minutes
                print("⚠️ Token expires soon: \(Int(timeUntilExpiry)) seconds")
            }

            return true
        } catch {
            print("❌ Authentication test failed: \(error)")
            return false
        }
    }

    static func testProfileAccess(client: SupabaseClient) async -> Bool {
        print("🔍 Testing profile table access...")

        do {
            let session = try await client.auth.session
            let userId = session.user.id.uuidString

            let response = try await client
                .from("profiles")
                .select("*")
                .eq("id", value: userId)
                .execute()

            print("✅ Profile access successful")
            print("📊 Profile data: \(String(data: response.data, encoding: .utf8) ?? "Unable to decode")")

            return response.data.count > 0
        } catch {
            print("❌ Profile access failed: \(error)")
            return false
        }
    }

    static func debugPortfolioFetch(client: SupabaseClient, investorId: UUID?) async {
        print("🔍 Debug portfolio fetch...")

        do {
            let session = try await client.auth.session
            let userId = investorId?.uuidString ?? session.user.id.uuidString

            print("📋 Testing portfolio access for user: \(userId)")

            // First check if user has a profile
            let profileResponse = try await client
                .from("profiles")
                .select("*")
                .eq("id", value: userId)
                .execute()

            print("✅ Profile check complete - found \(profileResponse.data.count) bytes")

            // Then check portfolios
            let portfolioResponse = try await client
                .from("portfolios")
                .select("*")
                .eq("investor_id", value: userId)
                .execute()

            print("✅ Portfolio query executed successfully")
            print("📊 Portfolio response: \(String(data: portfolioResponse.data, encoding: .utf8) ?? "Unable to decode")")

            // Check positions if portfolio exists
            if portfolioResponse.data.count > 2 { // More than empty array "[]"
                let positionsResponse = try await client
                    .from("positions")
                    .select("*")
                    .execute()

                print("📊 Positions response: \(String(data: positionsResponse.data, encoding: .utf8) ?? "Unable to decode")")
            }

        } catch {
            print("❌ Portfolio fetch debug failed: \(error)")

            if let postgrestError = error as? PostgrestError {
                print("❌ PostgREST error code: \(postgrestError.code ?? "unknown")")
                print("❌ PostgREST error message: \(postgrestError.message)")
                print("❌ PostgREST error details: \(postgrestError.details ?? "none")")
            }
        }
    }

    static func debugUserProfile(client: SupabaseClient) async {
        print("🔍 Debug user profile and metadata...")

        do {
            let session = try await client.auth.session
            let user = session.user

            print("📋 User metadata:")
            print("   - Email: \(user.email ?? "none")")
            print("   - ID: \(user.id)")
            print("   - Created: \(user.createdAt)")
            print("   - Confirmed at: \(user.emailConfirmedAt?.description ?? "not confirmed")")
            print("   - App metadata: \(user.appMetadata)")
            print("   - User metadata: \(user.userMetadata)")

        } catch {
            print("❌ User profile debug failed: \(error)")
        }
    }

    static func debugRLSPolicies(client: SupabaseClient, userId: String) async {
        print("🔍 Testing RLS policies for user: \(userId)")

        // Test various table access patterns
        let tables = ["profiles", "portfolios", "positions", "transactions", "daily_yields"]

        for table in tables {
            do {
                let response = try await client
                    .from(table)
                    .select("*")
                    .limit(5)
                    .execute()

                let dataString = String(data: response.data, encoding: .utf8) ?? "Unable to decode"
                let isEmpty = dataString == "[]"

                print("✅ Table '\(table)' accessible - \(isEmpty ? "No data" : "Has data")")

                if !isEmpty && response.data.count < 1000 { // Only show small responses
                    print("   Data sample: \(dataString)")
                }

            } catch {
                print("❌ Table '\(table)' access failed: \(error)")

                if let postgrestError = error as? PostgrestError {
                    print("   Error code: \(postgrestError.code ?? "unknown")")
                    print("   Error message: \(postgrestError.message)")
                }
            }
        }
    }

    static func runFullDiagnostics(client: SupabaseClient, investorId: UUID? = nil) async {
        print("\n🏥 Running full Supabase diagnostics...")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        // Test 1: Basic connectivity
        let connectionSuccess = await testConnection(client: client)

        // Test 2: Authentication
        let authSuccess = await testAuthentication(client: client)

        if authSuccess {
            // Test 3: User profile
            await debugUserProfile(client: client)

            // Test 4: Profile table access
            let profileSuccess = await testProfileAccess(client: client)

            // Test 5: RLS policies
            do {
                let session = try await client.auth.session
                await debugRLSPolicies(client: client, userId: session.user.id.uuidString)
            } catch {
                print("❌ Could not get user ID for RLS testing")
            }

            // Test 6: Portfolio fetch (if investor ID provided or use current user)
            await debugPortfolioFetch(client: client, investorId: investorId)
        }

        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("🏁 Diagnostics complete")
        print("   - Connection: \(connectionSuccess ? "✅" : "❌")")
        print("   - Authentication: \(authSuccess ? "✅" : "❌")")
        print("   - Tables: See individual results above")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    }

    // MARK: - Network Diagnostics

    static func testNetworkConnectivity() async -> Bool {
        print("🔍 Testing network connectivity...")

        guard let url = URL(string: "https://httpbin.org/get") else {
            print("❌ Invalid test URL")
            return false
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            if let httpResponse = response as? HTTPURLResponse {
                print("✅ Network connectivity test successful")
                print("   - Status code: \(httpResponse.statusCode)")
                print("   - Response size: \(data.count) bytes")
                return httpResponse.statusCode == 200
            } else {
                print("❌ Invalid HTTP response")
                return false
            }
        } catch {
            print("❌ Network connectivity test failed: \(error)")
            return false
        }
    }

    // MARK: - Quick Database Test

    static func quickDatabaseTest(client: SupabaseClient) async {
        print("🚀 Running quick database test...")

        let networkOK = await testNetworkConnectivity()
        let connectionOK = await testConnection(client: client)
        let authOK = await testAuthentication(client: client)

        if networkOK && connectionOK && authOK {
            await debugPortfolioFetch(client: client, investorId: nil)
        } else {
            print("❌ Basic tests failed, skipping data access tests")
        }
    }
}

// MARK: - Error Extensions for Better Debugging

extension PostgrestError: CustomStringConvertible {
    public var description: String {
        let code = self.code ?? "unknown"
        let message = self.message
        let details = self.details ?? "no details"
        return "PostgrestError[\(code)]: \(message) (\(details))"
    }
}