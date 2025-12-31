//
//  ProfileOverviewView.swift
//  IndigoInvestor
//
//  Complete user profile display with edit capabilities
//

import SwiftUI

struct ProfileOverviewView: View {
    @StateObject private var viewModel = ProfileOverviewViewModel()
    @State private var showingEdit = false
    @State private var showingImagePicker = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl3) {
                    // Profile Header
                    ProfileHeaderSection(
                        viewModel: viewModel,
                        showingImagePicker: $showingImagePicker
                    )

                    // Account Statistics
                    AccountStatsSection(viewModel: viewModel)

                    // Personal Information
                    PersonalInfoSection(viewModel: viewModel)

                    // Account Status
                    AccountStatusSection(viewModel: viewModel)

                    // Quick Actions
                    QuickActionsSection(
                        viewModel: viewModel,
                        showingEdit: $showingEdit
                    )
                }
                .padding(IndigoTheme.Spacing.xl)
            }

            // Loading Overlay
            if viewModel.isLoading {
                LoadingOverlay()
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingEdit = true
                } label: {
                    Image(systemName: "pencil.circle.fill")
                        .font(.title3)
                        .foregroundColor(IndigoTheme.Colors.primary)
                }
            }
        }
        .sheet(isPresented: $showingEdit) {
            NavigationStack {
                PersonalInformationView()
            }
        }
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(image: $viewModel.profileImage)
        }
        .task {
            await viewModel.loadProfile()
        }
    }
}

// MARK: - Profile Header Section
private struct ProfileHeaderSection: View {
    @ObservedObject var viewModel: ProfileOverviewViewModel
    @Binding var showingImagePicker: Bool

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.xl) {
            // Profile Picture
            ZStack(alignment: .bottomTrailing) {
                Group {
                    if let image = viewModel.profileImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                    } else {
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .foregroundColor(IndigoTheme.Colors.gray300)
                    }
                }
                .frame(width: 120, height: 120)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(IndigoTheme.Colors.primary, lineWidth: 3)
                )

                // Edit Button
                Button {
                    showingImagePicker = true
                } label: {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 32, height: 32)
                        .background(IndigoTheme.Colors.primary)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(IndigoTheme.Colors.background, lineWidth: 2)
                        )
                }
            }

            // Name and Email
            VStack(spacing: IndigoTheme.Spacing.sm) {
                Text(viewModel.profile?.fullName ?? "Loading...")
                    .font(IndigoTheme.Typography.title2)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(viewModel.profile?.email ?? "")
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                // Verification Badge
                if viewModel.profile?.emailVerified == true {
                    HStack(spacing: IndigoTheme.Spacing.sm) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundColor(IndigoTheme.Colors.success)
                        Text("Verified Account")
                            .font(IndigoTheme.Typography.caption1)
                            .foregroundColor(IndigoTheme.Colors.success)
                    }
                    .padding(.horizontal, IndigoTheme.Spacing.lg)
                    .padding(.vertical, IndigoTheme.Spacing.sm)
                    .background(IndigoTheme.Colors.success.opacity(IndigoTheme.Opacity.level10))
                    .cornerRadius(IndigoTheme.CornerRadius.full)
                }
            }
        }
    }
}

// MARK: - Account Stats Section
private struct AccountStatsSection: View {
    @ObservedObject var viewModel: ProfileOverviewViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            Text("Account Statistics")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            HStack(spacing: IndigoTheme.Spacing.lg) {
                StatCard(
                    icon: "calendar",
                    title: "Member Since",
                    value: viewModel.formattedJoinDate
                )

                StatCard(
                    icon: "dollarsign.circle",
                    title: "Total Invested",
                    value: viewModel.formattedTotalInvested
                )
            }

