//
//  DesignTokens.swift
//  IndigoInvestor
//
//  Complete design token system for Indigo Yield iOS app
//

import SwiftUI
import UIKit

// MARK: - Design Tokens

public struct DesignTokens {

    // MARK: - Colors

    public struct Colors {

        // MARK: Brand Core - Matches src/index.css HSL values
        
        // Primary Brand (231 48% 48%) -> #3F51B5
        public static let indigoPrimary = Color(hex: "#3F51B5")
        
        // Deep Indigo (231 53% 35%) -> #2A3693 (Corrected from #283593 to match HSL closer)
        public static let indigoDeep = Color(hex: "#2A3693")
        
        // Soft Tint (231 44% 96%) -> #E8EAF6
        public static let indigoSoft = Color(hex: "#E8EAF6")

        // Yield Green (150 100% 39%) -> #00C752
        public static let indigoAccent = Color(hex: "#00C752")
        
        // Legacy Alias
        public static let indigoSecondary = indigoDeep
        public static let indigoLight = indigoSoft

        // MARK: Financial Data Colors
        public static let positiveGreen = indigoAccent // Use brand yield green
        public static let negativeRed = Color(hex: "#EF4444")
        public static let neutralGray = Color(hex: "#6B7280")

        // MARK: Asset Category Colors
        public static let equityBlue = Color(hex: "#3B82F6")
        public static let bondGreen = Color(hex: "#10B981")
        public static let cryptoOrange = Color(hex: "#F59E0B")
        public static let realEstateRed = Color(hex: "#DC2626")
        public static let commodityPurple = Color(hex: "#8B5CF6")
        public static let cashGray = Color(hex: "#4B5563")

        // MARK: System Colors (iOS Adaptive)
        public static let backgroundPrimary = Color(.systemBackground)
        public static let backgroundSecondary = Color(.secondarySystemBackground)
        public static let backgroundTertiary = Color(.tertiarySystemBackground)
        public static let backgroundQuaternary = Color(.quaternarySystemFill)

        public static let textPrimary = Color(.label)
        public static let textSecondary = Color(.secondaryLabel)
        public static let textTertiary = Color(.tertiaryLabel)
        public static let textPlaceholder = Color(.placeholderText)

        // MARK: Status Colors
        public static let successGreen = positiveGreen
        public static let warningOrange = Color(.systemOrange)
        public static let errorRed = Color(.systemRed)
        public static let infoBlue = Color(.systemBlue)

        // MARK: Interactive Colors
        public static let linkBlue = Color(.link)
        public static let separatorGray = Color(.separator)
        public static let opaqueSeparator = Color(.opaqueSeparator)
        
        // MARK: Component Color Aliases
        public static let cardBackground = backgroundSecondary
        public static let buttonPrimary = indigoPrimary
        public static let inputBackground = backgroundSecondary
        public static let inputFocusBorder = indigoPrimary
        public static let inputBorder = separatorGray
        public static let warningAmber = warningOrange

        // MARK: Chart Colors
        public static let chartColors: [Color] = [
            indigoPrimary,
            equityBlue,
            bondGreen,
            cryptoOrange,
            realEstateRed,
            commodityPurple,
            .purple,
            .pink
        ]

