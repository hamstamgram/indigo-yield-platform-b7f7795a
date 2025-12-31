//
//  AppearanceSettingsViewModel.swift
//  IndigoInvestor
//
//  ViewModel for AppearanceSettingsView with theme, font size, and color preferences
//

import SwiftUI
import Combine

@MainActor
final class AppearanceSettingsViewModel: ObservableObject {
    // MARK: - Published Properties

    // Theme Settings
    @Published var selectedTheme: AppTheme = .system
    @Published var systemColorScheme: ColorScheme = .light

    // Font Settings
    @Published var fontScale: Double = 1.0

    // Color Settings
    @Published var accentColor: AccentColorOption = .indigo

    // Accessibility Settings
    @Published var reduceMotion: Bool = false
    @Published var increasedContrast: Bool = false

    // System State
    @Published var isLoading: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var successMessage: String = ""

    // MARK: - Private Properties
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // Font scale options
    let fontScaleRange: ClosedRange<Double> = 0.8...1.3
    let fontScaleStep: Double = 0.05

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
    }

    // MARK: - Data Loading
    func loadSettings() async {
        isLoading = true

        do {
            // TODO: Load settings from Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase query:
            let settings = try await supabase
                .from("user_appearance_settings")
                .select()
                .eq("user_id", userId)
                .single()
                .execute()

            // Theme
            if let themeString = settings["theme"] as? String,
               let theme = AppTheme(rawValue: themeString) {
                selectedTheme = theme
            }

            // Font scale
            fontScale = settings["font_scale"] as? Double ?? 1.0

            // Accent color
            if let colorString = settings["accent_color"] as? String,
               let color = AccentColorOption(rawValue: colorString) {
                accentColor = color
            }

            // Accessibility
            reduceMotion = settings["reduce_motion"] as? Bool ?? false
            increasedContrast = settings["increased_contrast"] as? Bool ?? false
            */

            // Placeholder data
            selectedTheme = .system
            fontScale = 1.0
            accentColor = .indigo
            reduceMotion = false
            increasedContrast = false

            isLoading = false

        } catch {
            isLoading = false
            errorMessage = "Failed to load settings: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Theme Selection
    func updateTheme(_ theme: AppTheme) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_appearance_settings")
                .update(["theme": theme.rawValue])
                .eq("user_id", userId)
                .execute()
            */

            selectedTheme = theme

            isLoading = false

            successMessage = "Theme updated to \(theme.displayName)"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update theme: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Font Scale
    func updateFontScale(_ scale: Double) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 300_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_appearance_settings")
                .update(["font_scale": scale])
                .eq("user_id", userId)
                .execute()
            */

            fontScale = scale

            isLoading = false

            let percentage = Int((scale - 1.0) * 100)
            let sign = percentage > 0 ? "+" : ""
            successMessage = "Font size adjusted (\(sign)\(percentage)%)"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update font size: \(error.localizedDescription)"
            showError = true
        }
    }

    func resetFontScale() async {
        await updateFontScale(1.0)
    }

    // MARK: - Accent Color
    func updateAccentColor(_ color: AccentColorOption) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_appearance_settings")
                .update(["accent_color": color.rawValue])
                .eq("user_id", userId)
                .execute()
            */

            accentColor = color

            isLoading = false

            successMessage = "Accent color updated to \(color.displayName)"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update accent color: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Accessibility Settings
    func updateReduceMotion(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_appearance_settings")
                .update(["reduce_motion": enabled])
                .eq("user_id", userId)
                .execute()
            */

            reduceMotion = enabled

            isLoading = false

            successMessage = enabled ? "Reduce motion enabled" : "Reduce motion disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update reduce motion: \(error.localizedDescription)"
            showError = true
        }
    }

    func updateIncreasedContrast(_ enabled: Bool) async {
        isLoading = true

        do {
            // TODO: Update setting in Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            /*
            // Example Supabase update:
            try await supabase
                .from("user_appearance_settings")
                .update(["increased_contrast": enabled])
                .eq("user_id", userId)
                .execute()
            */

            increasedContrast = enabled

            isLoading = false

            successMessage = enabled ? "Increased contrast enabled" : "Increased contrast disabled"
            showSuccess = true

        } catch {
            isLoading = false
            errorMessage = "Failed to update increased contrast: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Helper Methods
    var effectiveColorScheme: ColorScheme {
        switch selectedTheme {
        case .light:
            return .light
        case .dark:
            return .dark
        case .system:
            return systemColorScheme
        }
    }

    var fontScalePercentage: Int {
        Int((fontScale - 1.0) * 100)
    }

    var fontScaleLabel: String {
        let percentage = fontScalePercentage
        if percentage == 0 {
            return "Default"
        } else if percentage > 0 {
            return "+\(percentage)%"
        } else {
            return "\(percentage)%"
        }
    }
}

// MARK: - Supporting Types

enum AppTheme: String, CaseIterable, Identifiable {
    case light = "light"
    case dark = "dark"
    case system = "system"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .light:
            return "Light"
        case .dark:
            return "Dark"
        case .system:
            return "System"
        }
    }

    var icon: String {
        switch self {
        case .light:
            return "sun.max.fill"
        case .dark:
            return "moon.fill"
        case .system:
            return "circle.lefthalf.filled"
        }
    }

    var description: String {
        switch self {
        case .light:
            return "Always use light mode"
        case .dark:
            return "Always use dark mode"
        case .system:
            return "Match your device settings"
        }
    }
}

enum AccentColorOption: String, CaseIterable, Identifiable {
    case indigo = "indigo"
    case blue = "blue"
    case purple = "purple"
    case pink = "pink"
    case red = "red"
    case orange = "orange"
    case yellow = "yellow"
    case green = "green"
    case teal = "teal"
    case cyan = "cyan"

    var id: String { rawValue }

    var displayName: String {
        rawValue.capitalized
    }

    var color: Color {
        switch self {
        case .indigo:
            return IndigoTheme.Colors.primary
        case .blue:
            return .blue
        case .purple:
            return .purple
        case .pink:
            return .pink
        case .red:
            return .red
        case .orange:
            return .orange
        case .yellow:
            return .yellow
        case .green:
            return .green
        case .teal:
            return .teal
        case .cyan:
            return .cyan
        }
    }
}
