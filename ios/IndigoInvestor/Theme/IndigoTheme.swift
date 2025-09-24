import SwiftUI

// MARK: - Indigo Design System
struct IndigoTheme {
    // MARK: - Colors
    struct Colors {
        // Primary Purple Gradient
        static let primaryGradientStart = Color(hex: "6B4CE6")
        static let primaryGradientEnd = Color(hex: "9B7FFF")
        static let primaryGradient = LinearGradient(
            colors: [primaryGradientStart, primaryGradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        // Background Colors
        static let background = Color(hex: "F8F7FC")
        static let cardBackground = Color.white
        static let secondaryBackground = Color(hex: "F5F3FF")

        // Text Colors
        static let primaryText = Color(hex: "1A1A2E")
        static let secondaryText = Color(hex: "6B7280")
        static let tertiaryText = Color(hex: "9CA3AF")

        // Accent Colors
        static let success = Color(hex: "10B981")
        static let warning = Color(hex: "F59E0B")
        static let error = Color(hex: "EF4444")
        static let info = Color(hex: "3B82F6")

        // Asset Colors
        static let btc = Color(hex: "F7931A")
        static let eth = Color(hex: "627EEA")
        static let usdc = Color(hex: "2775CA")
    }

    // MARK: - Typography
    struct Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
        static let title1 = Font.system(size: 28, weight: .bold, design: .rounded)
        static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
        static let title3 = Font.system(size: 20, weight: .semibold, design: .rounded)
        static let headline = Font.system(size: 17, weight: .semibold, design: .rounded)
        static let body = Font.system(size: 17, weight: .regular, design: .rounded)
        static let callout = Font.system(size: 16, weight: .regular, design: .rounded)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .rounded)
        static let footnote = Font.system(size: 13, weight: .regular, design: .rounded)
        static let caption1 = Font.system(size: 12, weight: .regular, design: .rounded)
        static let caption2 = Font.system(size: 11, weight: .regular, design: .rounded)
    }

    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Corner Radius
    struct CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let xl: CGFloat = 20
        static let pill: CGFloat = 100
    }

    // MARK: - Shadows
    struct Shadow {
        static let small = (color: Color.black.opacity(0.05), radius: CGFloat(4), x: CGFloat(0), y: CGFloat(2))
        static let medium = (color: Color.black.opacity(0.08), radius: CGFloat(8), x: CGFloat(0), y: CGFloat(4))
        static let large = (color: Color.black.opacity(0.1), radius: CGFloat(16), x: CGFloat(0), y: CGFloat(8))
    }
}

// MARK: - Color Extension
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
    func body(content: Content) -> some View {
        content
            .background(IndigoTheme.Colors.cardBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
            .shadow(
                color: IndigoTheme.Shadow.medium.color,
                radius: IndigoTheme.Shadow.medium.radius,
                x: IndigoTheme.Shadow.medium.x,
                y: IndigoTheme.Shadow.medium.y
            )
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(IndigoTheme.Colors.primaryGradient)
            .cornerRadius(IndigoTheme.CornerRadius.large)
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(IndigoTheme.Typography.headline)
            .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}