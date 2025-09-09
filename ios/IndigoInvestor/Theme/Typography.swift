//
//  Typography.swift
//  IndigoInvestor
//
//  Custom typography system using Montserrat font family
//

import SwiftUI

/// Typography system for Indigo Investor app using Montserrat font
public struct Typography {
    // MARK: - Font Names
    private enum FontName {
        static let regular = "Montserrat-Regular"
        static let medium = "Montserrat-Medium"
        static let semiBold = "Montserrat-SemiBold"
        static let bold = "Montserrat-Bold"
        static let light = "Montserrat-Light"
        static let italic = "Montserrat-Italic"
        static let boldItalic = "Montserrat-BoldItalic"
    }
    
    // MARK: - Font Sizes
    private enum FontSize {
        static let largeTitle: CGFloat = 34
        static let title1: CGFloat = 28
        static let title2: CGFloat = 22
        static let title3: CGFloat = 20
        static let headline: CGFloat = 17
        static let body: CGFloat = 17
        static let callout: CGFloat = 16
        static let subheadline: CGFloat = 15
        static let footnote: CGFloat = 13
        static let caption1: CGFloat = 12
        static let caption2: CGFloat = 11
    }
    
    // MARK: - Display Fonts
    public static var largeTitle: Font {
        customFont(FontName.bold, size: FontSize.largeTitle)
    }
    
    public static var title1: Font {
        customFont(FontName.semiBold, size: FontSize.title1)
    }
    
    public static var title2: Font {
        customFont(FontName.semiBold, size: FontSize.title2)
    }
    
    public static var title3: Font {
        customFont(FontName.semiBold, size: FontSize.title3)
    }
    
    // MARK: - Text Fonts
    public static var headline: Font {
        customFont(FontName.semiBold, size: FontSize.headline)
    }
    
    public static var body: Font {
        customFont(FontName.regular, size: FontSize.body)
    }
    
    public static var bodyMedium: Font {
        customFont(FontName.medium, size: FontSize.body)
    }
    
    public static var bodyBold: Font {
        customFont(FontName.bold, size: FontSize.body)
    }
    
    public static var callout: Font {
        customFont(FontName.regular, size: FontSize.callout)
    }
    
    public static var subheadline: Font {
        customFont(FontName.regular, size: FontSize.subheadline)
    }
    
    public static var footnote: Font {
        customFont(FontName.regular, size: FontSize.footnote)
    }
    
    public static var caption1: Font {
        customFont(FontName.regular, size: FontSize.caption1)
    }
    
    public static var caption2: Font {
        customFont(FontName.regular, size: FontSize.caption2)
    }
    
    // MARK: - Special Styles
    public static var bodyItalic: Font {
        customFont(FontName.italic, size: FontSize.body)
    }
    
    public static var link: Font {
        customFont(FontName.medium, size: FontSize.body)
    }
    
    public static var button: Font {
        customFont(FontName.semiBold, size: FontSize.callout)
    }
    
    public static var tabLabel: Font {
        customFont(FontName.medium, size: FontSize.caption1)
    }
    
    // MARK: - Helper Methods
    private static func customFont(_ name: String, size: CGFloat) -> Font {
        return Font.custom(name, size: size)
    }
    
    /// Returns a custom font with dynamic type support
    public static func custom(_ name: String, size: CGFloat, relativeTo textStyle: Font.TextStyle) -> Font {
        return Font.custom(name, size: size, relativeTo: textStyle)
    }
    
    /// Returns system font as fallback when custom fonts are not available
    public static func systemFallback(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        return Font.system(size: size, weight: weight)
    }
}

// MARK: - View Extensions
extension View {
    /// Apply typography preset to any view
    public func typography(_ style: Font) -> some View {
        self.font(style)
    }
    
    /// Apply large title typography
    public func largeTitleStyle() -> some View {
        self.font(Typography.largeTitle)
    }
    
    /// Apply headline typography
    public func headlineStyle() -> some View {
        self.font(Typography.headline)
    }
    
    /// Apply body typography
    public func bodyStyle() -> some View {
        self.font(Typography.body)
    }
    
    /// Apply caption typography
    public func captionStyle() -> some View {
        self.font(Typography.caption1)
    }
}

// MARK: - Text Extensions
extension Text {
    /// Apply typography with additional text modifiers
    public func typography(_ style: Font, color: Color? = nil) -> Text {
        var text = self.font(style)
        if let color = color {
            text = text.foregroundColor(color)
        }
        return text
    }
}

// MARK: - Font Registration
public struct FontRegistration {
    /// Register custom fonts with the system
    /// This should be called once during app initialization
    public static func registerFonts() {
        let fontNames = [
            "Montserrat-Black",
            "Montserrat-BlackItalic",
            "Montserrat-Bold",
            "Montserrat-BoldItalic",
            "Montserrat-ExtraBold",
            "Montserrat-ExtraBoldItalic",
            "Montserrat-ExtraLight",
            "Montserrat-ExtraLightItalic",
            "Montserrat-Italic",
            "Montserrat-Light",
            "Montserrat-LightItalic",
            "Montserrat-Medium",
            "Montserrat-MediumItalic",
            "Montserrat-Regular",
            "Montserrat-SemiBold",
            "Montserrat-SemiBoldItalic",
            "Montserrat-Thin",
            "Montserrat-ThinItalic"
        ]
        
        for fontName in fontNames {
            registerFont(named: fontName)
        }
    }
    
    private static func registerFont(named name: String) {
        guard let fontURL = Bundle.main.url(forResource: name, withExtension: "ttf"),
              let fontData = try? Data(contentsOf: fontURL) as CFData,
              let provider = CGDataProvider(data: fontData),
              let font = CGFont(provider) else {
            print("Failed to register font: \(name)")
            return
        }
        
        var error: Unmanaged<CFError>?
        if !CTFontManagerRegisterGraphicsFont(font, &error) {
            print("Error registering font \(name): \(error?.takeRetainedValue() ?? "Unknown error" as CFError)")
        }
    }
}

// MARK: - Dynamic Type Support
public struct DynamicTypeModifier: ViewModifier {
    let textStyle: Font.TextStyle
    let fontName: String
    let baseSize: CGFloat
    
    @Environment(\.sizeCategory) var sizeCategory
    
    public func body(content: Content) -> some View {
        content.font(scaledFont)
    }
    
    private var scaledFont: Font {
        let scaledSize = UIFontMetrics(forTextStyle: uiTextStyle)
            .scaledValue(for: baseSize)
        return Font.custom(fontName, size: scaledSize)
    }
    
    private var uiTextStyle: UIFont.TextStyle {
        switch textStyle {
        case .largeTitle: return .largeTitle
        case .title: return .title1
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .body: return .body
        case .callout: return .callout
        case .subheadline: return .subheadline
        case .footnote: return .footnote
        case .caption: return .caption1
        case .caption2: return .caption2
        default: return .body
        }
    }
}

extension View {
    /// Apply dynamic type support to custom fonts
    public func dynamicTypeFont(name: String, baseSize: CGFloat, textStyle: Font.TextStyle) -> some View {
        self.modifier(DynamicTypeModifier(textStyle: textStyle, fontName: name, baseSize: baseSize))
    }
}
