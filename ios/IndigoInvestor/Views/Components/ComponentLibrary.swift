//
//  ComponentLibrary.swift
//  IndigoInvestor
//
//  Reusable SwiftUI component library for Indigo Yield
//

import SwiftUI

// MARK: - Financial Components

/// Displays a financial value with proper formatting and accessibility
struct FinancialValueView: View {
    let value: Double
    let currency: String
    let showChange: Bool
    let change: Double?
    let changeType: ChangeType
    let size: ValueSize

    enum ChangeType {
        case percentage, absolute, both
    }

    enum ValueSize {
        case large, medium, small

        var font: Font {
            switch self {
            case .large: return DesignTokens.Typography.financialLarge
            case .medium: return DesignTokens.Typography.financialMedium
            case .small: return DesignTokens.Typography.financialSmall
            }
        }
    }

    init(
        value: Double,
        currency: String = "USD",
        showChange: Bool = false,
        change: Double? = nil,
        changeType: ChangeType = .percentage,
        size: ValueSize = .medium
    ) {
        self.value = value
        self.currency = currency
        self.showChange = showChange
        self.change = change
        self.changeType = changeType
        self.size = size
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value, format: .currency(code: currency))
                .font(size.font)
                .foregroundColor(DesignTokens.Colors.textPrimary)
                .accessibleFinancialValue(
                    value.formatted(.currency(code: currency)),
                    description: "Current value"
                )

            if showChange, let change = change {
                HStack(spacing: 4) {
                    Image(systemName: change >= 0 ? "arrow.up" : "arrow.down")
                        .font(.caption2)

                    switch changeType {
                    case .percentage:
                        Text("\(change >= 0 ? "+" : "")\(change, specifier: "%.2f")%")
                    case .absolute:
                        Text("\(change >= 0 ? "+" : "")\(change, format: .currency(code: currency))")
                    case .both:
                        Text("\(change >= 0 ? "+" : "")\(change, format: .currency(code: currency)) (\(change >= 0 ? "+" : "")\(change, specifier: "%.2f")%)")
                    }
                }
                .font(DesignTokens.Typography.caption1)
                .foregroundColor(change >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
                .accessibilityLabel(change >= 0 ? "Gain" : "Loss")
            }
        }
    }
}

/// Portfolio allocation ring chart component
struct PortfolioAllocationRing: View {
    let allocations: [AllocationData]
    let size: CGFloat
    let lineWidth: CGFloat

    struct AllocationData: Identifiable {
        let id = UUID()
        let name: String
        let percentage: Double
        let color: Color
        let value: Double
    }

    init(allocations: [AllocationData], size: CGFloat = 120, lineWidth: CGFloat = 12) {
        self.allocations = allocations
        self.size = size
        self.lineWidth = lineWidth
    }

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(DesignTokens.Colors.backgroundTertiary, lineWidth: lineWidth)

            // Allocation arcs
            ForEach(Array(allocations.enumerated()), id: \.element.id) { index, allocation in
                Circle()
                    .trim(from: startAngle(for: index), to: endAngle(for: index))
                    .stroke(allocation.color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }

            // Center content
            VStack(spacing: 2) {
                Text("Total")
                    .font(DesignTokens.Typography.caption1)
                    .foregroundColor(DesignTokens.Colors.textSecondary)

                Text(totalValue, format: .currency(code: "USD"))
                    .font(DesignTokens.Typography.financialSmall)
                    .foregroundColor(DesignTokens.Colors.textPrimary)
            }
        }
        .frame(width: size, height: size)
    }

    private var totalValue: Double {
        allocations.reduce(0) { $0 + $1.value }
    }

    private func startAngle(for index: Int) -> Double {
        let previousPercentages = allocations.prefix(index).map { $0.percentage }
        return previousPercentages.reduce(0, +) / 100
    }

    private func endAngle(for index: Int) -> Double {
        let previousPercentages = allocations.prefix(index + 1).map { $0.percentage }
        return previousPercentages.reduce(0, +) / 100
    }
}

/// Asset allocation list item
struct AssetAllocationRow: View {
    let asset: AssetData
    let showValue: Bool
    let onTap: (() -> Void)?

    struct AssetData {
        let name: String
        let symbol: String
        let percentage: Double
        let value: Double
        let change: Double
        let color: Color
        let icon: String
    }

    init(asset: AssetData, showValue: Bool = true, onTap: (() -> Void)? = nil) {
        self.asset = asset
        self.showValue = showValue
        self.onTap = onTap
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 12) {
                // Asset Icon
                Circle()
                    .fill(asset.color)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Image(systemName: asset.icon)
                            .foregroundColor(.white)
                            .font(.system(size: 16, weight: .medium))
                    )

