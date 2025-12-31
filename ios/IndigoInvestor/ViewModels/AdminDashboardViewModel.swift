//
//  AdminDashboardViewModel.swift
//  IndigoInvestor
//
//  Admin dashboard view model for admin-only operations
//

import Foundation
import SwiftUI
import Combine

@MainActor
class AdminDashboardViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var pendingApprovals: [ApprovalRequest] = []
    @Published var recentInvestors: [InvestorProfile] = []
    @Published var dashboardMetrics: AdminMetrics?
    @Published var selectedApproval: ApprovalRequest?
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var showApprovalDetail = false
    
    // MARK: - Dependencies
    private let adminService: AdminServiceProtocol
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init(adminService: AdminServiceProtocol) {
        self.adminService = adminService
    }
    
    // MARK: - Public Methods
    
    func loadDashboardData() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            // Load data concurrently
            async let approvalsTask = loadPendingApprovals()
            async let investorsTask = loadRecentInvestors()
            async let metricsTask = loadDashboardMetrics()
            
            let (approvals, investors, metrics) = try await (approvalsTask, investorsTask, metricsTask)
            
            self.pendingApprovals = approvals
            self.recentInvestors = investors
            self.dashboardMetrics = metrics
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        guard !isRefreshing else { return }
        
        isRefreshing = true
        errorMessage = nil
        
        do {
            // Refresh all data
            async let approvalsTask = adminService.fetchPendingApprovals()
            async let investorsTask = adminService.fetchAllInvestors()
            
            let (approvals, allInvestors) = try await (approvalsTask, investorsTask)
            
            self.pendingApprovals = approvals
            self.recentInvestors = Array(allInvestors.prefix(10)) // Most recent 10
            
            // Recalculate metrics
            self.dashboardMetrics = calculateMetrics(from: allInvestors, approvals: approvals)
            
        } catch {
            handleError(error)
        }
        
        isRefreshing = false
    }
    
    func approveRequest(_ request: ApprovalRequest, notes: String? = nil) async {
        do {
            try await adminService.approveRequest(id: request.id, notes: notes)
            
            // Remove from pending list
            pendingApprovals.removeAll { $0.id == request.id }
            
            // Update metrics
            if let currentMetrics = dashboardMetrics {
                dashboardMetrics = AdminMetrics(
                    totalInvestors: currentMetrics.totalInvestors,
                    activeInvestors: currentMetrics.activeInvestors,
                    totalPendingApprovals: currentMetrics.totalPendingApprovals - 1,
                    totalAUM: currentMetrics.totalAUM,
                    monthlyGrowth: currentMetrics.monthlyGrowth
                )
            }
            
        } catch {
            handleError(error)
        }
    }
    
    func rejectRequest(_ request: ApprovalRequest, reason: String) async {
        do {
            try await adminService.rejectRequest(id: request.id, reason: reason)
            
            // Remove from pending list
            pendingApprovals.removeAll { $0.id == request.id }
            
            // Update metrics
            if let currentMetrics = dashboardMetrics {
                dashboardMetrics = AdminMetrics(
                    totalInvestors: currentMetrics.totalInvestors,
                    activeInvestors: currentMetrics.activeInvestors,
                    totalPendingApprovals: currentMetrics.totalPendingApprovals - 1,
                    totalAUM: currentMetrics.totalAUM,
                    monthlyGrowth: currentMetrics.monthlyGrowth
                )
            }
            
        } catch {
            handleError(error)
        }
    }
    
    func updateInvestorStatus(_ investorId: UUID, status: InvestorStatus) async {
        do {
            try await adminService.updateInvestorStatus(investorId: investorId, status: status)
            
            // Update local investor status
            if let index = recentInvestors.firstIndex(where: { $0.id == investorId }) {
                recentInvestors[index] = InvestorProfile(
                    id: recentInvestors[index].id,
                    userId: recentInvestors[index].userId,
                    email: recentInvestors[index].email,
                    fullName: recentInvestors[index].fullName,
                    phoneNumber: recentInvestors[index].phoneNumber,
                    dateOfBirth: recentInvestors[index].dateOfBirth,
                    address: recentInvestors[index].address,
                    kycStatus: recentInvestors[index].kycStatus,
                    investorType: recentInvestors[index].investorType,
                    riskProfile: recentInvestors[index].riskProfile,
                    createdAt: recentInvestors[index].createdAt,
                    updatedAt: Date()
                )
            }
            
        } catch {
            handleError(error)
        }
    }
    
    func selectApproval(_ approval: ApprovalRequest) {
        selectedApproval = approval
        showApprovalDetail = true
    }
    
    func clearSelection() {
        selectedApproval = nil
        showApprovalDetail = false
    }
    
    // MARK: - Private Methods
    
    private func loadPendingApprovals() async throws -> [ApprovalRequest] {
        return try await adminService.fetchPendingApprovals()
    }
    
    private func loadRecentInvestors() async throws -> [InvestorProfile] {
        let allInvestors = try await adminService.fetchAllInvestors()
        // Return most recent 10 investors
        return Array(allInvestors.prefix(10))
    }
    
    private func loadDashboardMetrics() async throws -> AdminMetrics {
        let allInvestors = try await adminService.fetchAllInvestors()
        let approvals = try await adminService.fetchPendingApprovals()
        
        return calculateMetrics(from: allInvestors, approvals: approvals)
    }
    
    private func calculateMetrics(from investors: [InvestorProfile], approvals: [ApprovalRequest]) -> AdminMetrics {
        let totalInvestors = investors.count
        let activeInvestors = investors.filter { $0.kycStatus == "verified" }.count
        let totalPendingApprovals = approvals.count
        
        // Calculate total AUM (mock calculation)
        let totalAUM = Decimal(investors.count * 50000) // Mock: $50k average per investor
        
        // Calculate monthly growth (mock calculation)
        let monthlyGrowth = Double.random(in: 2.5...8.5)
        
        return AdminMetrics(
            totalInvestors: totalInvestors,
            activeInvestors: activeInvestors,
            totalPendingApprovals: totalPendingApprovals,
            totalAUM: totalAUM,
            monthlyGrowth: monthlyGrowth
        )
    }
    
    private func handleError(_ error: Error) {
        print("❌ Admin dashboard error: \(error)")
        
        errorMessage = error.localizedDescription
        showError = true
        
        // Log error for analytics
        logError(error)
    }
    
    private func logError(_ error: Error) {
        let errorInfo = [
            "error": error.localizedDescription,
            "timestamp": Date().iso8601String,
            "screen": "AdminDashboard"
        ]
        
        print("📊 Error logged: \(errorInfo)")
    }
}

