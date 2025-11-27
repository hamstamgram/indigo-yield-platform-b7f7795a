//
//  FinancialComponents.swift
//  IndigoInvestor
//
//  Reusable financial UI components following the Indigo Yield design system
//

import SwiftUI

// MARK: - Financial Cards

/// Portfolio summary card displaying total value and change
public struct PortfolioSummaryCard: View {
    let totalValue: Double
    let change: Double
    let changePercent: Double
    let title: String
    
    public init(
        title: String = "Total Portfolio Value",
        totalValue: Double,
        change: Double,
        changePercent: Double
    ) {
        self.title = title
        self.totalValue = totalValue
        self.change = change
        self.changePercent = changePercent
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            // Title
            Text(title)
                .font(FinancialTypography.assetLabel)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            
            // Main Value
            FinancialTypography.formattedCurrency(totalValue, style: .large)
                .foregroundColor(DesignTokens.Colors.textPrimary)
            
            // Change Indicator
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: changePercent >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption)
                    .foregroundColor(changePercent >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
                
                FinancialTypography.formattedPercentage(changePercent, style: .small, showSign: true)
                
                FinancialTypography.formattedCurrency(change, style: .caption)
                    .foregroundColor(changePercent >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
            }
        }
        .financialCardStyle()
    }
}

/// Asset allocation card for individual holdings
public struct AssetAllocationCard: View {
    let asset: AssetAllocation
    
    public init(asset: AssetAllocation) {
        self.asset = asset
    }
    
    public var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Asset Icon
            Circle()
                .fill(asset.categoryColor)
                .frame(
                    width: DesignTokens.Dimensions.iconLarge,
                    height: DesignTokens.Dimensions.iconLarge
                )
                .overlay(
                    Image(systemName: asset.icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white)
                )
            
            // Asset Information
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(asset.name)
                    .font(FinancialTypography.cardTitle)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
                
                Text("\(asset.percentage, specifier: "%.1f")% allocation")
                    .font(FinancialTypography.caption)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
            }
            
            Spacer()
            
            // Value and Performance
            VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
                FinancialTypography.formattedCurrency(asset.value, style: .small)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                
                HStack(spacing: DesignTokens.Spacing.xxs) {
                    Image(systemName: asset.dailyChange >= 0 ? "arrow.up" : "arrow.down")
                        .font(.caption2)
                    
                    FinancialTypography.formattedPercentage(asset.dailyChange, style: .caption)
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.cardBackground)
        .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
}

/// Performance metric card for KPIs
public struct PerformanceMetricCard: View {
    let title: String
    let value: String
    let change: Double?
    let icon: String
    let color: Color
    
    // Convenience initializer with default color
    public init(
        title: String,
        value: String,
        change: Double? = nil,
        icon: String
    ) {
        self.init(title: title, value: value, change: change, icon: icon, color: DesignTokens.Colors.indigoPrimary)
    }

    // Full initializer with explicit color
    public init(
        title: String,
        value: String,
        change: Double? = nil,
        icon: String,
        color: Color
    ) {
        self.title = title
        self.value = value
        self.change = change
        self.icon = icon
        self.color = color
    }
    
    public var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            // Icon
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            // Value
            Text(value)
                .font(FinancialTypography.currencyMedium)
                .foregroundColor(DesignTokens.Colors.textPrimary)
            
            // Title
            Text(title)
                .font(FinancialTypography.caption)
                .foregroundColor(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            
            // Change Indicator
            if let change = change {
                HStack(spacing: DesignTokens.Spacing.xxs) {
                    Image(systemName: change >= 0 ? "arrow.up" : "arrow.down")
                        .font(.caption2)
                    
                    FinancialTypography.formattedPercentage(change, style: .caption)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.cardBackground)
        .cornerRadius(DesignTokens.Dimensions.cardCornerRadius)
        .shadow(
            color: DesignTokens.Shadows.subtleShadow.color,
            radius: DesignTokens.Shadows.subtleShadow.radius,
            x: DesignTokens.Shadows.subtleShadow.x,
            y: DesignTokens.Shadows.subtleShadow.y
        )
    }
}

// MARK: - Buttons

/// Primary action button with Indigo Yield styling
public struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    let isLoading: Bool
    let isDisabled: Bool
    
    @State private var isPressed = false
    
