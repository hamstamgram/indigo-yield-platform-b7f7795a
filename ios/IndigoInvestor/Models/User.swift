//
//  User.swift
//  IndigoInvestor
//
//  User and Profile models
//

import Foundation

// MARK: - User Role

public enum UserRole: String, Codable {
    case admin = "admin"
    case investor = "investor"
    case viewer = "viewer"
    case superAdmin = "super_admin"
}

// MARK: - User

public struct User: Identifiable, Codable {
    public let id: UUID
    public let email: String
    public let fullName: String?
    public let role: UserRole
    public let isActive: Bool
    public let createdAt: Date
    public let lastLogin: Date?
    public let profile: InvestorProfile?

    public init(id: UUID, email: String, fullName: String?, role: UserRole, isActive: Bool, createdAt: Date, lastLogin: Date?, profile: InvestorProfile? = nil) {
        self.id = id
        self.email = email
        self.fullName = fullName
        self.role = role
        self.isActive = isActive
        self.createdAt = createdAt
        self.lastLogin = lastLogin
        self.profile = profile
    }
}

// MARK: - Investor Profile

public struct InvestorProfile: Codable, Identifiable {
    public let id: UUID
    public let userId: UUID
    public let email: String
    public let fullName: String
    public let phoneNumber: String?
    public let dateOfBirth: Date?
    public let address: String?
    public let kycStatus: String
    public let investorType: String
    public let riskProfile: String?
    public let createdAt: Date
    public let updatedAt: Date
}
