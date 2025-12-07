//
//  AdminService.swift
//  IndigoInvestor
//
//  Admin service for admin-only operations with proper RLS enforcement
//

import Foundation
import Supabase
import Combine

protocol AdminServiceProtocol {
    func fetchPendingApprovals() async throws -> [ApprovalRequest]
    func approveRequest(id: UUID, notes: String?) async throws
    func rejectRequest(id: UUID, reason: String) async throws
    func fetchAllInvestors() async throws -> [InvestorProfile]
    func updateInvestorStatus(investorId: UUID, status: InvestorStatus) async throws
    func generateReport(type: ReportType, dateRange: DateRange) async throws -> Report
}

@MainActor
class AdminService: AdminServiceProtocol, ObservableObject {
    private let supabaseClient: SupabaseClient
    private let currentUser: User?
    
    init(supabaseClient: SupabaseClient) {
        self.supabaseClient = supabaseClient
        self.currentUser = supabaseClient.auth.currentUser
    }
    
    func fetchPendingApprovals() async throws -> [ApprovalRequest] {
        try validateAdminRole()
        
        do {
            let response = try await supabaseClient.database
                .from("approval_requests")
                .select()
                .eq("status", value: "pending")
                .order("created_at", ascending: false)
                .execute()
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            
            let approvals = try decoder.decode([ApprovalRequest].self, from: response.data)
            print("✅ Fetched \(approvals.count) pending approvals")
            return approvals
        } catch {
            print("❌ Failed to fetch pending approvals: \(error)")
            throw AdminError.fetchFailed(error)
        }
    }
    
    func approveRequest(id: UUID, notes: String? = nil) async throws {
        try validateAdminRole()
        
        do {
            let update = [
                "status": "approved",
                "admin_notes": notes ?? "",
                "processed_at": ISO8601DateFormatter().string(from: Date()),
                "processed_by": currentUser?.id.uuidString ?? ""
            ]
            
            _ = try await supabaseClient.database
                .from("approval_requests")
                .update(update)
                .eq("id", value: id.uuidString)
                .execute()
            
            print("✅ Approved request: \(id)")
        } catch {
            print("❌ Failed to approve request \(id): \(error)")
            throw AdminError.approvalFailed(error)
        }
    }
    
    func rejectRequest(id: UUID, reason: String) async throws {
        try validateAdminRole()
        
        guard !reason.isEmpty else {
            throw AdminError.validationFailed("Rejection reason is required")
        }
        
        do {
            let update = [
                "status": "rejected",
                "rejection_reason": reason,
                "processed_at": ISO8601DateFormatter().string(from: Date()),
                "processed_by": currentUser?.id.uuidString ?? ""
            ]
            
            _ = try await supabaseClient.database
                .from("approval_requests")
                .update(update)
                .eq("id", value: id.uuidString)
                .execute()
            
            print("✅ Rejected request: \(id)")
        } catch {
            print("❌ Failed to reject request \(id): \(error)")
            throw AdminError.rejectionFailed(error)
        }
    }
    
    func fetchAllInvestors() async throws -> [InvestorProfile] {
        try validateAdminRole()
        
        do {
            let response = try await supabaseClient.database
                .from("investors")
                .select("""
                    id, user_id, full_name, email, phone_number, 
                    account_number, kyc_status, risk_profile, 
                    total_invested, current_value, created_at, 
                    last_login, is_active
                """)
                .order("created_at", ascending: false)
                .execute()
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            
            let investors = try decoder.decode([InvestorProfile].self, from: response.data)
            print("✅ Fetched \(investors.count) investors")
            return investors
        } catch {
            print("❌ Failed to fetch investors: \(error)")
            throw AdminError.fetchFailed(error)
        }
    }
    
    func updateInvestorStatus(investorId: UUID, status: InvestorStatus) async throws {
        try validateAdminRole()
        
        do {
            let update = [
                "is_active": status == .active,
                "status_updated_by": currentUser?.id.uuidString ?? "",
                "status_updated_at": ISO8601DateFormatter().string(from: Date())
            ]
            
            _ = try await supabaseClient.database
                .from("investors")
                .update(update)
                .eq("id", value: investorId.uuidString)
                .execute()
            
            print("✅ Updated investor status: \(investorId) -> \(status)")
        } catch {
            print("❌ Failed to update investor status: \(error)")
            throw AdminError.updateFailed(error)
        }
    }
    