        // MARK: Gradient Definitions
        public static let indigoGradient = LinearGradient(
            colors: [indigoPrimary, indigoDeep],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        public static let successGradient = LinearGradient(
            colors: [positiveGreen, positiveGreen.opacity(0.8)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        public static let cardGradient = LinearGradient(
            colors: [backgroundSecondary, backgroundTertiary],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    // MARK: - Typography

    public struct Typography {

        // MARK: Display Text (Montserrat - "The Display Layer")
        // Matches CSS: font-family: "Montserrat", sans-serif;
        static let largeTitle = Font.custom("Montserrat-Bold", size: 34)
        static let title1 = Font.custom("Montserrat-Bold", size: 28)
        static let title2 = Font.custom("Montserrat-SemiBold", size: 22)
        static let title3 = Font.custom("Montserrat-SemiBold", size: 20)

        // MARK: Body Text (Inter - "The UI Layer")
        // Matches CSS: font-family: "Inter", sans-serif;
        // Using System font with specific design traits to approximate Inter on iOS
        // or fallback to system if custom font not loaded
        static let headline = Font.system(.headline, design: .default).weight(.semibold)
        static let subheadline = Font.system(.subheadline, design: .default).weight(.medium)
        static let body = Font.system(.body, design: .default)
        static let bodyEmphasized = Font.system(.body, design: .default).weight(.medium)
        static let callout = Font.system(.callout, design: .default)
        static let calloutEmphasized = Font.system(.callout, design: .default).weight(.medium)

        // MARK: Financial Numbers (JetBrains Mono - "The Precision Layer")
        // Matches CSS: font-family: "JetBrains Mono", monospace;
        static let financialLarge = Font.system(size: 32, weight: .bold, design: .monospaced)
        static let financialMedium = Font.system(size: 24, weight: .semibold, design: .monospaced)
        static let financialSmall = Font.system(size: 16, weight: .medium, design: .monospaced)
        static let financialCaption = Font.system(size: 12, weight: .medium, design: .monospaced)

        // MARK: Small Text
        static let footnote = Font.footnote
        static let footnoteEmphasized = Font.footnote.weight(.medium)
        static let caption1 = Font.caption
        static let caption1Emphasized = Font.caption.weight(.medium)
        static let caption2 = Font.caption2

        // MARK: Monospace (Strict)
        static let monospaceBody = Font.body.monospaced()
        static let monospaceSmall = Font.footnote.monospaced()
    }

    // MARK: - Spacing

    public struct Spacing {
        // Base 4pt Grid System
        static let xxs: CGFloat = 4      // 4pt
        static let xs: CGFloat = 8       // 8pt
        static let sm: CGFloat = 12      // 12pt
        static let md: CGFloat = 16      // 16pt
        static let lg: CGFloat = 24      // 24pt
        static let xl: CGFloat = 32      // 32pt
        static let xxl: CGFloat = 48     // 48pt
        static let xxxl: CGFloat = 64    // 64pt

        // Component Specific
        static let cardPadding: CGFloat = 16
        static let sectionSpacing: CGFloat = 24
        static let listRowSpacing: CGFloat = 12
        static let buttonSpacing: CGFloat = 16

        // Layout Margins
        static let screenMargin: CGFloat = 16
        static let safeAreaInset: CGFloat = 8
    }

    // MARK: - Component Sizes

    public struct ComponentSizes {
        // Buttons
        public static let buttonHeight: CGFloat = 50
        public static let buttonHeightCompact: CGFloat = 36
        public static let buttonCornerRadius: CGFloat = 8
        public static let pillButtonCornerRadius: CGFloat = 25

        // Input Fields
        public static let inputHeight: CGFloat = 44
        public static let inputCornerRadius: CGFloat = 8

        // Cards
        public static let cardCornerRadius: CGFloat = 12
        public static let cardCornerRadiusSmall: CGFloat = 8
        public static let smallCardCornerRadius = cardCornerRadiusSmall  // Alias for naming consistency

        // Icons
        public static let iconSmall: CGFloat = 16
        public static let iconMedium: CGFloat = 24
        public static let iconLarge: CGFloat = 32
        public static let iconXLarge: CGFloat = 48

        // Touch Targets (iOS HIG Minimum)
        public static let minimumTouchTarget: CGFloat = 44

        // Tab Bar
        public static let tabBarHeight: CGFloat = 49
        public static let tabBarIconSize: CGFloat = 25
    }
    
    // MARK: - Legacy API Compatibility
    public typealias Dimensions = ComponentSizes
    
    // MARK: - Shadows

    public struct Shadow {
        public struct Style {
            public let color: Color
            public let radius: CGFloat
            public let x: CGFloat
            public let y: CGFloat
            public let opacity: Double

            init(color: Color = .black, radius: CGFloat, x: CGFloat = 0, y: CGFloat, opacity: Double) {
                self.color = color
                self.radius = radius
                self.x = x
                self.y = y
                self.opacity = opacity
            }
        }

        public static let none = Style(radius: 0, y: 0, opacity: 0)
        public static let small = Style(radius: 2, y: 1, opacity: 0.05)
        public static let subtleShadow = small  // Legacy alias
        public static let medium = Style(radius: 4, y: 2, opacity: 0.1)
        public static let large = Style(radius: 8, y: 4, opacity: 0.15)
        public static let xlarge = Style(radius: 16, y: 8, opacity: 0.2)

        // Card specific shadows
        public static let card = Style(radius: 4, y: 2, opacity: 0.08)
        public static let cardHover = Style(radius: 8, y: 4, opacity: 0.12)
        public static let modal = Style(radius: 24, y: 12, opacity: 0.25)
    }
    
    public typealias Shadows = Shadow
    
    // MARK: - Animation

    public struct Animation {
        public static let fast = SwiftUI.Animation.easeInOut(duration: 0.2)
        public static let medium = SwiftUI.Animation.easeInOut(duration: 0.3)
        public static let slow = SwiftUI.Animation.easeInOut(duration: 0.5)

        public static let spring = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.8)
        public static let springBouncy = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.6)
        public static let springSnappy = SwiftUI.Animation.spring(response: 0.2, dampingFraction: 0.9)

        // Micro-interactions
        public static let buttonPress = SwiftUI.Animation.easeOut(duration: 0.1)
        public static let tabSwitch = SwiftUI.Animation.easeInOut(duration: 0.25)
        public static let modalPresentation = SwiftUI.Animation.spring(response: 0.5, dampingFraction: 0.8)
    }
    
    public typealias Animations = Animation

    // MARK: - Blur Effects

    public struct Blur {
        static let light = UIBlurEffect.Style.systemThinMaterial
        static let medium = UIBlurEffect.Style.systemMaterial
        static let heavy = UIBlurEffect.Style.systemThickMaterial
        static let ultraThin = UIBlurEffect.Style.systemUltraThinMaterial
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let red = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let green = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let blue = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: red, green: green, blue: blue)
    }

    var hexString: String? {
        guard let components = UIColor(self).cgColor.components else { return nil }

        let red = Int(components[0] * 255.0)
        let green = Int(components[1] * 255.0)
        let blue = Int(components[2] * 255.0)

        return String(format: "#%02X%02X%02X", red, green, blue)
    }
}

// MARK: - View Modifier Extensions

extension View {

