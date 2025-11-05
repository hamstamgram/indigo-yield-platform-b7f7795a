# iOS App Update Guide - Phase 5

**Date:** November 2025
**Purpose:** Apply monthly data entry system and daily rates features to iOS app
**Status:** Web platform complete, iOS updates documented

---

## Overview

The web platform has been completely restructured (Phases 1-4) and daily rates added (Phase 5). The iOS app needs matching updates to maintain feature parity.

---

## Part 1: Monthly Data Entry System (Phases 1-4)

### Current iOS App Issue

**File:** `ios/IndigoInvestor/ViewModels/StatementViewModel.swift` (line 82)

```swift
// CURRENT (BROKEN):
let response = try await supabaseManager.client
    .from("statements")
    .select("*")
    .eq("user_id", supabaseManager.currentUserId ?? "")
    .order("date", ascending: false)
    .execute()
```

**Problem:**
- Queries `statements` table which is EMPTY (0 records)
- Uses `user_id` directly instead of looking up `investor_id`
- Statement model doesn't match `investor_monthly_reports` schema

### Required Changes

#### 1. Update Statement Model

**File:** `ios/IndigoInvestor/ViewModels/StatementViewModel.swift` (lines 179-204)

**Current Model:**
```swift
struct Statement: Identifiable, Codable {
    let id: UUID
    let userId: UUID
    let title: String
    let type: StatementType
    let date: Date
    let filePath: String
    let fileSize: Int64
    let status: Status
    let isDownloaded: Bool
    let createdAt: Date
    let updatedAt: Date
}
```

**New Model (matches investor_monthly_reports):**
```swift
struct MonthlyStatement: Identifiable, Codable {
    let id: UUID
    let investorId: UUID
    let reportMonth: Date          // First day of month (YYYY-MM-01)
    let assetCode: String          // BTC, ETH, SOL, USDT, USDC, EURC
    let openingBalance: Decimal
    let closingBalance: Decimal
    let additions: Decimal
    let withdrawals: Decimal
    let yieldEarned: Decimal
    let entryDate: Date?
    let exitDate: Date?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case investorId = "investor_id"
        case reportMonth = "report_month"
        case assetCode = "asset_code"
        case openingBalance = "opening_balance"
        case closingBalance = "closing_balance"
        case additions
        case withdrawals
        case yieldEarned = "yield_earned"
        case entryDate = "entry_date"
        case exitDate = "exit_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Computed property for rate of return
    var rateOfReturn: Decimal {
        guard openingBalance > 0 else { return 0 }
        return (yieldEarned / openingBalance) * 100
    }
}
```

#### 2. Update fetchStatements() Method

**File:** `ios/IndigoInvestor/ViewModels/StatementViewModel.swift` (lines 76-105)

**New Implementation:**
```swift
private func fetchStatements() async {
    isLoading = true
    errorMessage = nil

    do {
        // Step 1: Get investor_id from profiles -> investors
        let profileResponse = try await supabaseManager.client
            .from("profiles")
            .select("id")
            .eq("id", supabaseManager.currentUserId ?? "")
            .single()
            .execute()

        let profileId = try JSONDecoder().decode(ProfileId.self, from: profileResponse.data).id

        let investorResponse = try await supabaseManager.client
            .from("investors")
            .select("id")
            .eq("profile_id", profileId)
            .maybeSingle()
            .execute()

        guard let investorData = investorResponse.data,
              let investor = try? JSONDecoder().decode(InvestorId.self, from: investorData) else {
            await MainActor.run {
                self.errorMessage = "Investor profile not found"
                self.isLoading = false
            }
            return
        }

        // Step 2: Fetch from investor_monthly_reports
        let response = try await supabaseManager.client
            .from("investor_monthly_reports")
            .select("*")
            .eq("investor_id", investor.id)
            .order("report_month", ascending: false)
            .execute()

        let fetchedStatements = try JSONDecoder().decode([MonthlyStatement].self, from: response.data)

        await MainActor.run {
            self.statements = fetchedStatements
            self.filteredStatements = fetchedStatements
            self.extractAvailableYears()
        }
    } catch {
        await MainActor.run {
            self.errorMessage = error.localizedDescription
            print("Error fetching statements: \\(error)")
        }
    }

    await MainActor.run {
        self.isLoading = false
    }
}

// Helper structs
struct ProfileId: Codable {
    let id: UUID
}

struct InvestorId: Codable {
    let id: UUID
}
```

