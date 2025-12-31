# Indigo Yield iOS Design System

## Overview

This design system provides a comprehensive foundation for the Indigo Yield investment platform iOS app, emphasizing professional financial aesthetics, accessibility, and consistency with iOS Human Interface Guidelines.

## Design Principles

### 1. Professional Financial Aesthetics
- **Trust & Security**: Colors and typography that convey stability and trustworthiness
- **Data Clarity**: Clear hierarchy for financial information with high contrast
- **Modern Sophistication**: Contemporary design that appeals to professional investors

### 2. iOS Native Excellence
- **Platform Consistency**: Adherence to iOS Human Interface Guidelines
- **Adaptive Design**: Full support for light/dark mode and accessibility features
- **Performance**: Optimized for smooth scrolling and fast interactions

### 3. Investment-Focused UX
- **Information Hierarchy**: Critical financial data prioritized and highlighted
- **Action Clarity**: Clear CTAs for investment actions (deposits, withdrawals, etc.)
- **Status Communication**: Clear visual feedback for account states and transactions

## Color System

### Primary Brand Colors
```swift
// Core Brand Identity
static let indigoPrimary = Color(hex: "#4147CC")        // Deep indigo blue
static let indigoSecondary = Color(hex: "#6B70D9")      // Lighter indigo
static let indigoAccent = Color(hex: "#FBB93C")         // Gold accent

// Brand Variations
static let indigoDark = Color(hex: "#2A2E8F")           // Darker variant
static let indigoLight = Color(hex: "#E8E9F5")          // Light tint
```

### Financial Data Colors
```swift
// Performance Indicators
static let positiveGreen = Color(hex: "#22C55E")        // Gains/Positive
static let negativeRed = Color(hex: "#EF4444")          // Losses/Negative
static let neutralGray = Color(hex: "#6B7280")          // No change

// Asset Categories
static let equityBlue = Color(hex: "#3B82F6")           // Stocks
static let bondGreen = Color(hex: "#10B981")            // Bonds
static let cryptoOrange = Color(hex: "#F59E0B")         // Cryptocurrency
static let realEstateRed = Color(hex: "#DC2626")        // Real Estate
static let commodityPurple = Color(hex: "#8B5CF6")      // Commodities
static let cashGray = Color(hex: "#4B5563")             // Cash/Money Market
```

### System Colors
```swift
// Background Hierarchy
static let backgroundPrimary = Color(.systemBackground)
static let backgroundSecondary = Color(.secondarySystemBackground)
static let backgroundTertiary = Color(.tertiarySystemBackground)

// Text Hierarchy
static let textPrimary = Color(.label)
static let textSecondary = Color(.secondaryLabel)
static let textTertiary = Color(.tertiaryLabel)
static let textPlaceholder = Color(.placeholderText)

// Status Colors
static let successGreen = Color(.systemGreen)
static let warningOrange = Color(.systemOrange)
static let errorRed = Color(.systemRed)
static let infoBlue = Color(.systemBlue)
```

## Typography System

### Font Family: SF Pro (System Default) + Montserrat (Headers)
```swift
struct FinancialTypography {
    // Large Titles (Fund Names, Main Values)
    static let largeTitle = Font.custom("Montserrat-Bold", size: 34)
    static let title1 = Font.custom("Montserrat-Bold", size: 28)
    static let title2 = Font.custom("Montserrat-SemiBold", size: 22)
    static let title3 = Font.custom("Montserrat-SemiBold", size: 20)

    // Headlines (Section Headers)
    static let headline = Font.headline.weight(.semibold)
    static let subheadline = Font.subheadline.weight(.medium)

    // Body Text
    static let body = Font.body
    static let bodyEmphasized = Font.body.weight(.medium)
    static let callout = Font.callout

    // Financial Data (Numbers)
    static let financialLarge = Font.system(size: 32, weight: .bold, design: .rounded)
    static let financialMedium = Font.system(size: 24, weight: .semibold, design: .rounded)
    static let financialSmall = Font.system(size: 16, weight: .medium, design: .rounded)

    // Small Text
    static let footnote = Font.footnote
    static let caption1 = Font.caption
    static let caption2 = Font.caption2
}
```

### Typography Usage Guidelines
- **Financial Values**: Use rounded system font for all monetary amounts
- **Headers**: Use Montserrat for main titles and section headers
- **Body Text**: Use SF Pro for readability and iOS consistency
- **Data Labels**: Use medium weight for emphasis without overwhelming

## Spacing System