    func generateReport(type: ReportType, dateRange: DateRange) async throws -> Report {
        try validateAdminRole()
        
        do {
            // Call Supabase Edge Function for report generation
            let requestBody = [
                "report_type": type.rawValue,
                "start_date": ISO8601DateFormatter().string(from: dateRange.startDate),
                "end_date": ISO8601DateFormatter().string(from: dateRange.endDate)
            ]
            
            let response = try await supabaseClient.functions.invoke(
                "generate_admin_report",
                options: FunctionInvokeOptions(
                    headers: ["Content-Type": "application/json"],
                    body: requestBody
                )
            )
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            
            let report = try decoder.decode(Report.self, from: response.data)
            print("✅ Generated \(type.rawValue) report")
            return report
        } catch {
            print("❌ Failed to generate report: \(error)")
            throw AdminError.reportGenerationFailed(error)
        }
    }
    
    private func validateAdminRole() async throws {
        guard currentUser != nil else {
            throw AdminError.unauthorized("User not authenticated")
        }
        
        do {
            let isAdminResponse = try await supabaseClient.database
                .rpc("is_admin")
                .execute()
            
            let decoder = JSONDecoder()
            let isAdmin = try decoder.decode(Bool.self, from: isAdminResponse.data)
            
            guard isAdmin else {
                throw AdminError.unauthorized("Admin access required")
            }
        } catch {
            print("❌ Admin validation failed: \(error)")
            throw AdminError.unauthorized("Failed to verify admin privileges")
        }
    }
}

// MARK: - Supporting Types

enum InvestorStatus: String, CaseIterable {
    case active = "active"
    case inactive = "inactive"
    case suspended = "suspended"
}

enum ReportType: String, CaseIterable {
    case portfolio = "portfolio"
    case transactions = "transactions"
    case withdrawals = "withdrawals"
    case performance = "performance"
}

struct DateRange {
    let startDate: Date
    let endDate: Date
}

struct ApprovalRequest: Codable, Identifiable {
    let id: UUID
    let type: String
    let investorId: UUID
    let amount: Decimal?
    let status: String
    let description: String?
    let createdAt: Date
    let processedAt: Date?
    let processedBy: UUID?
    let adminNotes: String?
    let rejectionReason: String?
}

struct Report: Codable {
    let id: UUID
    let type: String
    let data: [String: Any]
    let generatedAt: Date
    let generatedBy: UUID
    
    // Custom coding to handle [String: Any]
    enum CodingKeys: String, CodingKey {
        case id, type, data, generatedAt, generatedBy
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        type = try container.decode(String.self, forKey: .type)
        generatedAt = try container.decode(Date.self, forKey: .generatedAt)
        generatedBy = try container.decode(UUID.self, forKey: .generatedBy)
        
        // Handle [String: Any] data
        let jsonData = try container.decode(Data.self, forKey: .data)
        data = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] ?? [:]
    }
}

// MARK: - Admin Service Errors

enum AdminError: LocalizedError {
    case unauthorized(String)
    case fetchFailed(Error)
    case approvalFailed(Error)
    case rejectionFailed(Error)
    case updateFailed(Error)
    case reportGenerationFailed(Error)
    case validationFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .unauthorized(let message):
            return "Unauthorized: \(message)"
        case .fetchFailed(let error):
            return "Failed to fetch admin data: \(error.localizedDescription)"
        case .approvalFailed(let error):
            return "Failed to approve request: \(error.localizedDescription)"
        case .rejectionFailed(let error):
            return "Failed to reject request: \(error.localizedDescription)"
        case .updateFailed(let error):
            return "Failed to update data: \(error.localizedDescription)"
        case .reportGenerationFailed(let error):
            return "Failed to generate report: \(error.localizedDescription)"
        case .validationFailed(let message):
            return "Validation failed: \(message)"
        }
    }
}