#### 3. Update Filter Logic for Assets

**Add asset filtering** (similar to year/type filtering):

```swift
@Published var selectedAsset: AssetCode?
@Published var availableAssets: [AssetCode] = []

enum AssetCode: String, Codable, CaseIterable {
    case BTC = "BTC"
    case ETH = "ETH"
    case SOL = "SOL"
    case USDT = "USDT"
    case USDC = "USDC"
    case EURC = "EURC"
}

func filterStatements(year: Int?, asset: AssetCode?) {
    var filtered = statements

    // Filter by year
    if let year = year {
        filtered = filtered.filter { statement in
            Calendar.current.component(.year, from: statement.reportMonth) == year
        }
    }

    // Filter by asset
    if let asset = asset {
        filtered = filtered.filter { $0.assetCode == asset.rawValue }
    }

    filteredStatements = filtered
}

private func extractAvailableAssets() {
    let assets = Set(statements.map { AssetCode(rawValue: $0.assetCode) }.compactMap { $0 })
    availableAssets = Array(assets).sorted { $0.rawValue < $1.rawValue }
}
```

#### 4. Update Statement Detail View

**File:** `ios/IndigoInvestor/Views/Statements/StatementView.swift` or similar

**Display monthly statement data:**

```swift
struct MonthlyStatementDetailView: View {
    let statement: MonthlyStatement

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                Text("\(statement.assetCode) Fund")
                    .font(.title)
                    .fontWeight(.bold)

                Text(statement.reportMonth.formatted(.dateTime.month(.wide).year()))
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Divider()

                // Balance Details
                VStack(alignment: .leading, spacing: 12) {
                    StatementRow(label: "Beginning Balance", value: formatAmount(statement.openingBalance))

                    if statement.additions > 0 {
                        StatementRow(label: "Additions", value: "+ \(formatAmount(statement.additions))", color: .green)
                    }

                    if statement.withdrawals > 0 {
                        StatementRow(label: "Withdrawals", value: "- \(formatAmount(statement.withdrawals))", color: .red)
                    }

                    if statement.yieldEarned != 0 {
                        StatementRow(label: "Net Income", value: "+ \(formatAmount(statement.yieldEarned))", color: .blue)
                    }

                    Divider()

                    StatementRow(label: "Ending Balance", value: formatAmount(statement.closingBalance))
                        .fontWeight(.bold)

                    // Rate of Return
                    HStack {
                        Text("Rate of Return")
                            .font(.subheadline)
                        Spacer()
                        Text("\(formatPercentage(statement.rateOfReturn))%")
                            .font(.subheadline)
                            .foregroundColor(statement.rateOfReturn >= 0 ? .green : .red)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Entry/Exit dates
                if let entryDate = statement.entryDate {
                    Text("Fund Entry: \(entryDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .navigationTitle("Statement Details")
    }

    private func formatAmount(_ amount: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 8
        return formatter.string(from: amount as NSNumber) ?? "0.00"
    }

    private func formatPercentage(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: value as NSNumber) ?? "0.00"
    }
}

struct StatementRow: View {
    let label: String
    let value: String
    var color: Color = .primary

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .foregroundColor(color)
        }
    }
}
```

---

## Part 2: Daily Rates Feature (Phase 5)

### Database Schema

**Table:** `daily_rates`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rate_date | date | Date (unique) |
| btc_rate | numeric | BTC rate in USD |
| eth_rate | numeric | ETH rate in USD |
| sol_rate | numeric | SOL rate in USD |
| usdt_rate | numeric | USDT rate (typically $1.00) |
| usdc_rate | numeric | USDC rate (typically $1.00) |
| eurc_rate | numeric | EURC rate (typically $1.00) |
| notes | text | Optional notes |
| created_by | UUID | Admin who entered |
| created_at | timestamptz | Creation time |
| updated_at | timestamptz | Update time |

### 1. Create DailyRate Model

**New File:** `ios/IndigoInvestor/Models/DailyRate.swift`

```swift
import Foundation

struct DailyRate: Identifiable, Codable {
    let id: UUID
    let rateDate: Date
    let btcRate: Decimal
    let ethRate: Decimal
    let solRate: Decimal
    let usdtRate: Decimal
    let usdcRate: Decimal
    let eurcRate: Decimal
    let notes: String?
    let createdBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rateDate = "rate_date"
        case btcRate = "btc_rate"
        case ethRate = "eth_rate"
        case solRate = "sol_rate"
        case usdtRate = "usdt_rate"
        case usdcRate = "usdc_rate"
        case eurcRate = "eurc_rate"
        case notes
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Helper to get rate for specific asset
    func rate(for asset: String) -> Decimal {
        switch asset.uppercased() {
        case "BTC": return btcRate
        case "ETH": return ethRate
        case "SOL": return solRate
        case "USDT": return usdtRate
        case "USDC": return usdcRate
        case "EURC": return eurcRate
        default: return 0
        }
    }
}
```

