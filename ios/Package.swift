// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "IndigoInvestor",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v15),
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "IndigoInvestor",
            targets: ["IndigoInvestor"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.31.2"),
        .package(url: "https://github.com/danielgindi/Charts", from: "5.1.0"),
        .package(url: "https://github.com/onevcat/Kingfisher", from: "7.12.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.2"),
    ],
    targets: [
        .target(
            name: "IndigoInvestor",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "DGCharts", package: "Charts"),
                .product(name: "Kingfisher", package: "Kingfisher"),
                .product(name: "KeychainAccess", package: "KeychainAccess"),
            ],
            path: "IndigoInvestor",
            exclude: [
                "Info.plist",
                "Assets.xcassets"
            ]
        ),
        .testTarget(
            name: "IndigoInvestorTests",
            dependencies: [
                "IndigoInvestor",
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "IndigoInvestorTests"
        ),
    ]
)
