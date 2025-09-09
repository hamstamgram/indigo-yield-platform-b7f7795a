# iOS Static Code Analysis Report

## Date: 2025-01-09
## Analysis Tool: grep/manual inspection

## Typography Issues

### Font Usage Statistics
- **System font calls**: 65 instances of `.font(.system`
- **Custom font references**: 0 (No Montserrat detected)
- **Dynamic Type support**: Only 10 instances of text scaling modifiers
  - `minimumScaleFactor`: Found in some views
  - `lineLimit`: Limited usage
  - `allowsTightening`: Minimal implementation

### Typography Violations
- **No custom typography system**: App relies entirely on system fonts
- **Inconsistent sizing**: Using raw `.system(size:)` calls instead of semantic sizes
- **Missing Dynamic Type**: Most text doesn't support accessibility sizing

## Localization Readiness

### Hardcoded Strings
- **Total hardcoded Text() strings**: 205 instances
- **No localization system**: No `NSLocalizedString` or `String(localized:)` usage
- **Impact**: Cannot support multiple languages

### Sample Violations
```swift
Text("Dashboard")       // Should be: Text(String(localized: "dashboard.title"))
Text("Your Portfolio")  // Should be: Text(String(localized: "portfolio.header"))
Text("Settings")        // Should be: Text(String(localized: "settings.title"))
```

## Color System Analysis

### IndigoBrand Colors
- **Custom color extension**: Found in `Color+Brand.swift`
- **System color usage**: Heavy reliance on UIColor.systemBackground
- **Hardcoded colors in dependencies**: 2 instances in Charts library (not app code)

### Color Token Gaps
- No direct hex colors in app code ✅
- Using semantic colors for backgrounds ✅
- Missing complete token mapping with web platform ⚠️

## Spacing & Layout

### No Consistent Spacing System
- No spacing constants or enum found
- Hardcoded padding values throughout
- No alignment with web's 4px grid system

### Sample Issues
```swift
.padding(16)     // Should use: .padding(.spacing.md)
.padding(8)      // Should use: .padding(.spacing.sm)
.padding(24)     // Should use: .padding(.spacing.lg)
```

## Component Consistency

### Button Implementations
- Mix of system buttons and custom styles
- No consistent button component
- Different tap target sizes

### Card Components
- Custom implementations per view
- Inconsistent corner radius
- Variable padding and shadows

## Accessibility Gaps

### VoiceOver Support
- Limited accessibility labels
- No accessibility hints
- Missing traits for custom controls

### Dynamic Type
- Only 10 views support text scaling
- No consistent implementation
- Will break at large text sizes

## Dark Mode Implementation

### Current State
- Using `@Environment(\.colorScheme)`
- System colors adapt automatically
- Custom colors need verification

## File-by-File Violations

### High Priority Files (Most violations)
1. `Views/Dashboard/DashboardView.swift` - 15+ hardcoded strings
2. `Views/Portfolio/PortfolioView.swift` - 12+ hardcoded strings
3. `Views/Admin/AdminDashboardView.swift` - 20+ hardcoded strings
4. `Views/Authentication/AuthenticationView.swift` - 8+ hardcoded strings

### Typography Inconsistency Examples
```
Views/Dashboard/DashboardView.swift:116: .font(.system(size: 24, weight: .bold))
Views/Dashboard/DashboardView.swift:175: .font(.system(size: 16))
Views/Portfolio/PortfolioView.swift:106: .font(.system(size: 18, weight: .semibold))
```

## Recommendations

### Immediate Actions
1. Create `Typography.swift` with Montserrat integration
2. Create `Spacing.swift` with consistent scale
3. Create `Localizable.strings` file
4. Add accessibility labels to all interactive elements

### Typography System Template
```swift
enum Typography {
    static let largeTitle = Font.custom("Montserrat-Bold", size: 34)
    static let title1 = Font.custom("Montserrat-Semibold", size: 28)
    static let title2 = Font.custom("Montserrat-Semibold", size: 22)
    static let title3 = Font.custom("Montserrat-Semibold", size: 20)
    static let headline = Font.custom("Montserrat-Medium", size: 17)
    static let body = Font.custom("Montserrat-Regular", size: 17)
    static let callout = Font.custom("Montserrat-Regular", size: 16)
    static let subheadline = Font.custom("Montserrat-Regular", size: 15)
    static let footnote = Font.custom("Montserrat-Regular", size: 13)
    static let caption1 = Font.custom("Montserrat-Regular", size: 12)
    static let caption2 = Font.custom("Montserrat-Regular", size: 11)
}
```

### Spacing System Template
```swift
enum Spacing {
    static let xxs: CGFloat = 2   // 0.5 * base
    static let xs: CGFloat = 4    // 1 * base (matches web)
    static let sm: CGFloat = 8    // 2 * base
    static let md: CGFloat = 16   // 4 * base
    static let lg: CGFloat = 24   // 6 * base
    static let xl: CGFloat = 32   // 8 * base
    static let xxl: CGFloat = 48  // 12 * base
}
```

## Severity Summary

| Issue | Count | Severity | Effort |
|-------|-------|----------|--------|
| Hardcoded strings | 205 | HIGH | 2-3 days |
| Missing Montserrat | All text | HIGH | 1-2 days |
| No spacing system | All views | MEDIUM | 2-3 days |
| Limited Dynamic Type | 55/65 fonts | MEDIUM | 1-2 days |
| No accessibility labels | Most | MEDIUM | 2-3 days |

## Total Estimated Remediation: 8-13 days
