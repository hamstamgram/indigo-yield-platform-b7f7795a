//
//  DesignTokens.swift
//  IndigoInvestor
//
//  Comprehensive design system tokens for Indigo Yield iOS app
//

import SwiftUI

/// Design tokens providing consistent colors, typography, spacing, and other design elements
public struct DesignTokens {
    
    // MARK: - Colors
    
    /// Primary brand colors for Indigo Yield
    public struct Colors {
        
        // MARK: - Brand Colors
        
        /// Core brand identity colors
        public static let indigoPrimary = Color(hex: "#4147CC")        // Deep indigo blue
        public static let indigoSecondary = Color(hex: "#6B70D9")      // Lighter indigo
        public static let indigoAccent = Color(hex: "#FBB93C")         // Gold accent
        
        /// Brand variations
        public static let indigoDark = Color(hex: "#2A2E8F")           // Darker variant
        public static let indigoLight = Color(hex: "#E8E9F5")          // Light tint
        public static let indigoUltraLight = Color(hex: "#F5F6FB")     // Ultra light background
        
        // MARK: - Financial Data Colors
        
        /// Performance and status indicators
        public static let positiveGreen = Color(hex: "#22C55E")        // Gains/Positive
        public static let negativeRed = Color(hex: "#EF4444")          // Losses/Negative
        public static let neutralGray = Color(hex: "#6B7280")          // No change
        public static let warningAmber = Color(hex: "#F59E0B")         // Warning state
        
        /// Asset category colors
        public static let equityBlue = Color(hex: "#3B82F6")           // Stocks
        public static let bondGreen = Color(hex: "#10B981")            // Bonds
        public static let cryptoOrange = Color(hex: "#F59E0B")         // Cryptocurrency
        public static let realEstateRed = Color(hex: "#DC2626")        // Real Estate
        public static let commodityPurple = Color(hex: "#8B5CF6")      // Commodities
        public static let cashGray = Color(hex: "#4B5563")             // Cash/Money Market
        
        // MARK: - System Colors (Adaptive)
        
        /// Background hierarchy
        public static let backgroundPrimary = Color(.systemBackground)
        public static let backgroundSecondary = Color(.secondarySystemBackground)
        public static let backgroundTertiary = Color(.tertiarySystemBackground)
        public static let backgroundQuaternary = Color(.quaternarySystemFill)
        
        /// Text hierarchy
        public static let textPrimary = Color(.label)
        public static let textSecondary = Color(.secondaryLabel)
        public static let textTertiary = Color(.tertiaryLabel)
        public static let textPlaceholder = Color(.placeholderText)
        
        /// Status colors (system adaptive)
        public static let successGreen = Color(.systemGreen)
        public static let warningOrange = Color(.systemOrange)
        public static let errorRed = Color(.systemRed)
        public static let infoBlue = Color(.systemBlue)
        
        // MARK: - Semantic Colors
        
        /// Card and surface colors
        public static let cardBackground = Color(.secondarySystemBackground)
        public static let cardBorder = Color(.separator)
        public static let divider = Color(.separator)
        
        /// Interactive element colors
        public static let buttonPrimary = indigoPrimary
        public static let buttonSecondary = backgroundSecondary
        public static let buttonDestructive = errorRed
        
        /// Input field colors
        public static let inputBackground = backgroundSecondary
        public static let inputBorder = Color(.separator)
        public static let inputFocusBorder = indigoPrimary
    }
    
    // MARK: - Typography
    
    /// Financial-focused typography system using Montserrat and SF Pro
    public struct Typography {
        
        // MARK: - Montserrat Headers
        
        /// Large display titles (Fund names, main values)
        public static let largeTitle = Font.custom("Montserrat-Bold", size: 34)
        public static let title1 = Font.custom("Montserrat-Bold", size: 28)
        public static let title2 = Font.custom("Montserrat-SemiBold", size: 22)
        public static let title3 = Font.custom("Montserrat-SemiBold", size: 20)
        
        // MARK: - SF Pro Body Text
        
        /// Headlines and section headers
        public static let headline = Font.headline.weight(.semibold)
        public static let subheadline = Font.subheadline.weight(.medium)
        
        /// Body text for content
        public static let body = Font.body
        public static let bodyEmphasized = Font.body.weight(.medium)
        public static let bodyLarge = Font.title3
        public static let callout = Font.callout
        
        // MARK: - Financial Data Typography
        