### Base Unit: 4pt Grid System
```swift
struct Spacing {
    static let xxs: CGFloat = 4      // Minimal spacing
    static let xs: CGFloat = 8       // Small spacing
    static let sm: CGFloat = 12      // Medium-small spacing
    static let md: CGFloat = 16      // Standard spacing
    static let lg: CGFloat = 24      // Large spacing
    static let xl: CGFloat = 32      // Extra large spacing
    static let xxl: CGFloat = 48     // Maximum spacing

    // Component-specific
    static let cardPadding: CGFloat = 16
    static let sectionSpacing: CGFloat = 24
    static let buttonHeight: CGFloat = 50
    static let inputHeight: CGFloat = 44
}
```

### Layout Margins
```swift
struct LayoutMargins {
    static let screen: CGFloat = 16      // Screen edge margins
    static let card: CGFloat = 16        // Card internal padding
    static let list: CGFloat = 20        // List row padding
    static let form: CGFloat = 16        // Form field padding
}
```

## Component Library

### 1. Financial Cards

#### Portfolio Summary Card
```swift
struct PortfolioSummaryCard: View {
    let totalValue: Double
    let change: Double
    let changePercent: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Total Portfolio Value")
                .font(FinancialTypography.subheadline)
                .foregroundColor(.textSecondary)

            Text(totalValue, format: .currency(code: "USD"))
                .font(FinancialTypography.financialLarge)
                .foregroundColor(.textPrimary)

            HStack {
                Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption)
                Text("\(change >= 0 ? "+" : "")\(changePercent, specifier: "%.2f")%")
                    .font(FinancialTypography.caption1)
                Text("(\(change >= 0 ? "+" : "")\(change, format: .currency(code: "USD")))")
                    .font(FinancialTypography.caption2)
            }
            .foregroundColor(change >= 0 ? .positiveGreen : .negativeRed)
        }
        .padding()
        .background(.backgroundSecondary)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}
```

#### Asset Allocation Card
```swift
struct AssetCard: View {
    let asset: AssetAllocation

    var body: some View {
        HStack(spacing: 12) {
            // Asset Icon/Color Indicator
            Circle()
                .fill(asset.categoryColor)
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: asset.icon)
                        .foregroundColor(.white)
                        .font(.system(size: 16, weight: .medium))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(asset.name)
                    .font(FinancialTypography.bodyEmphasized)
                    .foregroundColor(.textPrimary)

                Text("\(asset.percentage, specifier: "%.1f")% allocation")
                    .font(FinancialTypography.caption1)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(asset.value, format: .currency(code: "USD"))
                    .font(FinancialTypography.financialSmall)
                    .foregroundColor(.textPrimary)

                HStack(spacing: 4) {
                    Image(systemName: asset.dailyChange >= 0 ? "arrow.up" : "arrow.down")
                        .font(.caption2)
                    Text("\(asset.dailyChange, specifier: "%.2f")%")
                        .font(FinancialTypography.caption2)
                }
                .foregroundColor(asset.dailyChange >= 0 ? .positiveGreen : .negativeRed)
            }
        }
        .padding()
        .background(.backgroundSecondary)
        .cornerRadius(8)
    }
}
```

### 2. Navigation Components

#### Tab Bar Configuration
```swift
func configureTabBarAppearance() {
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(.backgroundPrimary)
    appearance.selectionIndicatorTintColor = UIColor(.indigoPrimary)

    // Selected state
    appearance.stackedLayoutAppearance.selected.iconColor = UIColor(.indigoPrimary)
    appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
        .foregroundColor: UIColor(.indigoPrimary),
        .font: UIFont.systemFont(ofSize: 10, weight: .medium)
    ]

    // Normal state
    appearance.stackedLayoutAppearance.normal.iconColor = UIColor(.textSecondary)
    appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
        .foregroundColor: UIColor(.textSecondary),
        .font: UIFont.systemFont(ofSize: 10, weight: .regular)
    ]

    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
}
```

### 3. Button System

#### Primary Action Button
```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(FinancialTypography.bodyEmphasized)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: Spacing.buttonHeight)
                .background(.indigoPrimary)
                .cornerRadius(8)
                .scaleEffect(isPressed ? 0.98 : 1.0)
        }
        .buttonStyle(PlainButtonStyle())
        .onPressGesture(onPress: { isPressed = $0 })
    }
}
```

#### Secondary Button
```swift
struct SecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(FinancialTypography.bodyEmphasized)
                .foregroundColor(.indigoPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: Spacing.buttonHeight)
                .background(.backgroundSecondary)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(.indigoPrimary, lineWidth: 1)
                )
        }
    }
}
```

### 4. Input Components

#### Financial Input Field
```swift
struct CurrencyInputField: View {
    @Binding var value: Double
    let title: String
    let placeholder: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(FinancialTypography.subheadline)
                .foregroundColor(.textSecondary)

            TextField(placeholder, value: $value, format: .currency(code: "USD"))
                .font(FinancialTypography.body)
                .padding()
                .background(.backgroundSecondary)
                .cornerRadius(8)
                .keyboardType(.decimalPad)
        }
    }
}
```

