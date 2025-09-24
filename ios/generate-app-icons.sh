#!/bin/bash

# Generate iOS App Icons from source image
SOURCE_IMAGE="/System/Volumes/Data/Users/mama/indigo-bis-pantera/public/brand/INDIGO_SQUARE.jpg"
DEST_DIR="/Users/mama/indigo-yield-platform-v01/ios/IndigoInvestor/Resources/Assets.xcassets/AppIcon.appiconset"

# Check if source exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Source image not found: $SOURCE_IMAGE"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

echo "Generating iOS app icons..."

# iPhone icons
sips -z 40 40 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-20@2x.png"
sips -z 60 60 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-20@3x.png"
sips -z 58 58 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-29@2x.png"
sips -z 87 87 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-29@3x.png"
sips -z 80 80 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-40@2x.png"
sips -z 120 120 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-40@3x.png"
sips -z 120 120 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-60@2x.png"
sips -z 180 180 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-60@3x.png"

# iPad icons
sips -z 20 20 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-20.png"
sips -z 29 29 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-29.png"
sips -z 40 40 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-40.png"
sips -z 76 76 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-76.png"
sips -z 152 152 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-76@2x.png"
sips -z 167 167 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-83.5@2x.png"

# App Store icon
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$DEST_DIR/icon-1024.png"

echo "App icons generated successfully!"