### 2. Create DailyRatesViewModel

**New File:** `ios/IndigoInvestor/ViewModels/DailyRatesViewModel.swift`

```swift
import SwiftUI
import Combine

@MainActor
final class DailyRatesViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var dailyRates: [DailyRate] = []
    @Published var todayRate: DailyRate?
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Dependencies
    private let supabaseManager = SupabaseManager.shared
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        setupSubscriptions()
    }

    private func setupSubscriptions() {
        // Subscribe to real-time rate updates
        supabaseManager.subscribeToDailyRateUpdates()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] _ in
                    self?.fetchTodayRate()
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Data Loading

    func fetchTodayRate() {
        Task {
            await loadTodayRate()
        }
    }

    func fetchRecentRates(days: Int = 7) {
        Task {
            await loadRecentRates(days: days)
        }
    }

    private func loadTodayRate() async {
        isLoading = true
        errorMessage = nil

        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let todayString = formatter.string(from: today)

        do {
            let response = try await supabaseManager.client
                .from("daily_rates")
                .select("*")
                .eq("rate_date", todayString)
                .maybeSingle()
                .execute()

            if let rateData = response.data, !rateData.isEmpty {
                let rate = try JSONDecoder().decode(DailyRate.self, from: rateData)
                await MainActor.run {
                    self.todayRate = rate
                }
            } else {
                await MainActor.run {
                    self.todayRate = nil
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to load today's rates: \\(error.localizedDescription)"
            }
        }

        await MainActor.run {
            self.isLoading = false
        }
    }

    private func loadRecentRates(days: Int) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await supabaseManager.client
                .from("daily_rates")
                .select("*")
                .order("rate_date", ascending: false)
                .limit(days)
                .execute()

            let rates = try JSONDecoder().decode([DailyRate].self, from: response.data)

            await MainActor.run {
                self.dailyRates = rates
                if let latest = rates.first {
                    self.todayRate = latest
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to load rates: \\(error.localizedDescription)"
            }
        }

        await MainActor.run {
            self.isLoading = false
        }
    }

    // Calculate 24h change
    func calculateChange(current: Decimal, previous: Decimal?) -> Decimal? {
        guard let previous = previous, previous > 0 else { return nil }
        return ((current - previous) / previous) * 100
    }
}
```

### 3. Create Daily Rates View

**New File:** `ios/IndigoInvestor/Views/DailyRates/DailyRatesView.swift`

```swift
import SwiftUI

struct DailyRatesView: View {
    @StateObject private var viewModel = DailyRatesViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else if let error = viewModel.errorMessage {
                        ErrorView(message: error) {
                            viewModel.fetchTodayRate()
                        }
                    } else if let todayRate = viewModel.todayRate {
                        DailyRatesCard(rate: todayRate)
                    } else {
                        EmptyRatesView()
                    }
                }
                .padding()
            }
            .navigationTitle("Daily Rates")
            .refreshable {
                viewModel.fetchTodayRate()
            }
        }
        .onAppear {
            viewModel.fetchTodayRate()
        }
    }
}

struct DailyRatesCard: View {
    let rate: DailyRate

    private let assets: [(code: String, name: String, color: Color)] = [
        ("BTC", "Bitcoin", .orange),
        ("ETH", "Ethereum", .blue),
        ("SOL", "Solana", .purple),
        ("USDT", "Tether", .green),
        ("USDC", "USD Coin", .blue),
        ("EURC", "Euro Coin", .blue)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Today's Rates")
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                Text(rate.rateDate.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Rates
            ForEach(assets, id: \\.code) { asset in
                HStack {
                    Circle()
                        .fill(asset.color)
                        .frame(width: 8, height: 8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(asset.code)
                            .font(.headline)
                        Text(asset.name)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Text("$\\(formatRate(rate.rate(for: asset.code)))")
                        .font(.headline)
                        .monospacedDigit()
                }
                .padding(.vertical, 4)
            }

            // Notes
            if let notes = rate.notes, !notes.isEmpty {
                Divider()
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func formatRate(_ rate: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: rate as NSNumber) ?? "0.00"
    }
}

struct EmptyRatesView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Rates Available")
                .font(.headline)

            Text("Daily rates will appear here when published by the admin")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.red)

            Text("Error Loading Rates")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button(action: retry) {
                Text("Try Again")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
    }
}
```

