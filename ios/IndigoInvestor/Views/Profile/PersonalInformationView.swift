//
//  PersonalInformationView.swift
//  IndigoInvestor
//
//  Edit personal information with validation and persistence
//

import SwiftUI

struct PersonalInformationView: View {
    @StateObject private var viewModel = PersonalInformationViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?

    enum Field: Hashable {
        case firstName, lastName, phone, email, address, city, state, zipCode, country, dateOfBirth
    }

    var body: some View {
        ZStack {
            // Background
            IndigoTheme.Colors.background
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: IndigoTheme.Spacing.xl2) {
                    // Form Sections
                    BasicInformationSection(
                        viewModel: viewModel,
                        focusedField: $focusedField
                    )

                    ContactInformationSection(
                        viewModel: viewModel,
                        focusedField: $focusedField
                    )

                    AddressSection(
                        viewModel: viewModel,
                        focusedField: $focusedField
                    )

                    PersonalDetailsSection(
                        viewModel: viewModel,
                        focusedField: $focusedField
                    )

                    // Save Button
                    SaveButtonSection(
                        viewModel: viewModel,
                        dismiss: dismiss
                    )
                }
                .padding(IndigoTheme.Spacing.xl)
                .padding(.bottom, IndigoTheme.Spacing.xl3)
            }

            // Loading Overlay
            if viewModel.isSaving {
                LoadingOverlay(message: "Saving changes...")
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") {
                    dismiss()
                }
                .foregroundColor(IndigoTheme.Colors.secondaryText)
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Your profile has been updated successfully.")
        }
        .task {
            await viewModel.loadProfile()
        }
    }
}

// MARK: - Basic Information Section
private struct BasicInformationSection: View {
    @ObservedObject var viewModel: PersonalInformationViewModel
    var focusedField: FocusState<PersonalInformationView.Field?>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Basic Information")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                FormField(
                    label: "First Name",
                    text: $viewModel.firstName,
                    placeholder: "Enter first name",
                    error: viewModel.firstNameError,
                    keyboardType: .default,
                    autocapitalization: .words
                )
                .focused(focusedField, equals: .firstName)
                .submitLabel(.next)
                .onSubmit {
                    focusedField.wrappedValue = .lastName
                }

                FormField(
                    label: "Last Name",
                    text: $viewModel.lastName,
                    placeholder: "Enter last name",
                    error: viewModel.lastNameError,
                    keyboardType: .default,
                    autocapitalization: .words
                )
                .focused(focusedField, equals: .lastName)
                .submitLabel(.next)
                .onSubmit {
                    focusedField.wrappedValue = .phone
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Contact Information Section
private struct ContactInformationSection: View {
    @ObservedObject var viewModel: PersonalInformationViewModel
    var focusedField: FocusState<PersonalInformationView.Field?>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Contact Information")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                FormField(
                    label: "Phone Number",
                    text: $viewModel.phone,
                    placeholder: "+1 (555) 123-4567",
                    error: viewModel.phoneError,
                    keyboardType: .phonePad
                )
                .focused(focusedField, equals: .phone)
                .onChange(of: viewModel.phone) { _, newValue in
                    viewModel.formatPhoneNumber(newValue)
                }

                VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                    FormField(
                        label: "Email Address",
                        text: $viewModel.email,
                        placeholder: "your@email.com",
                        error: viewModel.emailError,
                        keyboardType: .emailAddress,
                        autocapitalization: .never
                    )
                    .focused(focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField.wrappedValue = .address
                    }

                    if viewModel.emailChanged {
                        HStack(spacing: IndigoTheme.Spacing.sm) {
                            Image(systemName: "info.circle.fill")
                                .font(.caption)
                                .foregroundColor(IndigoTheme.Colors.warning)

                            Text("Changing your email will require verification")
                                .font(IndigoTheme.Typography.caption1)
                                .foregroundColor(IndigoTheme.Colors.warning)
                        }
                        .padding(IndigoTheme.Spacing.md)
                        .background(IndigoTheme.Colors.warning.opacity(IndigoTheme.Opacity.level5))
                        .cornerRadius(IndigoTheme.CornerRadius.md)
                    }
                }
            }
        }
        .cardStyle()
    }
}

// MARK: - Address Section
private struct AddressSection: View {
    @ObservedObject var viewModel: PersonalInformationViewModel
    var focusedField: FocusState<PersonalInformationView.Field?>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Address")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                FormField(
                    label: "Street Address",
                    text: $viewModel.address,
                    placeholder: "123 Main Street",
                    error: viewModel.addressError,
                    keyboardType: .default,
                    autocapitalization: .words,
                    multiline: true
                )
                .focused(focusedField, equals: .address)

                FormField(
                    label: "City",
                    text: $viewModel.city,
                    placeholder: "San Francisco",
                    error: viewModel.cityError,
                    keyboardType: .default,
                    autocapitalization: .words
                )
                .focused(focusedField, equals: .city)
                .submitLabel(.next)
                .onSubmit {
                    focusedField.wrappedValue = .state
                }

                HStack(spacing: IndigoTheme.Spacing.lg) {
                    FormField(
                        label: "State/Province",
                        text: $viewModel.state,
                        placeholder: "CA",
                        error: viewModel.stateError,
                        keyboardType: .default,
                        autocapitalization: .allCharacters
                    )
                    .focused(focusedField, equals: .state)
                    .submitLabel(.next)
                    .onSubmit {
                        focusedField.wrappedValue = .zipCode
                    }

                    FormField(
                        label: "ZIP/Postal Code",
                        text: $viewModel.zipCode,
                        placeholder: "94102",
                        error: viewModel.zipCodeError,
                        keyboardType: .numberPad
                    )
                    .focused(focusedField, equals: .zipCode)
                }

                CountryPicker(
                    label: "Country",
                    selection: $viewModel.country,
                    error: viewModel.countryError
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Personal Details Section
private struct PersonalDetailsSection: View {
    @ObservedObject var viewModel: PersonalInformationViewModel
    var focusedField: FocusState<PersonalInformationView.Field?>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.lg) {
            SectionHeader(title: "Personal Details")

            VStack(spacing: IndigoTheme.Spacing.lg) {
                DatePickerField(
                    label: "Date of Birth",
                    selection: $viewModel.dateOfBirth,
                    error: viewModel.dateOfBirthError
                )
            }
        }
        .cardStyle()
    }
}

