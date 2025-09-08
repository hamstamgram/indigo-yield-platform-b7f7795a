#!/usr/bin/swift
//
//  GenerateAppIcons.swift
//  Script to generate app icons with Indigo branding
//
//  Usage: swift GenerateAppIcons.swift
//

import Foundation
import CoreGraphics
import CoreImage
import AppKit

class AppIconGenerator {
    
    struct IconSize {
        let name: String
        let size: CGFloat
        let scale: Int
        
        var filename: String {
            if scale == 1 {
                return "icon-\(Int(size)).png"
            } else {
                return "icon-\(Int(size))@\(scale)x.png"
            }
        }
        
        var pixelSize: CGFloat {
            return size * CGFloat(scale)
        }
    }
    
    // All required iOS app icon sizes
    let iconSizes: [IconSize] = [
        // iPhone Notification
        IconSize(name: "iPhone Notification", size: 20, scale: 2),
        IconSize(name: "iPhone Notification", size: 20, scale: 3),
        
        // iPhone Settings
        IconSize(name: "iPhone Settings", size: 29, scale: 2),
        IconSize(name: "iPhone Settings", size: 29, scale: 3),
        
        // iPhone Spotlight
        IconSize(name: "iPhone Spotlight", size: 40, scale: 2),
        IconSize(name: "iPhone Spotlight", size: 40, scale: 3),
        
        // iPhone App
        IconSize(name: "iPhone App", size: 60, scale: 2),
        IconSize(name: "iPhone App", size: 60, scale: 3),
        
        // iPad Notification
        IconSize(name: "iPad Notification", size: 20, scale: 1),
        IconSize(name: "iPad Notification", size: 20, scale: 2),
        
        // iPad Settings
        IconSize(name: "iPad Settings", size: 29, scale: 1),
        IconSize(name: "iPad Settings", size: 29, scale: 2),
        
        // iPad Spotlight
        IconSize(name: "iPad Spotlight", size: 40, scale: 1),
        IconSize(name: "iPad Spotlight", size: 40, scale: 2),
        
        // iPad App
        IconSize(name: "iPad App", size: 76, scale: 1),
        IconSize(name: "iPad App", size: 76, scale: 2),
        
        // iPad Pro App
        IconSize(name: "iPad Pro App", size: 83.5, scale: 2),
        
        // App Store
        IconSize(name: "App Store", size: 1024, scale: 1),
        
        // Apple Watch
        IconSize(name: "Watch Notification Center", size: 24, scale: 2),
        IconSize(name: "Watch Notification Center", size: 27.5, scale: 2),
        IconSize(name: "Watch Home Screen", size: 44, scale: 2),
        IconSize(name: "Watch Home Screen", size: 50, scale: 2),
        IconSize(name: "Watch Short Look", size: 86, scale: 2),
        IconSize(name: "Watch Short Look", size: 98, scale: 2),
        IconSize(name: "Watch Short Look", size: 108, scale: 2)
    ]
    
    // Indigo brand colors
    let indigoPrimary = NSColor(red: 64/255, green: 52/255, blue: 140/255, alpha: 1.0)
    let indigoSecondary = NSColor(red: 100/255, green: 88/255, blue: 166/255, alpha: 1.0)
    
    func generateIcons() {
        print("🎨 Generating Indigo app icons...")
        
        let outputDirectory = FileManager.default.currentDirectoryPath + "/Assets.xcassets/AppIcon.appiconset"
        
        // Create directory if it doesn't exist
        try? FileManager.default.createDirectory(
            atPath: outputDirectory,
            withIntermediateDirectories: true,
            attributes: nil
        )
        
        for iconSize in iconSizes {
            let image = createIcon(size: iconSize.pixelSize)
            let outputPath = "\(outputDirectory)/\(iconSize.filename)"
            
            if saveImage(image, to: outputPath) {
                print("✅ Generated \(iconSize.filename) (\(Int(iconSize.pixelSize))x\(Int(iconSize.pixelSize))px)")
            } else {
                print("❌ Failed to generate \(iconSize.filename)")
            }
        }
        
        print("\n🎉 Icon generation complete!")
        print("📁 Icons saved to: \(outputDirectory)")
    }
    
    func createIcon(size: CGFloat) -> NSImage {
        let image = NSImage(size: NSSize(width: size, height: size))
        
        image.lockFocus()
        
        // Create gradient background
        let gradient = NSGradient(
            colors: [indigoPrimary, indigoSecondary],
            atLocations: [0.0, 1.0],
            colorSpace: .deviceRGB
        )
        
        let rect = NSRect(x: 0, y: 0, width: size, height: size)
        
        // Draw rounded rectangle with gradient
        let cornerRadius = size * 0.225 // iOS standard corner radius
        let path = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
        gradient?.draw(in: path, angle: -45)
        
        // Draw logo text or symbol
        drawLogo(in: rect)
        
        image.unlockFocus()
        
        return image
    }
    
    func drawLogo(in rect: NSRect) {
        // Draw "INDIGO" text with infinity symbol
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        
        // Calculate font size based on icon size
        let fontSize = rect.width * 0.18
        let symbolSize = rect.width * 0.35
        
        // Draw infinity symbol (∞)
        let infinityAttributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: symbolSize, weight: .light),
            .foregroundColor: NSColor.white.withAlphaComponent(0.9),
            .paragraphStyle: paragraphStyle
        ]
        
        let infinityRect = NSRect(
            x: rect.minX,
            y: rect.midY - symbolSize * 0.6,
            width: rect.width,
            height: symbolSize
        )
        
        "∞".draw(in: infinityRect, withAttributes: infinityAttributes)
        
        // Draw "INDIGO" text
        let textAttributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: fontSize, weight: .bold),
            .foregroundColor: NSColor.white,
            .paragraphStyle: paragraphStyle,
            .kern: fontSize * 0.08
        ]
        
        let textRect = NSRect(
            x: rect.minX,
            y: rect.minY + rect.height * 0.15,
            width: rect.width,
            height: fontSize * 1.5
        )
        
        "INDIGO".draw(in: textRect, withAttributes: textAttributes)
    }
    
    func saveImage(_ image: NSImage, to path: String) -> Bool {
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let pngData = bitmap.representation(using: .png, properties: [:]) else {
            return false
        }
        
        do {
            try pngData.write(to: URL(fileURLWithPath: path))
            return true
        } catch {
            print("Error saving image: \(error)")
            return false
        }
    }
}

// Run the generator
let generator = AppIconGenerator()
generator.generateIcons()
