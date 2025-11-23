//
//  BiometricSettingsView.swift
//  IndigoInvestor
//
//  Biometric authentication settings with Face ID/Touch ID configuration
//

import SwiftUI

struct BiometricSettingsView: View {
    @StateObject private var viewModel = BiometricSettingsViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showingTestResult = false
    @State private var testSuccess = false

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl2) {
                    // Biometric Status Section
                    BiometricStatusSection(viewModel: viewModel)

                    // Biometric Toggle Section
                    if viewModel.biometricAuthManager.isAvailable {
                        BiometricToggleSection(viewModel: viewModel)

                        // Test Authentication Section
                        if viewModel.biometricEnabled {
                            TestAuthenticationSection(
                                viewModel: viewModel,
                                showingTestResult: $showingTestResult,
                                testSuccess: $testSuccess
                            )
                        }

                        // Fallback PIN Section
                        FallbackPINSection(viewModel: viewModel)

                        // Security Preferences Section
                        SecurityPreferencesSection(viewModel: viewModel)
                    } else {
                        // Not Available Section
                        BiometricNotAvailableSection()
                    }
                }
                .padding(IndigoTheme.Spacing.xl)
                .padding(.bottom, IndigoTheme.Spacing.xl3)
            }

            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay(message: "Updating settings...")
            }
        }
        .navigationTitle("Biometric Settings")
        .navigationBarTitleDisplayMode(.large)
        .alert("Test Authentication", isPresented: $showingTestResult) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(testSuccess ? "Biometric authentication successful!" : "Authentication failed. Please try again.")
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
        .task {
            await viewModel.loadSettings()
        }
    }
}

// MARK: - Biometric Status Section

private struct BiometricStatusSection: View {
    @ObservedObject var viewModel: BiometricSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Biometric Status", icon: "checkmark.shield.fill")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Availability Status
                StatusRow(
                    icon: viewModel.biometricAuthManager.isAvailable ? "checkmark.circle.fill" : "xmark.circle.fill",
                    iconColor: viewModel.biometricAuthManager.isAvailable ? IndigoTheme.Colors.success : IndigoTheme.Colors.error,
                    title: "Device Support",
                    value: viewModel.biometricAuthManager.isAvailable ? "Available" : "Not Available"
                )

                // Biometric Type
                if viewModel.biometricAuthManager.isAvailable {
                    StatusRow(
                        icon: viewModel.biometricAuthManager.biometricImage,
                        iconColor: IndigoTheme.Colors.primary,
                        title: "Biometric Type",
                        value: viewModel.biometricAuthManager.biometricName
                    )
                }

                // Enabled Status
                StatusRow(
                    icon: viewModel.biometricEnabled ? "lock.shield.fill" : "lock.open.fill",
                    iconColor: viewModel.biometricEnabled ? IndigoTheme.Colors.primary : IndigoTheme.Colors.gray500,
                    title: "Authentication Status",
                    value: viewModel.biometricEnabled ? "Enabled" : "Disabled"
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Biometric Toggle Section

private struct BiometricToggleSection: View {
    @ObservedObject var viewModel: BiometricSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Enable Biometric Authentication", icon: viewModel.biometricAuthManager.biometricImage)

            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Main Toggle
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("Use \(viewModel.biometricAuthManager.biometricName)")
                            .font(IndigoTheme.Typography.callout.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.primaryText)

                        Text("Unlock the app using \(viewModel.biometricAuthManager.biometricName) for faster and more secure access")
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer()

                    Toggle("", isOn: Binding(
                        get: { viewModel.biometricEnabled },
                        set: { newValue in
                            Task {
                                await viewModel.toggleBiometric(newValue)
                            }
                        }
                    ))
                    .labelsHidden()
                    .tint(IndigoTheme.Colors.primary)
                    .disabled(viewModel.isLoading)
                }
                .padding(IndigoTheme.Spacing.lg)
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.lg)