    public init(
        title: String,
        isLoading: Bool = false,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isLoading = isLoading
        self.isDisabled = isDisabled
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
                
                Text(title)
                    .font(FinancialTypography.buttonPrimary)
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.Dimensions.buttonHeight)
            .background(
                (isDisabled || isLoading) ? 
                DesignTokens.Colors.neutralGray : 
                DesignTokens.Colors.buttonPrimary
            )
            .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
            .scaleEffect(isPressed ? 0.98 : 1.0)
            .animation(DesignTokens.Animations.buttonPress, value: isPressed)
        }
        .disabled(isDisabled || isLoading)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

/// Secondary action button with outlined styling
public struct SecondaryButton: View {
    let title: String
    let action: () -> Void
    let isDisabled: Bool
    
    public init(
        title: String,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isDisabled = isDisabled
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(FinancialTypography.buttonPrimary)
                .foregroundColor(isDisabled ? DesignTokens.Colors.textTertiary : DesignTokens.Colors.indigoPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: DesignTokens.Dimensions.buttonHeight)
                .background(DesignTokens.Colors.backgroundPrimary)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Dimensions.smallCardCornerRadius)
                        .stroke(
                            isDisabled ? DesignTokens.Colors.textTertiary : DesignTokens.Colors.indigoPrimary,
                            lineWidth: 1
                        )
                )
        }
        .disabled(isDisabled)
    }
}

/// Destructive action button for dangerous operations
public struct DestructiveButton: View {
    let title: String
    let action: () -> Void
    let isDisabled: Bool
    
    public init(
        title: String,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.isDisabled = isDisabled
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(FinancialTypography.buttonPrimary)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: DesignTokens.Dimensions.buttonHeight)
                .background(isDisabled ? DesignTokens.Colors.neutralGray : DesignTokens.Colors.errorRed)
                .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
        }
        .disabled(isDisabled)
    }
}

// MARK: - Input Fields

/// Currency input field with proper formatting
public struct CurrencyInputField: View {
    @Binding var value: Double
    let title: String
    let placeholder: String
    let currencyCode: String
    
    @State private var isFocused = false
    @State private var textValue = ""
    
    public init(
        title: String,
        placeholder: String = "$0.00",
        currencyCode: String = "USD",
        value: Binding<Double>
    ) {
        self.title = title
        self.placeholder = placeholder
        self.currencyCode = currencyCode
        self._value = value
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(title)
                .font(FinancialTypography.assetLabel)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            
            TextField(placeholder, text: $textValue)
                .font(FinancialTypography.currencyMedium)
                .keyboardType(.decimalPad)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Colors.inputBackground)
                .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Dimensions.smallCardCornerRadius)
                        .stroke(
                            isFocused ? DesignTokens.Colors.inputFocusBorder : DesignTokens.Colors.inputBorder,
                            lineWidth: isFocused ? 2 : 1
                        )
                )
                .onFocusChange { focused in
                    isFocused = focused
                }
                .onChange(of: textValue) { newValue in
                    // Parse currency input and update binding
                    let formatter = NumberFormatter()
                    formatter.numberStyle = .currency
                    formatter.currencyCode = currencyCode
                    
                    if let number = formatter.number(from: newValue) {
                        value = number.doubleValue
                    }
                }
        }
    }
}

/// Standard text input field
public struct TextInputField: View {
    @Binding var text: String
    let title: String
    let placeholder: String
    let keyboardType: UIKeyboardType
    
    @State private var isFocused = false
    
    public init(
        title: String,
        placeholder: String,
        keyboardType: UIKeyboardType = .default,
        text: Binding<String>
    ) {
        self.title = title
        self.placeholder = placeholder
        self.keyboardType = keyboardType
        self._text = text
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(title)
                .font(FinancialTypography.assetLabel)
                .foregroundColor(DesignTokens.Colors.textSecondary)
            
            TextField(placeholder, text: $text)
                .font(FinancialTypography.bodyText)
                .keyboardType(keyboardType)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Colors.inputBackground)
                .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Dimensions.smallCardCornerRadius)
                        .stroke(
                            isFocused ? DesignTokens.Colors.inputFocusBorder : DesignTokens.Colors.inputBorder,
                            lineWidth: isFocused ? 2 : 1
                        )
                )
                .onFocusChange { focused in
                    isFocused = focused
                }
        }
    }
}

// MARK: - Status and Badges

/// Financial status badge with color coding
public struct StatusBadge: View {
    let status: FinancialStatus
    let text: String?
    
