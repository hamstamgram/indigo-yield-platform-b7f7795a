import SwiftUI

struct AssetHelper {
    static func iconURL(for assetCode: String) -> URL? {
        let lowerCode = assetCode.lowercased()
        
        // Special cases
        if lowerCode == "eurc" || lowerCode == "euroc" {
            return URL(string: "https://cryptologos.cc/logos/euro-coin-eurc-logo.png?v=035")
        }
        
        // Standard map for spothq repo
        // Mappings for edge cases if needed, otherwise direct
        let symbolMap: [String: String] = [
            "bitcoin": "btc",
            "ethereum": "eth",
            "solana": "sol",
            "tether": "usdt"
        ]
        
        let normalized = symbolMap[lowerCode] ?? lowerCode
        return URL(string: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/\(normalized).png")
    }
    
    static func fallbackIconName(for assetCode: String) -> String {
        switch assetCode.uppercased() {
        case "BTC": return "bitcoinsign.circle.fill"
        case "ETH": return "diamond.circle.fill" // Generic
        case "SOL": return "s.circle.fill"
        case "USDC": return "dollarsign.circle.fill"
        case "USDT": return "t.circle.fill"
        case "EURC": return "eurosign.circle.fill"
        default: return "circle.fill"
        }
    }
    
    static func color(for assetCode: String) -> Color {
        switch assetCode.uppercased() {
        case "BTC": return .orange
        case "ETH": return .purple
        case "SOL": return .blue
        case "USDC": return .blue
        case "USDT": return .green
        case "EURC": return .indigo
        default: return .gray
        }
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
                // Fallback to SF Symbol
                Image(systemName: AssetHelper.fallbackIconName(for: assetCode))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .foregroundColor(AssetHelper.color(for: assetCode))
            @unknown default:
                EmptyView()
            }
        }
        .frame(width: size, height: size)
        .background(Color.white)
        .clipShape(Circle())
    }
}