## Missing Page Designs

### 1. Live Events Page

#### Page Structure
```
Navigation Bar
├── Title: "Live Events"
├── Bell icon (notifications toggle)
└── Settings icon

Content Area
├── Status Banner (if market closed/maintenance)
├── Event Categories Filter (Horizontal scroll)
│   ├── All Events
│   ├── Market Updates
│   ├── Fund News
│   ├── System Updates
│   └── Alerts
├── Live Events Feed
│   ├── Event Cards (Chronological)
│   ├── Pull-to-refresh
│   └── Load more button
└── Bottom spacing for tab bar
```

#### Event Card Design
```swift
struct LiveEventCard: View {
    let event: LiveEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with timestamp and category
            HStack {
                Badge(event.category)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(event.timestamp, style: .time)
                        .font(FinancialTypography.caption2)
                        .foregroundColor(.textSecondary)

                    Text(event.timestamp, style: .relative)
                        .font(FinancialTypography.caption2)
                        .foregroundColor(.textTertiary)
                }
            }

            // Event Title and Description
            Text(event.title)
                .font(FinancialTypography.headline)
                .foregroundColor(.textPrimary)

            if !event.description.isEmpty {
                Text(event.description)
                    .font(FinancialTypography.body)
                    .foregroundColor(.textSecondary)
                    .lineLimit(3)
            }

            // Impact Indicator (for market events)
            if let impact = event.marketImpact {
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundColor(impact > 0 ? .positiveGreen : .negativeRed)

                    Text("Market Impact: \(impact > 0 ? "+" : "")\(impact, specifier: "%.2f")%")
                        .font(FinancialTypography.footnote)
                        .foregroundColor(impact > 0 ? .positiveGreen : .negativeRed)

                    Spacer()
                }
            }

            // Action buttons if applicable
            if event.hasAction {
                HStack {
                    Button("View Details") {
                        // Action
                    }
                    .font(FinancialTypography.footnote)
                    .foregroundColor(.indigoPrimary)

                    Spacer()
                }
            }
        }
        .padding()
        .background(.backgroundSecondary)
        .cornerRadius(12)
        .overlay(
            Rectangle()
                .fill(event.priorityColor)
                .frame(width: 4)
                .cornerRadius(2, corners: [.topLeading, .bottomLeading])
        )
    }
}

struct LiveEvent {
    let id: String
    let title: String
    let description: String
    let category: EventCategory
    let timestamp: Date
    let marketImpact: Double?
    let hasAction: Bool
    let priority: EventPriority

    var priorityColor: Color {
        switch priority {
        case .high: return .errorRed
        case .medium: return .warningOrange
        case .low: return .indigoPrimary
        }
    }
}

enum EventCategory: String, CaseIterable {
    case market = "Market Update"
    case fund = "Fund News"
    case system = "System"
    case alert = "Alert"

    var color: Color {
        switch self {
        case .market: return .infoBlue
        case .fund: return .positiveGreen
        case .system: return .neutralGray
        case .alert: return .errorRed
        }
    }
}

enum EventPriority {
    case high, medium, low
}
```

### 2. Newsletter Page

#### Page Structure
```
Navigation Bar
├── Title: "Newsletter"
├── Search icon
└── Settings icon (subscription preferences)

Content Area
├── Subscription Status Banner
├── Newsletter Categories
│   ├── Market Weekly
│   ├── Fund Updates
│   ├── Investment Insights
│   └── Company News
├── Newsletter Archive
│   ├── Recent Issues (List)
│   ├── Filter by category
│   └── Search functionality
└── Newsletter Reader (Modal/Navigation)
```

