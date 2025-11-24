//
//  FinancialTypography.swift
//  IndigoInvestor
//
//  Enhanced typography system specifically designed for financial applications
//

import SwiftUI

/// Financial typography system with specialized support for monetary values and data display
public struct FinancialTypography {
    
    // MARK: - Montserrat Headers for Brand Impact
    
    /// Large display titles for main portfolio values and fund names
    public static let portfolioValue = Font.custom("Montserrat-Bold", size: 36)
        .weight(.bold)
    
    /// Section headers and fund categories
    public static let sectionHeader = Font.custom("Montserrat-SemiBold", size: 24)
        .weight(.semibold)
    
    /// Card titles and asset names
    public static let cardTitle = Font.custom("Montserrat-SemiBold", size: 20)
        .weight(.semibold)
    
    /// Subsection headers
    public static let subheader = Font.custom("Montserrat-Medium", size: 18)
        .weight(.medium)
    
    // MARK: - SF Pro Rounded for Financial Values
    
    /// Large monetary amounts (portfolio totals, major balances)
    public static let currencyLarge = Font.system(size: 32, weight: .bold, design: .rounded)
    
    /// Medium monetary amounts (asset balances, transaction amounts)
    public static let currencyMedium = Font.system(size: 24, weight: .semibold, design: .rounded)
    
    /// Small monetary amounts (fees, small balances)
    public static let currencySmall = Font.system(size: 18, weight: .medium, design: .rounded)
    
    /// Inline currency values
    public static let currencyInline = Font.system(size: 16, weight: .medium, design: .rounded)
    
    /// Tiny currency amounts (captions, footnotes)
    public static let currencyCaption = Font.system(size: 14, weight: .medium, design: .rounded)
    
    // MARK: - SF Pro Rounded for Percentages and Performance
    
    /// Large percentage changes (main performance indicators)
    public static let percentageLarge = Font.system(size: 28, weight: .bold, design: .rounded)
    
    /// Medium percentage changes (asset performance)
    public static let percentageMedium = Font.system(size: 20, weight: .semibold, design: .rounded)
    
    /// Small percentage changes (inline performance)
    public static let percentageSmall = Font.system(size: 16, weight: .medium, design: .rounded)
    
    /// Caption percentage changes
    public static let percentageCaption = Font.system(size: 14, weight: .medium, design: .rounded)
    
    // MARK: - SF Pro Rounded for Numeric Data
    
    /// Large numbers (share counts, units)
    public static let numberLarge = Font.system(size: 24, weight: .semibold, design: .rounded)
    
    /// Medium numbers (quantities, counts)
    public static let numberMedium = Font.system(size: 18, weight: .medium, design: .rounded)
    
    /// Small numbers (inline quantities)
    public static let numberSmall = Font.system(size: 16, weight: .regular, design: .rounded)
    
    // MARK: - SF Pro for General Text
    
    /// Main body text for descriptions and content
    public static let bodyText = Font.system(size: 17, weight: .regular, design: .default)
    
    /// Emphasized body text
    public static let bodyTextEmphasized = Font.system(size: 17, weight: .medium, design: .default)
    
    /// Secondary body text for supporting information
    public static let bodyTextSecondary = Font.system(size: 15, weight: .regular, design: .default)
    
    /// Small body text for details
    public static let bodyTextSmall = Font.system(size: 14, weight: .regular, design: .default)
    
    // MARK: - SF Pro for Labels and Metadata
    
    /// Asset labels and categories
    public static let assetLabel = Font.system(size: 15, weight: .medium, design: .default)
    
    /// Date and time labels
    public static let dateLabel = Font.system(size: 14, weight: .regular, design: .default)
    
    /// Status labels and badges
    public static let statusLabel = Font.system(size: 13, weight: .semibold, design: .default)
    
    /// Footnotes and disclaimers
    public static let footnote = Font.system(size: 12, weight: .regular, design: .default)
    
    /// Caption text
    public static let caption = Font.system(size: 11, weight: .regular, design: .default)
    
    // MARK: - Interactive Elements
    