        /// Specialized fonts for financial values
        public static let financialLarge = Font.system(size: 32, weight: .bold, design: .rounded)
        public static let financialMedium = Font.system(size: 24, weight: .semibold, design: .rounded)
        public static let financialSmall = Font.system(size: 16, weight: .medium, design: .rounded)
        public static let financialCaption = Font.system(size: 14, weight: .medium, design: .rounded)
        
        // MARK: - Small Text
        
        /// Footer and caption text
        public static let footnote = Font.footnote
        public static let caption1 = Font.caption
        public static let caption2 = Font.caption2
        
        // MARK: - Interactive Elements
        
        /// Buttons and interactive text
        public static let buttonLarge = Font.system(size: 18, weight: .semibold)
        public static let buttonMedium = Font.system(size: 16, weight: .semibold)
        public static let buttonSmall = Font.system(size: 14, weight: .medium)
        public static let linkText = Font.body.weight(.medium)
        
        // MARK: - Navigation
        
        /// Navigation and tab bar text
        public static let navigationTitle = Font.headline.weight(.semibold)
        public static let tabLabel = Font.system(size: 10, weight: .medium)
    }
    
    // MARK: - Spacing
    
    /// 4pt grid-based spacing system
    public struct Spacing {
        
        // MARK: - Base Spacing Units
        
        public static let xxs: CGFloat = 4       // Minimal spacing
        public static let xs: CGFloat = 8        // Small spacing
        public static let sm: CGFloat = 12       // Medium-small spacing
        public static let md: CGFloat = 16       // Standard spacing (base unit)
        public static let lg: CGFloat = 24       // Large spacing
        public static let xl: CGFloat = 32       // Extra large spacing
        public static let xxl: CGFloat = 48      // Maximum spacing
        public static let xxxl: CGFloat = 64     // Ultra large spacing
        
        // MARK: - Component Spacing
        
        /// Padding for different components
        public static let cardPadding: CGFloat = 16
        public static let buttonPadding: CGFloat = 16
        public static let inputPadding: CGFloat = 12
        public static let sectionSpacing: CGFloat = 24
        public static let listItemSpacing: CGFloat = 12
        
        // MARK: - Layout Margins
        
        /// Screen and container margins
        public static let screenMargin: CGFloat = 16
        public static let cardMargin: CGFloat = 16
        public static let listMargin: CGFloat = 20
        public static let formMargin: CGFloat = 16
    }
    
    // MARK: - Component Dimensions
    
    /// Standard dimensions for UI components
    public struct Dimensions {
        
        // MARK: - Interactive Elements
        
        public static let buttonHeight: CGFloat = 50
        public static let buttonHeightSmall: CGFloat = 36
        public static let buttonHeightLarge: CGFloat = 56
        
        public static let inputHeight: CGFloat = 44
        public static let searchBarHeight: CGFloat = 36
        
        // MARK: - Cards and Containers
        
        public static let cardMinHeight: CGFloat = 120
        public static let cardCornerRadius: CGFloat = 12
        public static let smallCardCornerRadius: CGFloat = 8
        
        // MARK: - Icons and Images
        
        public static let iconSmall: CGFloat = 16
        public static let iconMedium: CGFloat = 24
        public static let iconLarge: CGFloat = 32
        public static let iconXLarge: CGFloat = 48
        
        public static let avatarSmall: CGFloat = 32
        public static let avatarMedium: CGFloat = 48
        public static let avatarLarge: CGFloat = 64
        
        // MARK: - Touch Targets
        
        public static let minimumTouchTarget: CGFloat = 44
        public static let recommendedTouchTarget: CGFloat = 48
    }
    
    // MARK: - Shadows and Elevation
    
    /// Shadow styles for depth and elevation
    public struct Shadows {
        
        public static let cardShadow = Shadow(
            color: .black.opacity(0.08),
            radius: 8,
            x: 0,
            y: 4
        )
        
        public static let buttonShadow = Shadow(
            color: .black.opacity(0.15),
            radius: 4,
            x: 0,
            y: 2
        )
        
        public static let modalShadow = Shadow(
            color: .black.opacity(0.25),
            radius: 16,
            x: 0,
            y: 8
        )
        
        public static let subtleShadow = Shadow(
            color: .black.opacity(0.05),
            radius: 2,
            x: 0,
            y: 1
        )
    }
    
    // MARK: - Animation Tokens
    
    /// Animation durations and curves
    public struct Animations {
        
        // MARK: - Durations
        
        public static let fast: Double = 0.15
        public static let medium: Double = 0.25
        public static let slow: Double = 0.35
        public static let slower: Double = 0.5
        
        // MARK: - Curves
        