#### Newsletter Components
```swift
struct NewsletterSubscriptionCard: View {
    @Binding var isSubscribed: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Stay Informed")
                        .font(FinancialTypography.headline)
                        .foregroundColor(.textPrimary)

                    Text("Get weekly market insights and fund updates")
                        .font(FinancialTypography.body)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                Toggle("", isOn: $isSubscribed)
                    .toggleStyle(SwitchToggleStyle(tint: .indigoPrimary))
            }

            if isSubscribed {
                Text("✓ You'll receive our newsletter every Tuesday")
                    .font(FinancialTypography.footnote)
                    .foregroundColor(.positiveGreen)
            }
        }
        .padding()
        .background(.backgroundSecondary)
        .cornerRadius(12)
    }
}

struct NewsletterIssueCard: View {
    let issue: NewsletterIssue

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(issue.date, style: .date)
                    .font(FinancialTypography.caption1)
                    .foregroundColor(.textSecondary)

                Spacer()

                Badge(issue.category)
            }

            Text(issue.title)
                .font(FinancialTypography.headline)
                .foregroundColor(.textPrimary)
                .lineLimit(2)

            Text(issue.excerpt)
                .font(FinancialTypography.body)
                .foregroundColor(.textSecondary)
                .lineLimit(3)

            HStack {
                Text("\(issue.readTime) min read")
                    .font(FinancialTypography.caption2)
                    .foregroundColor(.textTertiary)

                Spacer()

                if issue.isRead {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.positiveGreen)
                        Text("Read")
                            .font(FinancialTypography.caption2)
                            .foregroundColor(.positiveGreen)
                    }
                }

                Button("Read") {
                    // Open newsletter reader
                }
                .font(FinancialTypography.footnote)
                .foregroundColor(.indigoPrimary)
            }
        }
        .padding()
        .background(.backgroundSecondary)
        .cornerRadius(12)
    }
}

struct NewsletterReaderView: View {
    let issue: NewsletterIssue
    @Environment(\.dismiss) private var dismiss
    @State private var scrollPosition: CGFloat = 0

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 12) {
                        Text(issue.date, style: .date)
                            .font(FinancialTypography.caption1)
                            .foregroundColor(.textSecondary)

                        Text(issue.title)
                            .font(FinancialTypography.title2)
                            .foregroundColor(.textPrimary)

                        HStack {
                            Badge(issue.category)
                            Text("\(issue.readTime) min read")
                                .font(FinancialTypography.caption2)
                                .foregroundColor(.textTertiary)
                        }
                    }
                    .padding(.horizontal)

                    Divider()

                    // Content
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(issue.sections, id: \.id) { section in
                            NewsletterSection(section: section)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Share", systemImage: "square.and.arrow.up") {
                            // Share newsletter
                        }

                        Button("Save to Reading List", systemImage: "bookmark") {
                            // Save for later
                        }

                        Button("Print", systemImage: "printer") {
                            // Print newsletter
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
}
```

## Accessibility Guidelines

### 1. Color Accessibility
- Minimum contrast ratio of 4.5:1 for normal text
- Minimum contrast ratio of 3:1 for large text
- Never rely on color alone to convey information
- Provide alternative text for all images and icons

### 2. Typography Accessibility
- Support Dynamic Type scaling up to 200%
- Use semantic text styles where possible
- Maintain readable line spacing (1.4x minimum)

### 3. Interaction Accessibility
- Minimum touch target size of 44x44 points
- Provide clear focus indicators
- Support VoiceOver and other assistive technologies

### 4. Financial Data Accessibility
- Always provide text alternatives for charts
- Use clear labeling for numerical data
- Provide context for percentage changes and trends

## Animation Guidelines

### 1. Micro-interactions
```swift
struct AnimationTokens {
    // Duration
    static let fast: Double = 0.2
    static let medium: Double = 0.3
    static let slow: Double = 0.5

    // Easing
    static let easeOut = Animation.easeOut(duration: medium)
    static let spring = Animation.spring(response: 0.4, dampingFraction: 0.8)
    static let bouncy = Animation.interpolatingSpring(stiffness: 300, damping: 20)
}
```

### 2. State Changes
- Button press feedback: Scale + opacity change
- Card interactions: Gentle elevation change
- Loading states: Progressive disclosure
- Success/error states: Color transition + icon animation

### 3. Navigation Transitions
- Tab switches: Smooth cross-fade
- Modal presentation: Slide up/down with blur background
- Navigation pushes: Standard iOS slide transition

## Dark Mode Support

### Color Adaptations
```swift
extension Color {
    static let adaptiveBackground = Color(.systemBackground)
    static let adaptiveSecondaryBackground = Color(.secondarySystemBackground)
    static let adaptiveText = Color(.label)

    // Financial colors remain consistent in dark mode for brand recognition
    static let consistentPositive = Color(hex: "#22C55E") // Same in light/dark
    static let consistentNegative = Color(hex: "#EF4444") // Same in light/dark
}
```

### Design Considerations
- Maintain brand color consistency
- Increase shadow intensity in dark mode
- Use higher contrast for financial data
- Test all states in both light and dark modes

## Implementation Notes

### SwiftUI Best Practices
1. Use `@Environment` for theme values
2. Create reusable style modifiers
3. Implement proper state management
4. Use lazy loading for performance
5. Handle empty and error states gracefully

### Performance Considerations
1. Lazy load newsletter content
2. Cache live event data appropriately
3. Optimize image loading and caching
4. Use efficient list rendering for large datasets

This design system provides a comprehensive foundation for building the Indigo Yield iOS app with professional financial aesthetics while maintaining excellent usability and accessibility standards.