import SwiftUI

struct WithdrawalsView: View {
    @StateObject private var viewModel = WithdrawalsViewModel()
    @State private var selectedDestination = 0
    @State private var withdrawAmount = ""
    @State private var selectedAsset: AssetType = .btc
    @State private var showConfirmation = false
    @State private var isProcessing = false

    enum AssetType: String, CaseIterable {
        case btc = "BTC"
        case eth = "ETH"
        case euroc = "EUROC"
        case eurocPercent75 = "EUROC 75"

        var fullName: String {
            switch self {
            case .btc: return "Bitcoin"
            case .eth: return "Ethereum"
            case .euroc: return "EUROC"
            case .eurocPercent75: return "EUROC 75"
            }
        }

        var icon: String {
            switch self {
            case .btc: return "₿"
            case .eth: return "Ξ"
            case .euroc, .eurocPercent75: return "€"
            }
        }

        var color: Color {
            switch self {
            case .btc: return IndigoTheme.Colors.btc
            case .eth: return IndigoTheme.Colors.eth
            case .euroc, .eurocPercent75: return IndigoTheme.Colors.info
            }
        }

        var balance: String {
            switch self {
            case .btc: return "$44,167"
            case .eth: return "$18,600"
            case .euroc: return "$11,560"
            case .eurocPercent75: return "$28,620"
            }
        }

        var amount: String {
            switch self {
            case .btc: return "0.9 BTC"
            case .eth: return "10 ETH"
            case .euroc: return "11,560 EUR"
            case .eurocPercent75: return "28,620 EUR"
            }
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                IndigoTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: IndigoTheme.Spacing.lg) {
                        // Step 1: Choose Destination
                        destinationSection

                        // Step 2: Enter Amount
                        amountSection

                        // Step 3: Fee Preview
                        feePreviewSection

                        // Step 4: Withdrawal Details
                        withdrawalDetailsSection

                        // Review & Confirm Button
                        confirmButton
                    }
                    .padding(IndigoTheme.Spacing.md)
                    .padding(.bottom, 100)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .top) {
                customNavigationBar
            }
        }
        .sheet(isPresented: $showConfirmation) {
            ConfirmationSheet(
                amount: withdrawAmount,
                asset: selectedAsset,
                onConfirm: processWithdrawal
            )
        }
    }

    // MARK: - Navigation Bar
    private var customNavigationBar: some View {
        HStack {
            Button(action: {}) {
                Image(systemName: "arrow.left")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }

            Spacer()

            Text("Withdrawals")
                .font(IndigoTheme.Typography.title3)
                .foregroundColor(IndigoTheme.Colors.primaryText)

            Spacer()

            Button(action: {}) {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
            }
        }
        .padding(.horizontal, IndigoTheme.Spacing.md)
        .padding(.top, 60)
        .padding(.bottom, IndigoTheme.Spacing.md)
        .background(IndigoTheme.Colors.background)
    }

    // MARK: - Destination Section
    private var destinationSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("1.")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)

                Text("Choose Destination")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            VStack(spacing: IndigoTheme.Spacing.sm) {
                DestinationRow(
                    icon: "building.columns",
                    title: "My Ledger Wallet",
                    subtitle: "0xb8...A72",
                    isSelected: selectedDestination == 0,
                    action: { selectedDestination = 0 }
                )

                DestinationRow(
                    icon: "wallet.pass",
                    title: "My Ledger Wallet",
                    subtitle: "bc1q...A77",
                    isSelected: selectedDestination == 1,
                    action: { selectedDestination = 1 }
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Amount Section
    private var amountSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("2.")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)

                Text("Enter Amount")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            // Amount Input
            VStack(alignment: .leading, spacing: IndigoTheme.Spacing.sm) {
                Text("Amount (USDT)")
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                HStack {
                    TextField("0.00", text: $withdrawAmount)
                        .font(.system(size: 24, weight: .semibold, design: .rounded))
                        .keyboardType(.decimalPad)

                    Text("USDT")
                        .font(IndigoTheme.Typography.headline)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }
                .padding()
                .background(IndigoTheme.Colors.secondaryBackground)
                .cornerRadius(IndigoTheme.CornerRadius.medium)
            }

            // Network Max Toggle
            HStack {
                Text("You are sending")
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Spacer()

                Toggle("", isOn: .constant(false))
                    .labelsHidden()
                    .scaleEffect(0.8)

                Text("Network Max")
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Fee Preview Section
    private var feePreviewSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("3.")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)

                Text("Fee Preview")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            VStack(spacing: IndigoTheme.Spacing.md) {
                FeeRow(label: "Total Amount", value: withdrawAmount.isEmpty ? "0.00 USDT" : "\(withdrawAmount) USDT")
                FeeRow(label: "Network Fee", value: "4.568 USDT", isHighlighted: true)

                Divider()
                    .background(IndigoTheme.Colors.secondaryBackground)

                FeeRow(
                    label: "You will receive",
                    value: withdrawAmount.isEmpty ? "0.00 USDT" : "\(Double(withdrawAmount) ?? 0 - 4.568) USDT",
                    isBold: true
                )
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Withdrawal Details
    private var withdrawalDetailsSection: some View {
        VStack(alignment: .leading, spacing: IndigoTheme.Spacing.md) {
            HStack {
                Text("4.")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)

                Text("Review Details")
                    .font(IndigoTheme.Typography.headline)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            // Select Asset
            Text("Select Asset")
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: IndigoTheme.Spacing.md) {
                    ForEach(AssetType.allCases, id: \.self) { asset in
                        AssetSelectionCard(
                            asset: asset,
                            isSelected: selectedAsset == asset,
                            action: { selectedAsset = asset }
                        )
                    }
                }
            }

            // Withdrawal Details Grid
            VStack(spacing: IndigoTheme.Spacing.sm) {
                DetailRow(label: "Network", value: "BSC")
                DetailRow(label: "Deposit", value: "0.00 BTC")
                DetailRow(label: "Yield YTD", value: "$450.75")
                DetailRow(label: "Total", value: "$980.50 to $1,270")
            }
        }
        .padding(IndigoTheme.Spacing.lg)
        .cardStyle()
    }

    // MARK: - Confirm Button
    private var confirmButton: some View {
        Button(action: { showConfirmation = true }) {
            Text("Review & Confirm")
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(withdrawAmount.isEmpty)
    }

    private func processWithdrawal() {
        isProcessing = true
        // Process withdrawal logic
    }
}

