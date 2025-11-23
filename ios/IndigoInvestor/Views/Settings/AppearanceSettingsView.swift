//
//  AppearanceSettingsView.swift
//  IndigoInvestor
//
//  Complete theme and display settings screen with live preview
//

import SwiftUI

struct AppearanceSettingsView: View {
    @StateObject private var viewModel = AppearanceSettingsViewModel()
    @Environment(\.colorScheme) private var systemColorScheme

    var body: some View {
        ZStack {
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl2) {
                    ThemeSelectionSection(viewModel: viewModel)
                    FontSizeSection(viewModel: viewModel)
                    AccentColorSection(viewModel: viewModel)
                    AccessibilitySection(viewModel: viewModel)
                    PreviewSection(viewModel: viewModel)
                }
                .padding(IndigoTheme.Spacing.xl)
            }

            if viewModel.isLoading {
                LoadingOverlay(message: "Updating settings...")
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
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
        .task {
            await viewModel.loadSettings()
        }
        .onChange(of: systemColorScheme) { newScheme in
            viewModel.systemColorScheme = newScheme
        }
        .onAppear {
            viewModel.systemColorScheme = systemColorScheme
        }
    }
}

// MARK: - Theme Selection Section
private struct ThemeSelectionSection: View {
    @ObservedObject var viewModel: AppearanceSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Theme",
                icon: "paintbrush.fill",
                color: IndigoTheme.Colors.primary
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                ForEach(AppTheme.allCases) { theme in
                    ThemeCard(
                        theme: theme,
                        isSelected: viewModel.selectedTheme == theme,
                        onSelect: {
                            Task {
                                await viewModel.updateTheme(theme)
                            }
                        }
                    )
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
    }
}

// MARK: - Font Size Section
private struct FontSizeSection: View {
    @ObservedObject var viewModel: AppearanceSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Text Size",
                icon: "textformat.size",
                color: IndigoTheme.Colors.success
            )

            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Font scale slider
                HStack(spacing: IndigoTheme.Spacing.md) {
                    Image(systemName: "textformat.size.smaller")
                        .font(.system(size: 14))
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                        .frame(width: 24)

                    Slider(
                        value: $viewModel.fontScale,
                        in: viewModel.fontScaleRange,
                        step: viewModel.fontScaleStep
                    ) { isEditing in
                        if !isEditing {
                            Task {
                                await viewModel.updateFontScale(viewModel.fontScale)
                            }
                        }
                    }
                    .accentColor(viewModel.accentColor.color)

                    Image(systemName: "textformat.size.larger")
                        .font(.system(size: 20))
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                        .frame(width: 24)
                }

                // Current scale indicator
                HStack {
                    Text("Current Size:")
                        .font(IndigoTheme.Typography.bodyRegular)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)

                    Spacer()

                    Text(viewModel.fontScaleLabel)
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.primary)
                }

                // Preview text
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                    Text("Preview")
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                        .textCase(.uppercase)

                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("The quick brown fox jumps")
                            .font(.system(size: 18 * viewModel.fontScale, weight: .semibold))
                            .foregroundColor(IndigoTheme.Colors.textPrimary)

                        Text("This is how your text will appear in the app")
                            .font(.system(size: 14 * viewModel.fontScale))
                            .foregroundColor(IndigoTheme.Colors.textSecondary)
                    }
                }
                .padding(IndigoTheme.Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(IndigoTheme.Colors.background)
                .cornerRadius(IndigoTheme.Layout.cornerRadiusSmall)

                // Reset button
                if viewModel.fontScale != 1.0 {
                    Button {
                        Task {
                            await viewModel.resetFontScale()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.counterclockwise")
                            Text("Reset to Default")
                        }
                        .font(IndigoTheme.Typography.bodyMedium)
                        .foregroundColor(IndigoTheme.Colors.primary)
                    }
                }
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
    }
}

// MARK: - Accent Color Section
private struct AccentColorSection: View {
    @ObservedObject var viewModel: AppearanceSettingsViewModel

    let columns = [
        GridItem(.adaptive(minimum: 60, maximum: 80), spacing: IndigoTheme.Spacing.md)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Accent Color",
                icon: "paintpalette.fill",
                color: IndigoTheme.Colors.warning
            )

            LazyVGrid(columns: columns, spacing: IndigoTheme.Spacing.md) {
                ForEach(AccentColorOption.allCases) { colorOption in
                    ColorCircle(
                        colorOption: colorOption,
                        isSelected: viewModel.accentColor == colorOption,
                        onSelect: {
                            Task {
                                await viewModel.updateAccentColor(colorOption)
                            }
                        }
                    )
                }
            }

            Text("This color will be used for highlights, buttons, and interactive elements")
                .font(IndigoTheme.Typography.caption)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
    }
}

