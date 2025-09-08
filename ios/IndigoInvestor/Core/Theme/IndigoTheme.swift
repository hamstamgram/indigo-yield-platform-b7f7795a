//
//  IndigoTheme.swift
//  IndigoInvestor
//
//  App-wide theme and styling constants
//

import SwiftUI
import UIKit

struct IndigoTheme {
    
    // MARK: - Colors
    struct Colors {
        static let primary = Color("IndigoPrimary", bundle: nil)
        static let secondary = Color("IndigoSecondary", bundle: nil) 
        static let accent = Color("IndigoAccent", bundle: nil)
        static let background = Color(.systemBackground)
        static let secondaryBackground = Color(.secondarySystemBackground)
        static let tertiaryBackground = Color(.tertiarySystemBackground)
        
        // Semantic colors
        static let success = Color.green
        static let warning = Color.orange
        static let error = Color.red
        static let info = Color.blue
        
        // Default fallback colors if asset catalog colors are not found
        static let defaultPrimary = Color(red: 0.255, green: 0.278, blue: 0.502) // Indigo
        static let defaultSecondary = Color(red: 0.471, green: 0.498, blue: 0.678)
        static let defaultAccent = Color(red: 0.984, green: 0.725, blue: 0.157) // Gold
    }
    
    // MARK: - Typography
    struct Typography {
        static let largeTitle = Font.largeTitle
        static let title = Font.title
        static let title2 = Font.title2
        static let title3 = Font.title3
        static let headline = Font.headline
        static let subheadline = Font.subheadline
        static let body = Font.body
        static let callout = Font.callout
        static let footnote = Font.footnote
        static let caption = Font.caption
        static let caption2 = Font.caption2
    }
    
    // MARK: - Spacing
    struct Spacing {
        static let xxSmall: CGFloat = 4
        static let xSmall: CGFloat = 8
        static let small: CGFloat = 12
        static let medium: CGFloat = 16
        static let large: CGFloat = 24
        static let xLarge: CGFloat = 32
        static let xxLarge: CGFloat = 48
    }
    
    // MARK: - Corner Radius
    struct CornerRadius {
        static let small: CGFloat = 4
        static let medium: CGFloat = 8
        static let large: CGFloat = 12
        static let xLarge: CGFloat = 16
        static let round: CGFloat = 9999
    }
    
    // MARK: - Shadows
    struct Shadow {
        static let light = ShadowStyle(
            color: Color.black.opacity(0.05),
            radius: 4,
            x: 0,
            y: 2
        )
        
        static let medium = ShadowStyle(
            color: Color.black.opacity(0.1),
            radius: 8,
            x: 0,
            y: 4
        )
        
        static let heavy = ShadowStyle(
            color: Color.black.opacity(0.15),
            radius: 12,
            x: 0,
            y: 6
        )
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
            case .success, .warning, .error:
                UINotificationFeedbackGenerator().notificationOccurred(
                    self == .success ? .success : (self == .warning ? .warning : .error)
                )
            }
        }
    }
    
    // MARK: - Animation
    struct Animation {
        static let fast = SwiftUI.Animation.easeInOut(duration: 0.2)
        static let medium = SwiftUI.Animation.easeInOut(duration: 0.3)
        static let slow = SwiftUI.Animation.easeInOut(duration: 0.5)
        static let spring = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.8)
    }
}

// MARK: - Shadow Style
struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - View Extensions
extension View {
    func indigoCard() -> some View {
        self
            .padding()
            .background(IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.large)
            .shadow(
                color: IndigoTheme.Shadow.light.color,
                radius: IndigoTheme.Shadow.light.radius,
                x: IndigoTheme.Shadow.light.x,
                y: IndigoTheme.Shadow.light.y
            )
    }
    
    func indigoPrimaryButton() -> some View {
        self
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(IndigoTheme.Colors.primary)
            .cornerRadius(IndigoTheme.CornerRadius.medium)
    }
    
    func indigoSecondaryButton() -> some View {
        self
            .font(.headline)
            .foregroundColor(IndigoTheme.Colors.primary)
            .frame(maxWidth: .infinity)
            .padding()
            .background(IndigoTheme.Colors.secondaryBackground)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.medium)
                    .stroke(IndigoTheme.Colors.primary, lineWidth: 1)
            )
    }
}

// MARK: - Color Extension for Fallback
extension Color {
    init(_ name: String, bundle: Bundle?) {
        if let color = UIColor(named: name, in: bundle, compatibleWith: nil) {
            self = Color(color)
        } else {
            // Fallback to default colors
            switch name {
            case "IndigoPrimary":
                self = IndigoTheme.Colors.defaultPrimary
            case "IndigoSecondary":
                self = IndigoTheme.Colors.defaultSecondary
            case "IndigoAccent":
                self = IndigoTheme.Colors.defaultAccent
            default:
                self = Color.gray
            }
        }
    }
}
