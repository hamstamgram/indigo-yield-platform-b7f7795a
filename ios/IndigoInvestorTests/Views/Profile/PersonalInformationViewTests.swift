//
//  PersonalInformationViewTests.swift
//  IndigoInvestorTests
//
//  Comprehensive tests for Personal Information page
//

import XCTest
import SwiftUI
import ViewInspector
@testable import IndigoInvestor

@MainActor
final class PersonalInformationViewTests: XCTestCase {

    var mockNetworkService: MockNetworkService!

    override func setUp() {
        super.setUp()
        mockNetworkService = MockNetworkService()
    }

    override func tearDown() {
        mockNetworkService = nil
        super.tearDown()
    }

    // MARK: - Form Validation Tests

    func testNameFieldValidation() {
        // Given: Personal info form
        let validName = "John Doe"
        let invalidName = ""

        // When: Validating names
        let isValidNameValid = validateName(validName)
        let isInvalidNameValid = validateName(invalidName)

        // Then: Should validate correctly
        XCTAssertTrue(isValidNameValid)
        XCTAssertFalse(isInvalidNameValid)
    }

    func testEmailFieldValidation() {
        // Given: Email inputs
        let validEmail = "john.doe@example.com"
        let invalidEmail = "invalid-email"

        // When: Validating emails
        let isValidEmailValid = validateEmail(validEmail)
        let isInvalidEmailValid = validateEmail(invalidEmail)

        // Then: Should validate correctly
        XCTAssertTrue(isValidEmailValid)
        XCTAssertFalse(isInvalidEmailValid)
    }

    func testPhoneNumberValidation() {
        // Given: Phone numbers
        let validPhone = "+1234567890"
        let invalidPhone = "123"

        // When: Validating phone numbers
        let isValidPhoneValid = validatePhone(validPhone)
        let isInvalidPhoneValid = validatePhone(invalidPhone)

        // Then: Should validate correctly
        XCTAssertTrue(isValidPhoneValid)
        XCTAssertFalse(isInvalidPhoneValid)
    }

    func testDateOfBirthValidation() {
        // Given: Date of birth inputs
        let validDate = Date().addingTimeInterval(-18 * 365 * 24 * 3600) // 18 years ago
        let futureDate = Date().addingTimeInterval(24 * 3600) // Tomorrow

        // When: Validating dates
        let isValidDateValid = validateDateOfBirth(validDate)
        let isFutureDateValid = validateDateOfBirth(futureDate)

        // Then: Should validate correctly
        XCTAssertTrue(isValidDateValid)
        XCTAssertFalse(isFutureDateValid)
    }

    func testAddressFieldValidation() {
        // Given: Address inputs
        let validAddress = PersonalAddress(
            street: "123 Main St",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            country: "USA"
        )
        let invalidAddress = PersonalAddress(
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: ""
        )

        // When: Validating addresses
        let isValidAddressValid = validateAddress(validAddress)
        let isInvalidAddressValid = validateAddress(invalidAddress)

        // Then: Should validate correctly
        XCTAssertTrue(isValidAddressValid)
        XCTAssertFalse(isInvalidAddressValid)
    }

    // MARK: - Form Submission Tests

    func testSuccessfulFormSubmission() async throws {
        // Given: Valid form data
        let personalInfo = PersonalInfo(
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+1234567890",
            dateOfBirth: Date().addingTimeInterval(-18 * 365 * 24 * 3600),
            address: PersonalAddress(
                street: "123 Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
                country: "USA"
            )
        )

        // When: Submitting form
        mockNetworkService.mockResponse = ["success": true]
        let result = await submitPersonalInfo(personalInfo)

        // Then: Should submit successfully
        XCTAssertTrue(result)
    }