// MARK: - Supporting Types

struct AdminMetrics {
    let totalInvestors: Int
    let activeInvestors: Int
    let totalPendingApprovals: Int
    let totalAUM: Decimal
    let monthlyGrowth: Double
    
    var formattedTotalAUM: String {
        return totalAUM.formatted(.currency(code: "USD"))
    }
    
    var formattedMonthlyGrowth: String {
        return String(format: "%.1f%%", monthlyGrowth)
    }
    
    var activeInvestorPercentage: Double {
        guard totalInvestors > 0 else { return 0 }
        return Double(activeInvestors) / Double(totalInvestors) * 100
    }
    
    var formattedActiveInvestorPercentage: String {
        return String(format: "%.1f%%", activeInvestorPercentage)
    }
}

// MARK: - Computed Properties

extension AdminDashboardViewModel {
    var urgentApprovals: [ApprovalRequest] {
        // Approvals older than 3 days are considered urgent
        let urgentThreshold = Date().addingTimeInterval(-3 * 24 * 60 * 60)
        return pendingApprovals.filter { $0.createdAt < urgentThreshold }
    }
    
    var recentApprovals: [ApprovalRequest] {
        // Most recent 5 approvals
        return Array(pendingApprovals.prefix(5))
    }
    
    var hasData: Bool {
        return dashboardMetrics != nil
    }
    
    var isEmpty: Bool {
        return dashboardMetrics == nil && !isLoading
    }
    
    var hasUrgentApprovals: Bool {
        return !urgentApprovals.isEmpty
    }
}

// MARK: - Mock Data for Previews

#if DEBUG
extension AdminDashboardViewModel {
    static var preview: AdminDashboardViewModel {
        let mockService = MockAdminService()
        let viewModel = AdminDashboardViewModel(adminService: mockService)
        
        // Set up mock data
        viewModel.dashboardMetrics = AdminMetrics(
            totalInvestors: 150,
            activeInvestors: 142,
            totalPendingApprovals: 8,
            totalAUM: Decimal(7500000),
            monthlyGrowth: 5.2
        )
        
        viewModel.pendingApprovals = [
            ApprovalRequest(
                id: UUID(),
                type: "withdrawal",
                investorId: UUID(),
                amount: Decimal(25000),
                status: "pending",
                description: "Withdrawal request",
                createdAt: Date().addingTimeInterval(-2 * 24 * 60 * 60),
                processedAt: nil,
                processedBy: nil,
                adminNotes: nil,
                rejectionReason: nil
            )
        ]
        
        return viewModel
    }
}

private class MockAdminService: AdminServiceProtocol {
    func fetchPendingApprovals() async throws -> [ApprovalRequest] {
        return [
            ApprovalRequest(
                id: UUID(),
                type: "withdrawal",
                investorId: UUID(),
                amount: Decimal(25000),
                status: "pending",
                description: "Withdrawal request",
                createdAt: Date().addingTimeInterval(-2 * 24 * 60 * 60),
                processedAt: nil,
                processedBy: nil,
                adminNotes: nil,
                rejectionReason: nil
            )
        ]
    }
    
    func approveRequest(id: UUID, notes: String?) async throws {
        // Mock implementation
    }
    
    func rejectRequest(id: UUID, reason: String) async throws {
        // Mock implementation
    }
    
    func fetchAllInvestors() async throws -> [InvestorProfile] {
        return []
    }
    
    func updateInvestorStatus(investorId: UUID, status: InvestorStatus) async throws {
        // Mock implementation
    }
    
    func generateReport(type: ReportType, dateRange: DateRange) async throws -> Report {
        return Report(
            id: UUID(),
            type: type.rawValue,
            data: [:],
            generatedAt: Date(),
            generatedBy: UUID()
        )
    }
}
#endif