                // Asset Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(asset.name)
                        .font(DesignTokens.Typography.bodyEmphasized)
                        .foregroundColor(DesignTokens.Colors.textPrimary)

                    HStack {
                        Text(asset.symbol)
                            .font(DesignTokens.Typography.caption1)
                            .foregroundColor(DesignTokens.Colors.textSecondary)

                        Text("•")
                            .foregroundColor(DesignTokens.Colors.textSecondary)

                        Text("\(asset.percentage, specifier: "%.1f")%")
                            .font(DesignTokens.Typography.caption1)
                            .foregroundColor(DesignTokens.Colors.textSecondary)
                    }
                }

                Spacer()

                // Value and Change
                if showValue {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(asset.value, format: .currency(code: "USD"))
                            .font(DesignTokens.Typography.financialSmall)
                            .foregroundColor(DesignTokens.Colors.textPrimary)

                        HStack(spacing: 2) {
                            Image(systemName: asset.change >= 0 ? "arrow.up" : "arrow.down")
                                .font(.caption2)
                            Text("\(asset.change >= 0 ? "+" : "")\(asset.change, specifier: "%.2f")%")
                                .font(DesignTokens.Typography.caption1)
                        }
                        .foregroundColor(asset.change >= 0 ? DesignTokens.Colors.positiveGreen : DesignTokens.Colors.negativeRed)
                    }
                }

                if onTap != nil {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(DesignTokens.Colors.textTertiary)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - UI Components

/// Custom button styles following design system
struct IndigoButtonStyle: ButtonStyle {
    let style: Style
    let size: Size

    enum Style {
        case primary, secondary, tertiary, destructive

        var backgroundColor: Color {
            switch self {
            case .primary: return DesignTokens.Colors.indigoPrimary
            case .secondary: return DesignTokens.Colors.backgroundSecondary
            case .tertiary: return DesignTokens.Colors.indigoLight
            case .destructive: return DesignTokens.Colors.errorRed
            }
        }

        var foregroundColor: Color {
            switch self {
            case .primary, .destructive: return .white
            case .secondary, .tertiary: return DesignTokens.Colors.indigoPrimary
            }
        }

        var borderColor: Color? {
            switch self {
            case .secondary: return DesignTokens.Colors.indigoPrimary
            default: return nil
            }
        }
    }

    enum Size {
        case small, medium, large

        var height: CGFloat {
            switch self {
            case .small: return 32
            case .medium: return 44
            case .large: return 56
            }
        }

        var font: Font {
            switch self {
            case .small: return DesignTokens.Typography.footnoteEmphasized
            case .medium: return DesignTokens.Typography.calloutEmphasized
            case .large: return DesignTokens.Typography.bodyEmphasized
            }
        }
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(size.font)
            .foregroundColor(style.foregroundColor)
            .frame(height: size.height)
            .frame(maxWidth: .infinity)
            .background(style.backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(style.borderColor ?? Color.clear, lineWidth: 1)
            )
            .cornerRadius(8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(DesignTokens.Animation.buttonPress, value: configuration.isPressed)
    }
}

/// Loading state component
struct LoadingStateView: View {
    let message: String
    let style: Style

    enum Style {
        case spinner, dots, progress(Double)

        @ViewBuilder
        var indicator: some View {
            switch self {
            case .spinner:
                ProgressView()
                    .scaleEffect(1.2)
            case .dots:
                DotsLoadingView()
            case .progress(let value):
                ProgressView(value: value)
                    .progressViewStyle(LinearProgressViewStyle())
                    .frame(width: 200)
            }
        }
    }

    var body: some View {
        VStack(spacing: 20) {
            style.indicator
                .tint(DesignTokens.Colors.indigoPrimary)

            Text(message)
                .font(DesignTokens.Typography.body)
                .foregroundColor(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(DesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Colors.backgroundPrimary)
    }
}

/// Animated dots loading indicator
struct DotsLoadingView: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(DesignTokens.Colors.indigoPrimary)
                    .frame(width: 8, height: 8)
                    .scaleEffect(animating ? 1.0 : 0.5)
                    .animation(
                        Animation.easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                        value: animating
                    )
            }
        }
        .onAppear {
            animating = true
        }
    }
}

/// Empty state component
struct EmptyStateView: View {
    let icon: String
    let title: String
    let description: String
    let actionTitle: String?
    let action: (() -> Void)?

    init(
        icon: String,
        title: String,
        description: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.description = description
        self.actionTitle = actionTitle
        self.action = action
    }

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(DesignTokens.Colors.textTertiary)

