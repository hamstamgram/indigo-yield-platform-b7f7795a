//
//  IndigoTheme.swift
//  IndigoInvestor
//
//  Comprehensive design system and theming
//

import SwiftUI
import UIKit

// MARK: - Indigo Theme

struct IndigoTheme {
    // MARK: - Colors
    
    struct Colors {
        // Primary colors
        static let primary = Color(hex: "7C3AED")
        static let primaryDark = Color(hex: "5B21B6")
        static let primaryLight = Color(hex: "A78BFA")
        static let primaryBackground = Color(hex: "F3F0FF")
        
        // Secondary colors
        static let secondary = Color(hex: "10B981")
        static let secondaryDark = Color(hex: "059669")
        static let secondaryLight = Color(hex: "34D399")
        
        // Neutral colors
        static let text = Color(hex: "111827")
        static let textSecondary = Color(hex: "6B7280")
        static let textTertiary = Color(hex: "9CA3AF")
        static let border = Color(hex: "E5E7EB")
        static let divider = Color(hex: "F3F4F6")
        static let background = Color(hex: "FFFFFF")
        static let backgroundSecondary = Color(hex: "F9FAFB")
        
        // Semantic colors
        static let success = Color(hex: "10B981")
        static let warning = Color(hex: "F59E0B")
        static let error = Color(hex: "EF4444")
        static let info = Color(hex: "3B82F6")
        
        // Asset colors
        static let bitcoin = Color(hex: "F7931A")
        static let ethereum = Color(hex: "627EEA")
        static let solana = Color(hex: "14F195")
        static let usdc = Color(hex: "2775CA")
        
        // Dark mode variants
        static let darkBackground = Color(hex: "111827")
        static let darkBackgroundSecondary = Color(hex: "1F2937")
        static let darkText = Color(hex: "F9FAFB")
        static let darkTextSecondary = Color(hex: "D1D5DB")
        static let darkBorder = Color(hex: "374151")
    }
    
    // MARK: - Typography
    
    struct Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
        static let title1 = Font.system(size: 28, weight: .bold, design: .rounded)
        static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
        static let title3 = Font.system(size: 20, weight: .semibold, design: .rounded)
        static let headline = Font.system(size: 17, weight: .semibold, design: .default)
        static let body = Font.system(size: 17, weight: .regular, design: .default)
        static let callout = Font.system(size: 16, weight: .regular, design: .default)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
        static let footnote = Font.system(size: 13, weight: .regular, design: .default)
        static let caption1 = Font.system(size: 12, weight: .regular, design: .default)
        static let caption2 = Font.system(size: 11, weight: .regular, design: .default)
        
        // Monospace for numbers
        static let monospaceTitle = Font.system(size: 28, weight: .bold, design: .monospaced)
        static let monospaceBody = Font.system(size: 17, weight: .regular, design: .monospaced)
        static let monospaceCaption = Font.system(size: 12, weight: .regular, design: .monospaced)
    }
    
    // MARK: - Spacing
    
    struct Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }
    
    // MARK: - Corner Radius
    
    struct CornerRadius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
        static let xl: CGFloat = 16
        static let xxl: CGFloat = 20
        static let full: CGFloat = 9999
    }
    
    // MARK: - Shadows
    
    struct Shadows {
        static let sm = Shadow(
            color: Color.black.opacity(0.05),
            radius: 2,
            x: 0,
            y: 1
        )
        
        static let md = Shadow(
            color: Color.black.opacity(0.1),
            radius: 4,
            x: 0,
            y: 2
        )
        
        static let lg = Shadow(
            color: Color.black.opacity(0.15),
            radius: 8,
            x: 0,
            y: 4
        )
        
        static let xl = Shadow(
            color: Color.black.opacity(0.2),
            radius: 16,
            x: 0,
            y: 8
        )
    }
    
    // MARK: - Animations
    
    struct Animations {
        static let quick = Animation.easeInOut(duration: 0.2)
        static let standard = Animation.easeInOut(duration: 0.3)
        static let slow = Animation.easeInOut(duration: 0.5)
        static let spring = Animation.spring(response: 0.3, dampingFraction: 0.7)
        static let bouncy = Animation.spring(response: 0.4, dampingFraction: 0.6)
    }
    
    // MARK: - Haptics
    
    enum HapticFeedback {
        case light
        case medium
        case heavy
        case success
        case warning
        case error
        case selection
        
        func trigger() {
            switch self {
            case .light:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            case .medium:
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            case .heavy:
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            case .success:
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            case .warning:
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            case .error:
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            case .selection:
                UISelectionFeedbackGenerator().selectionChanged()
            }
        }
    }
}

// MARK: - Reusable Components

// MARK: Card Component
struct IndigoCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = IndigoTheme.Spacing.lg
    var backgroundColor: Color = IndigoTheme.Colors.background
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(padding)
            .background(backgroundColor)
            .cornerRadius(IndigoTheme.CornerRadius.lg)
            .shadow(
                color: IndigoTheme.Shadows.md.color,
                radius: IndigoTheme.Shadows.md.radius,
                x: IndigoTheme.Shadows.md.x,
                y: IndigoTheme.Shadows.md.y
            )
    }
}

// MARK: Tag Component
struct IndigoTag: View {
    let text: String
    var color: Color = IndigoTheme.Colors.primary
    var textColor: Color = .white
    
