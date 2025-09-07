//
//  Color+Brand.swift
//  IndigoInvestor
//
//  Brand color extensions for consistent theming
//

import SwiftUI

extension Color {
    // MARK: - Brand Colors
    
    /// Primary Indigo brand color
    static let indigoBrand = Color("IndigoBrand", bundle: .main)
    
    /// App accent color (same as brand for consistency)
    static let appAccent = Color("AccentColor", bundle: .main)
    
    // MARK: - Semantic Colors
    
    /// Primary button and interactive element color
    static let primaryAction = indigoBrand
    
    /// Success state color (green)
    static let success = Color.green
    
    /// Warning state color (orange)
    static let warning = Color.orange
    
    /// Error/danger state color (red)
    static let danger = Color.red
    
    /// Info state color (blue)
    static let info = Color.blue
    
    // MARK: - Background Colors
    
    /// Primary background (adapts to light/dark mode)
    static let primaryBackground = Color(UIColor.systemBackground)
    
    /// Secondary background (adapts to light/dark mode)
    static let secondaryBackground = Color(UIColor.secondarySystemBackground)
    
    /// Tertiary background (adapts to light/dark mode)
    static let tertiaryBackground = Color(UIColor.tertiarySystemBackground)
    
    // MARK: - Text Colors
    
    /// Primary text color (adapts to light/dark mode)
    static let primaryText = Color(UIColor.label)
    
    /// Secondary text color (adapts to light/dark mode)
    static let secondaryText = Color(UIColor.secondaryLabel)
    
    /// Tertiary text color (adapts to light/dark mode)
    static let tertiaryText = Color(UIColor.tertiaryLabel)
    
    /// Placeholder text color
    static let placeholderText = Color(UIColor.placeholderText)
    
    // MARK: - Chart Colors
    
    /// Colors for charts and data visualization
    static let chartColors: [Color] = [
        indigoBrand,
        .blue,
        .green,
        .orange,
        .purple,
        .pink,
        .yellow,
        .cyan
    ]
    
    // MARK: - Gradient Definitions
    
    /// Primary brand gradient
    static let indigoGradient = LinearGradient(
        colors: [
            indigoBrand,
            indigoBrand.opacity(0.8)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    /// Success gradient for positive states
    static let successGradient = LinearGradient(
        colors: [
            Color.green,
            Color.green.opacity(0.8)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // MARK: - Utility Functions
    
    /// Returns the hex string representation of the color
    var hexString: String? {
        let uiColor = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        
        guard uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else {
            return nil
        }
        
        return String(format: "#%02lX%02lX%02lX",
                      lround(Double(red * 255)),
                      lround(Double(green * 255)),
                      lround(Double(blue * 255)))
    }
}

// MARK: - View Modifiers

extension View {
    /// Apply the primary brand color as foreground
    func indigoBrand() -> some View {
        self.foregroundColor(.indigoBrand)
    }
    
    /// Apply the primary brand gradient as background
    func indigoGradientBackground() -> some View {
        self.background(Color.indigoGradient)
    }
}
