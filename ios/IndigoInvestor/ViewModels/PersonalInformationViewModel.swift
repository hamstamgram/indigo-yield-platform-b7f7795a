//
//  PersonalInformationViewModel.swift
//  IndigoInvestor
//
//  ViewModel for PersonalInformationView with validation and data persistence
//

import SwiftUI
import Combine

@MainActor
final class PersonalInformationViewModel: ObservableObject {
    // MARK: - Published Form Fields
    @Published var firstName: String = ""
    @Published var lastName: String = ""
    @Published var phone: String = ""
    @Published var email: String = ""
    @Published var address: String = ""
    @Published var city: String = ""
    @Published var state: String = ""
    @Published var zipCode: String = ""
    @Published var country: String = ""
    @Published var dateOfBirth: Date = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()

    // MARK: - Validation Errors
    @Published var firstNameError: String?
    @Published var lastNameError: String?
    @Published var phoneError: String?
    @Published var emailError: String?
    @Published var addressError: String?
    @Published var cityError: String?
    @Published var stateError: String?
    @Published var zipCodeError: String?
    @Published var countryError: String?
    @Published var dateOfBirthError: String?

    // MARK: - State Management
    @Published var isSaving: Bool = false
    @Published var showError: Bool = false
    @Published var showSuccess: Bool = false
    @Published var errorMessage: String = ""
    @Published var isValid: Bool = false
    @Published var emailChanged: Bool = false

