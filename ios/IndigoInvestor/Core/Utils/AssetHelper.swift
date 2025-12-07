//
//  AssetHelper.swift
//  IndigoInvestor
//
//  Asset Icon Helper using CoinGecko assets matching web platform
//  Updated to match src/utils/assets.ts
//

import SwiftUI

struct AssetHelper {
    
    // MARK: - Asset Config Definition
    
    struct AssetConfig {
        let symbol: String
        let name: String
        let logoUrl: String
        let colorHex: String
        let decimals: Int
        
        var color: Color {
            Color(hex: colorHex)
        }
    }
    
    // MARK: - Asset Registry (Source of Truth)
    // Matches src/utils/assets.ts
    
    private static let assets: [String: AssetConfig] = [
        "BTC": AssetConfig(
            symbol: "BTC",
            name: "Bitcoin",
            logoUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
            colorHex: "#F7931A",
            decimals: 8
        ),
        "ETH": AssetConfig(
            symbol: "ETH",
            name: "Ethereum",
            logoUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
            colorHex: "#627EEA",
            decimals: 18
        ),
        "SOL": AssetConfig(
            symbol: "SOL",
            name: "Solana",
            logoUrl: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
            colorHex: "#14F195",
            decimals: 9
        ),
        "USDT": AssetConfig(
            symbol: "USDT",
            name: "Stablecoin Fund",
            logoUrl: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
            colorHex: "#26A17B",
            decimals: 6
        ),
        "XRP": AssetConfig(
            symbol: "XRP",
            name: "XRP",
            logoUrl: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
            colorHex: "#00AAE4",
            decimals: 6
        ),
        "XAUT": AssetConfig(
            symbol: "XAUT",
            name: "Tether Gold",
            logoUrl: "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png",
            colorHex: "#FFD700",
            decimals: 6
        ),
        // EURC Yield Fund
        "EURC": AssetConfig(
            symbol: "EURC",
            name: "Euro Coin",
            logoUrl: "https://assets.coingecko.com/coins/images/26057/large/EURC.png",
            colorHex: "#0045A6",
            decimals: 6
        )
    ]
    
    // MARK: - Public Methods
    
    static func getConfig(for assetCode: String) -> AssetConfig? {
        return assets[assetCode.uppercased()]
    }
    
    static func iconURL(for assetCode: String) -> URL? {
        guard let config = getConfig(for: assetCode) else {
            // Fallback generation
            let code = assetCode.uppercased()
            return URL(string: "https://ui-avatars.com/api/?name=\(code)&background=eff6ff&color=1e40af")
        }
        return URL(string: config.logoUrl)
    }
    
    static func color(for assetCode: String) -> Color {
        return getConfig(for: assetCode)?.color ?? .gray
    }
    
    static func name(for assetCode: String) -> String {
        return getConfig(for: assetCode)?.name ?? assetCode.uppercased()
    }
    
    static func fallbackIconName(for assetCode: String) -> String {
        // Keeping generic fallback
        return "circle.fill"
    }
}

struct AssetIconView: View {
    let assetCode: String
    let size: CGFloat
    
    init(assetCode: String, size: CGFloat = 40) {
        self.assetCode = assetCode
        self.size = size
    }
    
    var body: some View {
        AsyncImage(url: AssetHelper.iconURL(for: assetCode)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            case .failure, .empty:
                // Fallback to generated avatar or initial
                ZStack {
                    Circle()
                        .fill(Color(.secondarySystemBackground))
                    
                    Text(assetCode.prefix(1).uppercased())
                        .font(.system(size: size * 0.5, weight: .bold))
                        .foregroundColor(.primary)
                }
            @unknown default:
                EmptyView()
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
        )
    }
}