    // MARK: - Card Modifiers

    func indigoCard(padding: CGFloat = DesignTokens.Spacing.md) -> some View {
        self
            .padding(padding)
            .background(DesignTokens.Colors.backgroundSecondary)
            .cornerRadius(DesignTokens.ComponentSizes.cardCornerRadius)
            .shadow(
                color: DesignTokens.Shadow.card.color.opacity(DesignTokens.Shadow.card.opacity),
                radius: DesignTokens.Shadow.card.radius,
                x: DesignTokens.Shadow.card.x,
                y: DesignTokens.Shadow.card.y
            )
    }

    func indigoCardElevated(padding: CGFloat = DesignTokens.Spacing.md) -> some View {
        self
            .padding(padding)
            .background(DesignTokens.Colors.backgroundSecondary)
            .cornerRadius(DesignTokens.ComponentSizes.cardCornerRadius)
            .shadow(
                color: DesignTokens.Shadow.large.color.opacity(DesignTokens.Shadow.large.opacity),
                radius: DesignTokens.Shadow.large.radius,
                x: DesignTokens.Shadow.large.x,
                y: DesignTokens.Shadow.large.y
            )
    }

    // MARK: - Button Modifiers

    func indigoPrimaryButton() -> some View {
        self
            .font(DesignTokens.Typography.bodyEmphasized)
            .foregroundColor(.white)
            .frame(height: DesignTokens.ComponentSizes.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Colors.indigoPrimary)
            .cornerRadius(DesignTokens.ComponentSizes.buttonCornerRadius)
    }

    func indigoSecondaryButton() -> some View {
        self
            .font(DesignTokens.Typography.bodyEmphasized)
            .foregroundColor(DesignTokens.Colors.indigoPrimary)
            .frame(height: DesignTokens.ComponentSizes.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Colors.backgroundSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.ComponentSizes.buttonCornerRadius)
                    .stroke(DesignTokens.Colors.indigoPrimary, lineWidth: 1)
            )
    }