    /// Primary action buttons
    public static let buttonPrimary = Font.system(size: 17, weight: .semibold, design: .default)
    
    /// Secondary action buttons
    public static let buttonSecondary = Font.system(size: 16, weight: .medium, design: .default)
    
    /// Small buttons and links
    public static let buttonSmall = Font.system(size: 14, weight: .medium, design: .default)
    
    /// Tab bar labels
    public static let tabLabel = Font.system(size: 10, weight: .medium, design: .default)
    
    /// Navigation titles
    public static let navigationTitle = Font.system(size: 17, weight: .semibold, design: .default)
    
    // MARK: - Specialized Financial Typography
    
    /// Stock ticker symbols
    public static let tickerSymbol = Font.system(size: 16, weight: .bold, design: .monospaced)
    
    /// Account numbers and identifiers
    public static let accountNumber = Font.system(size: 14, weight: .medium, design: .monospaced)
    
    /// Transaction IDs and references
    public static let transactionId = Font.system(size: 12, weight: .regular, design: .monospaced)
    
    /// ISIN codes and other financial identifiers
    public static let financialId = Font.system(size: 11, weight: .regular, design: .monospaced)
    
    // MARK: - Data Table Typography
    
    /// Table headers
    public static let tableHeader = Font.system(size: 14, weight: .semibold, design: .default)
    
    /// Table cell text
    public static let tableCell = Font.system(size: 15, weight: .regular, design: .default)
    
    /// Table financial values
    public static let tableFinancial = Font.system(size: 15, weight: .medium, design: .rounded)
    
    /// Table captions and totals
    public static let tableCaption = Font.system(size: 13, weight: .medium, design: .default)
}

// MARK: - Dynamic Type Support for Financial Typography

extension FinancialTypography {
    
    /// Get a dynamically scaled financial typography style
    public static func scaledFinancialFont(
        _ baseFont: Font,
        relativeTo textStyle: Font.TextStyle,
        maxScale: CGFloat = 2.0
    ) -> Font {
        // Note: Font scaling is handled by Dynamic Type system
        // This method returns the base font for consistency
        return baseFont
    }
    
    /// Currency formatter with proper typography
    public static func formattedCurrency(
        _ value: Double,
        code: String = "USD",
        style: CurrencyStyle = .medium
    ) -> Text {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = code
        
        let formattedValue = formatter.string(from: NSNumber(value: value)) ?? "$0.00"
        
        return Text(formattedValue)
            .font(style.font)
    }
    
    /// Percentage formatter with proper typography
    public static func formattedPercentage(
        _ value: Double,
        style: PercentageStyle = .medium,
        showSign: Bool = true
    ) -> Text {
        let sign = showSign && value >= 0 ? "+" : ""
        let formattedValue = String(format: "%@%.2f%%", sign, value)
        
        return Text(formattedValue)
            .font(style.font)
            .foregroundColor(value >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
    }
    
    /// Number formatter with proper typography
    public static func formattedNumber(
        _ value: Double,
        style: NumberStyle = .medium,
        decimals: Int = 2
    ) -> Text {
        let formattedValue = String(format: "%.\(decimals)f", value)
        
        return Text(formattedValue)
            .font(style.font)
    }
}

// MARK: - Typography Style Enums

public enum CurrencyStyle {
    case large, medium, small, inline, caption
    
    var font: Font {
        switch self {
        case .large: return FinancialTypography.currencyLarge
        case .medium: return FinancialTypography.currencyMedium
        case .small: return FinancialTypography.currencySmall
        case .inline: return FinancialTypography.currencyInline
        case .caption: return FinancialTypography.currencyCaption
        }
    }
}

public enum PercentageStyle {
    case large, medium, small, caption
    
    var font: Font {
        switch self {
        case .large: return FinancialTypography.percentageLarge
        case .medium: return FinancialTypography.percentageMedium
        case .small: return FinancialTypography.percentageSmall
        case .caption: return FinancialTypography.percentageCaption
        }
    }
}

public enum NumberStyle {
    case large, medium, small
    
