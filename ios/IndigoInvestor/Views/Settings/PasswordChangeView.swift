//
//  PasswordChangeView.swift
//  IndigoInvestor
//
//  Screen for changing user password with comprehensive validation and security
//

import SwiftUI

struct PasswordChangeView: View {
    @StateObject private var viewModel = PasswordChangeViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl) {
                    // Header Info
                    HeaderSection()

                    // Current Password Field
                    CurrentPasswordSection(viewModel: viewModel)

                    // New Password Field
                    NewPasswordSection(viewModel: viewModel)

                    // Confirm Password Field
                    ConfirmPasswordSection(viewModel: viewModel)

                    // Password Strength Indicator
                    if !viewModel.newPassword.isEmpty {
                        PasswordStrengthSection(viewModel: viewModel)
                    }

                    // Validation Requirements
                    if !viewModel.newPassword.isEmpty {
                        ValidationRequirementsSection(viewModel: viewModel)
                    }

                    // Action Buttons
                    ActionButtonsSection(viewModel: viewModel, dismiss: dismiss)
                }
                .padding(IndigoTheme.Spacing.lg)
            }

            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay()
            }
        }
        .navigationTitle("Change Password")
        .navigationBarTitleDisplayMode(.large)
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK", role: .cancel) {
                dismiss()
            }
        } message: {
            Text(viewModel.successMessage)
        }
    }
}

// MARK: - Header Section
private struct HeaderSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 28))
                    .foregroundColor(IndigoTheme.Colors.primary)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Update Your Password")
                        .font(IndigoTheme.Typography.h3)
                        .foregroundColor(IndigoTheme.Colors.textPrimary)

                    Text("Choose a strong password to protect your account")
                        .font(IndigoTheme.Typography.caption)
                        .foregroundColor(IndigoTheme.Colors.textSecondary)
                }
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadius)
    }
}

// MARK: - Current Password Section
private struct CurrentPasswordSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("Current Password")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            PasswordField(
                text: $viewModel.currentPassword,
                placeholder: "Enter current password",
                showPassword: $viewModel.showCurrentPassword,
                onToggleVisibility: viewModel.toggleCurrentPasswordVisibility
            )
        }
    }
}

// MARK: - New Password Section
private struct NewPasswordSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("New Password")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            PasswordField(
                text: $viewModel.newPassword,
                placeholder: "Enter new password",
                showPassword: $viewModel.showNewPassword,
                onToggleVisibility: viewModel.toggleNewPasswordVisibility
            )
        }
    }
}

// MARK: - Confirm Password Section
private struct ConfirmPasswordSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text("Confirm New Password")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            PasswordField(
                text: $viewModel.confirmPassword,
                placeholder: "Re-enter new password",
                showPassword: $viewModel.showConfirmPassword,
                onToggleVisibility: viewModel.toggleConfirmPasswordVisibility
            )
        }
    }
}

// MARK: - Password Field Component
private struct PasswordField: View {
    @Binding var text: String
    let placeholder: String
    @Binding var showPassword: Bool
    let onToggleVisibility: () -> Void

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            // Password Input
            if showPassword {
                TextField(placeholder, text: $text)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
                    .textContentType(.password)
            } else {
                SecureField(placeholder, text: $text)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
                    .textContentType(.password)
            }

            // Visibility Toggle
            Button(action: onToggleVisibility) {
                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 18))
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: IndigoTheme.Layout.cornerRadius)
                .stroke(IndigoTheme.Colors.border, lineWidth: 1)
        )
    }
}

