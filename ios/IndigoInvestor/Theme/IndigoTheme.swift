import SwiftUI

// MARK: - Unified Indigo Design System
// Synchronized with web design tokens from /src/design-system/tokens.ts
// Last synced: 2025-11-23

struct IndigoTheme {
    // MARK: - Colors (HSL-based from web tokens)
    struct Colors {
        // MARK: - Brand Colors
        // Primary - Dark Blue (hsl(222.2 47.4% 11.2%))
        static let primary = Color(hue: 222.2/360, saturation: 0.474, brightness: 0.112)
        static let primaryForeground = Color(hue: 210/360, saturation: 0.40, brightness: 0.98)

        // Secondary - Light Gray (hsl(210 40% 96.1%))
        static let secondary = Color(hue: 210/360, saturation: 0.40, brightness: 0.961)
        static let secondaryForeground = primary

        // MARK: - Semantic Colors
        // Success - Green (hsl(142 76% 36%))
        static let success = Color(hue: 142/360, saturation: 0.76, brightness: 0.36)
        static let successLight = Color(hue: 142/360, saturation: 0.70, brightness: 0.45)
        static let successDark = Color(hue: 142/360, saturation: 0.80, brightness: 0.28)

        // Warning - Orange (hsl(38 92% 50%))
        static let warning = Color(hue: 38/360, saturation: 0.92, brightness: 0.50)
        static let warningLight = Color(hue: 38/360, saturation: 0.90, brightness: 0.60)
        static let warningDark = Color(hue: 38/360, saturation: 0.94, brightness: 0.40)

        // Error - Red (hsl(0 84.2% 60.2%))
        static let error = Color(hue: 0, saturation: 0.842, brightness: 0.602)
        static let errorLight = Color(hue: 0, saturation: 0.80, brightness: 0.70)
        static let errorDark = Color(hue: 0, saturation: 0.88, brightness: 0.50)

        // Info - Blue (hsl(217 91% 60%))
        static let info = Color(hue: 217/360, saturation: 0.91, brightness: 0.60)
        static let infoLight = Color(hue: 217/360, saturation: 0.88, brightness: 0.70)
        static let infoDark = Color(hue: 217/360, saturation: 0.94, brightness: 0.50)

        // MARK: - Gray Scale
        static let gray50 = Color(hue: 210/360, saturation: 0.20, brightness: 0.98)
        static let gray100 = Color(hue: 210/360, saturation: 0.20, brightness: 0.96)
        static let gray200 = Color(hue: 210/360, saturation: 0.20, brightness: 0.90)
        static let gray300 = Color(hue: 210/360, saturation: 0.20, brightness: 0.82)
        static let gray400 = Color(hue: 210/360, saturation: 0.15, brightness: 0.65)
        static let gray500 = Color(hue: 210/360, saturation: 0.10, brightness: 0.50)
        static let gray600 = Color(hue: 210/360, saturation: 0.15, brightness: 0.40)
        static let gray700 = Color(hue: 210/360, saturation: 0.20, brightness: 0.30)
        static let gray800 = Color(hue: 210/360, saturation: 0.25, brightness: 0.20)
        static let gray900 = Color(hue: 210/360, saturation: 0.30, brightness: 0.10)

        // MARK: - iOS Semantic Colors (Adaptive for Dark Mode)
        static let label = Color(hue: 210/360, saturation: 0.30, brightness: 0.10)
        static let secondaryLabel = Color(hue: 210/360, saturation: 0.15, brightness: 0.40)
        static let tertiaryLabel = Color(hue: 210/360, saturation: 0.15, brightness: 0.65)
        static let quaternaryLabel = Color(hue: 210/360, saturation: 0.20, brightness: 0.82)

        static let systemBackground = Color(hue: 210/360, saturation: 0.20, brightness: 0.98)
        static let secondarySystemBackground = Color.white
        static let tertiarySystemBackground = Color(hue: 210/360, saturation: 0.20, brightness: 0.96)

        static let separator = Color(hue: 210/360, saturation: 0.20, brightness: 0.82)
        static let opaqueSeparator = Color(hue: 210/360, saturation: 0.20, brightness: 0.90)

        // MARK: - Background Colors
        static let background = gray50
        static let cardBackground = Color.white
        static let secondaryBackground = Color(hue: 210/360, saturation: 0.40, brightness: 0.961)

        // MARK: - Text Colors
        static let primaryText = gray900
        static let secondaryText = gray600
        static let tertiaryText = gray400

        // MARK: - Asset Colors (Crypto)
        static let btc = Color(hex: "F7931A")
        static let eth = Color(hex: "627EEA")
        static let usdc = Color(hex: "2775CA")

