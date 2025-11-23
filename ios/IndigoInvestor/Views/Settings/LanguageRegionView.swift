//
//  LanguageRegionView.swift
//  IndigoInvestor
//
//  Complete language and region settings screen with formatting preferences
//

import SwiftUI

struct LanguageRegionView: View {
    @StateObject private var viewModel = LanguageRegionViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl) {
                    // Language Selection
                    LanguageSelectionSection(viewModel: viewModel)

                    // Region Selection
                    RegionSelectionSection(viewModel: viewModel)

                    // Currency Selection
                    CurrencySelectionSection(viewModel: viewModel)

                    // Date & Time Format
                    DateTimeFormatSection(viewModel: viewModel)

                    // Measurement System
                    MeasurementSystemSection(viewModel: viewModel)

                    // Preview Section
                    PreviewSection(viewModel: viewModel)
                }
                .padding(IndigoTheme.Spacing.lg)
            }

            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay()
            }
        }
        .navigationTitle("Language & Region")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await viewModel.loadSettings()
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.successMessage)
        }
    }
}

// MARK: - Language Selection Section

private struct LanguageSelectionSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Language",
                subtitle: "Select your preferred language"
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(AppLanguage.allCases) { language in
                    LanguageRow(
                        language: language,
                        isSelected: viewModel.selectedLanguage == language,
                        onSelect: {
                            Task {
                                await viewModel.updateLanguage(language)
                            }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Region Selection Section

private struct RegionSelectionSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Region",
                subtitle: "Select your region for localized content"
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(AppRegion.allCases) { region in
                    RegionRow(
                        region: region,
                        isSelected: viewModel.selectedRegion == region,
                        onSelect: {
                            Task {
                                await viewModel.updateRegion(region)
                            }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Currency Selection Section

private struct CurrencySelectionSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Currency",
                subtitle: "Your preferred currency for financial displays"
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(Currency.allCases) { currency in
                    CurrencyRow(
                        currency: currency,
                        isSelected: viewModel.selectedCurrency == currency,
                        onSelect: {
                            Task {
                                await viewModel.updateCurrency(currency)
                            }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Date & Time Format Section

private struct DateTimeFormatSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Date & Time",
                subtitle: "Customize date and time display formats"
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                // Date Format
                FormatPickerRow(
                    title: "Date Format",
                    icon: "calendar",
                    currentValue: viewModel.dateFormat.displayName,
                    example: viewModel.formattedDateExample
                ) {
                    Menu {
                        ForEach(DateFormatStyle.allCases) { format in
                            Button {
                                Task {
                                    await viewModel.updateDateFormat(format)
                                }
                            } label: {
                                HStack {
                                    Text(format.displayName)
                                    Text("(\(format.example))")
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: IndigoTheme.Spacing.xs) {
                            Text(viewModel.dateFormat.displayName)
                                .font(IndigoTheme.Typography.body)
                                .foregroundColor(IndigoTheme.Colors.textPrimary)

                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        }
                    }
                }

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Time Format
                FormatPickerRow(
                    title: "Time Format",
                    icon: "clock",
                    currentValue: viewModel.timeFormat.displayName,
                    example: viewModel.formattedTimeExample
                ) {
                    Menu {
                        ForEach(TimeFormatStyle.allCases) { format in
                            Button {
                                Task {
                                    await viewModel.updateTimeFormat(format)
                                }
                            } label: {
                                Text(format.displayName)
                            }
                        }
                    } label: {
                        HStack(spacing: IndigoTheme.Spacing.xs) {
                            Text(viewModel.timeFormat.displayName)
                                .font(IndigoTheme.Typography.body)
                                .foregroundColor(IndigoTheme.Colors.textPrimary)

                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        }
                    }
                }

                Divider()
                    .background(IndigoTheme.Colors.border)

                // First Day of Week
                FormatPickerRow(
                    title: "First Day of Week",
                    icon: "calendar.day.timeline.left",
                    currentValue: viewModel.firstDayOfWeek.displayName,
                    example: nil
                ) {
                    Menu {
                        ForEach(WeekDay.allCases) { day in
                            Button {
                                Task {
                                    await viewModel.updateFirstDayOfWeek(day)
                                }
                            } label: {
                                Text(day.displayName)
                            }
                        }
                    } label: {
                        HStack(spacing: IndigoTheme.Spacing.xs) {
                            Text(viewModel.firstDayOfWeek.displayName)
                                .font(IndigoTheme.Typography.body)
                                .foregroundColor(IndigoTheme.Colors.textPrimary)

                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Measurement System Section

private struct MeasurementSystemSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Measurement System",
                subtitle: "Units for displaying measurements"
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                ForEach(MeasurementSystem.allCases) { system in
                    MeasurementSystemRow(
                        system: system,
                        isSelected: viewModel.measurementSystem == system,
                        onSelect: {
                            Task {
                                await viewModel.updateMeasurementSystem(system)
                            }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Preview Section

private struct PreviewSection: View {
    @ObservedObject var viewModel: LanguageRegionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Preview",
                subtitle: "See how your preferences will appear"
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // Date Preview
                PreviewRow(
                    icon: "calendar",
                    title: "Date",
                    value: viewModel.formattedDateExample
                )

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Time Preview
                PreviewRow(
                    icon: "clock",
                    title: "Time",
                    value: viewModel.formattedTimeExample
                )

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Currency Preview
                PreviewRow(
                    icon: "dollarsign.circle",
                    title: "Currency",
                    value: viewModel.formattedCurrencyExample
                )
            }
            .padding(IndigoTheme.Spacing.md)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
    }
}

// MARK: - Reusable Components

private struct SectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
            Text(title)
                .font(IndigoTheme.Typography.h3)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            Text(subtitle)
                .font(IndigoTheme.Typography.caption)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
        }
    }
}

private struct LanguageRow: View {
    let language: AppLanguage
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // Flag Icon
                Text(language.icon)
                    .font(.system(size: 32))

                // Language Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(language.displayName)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text(language.nativeName)
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }

                Spacer()

                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(isSelected ? IndigoTheme.Colors.primaryLight : IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct RegionRow: View {
    let region: AppRegion
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // Flag Icon
                Text(region.icon)
                    .font(.system(size: 32))

                // Region Info
                Text(region.displayName)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                Spacer()

                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(isSelected ? IndigoTheme.Colors.primaryLight : IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct CurrencyRow: View {
    let currency: Currency
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // Currency Symbol
                Text(currency.symbol)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(IndigoTheme.Colors.primary)
                    .frame(width: 40, height: 40)
                    .background(IndigoTheme.Colors.primaryLight)
                    .cornerRadius(8)

                // Currency Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(currency.displayName)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text(currency.rawValue)
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }

                Spacer()

                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(isSelected ? IndigoTheme.Colors.primaryLight : IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct FormatPickerRow<Content: View>: View {
    let title: String
    let icon: String
    let currentValue: String
    let example: String?
    @ViewBuilder let picker: () -> Content

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 32, height: 32)
                .background(IndigoTheme.Colors.primaryLight)
                .cornerRadius(6)

            // Title and Example
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                if let example = example {
                    Text(example)
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
            }

            Spacer()

            // Picker
            picker()
        }
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadius)
    }
}

private struct MeasurementSystemRow: View {
    let system: MeasurementSystem
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // System Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(system.displayName)
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text(system.description)
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }

                Spacer()

                // Selection Indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(isSelected ? IndigoTheme.Colors.primaryLight : IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

private struct PreviewRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(IndigoTheme.Colors.primary)

            // Title
            Text(title)
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)

            Spacer()

            // Value
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(IndigoTheme.Colors.textPrimary)
        }
    }
}

private struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text("Updating...")
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(.white)
            }
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
            .shadow(radius: 10)
        }
    }
}

// MARK: - Preview

struct LanguageRegionView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            LanguageRegionView()
        }
    }
}