// MARK: - Password Strength Section
private struct PasswordStrengthSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            // Label
            HStack {
                Text("Password Strength")
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textPrimary)

                Spacer()

                Text(viewModel.passwordStrength.displayName)
                    .font(IndigoTheme.Typography.caption)
                    .foregroundColor(viewModel.passwordStrength.color)
                    .fontWeight(.semibold)
            }

            // Strength Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 4)
                        .fill(IndigoTheme.Colors.border)
                        .frame(height: 8)

                    // Progress
                    RoundedRectangle(cornerRadius: 4)
                        .fill(viewModel.passwordStrength.color)
                        .frame(
                            width: geometry.size.width * viewModel.passwordStrength.progress,
                            height: 8
                        )
                        .animation(.easeInOut(duration: 0.3), value: viewModel.passwordStrength)
                }
            }
            .frame(height: 8)
        }
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadius)
    }
}

// MARK: - Validation Requirements Section
private struct ValidationRequirementsSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Text("Password Requirements")
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textPrimary)

            VStack(spacing: IndigoTheme.Spacing.sm) {
                RequirementRow(
                    text: "At least 8 characters",
                    isMet: viewModel.hasMinLength
                )

                RequirementRow(
                    text: "Contains uppercase letter (A-Z)",
                    isMet: viewModel.hasUppercase
                )

                RequirementRow(
                    text: "Contains lowercase letter (a-z)",
                    isMet: viewModel.hasLowercase
                )

                RequirementRow(
                    text: "Contains number (0-9)",
                    isMet: viewModel.hasNumber
                )

                RequirementRow(
                    text: "Contains special character (!@#$...)",
                    isMet: viewModel.hasSpecialCharacter
                )

                RequirementRow(
                    text: "Different from current password",
                    isMet: viewModel.isDifferentFromCurrent
                )

                if !viewModel.confirmPassword.isEmpty {
                    RequirementRow(
                        text: "Passwords match",
                        isMet: viewModel.passwordsMatch
                    )
                }
            }
        }
        .padding(IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.surface)
        .cornerRadius(IndigoTheme.Layout.cornerRadius)
    }
}

// MARK: - Requirement Row Component
private struct RequirementRow: View {
    let text: String
    let isMet: Bool

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.sm) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 16))
                .foregroundColor(isMet ? Color.green : IndigoTheme.Colors.textSecondary)

            Text(text)
                .font(IndigoTheme.Typography.caption)
                .foregroundColor(isMet ? IndigoTheme.Colors.textPrimary : IndigoTheme.Colors.textSecondary)

            Spacer()
        }
    }
}

// MARK: - Action Buttons Section
private struct ActionButtonsSection: View {
    @ObservedObject var viewModel: PasswordChangeViewModel
    let dismiss: DismissAction

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.md) {
            // Save Button
            Button {
                Task {
                    await viewModel.updatePassword()
                }
            } label: {
                HStack(spacing: IndigoTheme.Spacing.sm) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 18))

                    Text("Update Password")
                        .font(IndigoTheme.Typography.body)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    viewModel.canSubmit ?
                    IndigoTheme.Colors.primary :
                    IndigoTheme.Colors.border
                )
                .cornerRadius(IndigoTheme.Layout.cornerRadius)
            }
            .disabled(!viewModel.canSubmit)

            // Cancel Button
            Button {
                dismiss()
            } label: {
                Text("Cancel")
                    .font(IndigoTheme.Typography.body)
                    .fontWeight(.semibold)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(IndigoTheme.Colors.surface)
                    .cornerRadius(IndigoTheme.Layout.cornerRadius)
                    .overlay(
                        RoundedRectangle(cornerRadius: IndigoTheme.Layout.cornerRadius)
                            .stroke(IndigoTheme.Colors.border, lineWidth: 1)
                    )
            }
        }
    }
}

// MARK: - Loading Overlay
private struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: IndigoTheme.Spacing.md) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text("Updating password...")
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(.white)
            }
            .padding(IndigoTheme.Spacing.xl)
            .background(IndigoTheme.Colors.surface)
            .cornerRadius(IndigoTheme.Layout.cornerRadius)
        }
    }
}

// MARK: - Preview
struct PasswordChangeView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            PasswordChangeView()
        }
    }
}