    public init(_ status: FinancialStatus, text: String? = nil) {
        self.status = status
        self.text = text ?? status.displayName
    }
    
    public var body: some View {
        Text(text ?? status.displayName)
            .font(FinancialTypography.statusLabel)
            .foregroundColor(status.textColor)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(status.backgroundColor)
            .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
}

/// Category badge for asset types
public struct CategoryBadge: View {
    let category: String
    let color: Color
    
    // Convenience initializer with default color
    public init(category: String) {
        self.init(category: category, color: DesignTokens.Colors.indigoPrimary)
    }

    // Full initializer with explicit color
    public init(category: String, color: Color) {
        self.category = category
        self.color = color
    }
    
    public var body: some View {
        Text(category)
            .font(FinancialTypography.statusLabel)
            .foregroundColor(color)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(color.opacity(0.1))
            .cornerRadius(DesignTokens.Dimensions.smallCardCornerRadius)
    }
}

// MARK: - Loading and Empty States

/// Loading view for financial data
public struct FinancialLoadingView: View {
    let message: String
    
    public init(message: String = "Loading portfolio data...") {
        self.message = message
    }
    
    public var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)
                .progressViewStyle(CircularProgressViewStyle(tint: DesignTokens.Colors.indigoPrimary))
            
            Text(message)
                .font(FinancialTypography.bodyText)
                .foregroundColor(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Colors.backgroundPrimary)
    }
}

/// Empty state view for financial data
public struct FinancialEmptyStateView: View {
    let title: String
    let message: String
    let icon: String
    let action: (() -> Void)?
    let actionTitle: String?
    
    public init(
        title: String,
        message: String,
        icon: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.icon = icon
        self.actionTitle = actionTitle
        self.action = action
    }
    
    public var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(DesignTokens.Colors.textTertiary)
            
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(title)
                    .font(FinancialTypography.sectionHeader)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
                
                Text(message)
                    .font(FinancialTypography.bodyText)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            if let action = action, let actionTitle = actionTitle {
                PrimaryButton(title: actionTitle, action: action)
                    .frame(maxWidth: 200)
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }
}

// MARK: - Supporting Types

/// Asset allocation data model
public struct AssetAllocation: Identifiable {
    public let id = UUID()
    public let name: String
    public let percentage: Double
    public let value: Double
    public let dailyChange: Double
    public let categoryColor: Color
    public let icon: String
    
    public init(
        name: String,
        percentage: Double,
        value: Double,
        dailyChange: Double,
        categoryColor: Color,
        icon: String
    ) {
        self.name = name
        self.percentage = percentage
        self.value = value
        self.dailyChange = dailyChange
        self.categoryColor = categoryColor
        self.icon = icon
    }
}

/// Financial status enumeration
public enum FinancialStatus {
    case active, pending, completed, cancelled, error, warning
    
    public var displayName: String {
        switch self {
        case .active: return "Active"
        case .pending: return "Pending"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        case .error: return "Error"
        case .warning: return "Warning"
        }
    }
    
    public var backgroundColor: Color {
        switch self {
        case .active: return DesignTokens.Colors.positiveGreen.opacity(0.1)
        case .pending: return DesignTokens.Colors.warningAmber.opacity(0.1)
        case .completed: return DesignTokens.Colors.positiveGreen.opacity(0.1)
        case .cancelled: return DesignTokens.Colors.neutralGray.opacity(0.1)
        case .error: return DesignTokens.Colors.errorRed.opacity(0.1)
        case .warning: return DesignTokens.Colors.warningOrange.opacity(0.1)
        }
    }
    
    public var textColor: Color {
        switch self {
        case .active: return DesignTokens.Colors.positiveGreen
        case .pending: return DesignTokens.Colors.warningAmber
        case .completed: return DesignTokens.Colors.positiveGreen
        case .cancelled: return DesignTokens.Colors.neutralGray
        case .error: return DesignTokens.Colors.errorRed
        case .warning: return DesignTokens.Colors.warningOrange
        }
    }
}

// MARK: - View Extensions

extension View {
    /// Add focus change callback for text fields
    func onFocusChange(_ action: @escaping (Bool) -> Void) -> some View {
        self.background(
            FocusChangeDetector(onFocusChange: action)
        )
    }
}

// MARK: - Focus Detection Helper

private struct FocusChangeDetector: UIViewRepresentable {
    let onFocusChange: (Bool) -> Void
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        // Focus detection logic would be implemented here
        // This is a simplified version for the example
    }
}