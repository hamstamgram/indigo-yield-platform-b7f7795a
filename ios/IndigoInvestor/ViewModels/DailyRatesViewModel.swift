//
//  DailyRatesViewModel.swift
//  IndigoInvestor
//
//  ViewModel for managing daily cryptocurrency rates
//

import Foundation
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

            if !response.data.isEmpty {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                let rate = try decoder.decode(DailyRate.self, from: response.data)

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
                self.errorMessage = "Failed to load today's rates: \(error.localizedDescription)"
                print("Error loading today's rates: \(error)")
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

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let rates = try decoder.decode([DailyRate].self, from: response.data)

            await MainActor.run {
                self.dailyRates = rates
                if let latest = rates.first {
                    self.todayRate = latest
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to load rates: \(error.localizedDescription)"
                print("Error loading recent rates: \(error)")
            }
        }

        await MainActor.run {
            self.isLoading = false
        }
    }

    // MARK: - Refresh

    func refreshRates() {
        Task {
            await loadTodayRate()
            await loadRecentRates(days: 7)
        }
    }
}