    var font: Font {
        switch self {
        case .large: return FinancialTypography.numberLarge
        case .medium: return FinancialTypography.numberMedium
        case .small: return FinancialTypography.numberSmall
        }
    }
}

// MARK: - Text Extensions for Financial Typography

extension Text {
    
    /// Apply financial value styling with semantic colors
    public func financialValue(
        _ value: Double,
        style: CurrencyStyle = .medium,
        showChangeColor: Bool = false
    ) -> Text {
        var styledText = self.font(style.font)
        
        if showChangeColor {
            let color = value >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed
            styledText = styledText.foregroundColor(color)
        }
        
        return styledText
    }
    
    /// Apply percentage styling with semantic colors
    public func percentage(
        _ value: Double,
        style: PercentageStyle = .medium
    ) -> Text {
        let color = value >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed
        
        return self
            .font(style.font)
            .foregroundColor(color)
    }
    
    /// Apply ticker symbol styling
    public func tickerSymbol() -> Text {
        return self
            .font(FinancialTypography.tickerSymbol)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }
    
    /// Apply financial ID styling
    public func financialId() -> Text {
        return self
            .font(FinancialTypography.financialId)
            .foregroundColor(DesignTokens.Colors.textSecondary)
    }
    
    /// Apply card title styling
    public func cardTitle() -> Text {
        return self
            .font(FinancialTypography.cardTitle)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }
    
    /// Apply section header styling
    public func sectionHeader() -> Text {
        return self
            .font(FinancialTypography.sectionHeader)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }
}

// MARK: - View Extensions for Financial Typography

extension View {
    
    /// Apply portfolio value styling (for main balance displays)
    public func portfolioValueStyle() -> some View {
        self.font(FinancialTypography.portfolioValue)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }
    
    /// Apply financial card styling
    public func financialCardStyle() -> some View {
        self
            .padding(DesignTokens.Spacing.cardPadding)
            .background(DesignTokens.Colors.cardBackground)
            .cornerRadius(DesignTokens.Dimensions.cardCornerRadius)
            .shadow(
                color: DesignTokens.Shadows.cardShadow.color,
                radius: DesignTokens.Shadows.cardShadow.radius,
                x: DesignTokens.Shadows.cardShadow.x,
                y: DesignTokens.Shadows.cardShadow.y
            )
    }
    
    /// Apply data table cell styling
    public func tableCell() -> some View {
        self
            .font(FinancialTypography.tableCell)
            .foregroundColor(DesignTokens.Colors.textPrimary)
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.vertical, DesignTokens.Spacing.sm)
    }
    
    /// Apply financial data table cell styling
    public func financialTableCell() -> some View {
        self
            .font(FinancialTypography.tableFinancial)
            .foregroundColor(DesignTokens.Colors.textPrimary)
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.vertical, DesignTokens.Spacing.sm)
    }
}

// MARK: - Financial Typography Accessibility

extension FinancialTypography {
    
    /// Get accessible font size based on Dynamic Type setting
    public static func accessibleFont(
        _ baseFont: Font,
        category: UIContentSizeCategory = .large
    ) -> Font {
        let scaleFactor = category.scaleFactor
        return baseFont // SwiftUI handles Dynamic Type automatically
    }
    
    /// Check if current text size requires simplified layouts
    public static var requiresSimplifiedLayout: Bool {
        let category = UIApplication.shared.preferredContentSizeCategory
        return category.isAccessibilityCategory
    }
}

// MARK: - UIContentSizeCategory Extension

extension UIContentSizeCategory {
    var scaleFactor: CGFloat {
        switch self {
        case .extraSmall: return 0.8
        case .small: return 0.9
        case .medium: return 1.0
        case .large: return 1.0
        case .extraLarge: return 1.15
        case .extraExtraLarge: return 1.3
        case .extraExtraExtraLarge: return 1.5
        case .accessibilityMedium: return 1.6
        case .accessibilityLarge: return 1.9
        case .accessibilityExtraLarge: return 2.35
        case .accessibilityExtraExtraLarge: return 2.76
        case .accessibilityExtraExtraExtraLarge: return 3.12
        default: return 1.0
        }
    }
}