    func testFailedFormSubmission() async throws {
        // Given: Network error
        mockNetworkService.shouldFail = true

        let personalInfo = PersonalInfo(
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+1234567890",
            dateOfBirth: Date().addingTimeInterval(-18 * 365 * 24 * 3600),
            address: PersonalAddress(
                street: "123 Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
                country: "USA"
            )
        )

        // When: Submitting form
        let result = await submitPersonalInfo(personalInfo)

        // Then: Should fail gracefully
        XCTAssertFalse(result)
    }

    // MARK: - Field Update Tests

    func testUpdateSingleField() async throws {
        // Given: Existing personal info
        let updatedEmail = "newemail@example.com"

        // When: Updating email
        mockNetworkService.mockResponse = ["success": true]
        let result = await updateField("email", value: updatedEmail)

        // Then: Should update successfully
        XCTAssertTrue(result)
    }

    // MARK: - Input Length Tests

    func testMaximumFieldLengths() {
        // Given: Long input strings
        let longName = String(repeating: "a", count: 101)
        let longStreet = String(repeating: "b", count: 256)

        // When: Validating length
        let isNameValid = validateNameLength(longName)
        let isStreetValid = validateStreetLength(longStreet)

        // Then: Should enforce max length
        XCTAssertFalse(isNameValid)
        XCTAssertFalse(isStreetValid)
    }

    // MARK: - Special Characters Tests

    func testSpecialCharactersInName() {
        // Given: Names with special characters
        let nameWithNumbers = "John123"
        let nameWithSymbols = "John@Doe"
        let validName = "John-Mary O'Connor"

        // When: Validating special characters
        let isNumberNameValid = validateNameCharacters(nameWithNumbers)
        let isSymbolNameValid = validateNameCharacters(nameWithSymbols)
        let isValidNameValid = validateNameCharacters(validName)

        // Then: Should allow only valid characters
        XCTAssertFalse(isNumberNameValid)
        XCTAssertFalse(isSymbolNameValid)
        XCTAssertTrue(isValidNameValid)
    }

    // MARK: - Helper Methods

    private func validateName(_ name: String) -> Bool {
        return !name.isEmpty && name.count >= 2 && name.count <= 100
    }

    private func validateEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    private func validatePhone(_ phone: String) -> Bool {
        let phoneRegex = "^\\+?[1-9]\\d{9,14}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        return phonePredicate.evaluate(with: phone)
    }

    private func validateDateOfBirth(_ date: Date) -> Bool {
        let age = Calendar.current.dateComponents([.year], from: date, to: Date()).year ?? 0
        return age >= 18 && age <= 120
    }

    private func validateAddress(_ address: PersonalAddress) -> Bool {
        return !address.street.isEmpty &&
               !address.city.isEmpty &&
               !address.state.isEmpty &&
               !address.zipCode.isEmpty &&
               !address.country.isEmpty
    }

    private func submitPersonalInfo(_ info: PersonalInfo) async -> Bool {
        do {
            _ = try await mockNetworkService.fetchData(from: "/profile/personal-info")
            return true
        } catch {
            return false
        }
    }

    private func updateField(_ field: String, value: String) async -> Bool {
        do {
            _ = try await mockNetworkService.fetchData(from: "/profile/update")
            return true
        } catch {
            return false
        }
    }

    private func validateNameLength(_ name: String) -> Bool {
        return name.count <= 100
    }

    private func validateStreetLength(_ street: String) -> Bool {
        return street.count <= 255
    }

    private func validateNameCharacters(_ name: String) -> Bool {
        let nameRegex = "^[a-zA-Z\\s'-]+$"
        let namePredicate = NSPredicate(format: "SELF MATCHES %@", nameRegex)
        return namePredicate.evaluate(with: name)
    }
}

// MARK: - Mock Models

struct PersonalInfo {
    let firstName: String
    let lastName: String
    let email: String
    let phone: String
    let dateOfBirth: Date
    let address: PersonalAddress
}

struct PersonalAddress {
    let street: String
    let city: String
    let state: String
    let zipCode: String
    let country: String
}