    // MARK: - Private Properties
    private var originalEmail: String = ""
    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol = ServiceContainer.shared.networkService) {
        self.networkService = networkService
        setupValidation()
    }

    // MARK: - Setup
    private func setupValidation() {
        // Validate all fields whenever any field changes
        Publishers.CombineLatest4(
            $firstName,
            $lastName,
            $phone,
            $email
        )
        .combineLatest(
            Publishers.CombineLatest4(
                $address,
                $city,
                $state,
                $zipCode
            )
        )
        .combineLatest($country, $dateOfBirth)
        .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
        .sink { [weak self] _ in
            self?.validateAllFields()
        }
        .store(in: &cancellables)

        // Track email changes
        $email
            .dropFirst()
            .sink { [weak self] newEmail in
                guard let self = self else { return }
                self.emailChanged = newEmail != self.originalEmail
            }
            .store(in: &cancellables)
    }

    // MARK: - Data Loading
    func loadProfile() async {
        do {
            // TODO: Load from Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 500_000_000)

            // Placeholder data - replace with actual Supabase query
            firstName = "John"
            lastName = "Doe"
            phone = "+1 (555) 123-4567"
            email = "john.doe@example.com"
            originalEmail = email
            address = "123 Main Street\nApt 4B"
            city = "San Francisco"
            state = "CA"
            zipCode = "94102"
            country = "United States"
            dateOfBirth = Calendar.current.date(from: DateComponents(year: 1990, month: 5, day: 15)) ?? Date()

        } catch {
            errorMessage = "Failed to load profile: \(error.localizedDescription)"
            showError = true
        }
    }

    // MARK: - Phone Number Formatting
    func formatPhoneNumber(_ number: String) {
        // Remove all non-numeric characters
        let cleaned = number.filter { $0.isNumber }

        // Limit to 10 digits (US format)
        let limited = String(cleaned.prefix(10))

        // Format as (XXX) XXX-XXXX
        var formatted = ""
        for (index, char) in limited.enumerated() {
            if index == 0 {
                formatted += "+1 ("
            }
            if index == 3 {
                formatted += ") "
            }
            if index == 6 {
                formatted += "-"
            }
            formatted.append(char)
        }

        phone = formatted
    }

    // MARK: - Validation
    private func validateAllFields() {
        validateFirstName()
        validateLastName()
        validatePhone()
        validateEmail()
        validateAddress()
        validateCity()
        validateState()
        validateZipCode()
        validateCountry()
        validateDateOfBirth()

        // Update overall validity
        isValid = firstNameError == nil &&
                  lastNameError == nil &&
                  phoneError == nil &&
                  emailError == nil &&
                  addressError == nil &&
                  cityError == nil &&
                  stateError == nil &&
                  zipCodeError == nil &&
                  countryError == nil &&
                  dateOfBirthError == nil &&
                  !firstName.isEmpty &&
                  !lastName.isEmpty
    }

    private func validateFirstName() {
        if firstName.isEmpty {
            firstNameError = "First name is required"
        } else if firstName.count < 2 {
            firstNameError = "First name must be at least 2 characters"
        } else if firstName.count > 50 {
            firstNameError = "First name is too long"
        } else {
            firstNameError = nil
        }
    }

    private func validateLastName() {
        if lastName.isEmpty {
            lastNameError = "Last name is required"
        } else if lastName.count < 2 {
            lastNameError = "Last name must be at least 2 characters"
        } else if lastName.count > 50 {
            lastNameError = "Last name is too long"
        } else {
            lastNameError = nil
        }
    }

    private func validatePhone() {
        if phone.isEmpty {
            phoneError = nil // Phone is optional
        } else {
            let cleaned = phone.filter { $0.isNumber }
            if cleaned.count < 10 {
                phoneError = "Phone number must be at least 10 digits"
            } else if cleaned.count > 15 {
                phoneError = "Phone number is too long"
            } else {
                phoneError = nil
            }
        }
    }

    private func validateEmail() {
        if email.isEmpty {
            emailError = "Email is required"
        } else {
            let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
            let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
            if !emailPredicate.evaluate(with: email) {
                emailError = "Invalid email format"
            } else {
                emailError = nil
            }
        }
    }

    private func validateAddress() {
        if address.isEmpty {
            addressError = nil // Address is optional
        } else if address.count < 5 {
            addressError = "Address must be at least 5 characters"
        } else if address.count > 200 {
            addressError = "Address is too long"
        } else {
            addressError = nil
        }
    }

    private func validateCity() {
        if city.isEmpty {
            cityError = nil // City is optional
        } else if city.count < 2 {
            cityError = "City name must be at least 2 characters"
        } else if city.count > 100 {
            cityError = "City name is too long"
        } else {
            cityError = nil
        }
    }

    private func validateState() {
        if state.isEmpty {
            stateError = nil // State is optional
        } else if state.count < 2 {
            stateError = "State must be at least 2 characters"
        } else if state.count > 50 {
            stateError = "State is too long"
        } else {
            stateError = nil
        }
    }

    private func validateZipCode() {
        if zipCode.isEmpty {
            zipCodeError = nil // ZIP code is optional
        } else {
            let cleaned = zipCode.filter { $0.isNumber || $0.isLetter }
            if cleaned.count < 3 {
                zipCodeError = "ZIP code must be at least 3 characters"
            } else if cleaned.count > 10 {
                zipCodeError = "ZIP code is too long"
            } else {
                zipCodeError = nil
            }
        }
    }

    private func validateCountry() {
        if country.isEmpty {
            countryError = nil // Country is optional
        } else {
            countryError = nil
        }
    }

    private func validateDateOfBirth() {
        let calendar = Calendar.current
        let ageComponents = calendar.dateComponents([.year], from: dateOfBirth, to: Date())

        if let age = ageComponents.year {
            if age < 18 {
                dateOfBirthError = "You must be at least 18 years old"
            } else if age > 120 {
                dateOfBirthError = "Invalid date of birth"
            } else {
                dateOfBirthError = nil
            }
        } else {
            dateOfBirthError = "Invalid date"
        }
    }

    // MARK: - Save Changes
    func saveChanges() async {
        guard isValid else { return }

        isSaving = true

        do {
            // Validate one more time before saving
            validateAllFields()
            guard isValid else {
                throw ValidationError.invalidData
            }

            // TODO: Save to Supabase
            // Simulate network call
            try await Task.sleep(nanoseconds: 1_500_000_000)

            /*
            // Example Supabase update:
            let updates: [String: Any] = [
                "first_name": firstName,
                "last_name": lastName,
                "phone": phone,
                "email": email,
                "address": address,
                "city": city,
                "state": state,
                "zip_code": zipCode,
                "country": country,
                "date_of_birth": ISO8601DateFormatter().string(from: dateOfBirth)
            ]

            try await supabase.from("profiles")
                .update(updates)
                .eq("id", userId)
                .execute()

            // If email changed, send verification email
            if emailChanged {
                try await supabase.auth.updateUser(
                    attributes: UserAttributes(email: email)
                )
            }
            */

            isSaving = false
            showSuccess = true

            // Update original email if it changed
            if emailChanged {
                originalEmail = email
                emailChanged = false
            }

        } catch {
            isSaving = false
            errorMessage = "Failed to save changes: \(error.localizedDescription)"
            showError = true
        }
    }
}

// MARK: - Validation Error
enum ValidationError: LocalizedError {
    case invalidData

    var errorDescription: String? {
        switch self {
        case .invalidData:
            return "Please correct the errors before saving"
        }
    }
}