// MARK: - Accessibility Section
private struct AccessibilitySection: View {
    @ObservedObject var viewModel: AppearanceSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Accessibility",
                icon: "accessibility",
                color: IndigoTheme.Colors.info
            )

            VStack(spacing: IndigoTheme.Spacing.sm) {
                AccessibilityToggle(
                    title: "Reduce Motion",
                    description: "Minimize animations and transitions",
                    isOn: Binding(
                        get: { viewModel.reduceMotion },
                        set: { newValue in
                            Task {
                                await viewModel.updateReduceMotion(newValue)
                            }
                        }
                    ),
                    accentColor: viewModel.accentColor.color
                )

                Divider()
                    .background(IndigoTheme.Colors.border)

                AccessibilityToggle(
                    title: "Increased Contrast",
                    description: "Enhance color contrast for better visibility",
                    isOn: Binding(
                        get: { viewModel.increasedContrast },
                        set: { newValue in
                            Task {
                                await viewModel.updateIncreasedContrast(newValue)
                            }
                        }
                    ),
                    accentColor: viewModel.accentColor.color
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
    }
}

// MARK: - Preview Section
private struct PreviewSection: View {
    @ObservedObject var viewModel: AppearanceSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            SectionHeader(
                title: "Preview",
                icon: "eye.fill",
                color: IndigoTheme.Colors.secondary
            )

            VStack(spacing: IndigoTheme.Spacing.md) {
                // Sample card with current settings
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                    HStack {
                        Circle()
                            .fill(viewModel.accentColor.color)
                            .frame(width: 40, height: 40)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Portfolio Performance")
                                .font(.system(size: 16 * viewModel.fontScale, weight: .semibold))
                                .foregroundColor(IndigoTheme.Colors.textPrimary)

                            Text("Last updated 5 minutes ago")
                                .font(.system(size: 12 * viewModel.fontScale))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(IndigoTheme.Colors.textTertiary)
                    }

                    Divider()
                        .background(IndigoTheme.Colors.border)

                    HStack(spacing: IndigoTheme.Spacing.lg) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Total Value")
                                .font(.system(size: 12 * viewModel.fontScale))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)

                            Text("$125,430")
                                .font(.system(size: 20 * viewModel.fontScale, weight: .bold))
                                .foregroundColor(IndigoTheme.Colors.textPrimary)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text("24h Change")
                                .font(.system(size: 12 * viewModel.fontScale))
                                .foregroundColor(IndigoTheme.Colors.textSecondary)

                            Text("+2.45%")
                                .font(.system(size: 16 * viewModel.fontScale, weight: .semibold))
                                .foregroundColor(viewModel.accentColor.color)
                        }
                    }

                    // Sample button
                    Button {} label: {
                        Text("View Details")
                            .font(.system(size: 14 * viewModel.fontScale, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(viewModel.accentColor.color)
                            .cornerRadius(IndigoTheme.Layout.cornerRadiusSmall)
                    }
                }
                .padding(IndigoTheme.Spacing.md)
                .background(IndigoTheme.Colors.surface)
                .cornerRadius(IndigoTheme.Layout.cornerRadiusSmall)

                Text("This is how cards and content will appear with your current settings")
                    .font(IndigoTheme.Typography.caption)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.background)
        .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
    }
}

// MARK: - Supporting Components

private struct SectionHeader: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(color)

            Text(title)
                .font(IndigoTheme.Typography.h3)
                .foregroundColor(IndigoTheme.Colors.textPrimary)
        }
    }
}

private struct ThemeCard: View {
    let theme: AppTheme
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(isSelected ? theme.color : IndigoTheme.Colors.background)
                        .frame(width: 48, height: 48)

                    Image(systemName: theme.icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(isSelected ? .white : IndigoTheme.Colors.textSecondary)
                }

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(theme.displayName)
                        .font(IndigoTheme.Typography.bodyBold)
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text(theme.description)
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }

                Spacer()

                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(IndigoTheme.Colors.success)
                }
            }
            .padding(IndigoTheme.Spacing.md)
            .background(isSelected ? IndigoTheme.Colors.background : IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadiusSmall)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.Layout.cornerRadiusSmall)
                    .stroke(isSelected ? IndigoTheme.Colors.primary : Color.clear, lineWidth: 2)
            )
        }
    }
}

private struct ColorCircle: View {
    let colorOption: AccentColorOption
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: IndigoTheme.Spacing.xs) {
                ZStack {
                    Circle()
                        .fill(colorOption.color)
                        .frame(width: 50, height: 50)

                    if isSelected {
                        Circle()
                            .stroke(.white, lineWidth: 3)
                            .frame(width: 50, height: 50)

                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                    }
                }

                Text(colorOption.displayName)
                    .font(.system(size: 11, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(IndigoTheme.Colors.textPrimary)
            }
        }
    }
}

private struct AccessibilityToggle: View {
    let title: String
    let description: String
    @Binding var isOn: Bool
    let accentColor: Color

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(IndigoTheme.Typography.bodyBold)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                Text(description)
                    .font(IndigoTheme.Typography.caption)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(accentColor)
        }
    }
}

private struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text(message)
                    .font(IndigoTheme.Typography.bodyMedium)
                    .foregroundColor(.white)
            }
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.surface.opacity(0.95))
            .cornerRadius(IndigoTheme.Layout.cornerRadiusMedium)
        }
    }
}

// MARK: - AppTheme Extension
extension AppTheme {
    var color: Color {
        switch self {
        case .light:
            return .yellow
        case .dark:
            return .purple
        case .system:
            return IndigoTheme.Colors.primary
        }
    }
}

// MARK: - Preview
struct AppearanceSettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            AppearanceSettingsView()
        }
    }
}
