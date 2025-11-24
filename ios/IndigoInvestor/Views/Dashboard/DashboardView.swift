//
//  DashboardView.swift
//  IndigoInvestor
//
//  Refactored Dashboard for Passive Investment Tracker (No Chart, No Fiat, Yield Focus)
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var serviceLocator: ServiceLocator
    @State private var showWithdrawalSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // 1. HERO: Yield Overview
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Performance")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        Text("Capital Account Summary")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    
                    // 2. YIELD CARDS GRID (Replaces Charts/Fiat)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        // Card 1: Yield (Inception)
                        YieldCard(
                            title: "Yield (Inception)",
                            value: viewModel.portfolio?.totalYieldAllTimeFormatted ?? "0.0000",
                            unitLabel: viewModel.portfolio?.yieldUnitLabel ?? "UNITS",
                            iconName: "clock.fill",
                            color: .indigo,
                            subtitle: "Total earnings since opening"
                        )
                        
                        // Card 2: Yield (This Month)
                        YieldCard(
                            title: "Latest Yield",
                            value: viewModel.portfolio?.latestYieldFormatted ?? "+0.0000",
                            unitLabel: viewModel.portfolio?.yieldUnitLabel ?? "UNITS",
                            iconName: "calendar",
                            color: .green,
                            subtitle: "Net income this period"
                        )
                    }
                    .padding(.horizontal)
                    
                    // 3. ASSET LEDGER STACK
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text("Active Positions")
                                .font(.headline)
                            Spacer()
                            Button("View All") {
                                // Navigate to portfolio tab
                            }
                            .font(.subheadline)
                        }
                        .padding(.horizontal)
                        
                        if let assets = viewModel.portfolio?.assets, !assets.isEmpty {
                            ForEach(assets) { asset in
                                AssetLedgerCard(asset: asset)
                            }
                        } else if !viewModel.isLoading {
                            EmptyStateView(
                                iconName: "chart.bar.doc.horizontal",
                                title: "No Active Positions",
                                message: "Contact admin to activate your portfolio."
                            )
                        } else {
                            ProgressView()
                                .frame(maxWidth: .infinity, minHeight: 100)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Quick Actions (Updated: No Deposit)
                    QuickActionsCard(
                        onWithdrawTapped: {
                            showWithdrawalSheet = true
                        },
                        onStatementsTapped: {
                            // Navigate to statements
                        }
                    )
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationBarHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NotificationButton()
                }
            }
            .refreshable {
                await viewModel.refreshData()
            }
            .sheet(isPresented: $showWithdrawalSheet) {
                WithdrawalRequestView()
            }
        }
        .task {
            await viewModel.loadData()
        }
    }
}

// MARK: - Yield Card Component
struct YieldCard: View {
    let title: String
    let value: String
    let unitLabel: String
    let iconName: String
    let color: Color
    let subtitle: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title.uppercased())
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                Spacer()
                Image(systemName: iconName)
                    .foregroundColor(color)
                    .font(.system(size: 20))
                    .padding(8)
                    .background(color.opacity(0.1))
                    .clipShape(Circle())
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundColor(color)
                    .minimumScaleFactor(0.8)
                    .lineLimit(1)
                
                Text(unitLabel)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(color.opacity(0.8))
            }
            
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Asset Ledger Card Component
struct AssetLedgerCard: View {
    let asset: AssetPosition
    @State private var isExpanded = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header Row
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack(spacing: 12) {
                    // Asset Icon
                    AssetIconView(assetCode: asset.assetCode, size: 40)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(asset.fundName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                        Text("\(asset.balanceFormatted) \(asset.assetCode)")
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    // Yield Badge
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.right")
                            .font(.caption2)
                        Text(asset.mtdYieldFormatted)
                            .font(.caption)
                            .fontWeight(.bold)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .foregroundColor(.green)
                    .cornerRadius(8)
                    
                    Image(systemName: "chevron.down")
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .foregroundColor(.secondary)
                }
                .padding()
            }
            .buttonStyle(PlainButtonStyle())
            
            // Expanded Details (Ledger)
            if isExpanded {
                VStack(spacing: 12) {
                    Divider()
                    
                    HStack {
                        Text("CAPITAL ACCOUNT SUMMARY (MTD)")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        LedgerItem(label: "Opening", value: asset.openingBalanceFormatted)
                        LedgerItem(label: "Additions", value: asset.additionsFormatted, color: .green)
                        LedgerItem(label: "Redemptions", value: asset.withdrawalsFormatted, color: .red)
                        LedgerItem(label: "Net Income", value: asset.mtdYieldFormatted, color: .blue)
                    }
                    
                    HStack {
                        Text("Ending Balance")
                            .font(.caption)
                            .fontWeight(.bold)
                        Spacer()
                        Text("\(asset.balanceFormatted) \(asset.assetCode)")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                    }
                    .padding(.top, 8)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
                    .background(Color(.tertiarySystemBackground))
                    .cornerRadius(8)
                }
                .padding(.horizontal)
                .padding(.bottom, 16)
                .transition(.opacity)
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct LedgerItem: View {
    let label: String
    let value: String
    var color: Color = .primary
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 14, design: .monospaced))
                .foregroundColor(color)
        }
    }
}

// MARK: - Quick Actions (Updated)
struct QuickActionsCard: View {
    let onWithdrawTapped: () -> Void
    let onStatementsTapped: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            QuickActionButton(
                icon: "arrow.up.circle.fill",
                title: "Request Withdrawal",
                color: .blue,
                action: onWithdrawTapped
            )

            QuickActionButton(
                icon: "doc.text.fill",
                title: "View Statements",
                color: .indigo,
                action: onStatementsTapped
            )
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// Helper Models (Stubbed for View - Implementation in ViewModel)
struct AssetPosition: Identifiable {
    let id: String
    let fundName: String
    let assetCode: String
    let balance: Decimal
    let openingBalance: Decimal
    let additions: Decimal
    let withdrawals: Decimal
    let mtdYield: Decimal
    
    var balanceFormatted: String { balance.formatted() }
    var mtdYieldFormatted: String { "+\(mtdYield.formatted())" }
    var openingBalanceFormatted: String { openingBalance.formatted() }
    var additionsFormatted: String { "+\(additions.formatted())" }
    var withdrawalsFormatted: String { withdrawals > 0 ? "-\(withdrawals.formatted())" : "0.0000" }
}

struct EmptyStateView: View {
    let iconName: String
    let title: String
    let message: String
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

// Note: Reusing existing QuickActionButton and NotificationButton components from previous file if available,
// otherwise they need to be redefined here or imported. Assuming they exist in the project scope.