        // MARK: - Legacy Purple Gradient (maintained for compatibility)
        static let primaryGradientStart = Color(hex: "6B4CE6")
        static let primaryGradientEnd = Color(hex: "9B7FFF")
        static let primaryGradient = LinearGradient(
            colors: [primaryGradientStart, primaryGradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Typography (Montserrat-based, iOS text styles)
    struct Typography {
        // iOS Standard Text Styles
        static let largeTitle = Font.custom("Montserrat", size: 34).weight(.regular)
        static let title1 = Font.custom("Montserrat", size: 28).weight(.regular)
        static let title2 = Font.custom("Montserrat", size: 22).weight(.semibold)
        static let title3 = Font.custom("Montserrat", size: 20).weight(.semibold)
        static let headline = Font.custom("Montserrat", size: 17).weight(.semibold)
        static let body = Font.custom("Montserrat", size: 17).weight(.regular)
        static let callout = Font.custom("Montserrat", size: 16).weight(.regular)
        static let subheadline = Font.custom("Montserrat", size: 15).weight(.regular)
        static let footnote = Font.custom("Montserrat", size: 13).weight(.regular)
        static let caption1 = Font.custom("Montserrat", size: 12).weight(.regular)
        static let caption2 = Font.custom("Montserrat", size: 11).weight(.regular)

        // Web-aligned sizes for custom use
        static let xs = Font.custom("Montserrat", size: 12).weight(.regular)
        static let sm = Font.custom("Montserrat", size: 14).weight(.regular)
        static let base = Font.custom("Montserrat", size: 16).weight(.regular)
        static let lg = Font.custom("Montserrat", size: 18).weight(.regular)
        static let xl = Font.custom("Montserrat", size: 20).weight(.regular)
        static let xl2 = Font.custom("Montserrat", size: 24).weight(.regular)
        static let xl3 = Font.custom("Montserrat", size: 30).weight(.regular)
        static let xl4 = Font.custom("Montserrat", size: 36).weight(.regular)

        // Font Weights
        enum Weight {
            static let thin: Font.Weight = .thin
            static let extralight: Font.Weight = .ultraLight
            static let light: Font.Weight = .light
            static let normal: Font.Weight = .regular
            static let medium: Font.Weight = .medium
            static let semibold: Font.Weight = .semibold
            static let bold: Font.Weight = .bold
            static let extrabold: Font.Weight = .heavy
            static let black: Font.Weight = .black
        }
    }

    // MARK: - Spacing (4px grid system)
    struct Spacing {
        static let px: CGFloat = 1
        static let xs: CGFloat = 2     // 0.5
        static let sm: CGFloat = 4     // 1
        static let md: CGFloat = 8     // 2
        static let lg: CGFloat = 12    // 3
        static let xl: CGFloat = 16    // 4
        static let xl2: CGFloat = 20   // 5
        static let xl3: CGFloat = 24   // 6
        static let xl4: CGFloat = 32   // 8
        static let xl5: CGFloat = 40   // 10
        static let xl6: CGFloat = 48   // 12
        static let xl7: CGFloat = 64   // 16
        static let xl8: CGFloat = 80   // 20
        static let xl9: CGFloat = 96   // 24
    }

    // MARK: - Corner Radius
    struct CornerRadius {
        static let none: CGFloat = 0
        static let sm: CGFloat = 2
        static let base: CGFloat = 4
        static let md: CGFloat = 6
        static let lg: CGFloat = 8
        static let xl: CGFloat = 12
        static let xl2: CGFloat = 16
        static let xl3: CGFloat = 24
        static let full: CGFloat = 9999
        static let continuous: CGFloat = 20  // iOS continuous corner radius
    }

    // MARK: - Shadows
    struct Shadow {
        static let none = (color: Color.clear, radius: CGFloat(0), x: CGFloat(0), y: CGFloat(0))
        static let sm = (color: Color.black.opacity(0.05), radius: CGFloat(2), x: CGFloat(0), y: CGFloat(1))
        static let base = (color: Color.black.opacity(0.1), radius: CGFloat(3), x: CGFloat(0), y: CGFloat(1))
        static let md = (color: Color.black.opacity(0.1), radius: CGFloat(6), x: CGFloat(0), y: CGFloat(4))
        static let lg = (color: Color.black.opacity(0.1), radius: CGFloat(15), x: CGFloat(0), y: CGFloat(10))
        static let xl = (color: Color.black.opacity(0.1), radius: CGFloat(25), x: CGFloat(0), y: CGFloat(20))
        static let xl2 = (color: Color.black.opacity(0.25), radius: CGFloat(50), x: CGFloat(0), y: CGFloat(25))
        static let inner = (color: Color.black.opacity(0.05), radius: CGFloat(4), x: CGFloat(0), y: CGFloat(2))
    }

    // MARK: - Animation
    struct Animation {
        static let instant: TimeInterval = 0
        static let fast: TimeInterval = 0.15
        static let normal: TimeInterval = 0.3
        static let slow: TimeInterval = 0.5
        static let slower: TimeInterval = 0.7
        static let slowest: TimeInterval = 1.0

        // Easing functions
        static let linear = SwiftUI.Animation.linear
        static let easeIn = SwiftUI.Animation.easeIn
        static let easeOut = SwiftUI.Animation.easeOut
        static let easeInOut = SwiftUI.Animation.easeInOut
        static let spring = SwiftUI.Animation.spring(response: 0.5, dampingFraction: 0.7)
    }

    // MARK: - Opacity
    struct Opacity {
        static let transparent: Double = 0
        static let level5: Double = 0.05
        static let level10: Double = 0.1
        static let level20: Double = 0.2
        static let level25: Double = 0.25
        static let level30: Double = 0.3
        static let level40: Double = 0.4
        static let level50: Double = 0.5
        static let level60: Double = 0.6
        static let level70: Double = 0.7
        static let level75: Double = 0.75
        static let level80: Double = 0.8
        static let level90: Double = 0.9
        static let level95: Double = 0.95
        static let opaque: Double = 1.0
    }

    // MARK: - Z-Index (for layering)
    struct ZIndex {
        static let auto: Double = 0
        static let base: Double = 10
        static let dropdown: Double = 100
        static let sticky: Double = 200
        static let fixed: Double = 300
        static let modalBackdrop: Double = 400
        static let modal: Double = 500
        static let popover: Double = 600
        static let tooltip: Double = 700
        static let notification: Double = 800
        static let commandPalette: Double = 900
        static let max: Double = 999
    }
}

// MARK: - Color Extension for Hex Support
extension Color {
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
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - View Modifiers
struct CardStyle: ViewModifier {
    var padding: CGFloat = IndigoTheme.Spacing.xl
    var cornerRadius: CGFloat = IndigoTheme.CornerRadius.xl

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(cornerRadius)
            .shadow(
                color: IndigoTheme.Shadow.md.color,
                radius: IndigoTheme.Shadow.md.radius,
                x: IndigoTheme.Shadow.md.x,
                y: IndigoTheme.Shadow.md.y
            )
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: IndigoTheme.Spacing.md) {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            }
            configuration.label
        }
        .font(IndigoTheme.Typography.headline)
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .frame(height: 56)
        .background(IndigoTheme.Colors.primary)
        .cornerRadius(IndigoTheme.CornerRadius.xl)
        .scaleEffect(configuration.isPressed ? 0.95 : 1)
        .opacity(isLoading ? IndigoTheme.Opacity.level70 : IndigoTheme.Opacity.opaque)
        .animation(IndigoTheme.Animation.easeInOut, value: configuration.isPressed)
        .animation(IndigoTheme.Animation.easeInOut, value: isLoading)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(IndigoTheme.Colors.primary)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.xl)
                    .stroke(IndigoTheme.Colors.separator, lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(IndigoTheme.Animation.easeInOut, value: configuration.isPressed)
    }
}

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(IndigoTheme.Colors.primary)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(Color.clear)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.xl)
                    .stroke(IndigoTheme.Colors.primary, lineWidth: 2)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(IndigoTheme.Animation.easeInOut, value: configuration.isPressed)
    }
}

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(IndigoTheme.Colors.error)
            .cornerRadius(IndigoTheme.CornerRadius.xl)
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(IndigoTheme.Animation.easeInOut, value: configuration.isPressed)
    }
}