    func indigoTertiaryButton() -> some View {
        self
            .font(DesignTokens.Typography.calloutEmphasized)
            .foregroundColor(DesignTokens.Colors.indigoPrimary)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Colors.indigoLight)
            .cornerRadius(DesignTokens.ComponentSizes.buttonCornerRadius)
    }

    func indigoDestructiveButton() -> some View {
        self
            .font(DesignTokens.Typography.bodyEmphasized)
            .foregroundColor(.white)
            .frame(height: DesignTokens.ComponentSizes.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Colors.errorRed)
            .cornerRadius(DesignTokens.ComponentSizes.buttonCornerRadius)
    }

    // MARK: - Typography Modifiers

    func financialValue() -> some View {
        self
            .font(DesignTokens.Typography.financialMedium)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }

    func financialChange(isPositive: Bool) -> some View {
        self
            .font(DesignTokens.Typography.financialSmall)
            .foregroundColor(isPositive ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
    }

    func sectionHeader() -> some View {
        self
            .font(DesignTokens.Typography.headline)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }

    func bodyText() -> some View {
        self
            .font(DesignTokens.Typography.body)
            .foregroundColor(DesignTokens.Colors.textPrimary)
    }

    func secondaryText() -> some View {
        self
            .font(DesignTokens.Typography.body)
            .foregroundColor(DesignTokens.Colors.textSecondary)
    }

    func captionText() -> some View {
        self
            .font(DesignTokens.Typography.caption1)
            .foregroundColor(DesignTokens.Colors.textSecondary)
    }

    // MARK: - Layout Modifiers

    func screenPadding() -> some View {
        self.padding(.horizontal, DesignTokens.Spacing.screenMargin)
    }

    func sectionSpacing() -> some View {
        self.padding(.vertical, DesignTokens.Spacing.sectionSpacing)
    }

    // MARK: - Interactive Modifiers

    func pressEffect() -> some View {
        self
            .scaleEffect(1.0)
            .animation(DesignTokens.Animation.buttonPress, value: false)
    }

    func onPressGesture(onPress: @escaping (Bool) -> Void) -> some View {
        self
            .scaleEffect(1.0)
            .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: onPress) {}
    }

    // MARK: - Accessibility Modifiers

    func accessibleFinancialValue(_ value: String, description: String? = nil) -> some View {
        self
            .accessibilityValue(value)
            .accessibilityHint(description ?? "Financial amount")
            .accessibilityAddTraits(.updatesFrequently)
    }

    func accessibleButton(_ label: String, hint: String? = nil) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(.isButton)
    }
}

// MARK: - Haptic Feedback

enum HapticFeedback {
    case light
    case medium
    case heavy
    case selection
    case success
    case warning
    case error

    func trigger() {
        switch self {
        case .light:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .medium:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .heavy:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .selection:
            UISelectionFeedbackGenerator().selectionChanged()
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

// MARK: - Layout Constants

struct LayoutConstants {
    static let minTouchTarget: CGFloat = 44
    static let maxContentWidth: CGFloat = 414  // iPhone Pro Max width
    static let compactWidth: CGFloat = 320     // iPhone SE width

    // Tab Bar
    static let tabBarHeight: CGFloat = 49
    static let tabBarSafeArea: CGFloat = 34    // iPhone X+ home indicator

    // Navigation
    static let navBarHeight: CGFloat = 44
    static let navBarLargeHeight: CGFloat = 96

    // List Items
    static let listRowHeight: CGFloat = 60
    static let listRowMinHeight: CGFloat = 44
}

// MARK: - Device Utilities

struct DeviceInfo {
    static let idiom = UIDevice.current.userInterfaceIdiom
    static let isPhone = idiom == .phone
    static let isPad = idiom == .pad

    static var screenSize: CGSize {
        UIScreen.main.bounds.size
    }

    static var isCompact: Bool {
        screenSize.width <= LayoutConstants.compactWidth
    }

    static var hasNotch: Bool {
        if let window = UIApplication.shared.windows.first {
            return window.safeAreaInsets.top > 20
        }
        return false
    }
}