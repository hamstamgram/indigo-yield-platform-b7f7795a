//
//  AccountViewModel.swift
//  IndigoInvestor
//
//  ViewModel for account management and user profile
//

import Foundation
import SwiftUI
import Combine

@MainActor
class AccountViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var userName = ""
    @Published var userEmail = ""
    @Published var profileImage: UIImage?
    @Published var initials = ""
    @Published var memberSince = ""
    @Published var totalInvested = "$0"
    @Published var totalReturns = "$0"
    @Published var activeDays = "0 days"
    @Published var appVersion = ""
    @Published var buildNumber = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        loadAppInfo()
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Subscribe to profile updates
        supabaseManager.subscribeToProfileUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.loadAccountData()
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    func loadAccountData() {
        Task {
            await fetchUserProfile()
            await fetchAccountStats()
        }
    }
    
    private func fetchUserProfile() async {
        do {
            let response = try await supabaseManager.client
                .from("profiles")
                .select("*")
                .eq("id", supabaseManager.currentUserId ?? "")
                .single()
                .execute()
            
            let profile = try JSONDecoder().decode(UserProfile.self, from: response.data)
            
            await MainActor.run {
                self.userName = "\(profile.firstName) \(profile.lastName)"
                self.userEmail = profile.email
                self.initials = "\(profile.firstName.prefix(1))\(profile.lastName.prefix(1))"
                self.memberSince = profile.createdAt.formatted(.dateTime.year())
                
                // Load profile image if available
                if let imageUrl = profile.avatarUrl {
                    Task {
                        await loadProfileImage(from: imageUrl)
                    }
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    private func fetchAccountStats() async {
        do {
            let response = try await supabaseManager.client
                .from("account_stats")
                .select("*")
                .eq("user_id", supabaseManager.currentUserId ?? "")
                .single()
                .execute()
            
            let stats = try JSONDecoder().decode(AccountStats.self, from: response.data)
            
            await MainActor.run {
                self.totalInvested = formatCurrency(stats.totalInvested)
                self.totalReturns = formatCurrency(stats.totalReturns)
                self.activeDays = "\(stats.activeDays) days"
            }
        } catch {
            // Use default values if stats not available
            print("Error fetching account stats: \(error)")
        }
    }
    
    private func loadProfileImage(from urlString: String) async {
        guard let url = URL(string: urlString) else { return }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let image = UIImage(data: data) {
                await MainActor.run {
                    self.profileImage = image
                }
            }
        } catch {
            print("Error loading profile image: \(error)")
        }
    }
    
    // MARK: - Actions
    
    func updateProfileImage(_ image: UIImage) async {
        profileImage = image
        
        // Upload to Supabase Storage
        guard let imageData = image.jpegData(compressionQuality: 0.8) else { return }
        
        do {
            let fileName = "\(supabaseManager.currentUserId ?? "unknown")_\(Date().timeIntervalSince1970).jpg"
            let path = "avatars/\(fileName)"
            
            _ = try await supabaseManager.client.storage
                .from("profiles")
                .upload(path: path, data: imageData)
            
            // Update profile with new avatar URL
            let publicUrl = supabaseManager.client.storage
                .from("profiles")
                .getPublicURL(path: path)
            
            try await supabaseManager.client
                .from("profiles")
                .update(["avatar_url": publicUrl.absoluteString])
                .eq("id", supabaseManager.currentUserId ?? "")
                .execute()
            
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to update profile image"
            }
        }
    }
    
    func openPrivacyPolicy() {
        if let url = URL(string: "https://indigoyield.com/privacy") {
            UIApplication.shared.open(url)
        }
    }
    
    func openTermsOfService() {
        if let url = URL(string: "https://indigoyield.com/terms") {
            UIApplication.shared.open(url)
        }
    }
    
    func openDisclosures() {
        if let url = URL(string: "https://indigoyield.com/disclosures") {
            UIApplication.shared.open(url)
        }
    }
    
    func contactSupport() {
        let email = "support@indigoyield.com"
        let subject = "Support Request from iOS App"
        let body = "User: \(userEmail)\nApp Version: \(appVersion)\n\nDescribe your issue:\n"
        
        if let url = URL(string: "mailto:\(email)?subject=\(subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&body=\(body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
            UIApplication.shared.open(url)
        }
    }
    
    // MARK: - Helper Methods
    
    private func loadAppInfo() {
        if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
            appVersion = version
        }
        
        if let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
            buildNumber = build
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
    }
}

// MARK: - Supporting Types

struct UserProfile: Codable {
    let id: UUID
    let email: String
    let firstName: String
    let lastName: String
    let avatarUrl: String?
    let phoneNumber: String?
    let dateOfBirth: Date?
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String
    let kycStatus: String
    let accreditedStatus: String
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case phoneNumber = "phone_number"
        case dateOfBirth = "date_of_birth"
        case address
        case city
        case state
        case zipCode = "zip_code"
        case country
        case kycStatus = "kyc_status"
        case accreditedStatus = "accredited_status"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct AccountStats: Codable {
    let userId: UUID
    let totalInvested: Double
    let totalReturns: Double
    let totalWithdrawn: Double
    let currentBalance: Double
    let activeDays: Int
    let lastActivity: Date
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case totalInvested = "total_invested"
        case totalReturns = "total_returns"
        case totalWithdrawn = "total_withdrawn"
        case currentBalance = "current_balance"
        case activeDays = "active_days"
        case lastActivity = "last_activity"
    }
}