            VStack(spacing: 8) {
                Text(title)
                    .font(DesignTokens.Typography.title3)
                    .foregroundColor(DesignTokens.Colors.textPrimary)

                Text(description)
                    .font(DesignTokens.Typography.body)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }

            if let actionTitle = actionTitle, let action = action {
                Button(actionTitle, action: action)
                    .buttonStyle(IndigoButtonStyle(style: .primary, size: .medium))
                    .frame(maxWidth: 200)
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Generic status badge component for general-purpose status display
struct GenericStatusBadge: View {
    let text: String
    let status: Status

    enum Status {
        case active, pending, inactive, success, warning, error

        var color: Color {
            switch self {
            case .active: return DesignTokens.Colors.positiveGreen
            case .pending: return DesignTokens.Colors.warningOrange
            case .inactive: return DesignTokens.Colors.neutralGray
            case .success: return DesignTokens.Colors.successGreen
            case .warning: return DesignTokens.Colors.warningOrange
            case .error: return DesignTokens.Colors.errorRed
            }
        }
    }

    var body: some View {
        Text(text)
            .font(DesignTokens.Typography.caption1Emphasized)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(status.color.opacity(0.1))
            .foregroundColor(status.color)
            .cornerRadius(6)
    }
}

/// Information card with icon
struct InfoCard: View {
    let icon: String
    let title: String
    let description: String
    let style: Style

    enum Style {
        case info, warning, success, error

        var color: Color {
            switch self {
            case .info: return DesignTokens.Colors.infoBlue
            case .warning: return DesignTokens.Colors.warningOrange
            case .success: return DesignTokens.Colors.successGreen
            case .error: return DesignTokens.Colors.errorRed
            }
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(style.color)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(DesignTokens.Typography.calloutEmphasized)
                    .foregroundColor(DesignTokens.Colors.textPrimary)

                Text(description)
                    .font(DesignTokens.Typography.body)
                    .foregroundColor(DesignTokens.Colors.textSecondary)
            }

            Spacer()
        }
        .padding()
        .background(style.color.opacity(0.05))
        .cornerRadius(DesignTokens.ComponentSizes.cardCornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.ComponentSizes.cardCornerRadius)
                .stroke(style.color.opacity(0.2), lineWidth: 1)
        )
    }
}

/// Expandable section component
struct ExpandableSection<Content: View>: View {
    let title: String
    let subtitle: String?
    let content: Content
    @State private var isExpanded: Bool

    init(
        title: String,
        subtitle: String? = nil,
        isExpanded: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.subtitle = subtitle
        self._isExpanded = State(initialValue: isExpanded)
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: {
                withAnimation(DesignTokens.Animation.medium) {
                    isExpanded.toggle()
                }
                HapticFeedback.selection.trigger()
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(DesignTokens.Typography.headline)
                            .foregroundColor(DesignTokens.Colors.textPrimary)

                        if let subtitle = subtitle {
                            Text(subtitle)
                                .font(DesignTokens.Typography.body)
                                .foregroundColor(DesignTokens.Colors.textSecondary)
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.down")
                        .font(.callout)
                        .foregroundColor(DesignTokens.Colors.textSecondary)
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .animation(DesignTokens.Animation.medium, value: isExpanded)
                }
                .padding()
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                content
                    .padding([.leading, .trailing, .bottom])
                    .transition(.opacity.combined(with: .slide))
            }
        }
        .background(DesignTokens.Colors.backgroundSecondary)
        .cornerRadius(DesignTokens.ComponentSizes.cardCornerRadius)
    }
}

// MARK: - Chart Components

/// Mini line chart for trends
struct MiniLineChart: View {
    let dataPoints: [Double]
    let color: Color
    let showFill: Bool

    init(dataPoints: [Double], color: Color = DesignTokens.Colors.indigoPrimary, showFill: Bool = true) {
        self.dataPoints = dataPoints
        self.color = color
        self.showFill = showFill
    }

    var body: some View {
        GeometryReader { geometry in
            Path { path in
                guard dataPoints.count > 1 else { return }

                let minValue = dataPoints.min() ?? 0
                let maxValue = dataPoints.max() ?? 1
                let range = maxValue - minValue

                let stepX = geometry.size.width / CGFloat(dataPoints.count - 1)
                let stepY = geometry.size.height

                for (index, value) in dataPoints.enumerated() {
                    let x = CGFloat(index) * stepX
                    let y = stepY - (CGFloat(value - minValue) / CGFloat(range)) * stepY

                    if index == 0 {
                        path.move(to: CGPoint(x: x, y: y))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: y))
                    }
                }
            }
            .stroke(color, lineWidth: 2)