            HStack(spacing: IndigoTheme.Spacing.lg) {
                StatCard(
                    icon: "arrow.up.right.circle",
                    title: "Active Positions",
                    value: "\(viewModel.profile?.activePositions ?? 0)"
                )

                StatCard(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Total Returns",
                    value: viewModel.formattedTotalReturns,
                    valueColor: (viewModel.profile?.totalReturns ?? 0) >= 0 ?
                        IndigoTheme.Colors.success : IndigoTheme.Colors.error
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Personal Info Section
private struct PersonalInfoSection: View {
    @ObservedObject var viewModel: ProfileOverviewViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            Text("Personal Information")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            VStack(spacing: IndigoTheme.Spacing.lg) {
                InfoRow(
                    icon: "phone.fill",
                    label: "Phone",
                    value: viewModel.profile?.phone ?? "Not provided"
                )

                InfoRow(
                    icon: "location.fill",
                    label: "Address",
                    value: viewModel.formattedAddress
                )

                InfoRow(
                    icon: "flag.fill",
                    label: "Country",
                    value: viewModel.profile?.country ?? "Not specified"
                )

                InfoRow(
                    icon: "calendar.badge.clock",
                    label: "Date of Birth",
                    value: viewModel.formattedDateOfBirth
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Account Status Section
private struct AccountStatusSection: View {
    @ObservedObject var viewModel: ProfileOverviewViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            Text("Account Status")
                .font(IndigoTheme.Typography.headline)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            VStack(spacing: IndigoTheme.Spacing.md) {
                ProfileStatusBadge(
                    icon: "checkmark.shield.fill",
                    title: "KYC Verification",
                    status: viewModel.profile?.kycVerified == true ? "Verified" : "Pending",
                    isPositive: viewModel.profile?.kycVerified == true
                )

                ProfileStatusBadge(
                    icon: "lock.shield.fill",
                    title: "Two-Factor Authentication",
                    status: viewModel.profile?.has2FA == true ? "Enabled" : "Disabled",
                    isPositive: viewModel.profile?.has2FA == true
                )

                ProfileStatusBadge(
                    icon: "faceid",
                    title: "Biometric Login",
                    status: viewModel.profile?.hasBiometric == true ? "Enabled" : "Disabled",
                    isPositive: viewModel.profile?.hasBiometric == true
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Quick Actions Section
private struct QuickActionsSection: View {
    @ObservedObject var viewModel: ProfileOverviewViewModel
    @Binding var showingEdit: Bool

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            ActionButton(
                icon: "person.fill",
                title: "Edit Profile",
                subtitle: "Update your personal information",
                action: { showingEdit = true }
            )

            NavigationLink {
                SecuritySettingsView()
            } label: {
                ActionButtonLabel(
                    icon: "lock.shield.fill",
                    title: "Security Settings",
                    subtitle: "Manage your account security"
                )
            }

            NavigationLink {
                NotificationPreferencesView()
            } label: {
                ActionButtonLabel(
                    icon: "bell.fill",
                    title: "Notification Preferences",
                    subtitle: "Configure your alerts and notifications"
                )
            }
        }
    }
}

// MARK: - Reusable Components
private struct StatCard: View {
    let icon: String
    let title: String
    let value: String
    var valueColor: Color = IndigoTheme.Colors.primaryText

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(IndigoTheme.Colors.primary)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(title)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Text(value)
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(valueColor)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(IndigoTheme.Spacing.lg)
        .background(IndigoTheme.Colors.secondaryBackground)
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct InfoRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(label)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Text(value)
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            Spacer()
        }
    }
}

private struct ProfileStatusBadge: View {
    let icon: String
    let title: String
    let status: String
    let isPositive: Bool

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(isPositive ? IndigoTheme.Colors.success : IndigoTheme.Colors.warning)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(title)
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(status)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(isPositive ? IndigoTheme.Colors.success : IndigoTheme.Colors.warning)
            }

            Spacer()

            Image(systemName: isPositive ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                .font(.title3)
                .foregroundColor(isPositive ? IndigoTheme.Colors.success : IndigoTheme.Colors.warning)
        }
        .padding(IndigoTheme.Spacing.lg)
        .background(
            (isPositive ? IndigoTheme.Colors.success : IndigoTheme.Colors.warning)
                .opacity(IndigoTheme.Opacity.level5)
        )
        .cornerRadius(IndigoTheme.CornerRadius.lg)
    }
}

private struct ActionButton: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ActionButtonLabel(icon: icon, title: title, subtitle: subtitle)
        }
    }
}

private struct ActionButtonLabel: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(IndigoTheme.Colors.primary)
                .frame(width: 44, height: 44)
                .background(IndigoTheme.Colors.primary.opacity(IndigoTheme.Opacity.level10))
                .cornerRadius(IndigoTheme.CornerRadius.lg)

            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.xs) {
                Text(title)
                    .font(IndigoTheme.Typography.callout.weight(.semibold))
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(subtitle)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundColor(IndigoTheme.Colors.tertiaryText)
        }
        .padding(IndigoTheme.Spacing.lg)
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

private struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(IndigoTheme.Opacity.level30)
                .ignoresSafeArea()

            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .scaleEffect(1.5)
                .padding(IndigoTheme.Spacing.xl3)
                .background(IndigoTheme.Colors.primary)
                .cornerRadius(IndigoTheme.CornerRadius.xl)
        }
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.editedImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }
    }
}

// MARK: - Preview
#Preview {
    NavigationStack {
        ProfileOverviewView()
    }
}