// MARK: - View Extensions
extension View {
    func cardStyle(padding: CGFloat = IndigoTheme.Spacing.xl, cornerRadius: CGFloat = IndigoTheme.CornerRadius.xl) -> some View {
        modifier(CardStyle(padding: padding, cornerRadius: cornerRadius))
    }

    func primaryButtonStyle(isLoading: Bool = false) -> some View {
        buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
    }

    func secondaryButtonStyle() -> some View {
        buttonStyle(SecondaryButtonStyle())
    }

    func outlineButtonStyle() -> some View {
        buttonStyle(OutlineButtonStyle())
    }

    func destructiveButtonStyle() -> some View {
        buttonStyle(DestructiveButtonStyle())
    }
}

// MARK: - Adaptive Layout Helper
struct AdaptiveLayout {
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    var isCompact: Bool {
        horizontalSizeClass == .compact && verticalSizeClass == .regular
    }

    var isPad: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    var spacing: CGFloat {
        isCompact ? IndigoTheme.Spacing.lg :
        isPad ? IndigoTheme.Spacing.xl3 :
        IndigoTheme.Spacing.xl
    }

    var padding: CGFloat {
        isCompact ? IndigoTheme.Spacing.xl :
        isPad ? IndigoTheme.Spacing.xl3 :
        IndigoTheme.Spacing.xl
    }

    var columns: [GridItem] {
        isPad ? [GridItem(.adaptive(minimum: 300))] :
        isCompact ? [GridItem(.flexible())] :
        [GridItem(.flexible()), GridItem(.flexible())]
    }

    var cardCornerRadius: CGFloat {
        isCompact ? IndigoTheme.CornerRadius.lg :
        isPad ? IndigoTheme.CornerRadius.xl2 :
        IndigoTheme.CornerRadius.xl
    }
}