        public static let easeOut = Animation.easeOut(duration: medium)
        public static let easeInOut = Animation.easeInOut(duration: medium)
        public static let spring = Animation.spring(response: 0.4, dampingFraction: 0.8)
        public static let bouncy = Animation.interpolatingSpring(stiffness: 300, damping: 20)
        
        // MARK: - Specialized Animations
        
        public static let buttonPress = Animation.easeInOut(duration: fast)
        public static let cardFlip = Animation.easeInOut(duration: slow)
        public static let slideTransition = Animation.easeOut(duration: medium)
    }
    
    // MARK: - Accessibility
    
    /// Accessibility-focused design tokens
    public struct Accessibility {
        
        // MARK: - Contrast Ratios
        
        /// Minimum contrast ratios for different text sizes
        public static let normalTextContrast: Double = 4.5
        public static let largeTextContrast: Double = 3.0
        public static let graphicalElementContrast: Double = 3.0
        
        // MARK: - Dynamic Type Support
        
        /// Scale factors for different accessibility text sizes
        public static let extraSmallScale: CGFloat = 0.8
        public static let smallScale: CGFloat = 0.9
        public static let mediumScale: CGFloat = 1.0
        public static let largeScale: CGFloat = 1.15
        public static let extraLargeScale: CGFloat = 1.3
        public static let accessibilityMediumScale: CGFloat = 1.6
        public static let accessibilityLargeScale: CGFloat = 1.9
        public static let accessibilityExtraLargeScale: CGFloat = 2.35
    }
}

// MARK: - Supporting Structures

/// Shadow configuration
public struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
    
    public init(color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) {
        self.color = color
        self.radius = radius
        self.x = x
        self.y = y
    }
}

// MARK: - Color Extension

extension Color {
    /// Initialize color from hex string
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
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - View Extensions for Design Tokens

extension View {
    
    /// Apply card styling with consistent shadow and background
    public func cardStyle(
        backgroundColor: Color = DesignTokens.Colors.cardBackground,
        cornerRadius: CGFloat = DesignTokens.Dimensions.cardCornerRadius,
        shadow: Shadow = DesignTokens.Shadows.cardShadow
    ) -> some View {
        self
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .shadow(
                color: shadow.color,
                radius: shadow.radius,
                x: shadow.x,
                y: shadow.y
            )
    }
    
    /// Apply primary button styling
    public func primaryButtonStyle() -> some View {
        self
            .font(DesignTokens.Typography.buttonMedium)
            .foregroundColor(.white)
            .frame(height: DesignTokens.Dimensions.buttonHeight)
            .background(DesignTokens.Colors.buttonPrimary)
            .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
    
    /// Apply secondary button styling
    public func secondaryButtonStyle() -> some View {
        self
            .font(DesignTokens.Typography.buttonMedium)
            .foregroundColor(DesignTokens.Colors.indigoPrimary)
            .frame(height: DesignTokens.Dimensions.buttonHeight)
            .background(DesignTokens.Colors.buttonSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Dimensions.smallCardCornerRadius)
                    .stroke(DesignTokens.Colors.indigoPrimary, lineWidth: 1)
            )
    }
    
    /// Apply financial value styling
    public func financialValueStyle(size: FinancialValueSize = .medium) -> some View {
        self.font(size.font)
    }
    
    /// Apply consistent screen margins
    public func screenMargins() -> some View {
        self.padding(.horizontal, DesignTokens.Spacing.screenMargin)
    }
    
    /// Apply section spacing
    public func sectionSpacing() -> some View {
        self.padding(.vertical, DesignTokens.Spacing.sectionSpacing)
    }
}

// MARK: - Financial Value Size

public enum FinancialValueSize {
    case large, medium, small, caption
    
    var font: Font {
        switch self {
        case .large: return DesignTokens.Typography.financialLarge
        case .medium: return DesignTokens.Typography.financialMedium
        case .small: return DesignTokens.Typography.financialSmall
        case .caption: return DesignTokens.Typography.financialCaption
        }
    }
}

// MARK: - Design Token Validation

#if DEBUG
/// Development helper for validating design tokens
public struct DesignTokenValidator {
    
    /// Validate color contrast ratios
    public static func validateColorContrast() {
        // Implementation for validating WCAG contrast ratios
        // This would be used during development to ensure accessibility compliance
    }
    
    /// Validate typography scales
    public static func validateTypographyScale() {
        // Implementation for validating typography hierarchy
    }
    
    /// Validate spacing consistency
    public static func validateSpacingScale() {
        // Implementation for validating 4pt grid adherence
    }
}
#endif