### 4. Add Push Notifications for Daily Rates

**Update:** `ios/IndigoInvestor/Services/NotificationService.swift` or similar

```swift
// Handle daily_rate notifications
func handleDailyRateNotification(_ notification: UNNotification) {
    let userInfo = notification.request.content.userInfo

    guard let rateDate = userInfo["rate_date"] as? String,
          let btcRate = userInfo["btc_rate"] as? Double else {
        return
    }

    // Update local data or trigger refresh
    NotificationCenter.default.post(
        name: NSNotification.Name("DailyRateReceived"),
        object: nil,
        userInfo: userInfo
    )
}

// Subscribe to daily_rate topic (if using Firebase/APNS topics)
func subscribeToDailyRates() {
    // Implementation depends on notification service used
    // Firebase: Messaging.messaging().subscribe(toTopic: "daily_rates")
    // APNS: Configure in app settings
}
```

### 5. Update SupabaseManager for Real-time Subscriptions

**File:** `ios/IndigoInvestor/Services/SupabaseManager.swift`

```swift
// Add daily_rates subscription
func subscribeToDailyRateUpdates() -> AnyPublisher<DailyRateUpdate, Never> {
    let subject = PassthroughSubject<DailyRateUpdate, Never>()

    let subscription = client
        .from("daily_rates")
        .on(.insert) { payload in
            subject.send(.added(payload))
        }
        .on(.update) { payload in
            subject.send(.updated(payload))
        }
        .subscribe()

    return subject.eraseToAnyPublisher()
}

enum DailyRateUpdate {
    case added(Any)
    case updated(Any)
}
```

---

## Summary of iOS Changes Required

### Files to Create:
1. `ios/IndigoInvestor/Models/DailyRate.swift` - Daily rate model
2. `ios/IndigoInvestor/ViewModels/DailyRatesViewModel.swift` - ViewModel
3. `ios/IndigoInvestor/Views/DailyRates/DailyRatesView.swift` - UI view

### Files to Modify:
1. `ios/IndigoInvestor/ViewModels/StatementViewModel.swift`
   - Change Statement model to MonthlyStatement
   - Update fetchStatements() to query investor_monthly_reports
   - Add asset filtering
   - Add investor_id lookup logic

2. `ios/IndigoInvestor/Views/Statements/StatementView.swift`
   - Update UI to display monthly statement fields
   - Show opening/closing/additions/withdrawals/yield
   - Calculate and display rate of return

3. `ios/IndigoInvestor/Services/SupabaseManager.swift`
   - Add subscribeToDailyRateUpdates() method

4. `ios/IndigoInvestor/Services/NotificationService.swift`
   - Add handleDailyRateNotification() method
   - Subscribe to daily_rate notifications

---

## Testing Checklist

### Monthly Statements:
- [ ] Investor can view historical statements (Jun 2024 - present)
- [ ] Filter by year works
- [ ] Filter by asset works (BTC, ETH, SOL, etc.)
- [ ] Statement details show all fields correctly
- [ ] Rate of return calculates correctly
- [ ] Empty state shows when no statements

### Daily Rates:
- [ ] Today's rates display when published by admin
- [ ] All 6 assets show correct rates
- [ ] Real-time updates work when admin publishes new rates
- [ ] Push notifications received when rates published
- [ ] Notes display if admin included them
- [ ] Empty state shows when no rates published

---

## Deployment Steps

1. **Database Migrations:**
   - Run `20251105000001_create_daily_rates.sql`
   - Run `20251105000002_extend_notifications_for_daily_rates.sql`

2. **iOS Build:**
   - Add new files to Xcode project
   - Update modified files
   - Update Info.plist if needed for notifications
   - Run tests
   - Archive and deploy

3. **Admin Testing:**
   - Enter daily rates via DailyRatesManagement.tsx
   - Click "Send Notification"
   - Verify iOS app receives notification
   - Verify rates display in app

4. **Investor Testing:**
   - Log in as test investor
   - Check statements page shows monthly data
   - Filter by year and asset
   - Check daily rates page shows today's rates
   - Verify push notification received

---

**End of iOS App Update Guide**
