//
//  Color+Extensions.swift
//  IndigoInvestor
//
//  SwiftUI Color extensions for brand colors and utilities
//

import SwiftUI

extension Color {
    /// Initialize Color from hex string
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    // MARK: - Brand Colors

    static let indigoPrimary = Color(hex: "4F46E5")
    static let indigoSecondary = Color(hex: "7C3AED")
    static let indigoAccent = Color(hex: "8B5CF6")

    static let indigoDarkBackground = Color(hex: "1A1F3A")
    static let indigoDarkSecondary = Color(hex: "2D3561")
    static let indigoDarkTertiary = Color(hex: "3E4777")

    // MARK: - Semantic Colors

    static let success = Color(hex: "10B981")
    static let warning = Color(hex: "F59E0B")
    static let error = Color(hex: "EF4444")
    static let info = Color(hex: "3B82F6")

    // MARK: - Chart Colors

    static let chartBlue = Color(hex: "3B82F6")
    static let chartGreen = Color(hex: "10B981")
    static let chartYellow = Color(hex: "FBBF24")
    static let chartRed = Color(hex: "EF4444")
    static let chartPurple = Color(hex: "8B5CF6")
    static let chartPink = Color(hex: "EC4899")

    // MARK: - Utilities

    /// Returns a lighter version of the color
    func lighter(by percentage: CGFloat = 0.2) -> Color {
        return self.adjust(by: abs(percentage))
    }

    /// Returns a darker version of the color
    func darker(by percentage: CGFloat = 0.2) -> Color {
        return self.adjust(by: -abs(percentage))
    }

    private func adjust(by percentage: CGFloat) -> Color {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        UIColor(self).getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        return Color(
            .sRGB,
            red: min(Double(red + percentage), 1.0),
            green: min(Double(green + percentage), 1.0),
            blue: min(Double(blue + percentage), 1.0),
            opacity: Double(alpha)
        )
    }
}
