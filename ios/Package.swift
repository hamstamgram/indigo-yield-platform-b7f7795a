// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IndigoInvestor",
    platforms: [
        .iOS(.v14),
        .watchOS(.v9)
    ],
    products: [
        .library(
            name: "IndigoInvestor",
            targets: ["IndigoInvestor"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.5.0"),
        .package(url: "https://github.com/danielgindi/Charts.git", from: "5.0.0"),
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.10.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
    ],
    targets: [
        .target(
            name: "IndigoInvestor",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "DGCharts", package: "Charts"),
                .product(name: "Kingfisher", package: "Kingfisher"),
                .product(name: "KeychainAccess", package: "KeychainAccess"),
            ]
        ),
        .testTarget(
            name: "IndigoInvestorTests",
            dependencies: ["IndigoInvestor"]
        ),
    ]
)