// MARK: - Supporting Views
struct DestinationRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(IndigoTheme.Colors.primaryGradientStart)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(IndigoTheme.Typography.subheadline)
                        .foregroundColor(IndigoTheme.Colors.primaryText)

                    Text(subtitle)
                        .font(IndigoTheme.Typography.caption1)
                        .foregroundColor(IndigoTheme.Colors.secondaryText)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(isSelected ? IndigoTheme.Colors.primaryGradientStart : IndigoTheme.Colors.tertiaryText)
            }
            .padding()
            .background(isSelected ? IndigoTheme.Colors.secondaryBackground : Color.clear)
            .cornerRadius(IndigoTheme.CornerRadius.medium)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FeeRow: View {
    let label: String
    let value: String
    var isHighlighted: Bool = false
    var isBold: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(isBold ? IndigoTheme.Typography.headline : IndigoTheme.Typography.subheadline)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            Spacer()

            Text(value)
                .font(isBold ? IndigoTheme.Typography.headline : IndigoTheme.Typography.subheadline)
                .foregroundColor(isHighlighted ? IndigoTheme.Colors.warning : IndigoTheme.Colors.primaryText)
        }
    }
}

struct AssetSelectionCard: View {
    let asset: WithdrawalsView.AssetType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: IndigoTheme.Spacing.sm) {
                ZStack {
                    Circle()
                        .fill(asset.color.opacity(0.1))
                        .frame(width: 48, height: 48)

                    Text(asset.icon)
                        .font(.title2)
                        .foregroundColor(asset.color)
                }

                Text(asset.rawValue)
                    .font(IndigoTheme.Typography.caption1)
                    .foregroundColor(IndigoTheme.Colors.primaryText)

                Text(asset.balance)
                    .font(IndigoTheme.Typography.footnote)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Text(asset.amount)
                    .font(IndigoTheme.Typography.caption2)
                    .foregroundColor(IndigoTheme.Colors.tertiaryText)
            }
            .padding()
            .frame(width: 100)
            .background(isSelected ? IndigoTheme.Colors.primaryGradient.opacity(0.1) : IndigoTheme.Colors.secondaryBackground)
            .cornerRadius(IndigoTheme.CornerRadius.medium)
            .overlay(
                RoundedRectangle(cornerRadius: IndigoTheme.CornerRadius.medium)
                    .stroke(isSelected ? IndigoTheme.Colors.primaryGradientStart : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.secondaryText)

            Spacer()

            Text(value)
                .font(IndigoTheme.Typography.caption1)
                .foregroundColor(IndigoTheme.Colors.primaryText)
        }
    }
}

struct ConfirmationSheet: View {
    let amount: String
    let asset: WithdrawalsView.AssetType
    let onConfirm: () -> Void
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: IndigoTheme.Spacing.xl) {
            // Header
            VStack(spacing: IndigoTheme.Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(IndigoTheme.Colors.success)

                Text("Confirm Withdrawal")
                    .font(IndigoTheme.Typography.title2)
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            // Details
            VStack(spacing: IndigoTheme.Spacing.md) {
                Text("You are withdrawing")
                    .font(IndigoTheme.Typography.subheadline)
                    .foregroundColor(IndigoTheme.Colors.secondaryText)

                Text("\(amount) \(asset.rawValue)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(IndigoTheme.Colors.primaryText)
            }

            // Buttons
            VStack(spacing: IndigoTheme.Spacing.md) {
                Button(action: {
                    onConfirm()
                    dismiss()
                }) {
                    Text("Confirm")
                }
                .buttonStyle(PrimaryButtonStyle())

                Button(action: { dismiss() }) {
                    Text("Cancel")
                }
                .buttonStyle(SecondaryButtonStyle())
            }
        }
        .padding(IndigoTheme.Spacing.xl)
        .presentationDetents([.height(400)])
    }
}

// MARK: - View Model
class WithdrawalsViewModel: ObservableObject {
    @Published var availableBalance: Double = 150000
    @Published var pendingWithdrawals: [Withdrawal] = []
    @Published var recentWithdrawals: [Withdrawal] = []

    struct Withdrawal {
        let id = UUID()
        let amount: Double
        let asset: String
        let status: String
        let date: Date
        let destination: String
    }
}