                // Info Box
                if viewModel.biometricEnabled {
                    InfoBox(
                        icon: "info.circle.fill",
                        message: "Your biometric data is stored securely on your device and never shared with our servers"
                    )
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Test Authentication Section

private struct TestAuthenticationSection: View {
    @ObservedObject var viewModel: BiometricSettingsViewModel
    @Binding var showingTestResult: Bool
    @Binding var testSuccess: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Test Authentication", icon: "checkmark.shield.fill")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                Text("Test your biometric authentication to ensure it's working correctly")
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)

                Button {
                    Task {
                        let success = await viewModel.testAuthentication()
                        testSuccess = success
                        showingTestResult = true
                    }
                } label: {
                    HStack {
                        Image(systemName: viewModel.biometricAuthManager.biometricImage)
                            .font(.title3)

                        Text("Test \(viewModel.biometricAuthManager.biometricName)")
                            .font(IndigoTheme.Typography.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(IndigoTheme.Spacing.lg)
                    .background(IndigoTheme.Colors.primary)
                    .foregroundColor(.white)
                    .cornerRadius(IndigoTheme.CornerRadius.xl)
                }
                .disabled(viewModel.isLoading)
            }
        }
        .cardStyle()
    }
}

// MARK: - Fallback PIN Section

private struct FallbackPINSection: View {
    @ObservedObject var viewModel: BiometricSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Fallback Security", icon: "key.fill")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Device Passcode
                HStack {
                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                        Text("Device Passcode")
                            .font(IndigoTheme.Typography.callout.weight(.semibold))
                            .foregroundColor(IndigoTheme.Colors.primaryText)

                        Text("Use your device passcode as a fallback authentication method")
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer()

                    Toggle("", isOn: $viewModel.allowPasscodeFallback)
                        .labelsHidden()
                        .tint(IndigoTheme.Colors.primary)
                        .disabled(viewModel.isLoading)
                        .onChange(of: viewModel.allowPasscodeFallback) { _, newValue in
                            Task {
                                await viewModel.updatePasscodeFallback(newValue)
                            }
                        }
                }
                .padding(IndigoTheme.Spacing.lg)
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.lg)

                // Info Box
                InfoBox(
                    icon: "exclamationmark.triangle.fill",
                    iconColor: IndigoTheme.Colors.warning,
                    message: "If biometric authentication fails, you'll be prompted to enter your device passcode"
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Security Preferences Section

private struct SecurityPreferencesSection: View {
    @ObservedObject var viewModel: BiometricSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Security Preferences", icon: "gearshape.fill")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                // Require Biometric on Launch
                PreferenceRow(
                    icon: "arrow.clockwise",
                    title: "Require on Launch",
                    description: "Always require authentication when opening the app",
                    isOn: $viewModel.requireOnLaunch
                )
                .onChange(of: viewModel.requireOnLaunch) { _, newValue in
                    Task {
                        await viewModel.updateRequireOnLaunch(newValue)
                    }
                }

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Require for Transactions
                PreferenceRow(
                    icon: "dollarsign.circle",
                    title: "Require for Transactions",
                    description: "Authenticate before executing any transaction",
                    isOn: $viewModel.requireForTransactions
                )
                .onChange(of: viewModel.requireForTransactions) { _, newValue in
                    Task {
                        await viewModel.updateRequireForTransactions(newValue)
                    }
                }

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Require for Settings Changes
                PreferenceRow(
                    icon: "gearshape.2",
                    title: "Require for Settings",
                    description: "Authenticate before changing security settings",
                    isOn: $viewModel.requireForSettings
                )
                .onChange(of: viewModel.requireForSettings) { _, newValue in
                    Task {
                        await viewModel.updateRequireForSettings(newValue)
                    }
                }

                Divider()
                    .background(IndigoTheme.Colors.border)

                // Auto-Lock Timeout
                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                    HStack {
                        Image(systemName: "clock")
                            .font(.title3)
                            .foregroundColor(IndigoTheme.Colors.primary)
                            .frame(width: 32)

                        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                            Text("Auto-Lock Timeout")
                                .font(IndigoTheme.Typography.callout.weight(.semibold))
                                .foregroundColor(IndigoTheme.Colors.primaryText)

                            Text("Lock app after inactivity")
                                .font(IndigoTheme.Typography.caption1)
                                .foregroundColor(IndigoTheme.Colors.secondaryText)
                        }

                        Spacer()

                        Menu {
                            ForEach(viewModel.timeoutOptions, id: \.self) { option in
                                Button(viewModel.timeoutLabel(for: option)) {
                                    Task {
                                        await viewModel.updateAutoLockTimeout(option)
                                    }
                                }
                            }
                        } label: {
                            HStack(spacing: IndigoTheme.Spacing.xs) {
                                Text(viewModel.timeoutLabel(for: viewModel.autoLockTimeout))
                                    .font(IndigoTheme.Typography.callout.weight(.medium))
                                    .foregroundColor(IndigoTheme.Colors.primary)

                                Image(systemName: "chevron.down")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(IndigoTheme.Colors.primary)
                            }
                        }
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Biometric Not Available Section

private struct BiometricNotAvailableSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Not Available", icon: "exclamationmark.triangle.fill", color: IndigoTheme.Colors.warning)

            VStack(spacing: IndigoTheme.Spacing.xl) {
                Image(systemName: "faceid.slash")
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.Colors.gray500)

                VStack(spacing: IndigoTheme.Spacing.sm) {
                    Text("Biometric Authentication Not Available")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)
                        .multilineTextAlignment(.center)

                    Text("This device doesn't support Face ID or Touch ID, or biometric authentication is not set up.")
                        .font(IndigoTheme.Typography.body)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
                    Text("To enable biometric authentication:")
                        .font(IndigoTheme.Typography.callout.weight(.semibold))
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                        InstructionRow(number: 1, text: "Open the Settings app")
                        InstructionRow(number: 2, text: "Tap Face ID & Passcode (or Touch ID & Passcode)")
                        InstructionRow(number: 3, text: "Set up Face ID or Touch ID")
                        InstructionRow(number: 4, text: "Return to this app")
                    }
                }
                .padding(IndigoTheme.Spacing.lg)
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.lg)
            }
            .frame(maxWidth: .infinity)
        }
        .cardStyle()
    }
}