    var body: some View {
        Text(text)
            .font(IndigoTheme.Typography.caption1)
            .fontWeight(.medium)
            .foregroundColor(textColor)
            .padding(.horizontal, IndigoTheme.Spacing.sm)
            .padding(.vertical, IndigoTheme.Spacing.xs)
            .background(color)
            .cornerRadius(IndigoTheme.CornerRadius.sm)
    }
}

// MARK: Chip Component
struct IndigoChip: View {
    let text: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(IndigoTheme.Typography.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : IndigoTheme.Colors.text)
                .padding(.horizontal, IndigoTheme.Spacing.md)
                .padding(.vertical, IndigoTheme.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.full)
                        .fill(isSelected ? IndigoTheme.Colors.primary : IndigoTheme.Colors.backgroundSecondary)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.full)
                        .stroke(isSelected ? Color.clear : IndigoTheme.Colors.border, lineWidth: 1)
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: Stat Row Component
struct IndigoStatRow: View {
    let label: String
    let value: String
    var valueColor: Color = IndigoTheme.Colors.text
    var icon: String? = nil
    
    var body: some View {
        HStack {
            if let icon = icon {
                Image(systemName: icon)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                    .frame(width: 20)
            }
            
            Text(label)
                .font(IndigoTheme.Typography.body)
                .foregroundColor(IndigoTheme.Colors.textSecondary)
            
            Spacer()
            
            Text(value)
                .font(IndigoTheme.Typography.body)
                .fontWeight(.semibold)
                .foregroundColor(valueColor)
        }
        .padding(.vertical, IndigoTheme.Spacing.sm)
    }
}

// MARK: Pill Button Component
struct IndigoPillButton: View {
    let title: String
    let action: () -> Void
    var style: Style = .primary
    var isLoading: Bool = false
    var isDisabled: Bool = false
    
    enum Style {
        case primary
        case secondary
        case outline
        case destructive
    }
    
    private var backgroundColor: Color {
        switch style {
        case .primary:
            return IndigoTheme.Colors.primary
        case .secondary:
            return IndigoTheme.Colors.secondary
        case .outline:
            return Color.clear
        case .destructive:
            return IndigoTheme.Colors.error
        }
    }
    
    private var foregroundColor: Color {
        switch style {
        case .primary, .secondary, .destructive:
            return .white
        case .outline:
            return IndigoTheme.Colors.primary
        }
    }
    
    var body: some View {
        Button(action: {
            IndigoTheme.HapticFeedback.light.trigger()
            action()
        }) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: foregroundColor))
                        .scaleEffect(0.8)
                } else {
                    Text(title)
                        .font(IndigoTheme.Typography.body)
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(foregroundColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, IndigoTheme.Spacing.md)
            .background(backgroundColor)
            .cornerRadius(IndigoTheme.CornerRadius.full)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.full)
                    .stroke(style == .outline ? IndigoTheme.Colors.primary : Color.clear, lineWidth: 2)
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.6 : 1.0)
    }
}

// MARK: Empty State Component
struct IndigoEmptyState: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(IndigoTheme.Colors.textTertiary)
            
            VStack(spacing: IndigoTheme.Spacing.sm) {
                Text(title)
                    .font(IndigoTheme.Typography.title3)
                    .foregroundColor(IndigoTheme.Colors.text)
                
                Text(message)
                    .font(IndigoTheme.Typography.body)
                    .foregroundColor(IndigoTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            if let actionTitle = actionTitle, let action = action {
                IndigoPillButton(title: actionTitle, action: action)
                    .frame(maxWidth: 200)
            }
        }
        .padding(IndigoTheme.Spacing.xxxl)
    }
}

// MARK: Shimmer/Skeleton Loading Component
struct IndigoShimmer: View {
    @State private var isAnimating = false
    var height: CGFloat = 20
    var cornerRadius: CGFloat = IndigoTheme.CornerRadius.sm
    
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(
                LinearGradient(
                    gradient: Gradient(colors: [
                        IndigoTheme.Colors.backgroundSecondary,
                        IndigoTheme.Colors.background,
                        IndigoTheme.Colors.backgroundSecondary
                    ]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: height)
            .redacted(reason: .placeholder)
            .shimmering(active: isAnimating)
            .onAppear {
                isAnimating = true
            }
    }
}

// MARK: - View Extensions

extension View {
    func shimmering(active: Bool = true) -> some View {
        self.modifier(ShimmeringModifier(active: active))
    }
    
    func indigoCard(padding: CGFloat = IndigoTheme.Spacing.lg) -> some View {
        self
            .padding(padding)
            .background(IndigoTheme.Colors.background)
            .cornerRadius(IndigoTheme.CornerRadius.lg)
            .shadow(
                color: IndigoTheme.Shadows.md.color,
                radius: IndigoTheme.Shadows.md.radius,
                x: IndigoTheme.Shadows.md.x,
                y: IndigoTheme.Shadows.md.y
            )
    }
}

// MARK: - Modifiers

struct ShimmeringModifier: ViewModifier {
    let active: Bool
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    if active {
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(0),
                                Color.white.opacity(0.3),
                                Color.white.opacity(0)
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geometry.size.width * 2)
                        .offset(x: -geometry.size.width + phase * geometry.size.width * 2)
                        .animation(
                            Animation.linear(duration: 1.5)
                                .repeatForever(autoreverses: false),
                            value: phase
                        )
                        .onAppear {
                            phase = 1
                        }
                    }
                }
            )
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
}
