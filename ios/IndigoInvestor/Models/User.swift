//
//  User.swift
//  IndigoInvestor
//
//  User models for authentication and profiles
//

import Foundation
import Supabase

// MARK: - User Model

struct User: Identifiable, Codable {
    let id: UUID
    let email: String
    let fullName: String?
    let role: UserRole
    let isActive: Bool
    let createdAt: Date
    let lastLogin: Date?
    let profile: InvestorProfile?

    init(id: UUID, email: String, fullName: String?, role: UserRole, isActive: Bool, createdAt: Date, lastLogin: Date?, profile: InvestorProfile? = nil) {
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

struct InvestorProfile: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let email: String
    let fullName: String
    let phoneNumber: String?
    let dateOfBirth: Date?
    let address: String?
    let kycStatus: String
    let investorType: String
    let riskProfile: String?
    let createdAt: Date
    let updatedAt: Date
}

// Extension for Supabase User compatibility
extension User {
    init(from supabaseUser: Supabase.User) {
        self.id = supabaseUser.id
        self.email = supabaseUser.email ?? ""
        self.fullName = supabaseUser.userMetadata["full_name"]?.value as? String
        self.role = .investor
        self.isActive = true
        self.createdAt = supabaseUser.createdAt
        self.lastLogin = Date()
        self.profile = nil
    }
}