// MARK: - Save Button Section
private struct SaveButtonSection: View {
    @ObservedObject var viewModel: PersonalInformationViewModel
    let dismiss: DismissAction

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            Button {
                Task {
                    await viewModel.saveChanges()
                }
            } label: {
                HStack {
                    if viewModel.isSaving {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Save Changes")
                            .font(IndigoTheme.Typography.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(IndigoTheme.Spacing.lg)
                .background(viewModel.isValid ? IndigoTheme.Colors.primary : IndigoTheme.Colors.gray300)
                .foregroundColor(.white)
                .cornerRadius(IndigoTheme.CornerRadius.xl)
            }
            .disabled(!viewModel.isValid || viewModel.isSaving)

            Button {
                dismiss()
            } label: {
                Text("Cancel")
                    .font(IndigoTheme.Typography.callout)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)
                    .frame(maxWidth: .infinity)
                    .padding(IndigoTheme.Spacing.lg)
            }
        }
    }
}

// MARK: - Reusable Components

private struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(IndigoTheme.Colors.primaryText)
    }
}

private struct FormField: View {
    let label: String
    @Binding var text: String
    let placeholder: String
    let error: String?
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var multiline: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text(label)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Group {
                if multiline {
                    TextEditor(text: $text)
                        .frame(minHeight: 80)
                        .padding(IndigoTheme.Spacing.md)
                        .background(IndigoTheme.Colors.secondaryBackground)
                        .cornerRadius(IndigoTheme.CornerRadius.lg)
                        .overlay(
                            RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.lg)
                                .stroke(error != nil ? IndigoTheme.Colors.error : IndigoTheme.Colors.border, lineWidth: 1)
                        )
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                        .textInputAutocapitalization(autocapitalization)
                        .autocorrectionDisabled()
                        .padding(IndigoTheme.Spacing.lg)
                        .background(IndigoTheme.Colors.secondaryBackground)
                        .cornerRadius(IndigoTheme.CornerRadius.lg)
                        .overlay(
                            RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.lg)
                                .stroke(error != nil ? IndigoTheme.Colors.error : IndigoTheme.Colors.border, lineWidth: 1)
                        )
                }
            }

            if let error = error {
                HStack(spacing: IndigoTheme.Spacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.caption)
                    Text(error)
                        .font(IndigoTheme.Typography.caption1)
                }
                .foregroundColor(IndigoTheme.Colors.error)
            }
        }
    }
}

private struct CountryPicker: View {
    let label: String
    @Binding var selection: String
    let error: String?

    private let countries = [
        "United States", "Canada", "United Kingdom", "Australia", "Germany",
        "France", "Spain", "Italy", "Japan", "South Korea", "Singapore",
        "Hong Kong", "Switzerland", "Netherlands", "Sweden", "Norway"
    ].sorted()

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text(label)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Menu {
                ForEach(countries, id: \.self) { country in
                    Button(country) {
                        selection = country
                    }
                }
            } label: {
                HStack {
                    Text(selection.isEmpty ? "Select country" : selection)
                        .foregroundColor(selection.isEmpty ? IndigoTheme.Colors.tertiaryText : IndigoTheme.Colors.primaryText)

                    Spacer()

                    Image(systemName: "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(IndigoTheme.Colors.tertiaryText)
                }
                .padding(IndigoTheme.Spacing.lg)
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.lg)
                .overlay(
                    RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.lg)
                        .stroke(error != nil ? IndigoTheme.Colors.error : IndigoTheme.Colors.border, lineWidth: 1)
                )
            }

            if let error = error {
                HStack(spacing: IndigoTheme.Spacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.caption)
                    Text(error)
                        .font(IndigoTheme.Typography.caption1)
                }
                .foregroundColor(IndigoTheme.Colors.error)
            }
        }
    }
}

private struct DatePickerField: View {
    let label: String
    @Binding var selection: Date
    let error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
            Text(label)
                .font(IndigoTheme.Typography.callout.weight(.medium))
                .foregroundColor(IndigoTheme.Colors.primaryText)

            DatePicker(
                "",
                selection: $selection,
                in: ...Date(),
                displayedComponents: .date
            )
            .datePickerStyle(.compact)
            .labelsHidden()
            .padding(IndigoTheme.Spacing.lg)
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.lg)
                    .stroke(error != nil ? IndigoTheme.Colors.error : IndigoTheme.Colors.border, lineWidth: 1)
            )

            if let error = error {
                HStack(spacing: IndigoTheme.Spacing.xs) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.caption)
                    Text(error)
                        .font(IndigoTheme.Typography.caption1)
                }
                .foregroundColor(IndigoTheme.Colors.error)
            }
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
        PersonalInformationView()
    }
}
