//
//  Typography.swift
//  IndigoInvestor
//
//  Typography system for consistent font styling
//

import SwiftUI

struct Typography {
    // MARK: - Title Styles
    static let largeTitle = Font.system(size: 34, weight: .bold, design: .default)
    static let title1 = Font.system(size: 28, weight: .regular, design: .default)
    static let title2 = Font.system(size: 22, weight: .regular, design: .default)
    static let title3 = Font.system(size: 20, weight: .regular, design: .default)
    
    // MARK: - Headline & Body
    static let headline = Font.system(size: 17, weight: .semibold, design: .default)
    static let body = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 17, weight: .medium, design: .default)
    static let callout = Font.system(size: 16, weight: .regular, design: .default)
    static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
    static let footnote = Font.system(size: 13, weight: .regular, design: .default)
    
    // MARK: - Caption Styles
    static let caption1 = Font.system(size: 12, weight: .regular, design: .default)
    static let caption2 = Font.system(size: 11, weight: .regular, design: .default)
}

// MARK: - Font Registration
struct FontRegistration {
    static func registerFonts() {
        // Font registration would go here if using custom fonts
        // For now, we're using system fonts so no registration needed
        print("Using system fonts - no custom font registration needed")
    }
}