// MARK: - Reusable Components

private struct SectionHeader: View {
    let title: String
    let icon: String
    var color: Color = IndigoTheme.Colors.primary

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(title)
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)
        }
    }
}

private struct StatusRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(iconColor)
                .frame(width: 32)

            Text(title)
                .font(IndigoTheme.Typography.callout)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()

            Text(value)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.secondaryText)
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct PreferenceRow: View {
    let icon: String
    let title: String
    let description: String
    @Binding var isOn: Bool

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(title)
                    .font(IndigoTheme.Typography.callout.weight(.semibold))
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(description)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(IndigoTheme.Colors.primary)
        }
    }
}

private struct InfoBox: View {
    let icon: String
    var iconColor: Color = IndigoTheme.Colors.primary
    let message: String

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(iconColor)

            Text(message)
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(IndigoTheme.Spacing.md)
        .background(iconColor.opacity(IndigoTheme.Opacity.level5))
        .cornerRadius(IndigoTheme.CornerRadius.md)
    }
}

private struct InstructionRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            Text("\(number)")
                .font(IndigoTheme.Typography.callout.weight(.bold))
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(IndigoTheme.Colors.primary)
                .cornerRadius(12)

            Text(text)
                .font(IndigoTheme.Typography.callout)
                .foregroundColor(IndigoTheme.Colors.primaryText)
        }
    }
}

private struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            Color.black.opacity(IndigoTheme.Opacity.level30)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.lg) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text(message)
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(.white)
            }
            .padding(IndigoTheme.Spacing.xl3)
            .background(IndigoTheme.Colors.primary)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
        }
    }
}

// MARK: - Card Style Modifier

private extension View {
    func cardStyle() -> some View {
        self
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
            .shadow(
                color: IndigoTheme.Shadow.sm.color,
                radius: IndigoTheme.Shadow.sm.radius,
                x: IndigoTheme.Shadow.sm.x,
                y: IndigoTheme.Shadow.sm.y
            )
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        BiometricSettingsView()
    }
}