            if showFill {
                Path { path in
                    guard dataPoints.count > 1 else { return }

                    let minValue = dataPoints.min() ?? 0
                    let maxValue = dataPoints.max() ?? 1
                    let range = maxValue - minValue

                    let stepX = geometry.size.width / CGFloat(dataPoints.count - 1)
                    let stepY = geometry.size.height

                    path.move(to: CGPoint(x: 0, y: stepY))

                    for (index, value) in dataPoints.enumerated() {
                        let x = CGFloat(index) * stepX
                        let y = stepY - (CGFloat(value - minValue) / CGFloat(range)) * stepY
                        path.addLine(to: CGPoint(x: x, y: y))
                    }

                    path.addLine(to: CGPoint(x: geometry.size.width, y: stepY))
                    path.closeSubpath()
                }
                .fill(
                    LinearGradient(
                        colors: [color.opacity(0.3), color.opacity(0.0)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .frame(height: 60)
    }
}

// MARK: - Form Components

/// Custom text field with label and validation
struct IndigoTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    let validation: ValidationRule?
    let keyboardType: UIKeyboardType
    let isSecure: Bool

    enum ValidationRule {
        case required, email, minLength(Int), custom((String) -> String?)

        func validate(_ input: String) -> String? {
            switch self {
            case .required:
                return input.isEmpty ? "This field is required" : nil
            case .email:
                let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
                let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
                return emailPredicate.evaluate(with: input) ? nil : "Please enter a valid email"
            case .minLength(let min):
                return input.count >= min ? nil : "Must be at least \(min) characters"
            case .custom(let validator):
                return validator(input)
            }
        }
    }

    @State private var errorMessage: String?

    init(
        label: String,
        placeholder: String,
        text: Binding<String>,
        validation: ValidationRule? = nil,
        keyboardType: UIKeyboardType = .default,
        isSecure: Bool = false
    ) {
        self.label = label
        self.placeholder = placeholder
        self._text = text
        self.validation = validation
        self.keyboardType = keyboardType
        self.isSecure = isSecure
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(DesignTokens.Typography.calloutEmphasized)
                .foregroundColor(DesignTokens.Colors.textPrimary)

            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .textFieldStyle(IndigoTextFieldStyle(hasError: errorMessage != nil))
            .keyboardType(keyboardType)
            .onChange(of: text) { newValue in
                errorMessage = validation?.validate(newValue)
            }

            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(DesignTokens.Typography.caption1)
                    .foregroundColor(DesignTokens.Colors.errorRed)
            }
        }
    }
}

struct IndigoTextFieldStyle: TextFieldStyle {
    let hasError: Bool

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(DesignTokens.Colors.backgroundSecondary)
            .cornerRadius(DesignTokens.ComponentSizes.inputCornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.ComponentSizes.inputCornerRadius)
                    .stroke(hasError ? DesignTokens.Colors.errorRed : Color.clear, lineWidth: 1)
            )
    }
}

// MARK: - Extensions

extension View {
    func indigoButton(style: IndigoButtonStyle.Style, size: IndigoButtonStyle.Size = .medium) -> some View {
        self.buttonStyle(IndigoButtonStyle(style: style, size: size))
    }
}

// MARK: - Previews

#Preview("Financial Components") {
    ScrollView {
        VStack(spacing: 20) {
            FinancialValueView(
                value: 250000,
                showChange: true,
                change: 5.2,
                size: .large
            )

            AssetAllocationRow(
                asset: AssetAllocationRow.AssetData(
                    name: "Apple Inc.",
                    symbol: "AAPL",
                    percentage: 15.2,
                    value: 38000,
                    change: 2.3,
                    color: .blue,
                    icon: "building.2"
                )
            )

            StatusBadge(status: .active)

            InfoCard(
                icon: "info.circle",
                title: "Market Update",
                description: "Markets are currently closed",
                style: .info
            )
        }
        .padding()
    }
}

#Preview("Chart Components") {
    VStack(spacing: 20) {
        MiniLineChart(
            dataPoints: [100, 120, 110, 140, 135, 150, 145],
            color: DesignTokens.Colors.positiveGreen
        )

        PortfolioAllocationRing(
            allocations: [
                PortfolioAllocationRing.AllocationData(name: "Stocks", percentage: 60, color: .blue, value: 150000),
                PortfolioAllocationRing.AllocationData(name: "Bonds", percentage: 30, color: .green, value: 75000),
                PortfolioAllocationRing.AllocationData(name: "Cash", percentage: 10, color: .gray, value: 25000)
            ]
        )
    }
    .padding()
}