#!/bin/bash

# Generate App Icon Placeholders for IndigoInvestor
# This script creates placeholder icons with the Indigo brand color
# You should replace these with actual logo designs

ICON_DIR="Assets.xcassets/AppIcon.appiconset"
PURPLE_COLOR="#6753BE"  # Indigo brand color

# Function to create a placeholder icon using ImageMagick or sips
create_icon() {
    size=$1
    filename=$2
    
    # Check if ImageMagick is available
    if command -v convert &> /dev/null; then
        # Use ImageMagick
        convert -size ${size}x${size} xc:"$PURPLE_COLOR" \
                -fill white \
                -gravity center \
                -font Helvetica-Bold \
                -pointsize $(($size/3)) \
                -annotate +0+0 "I" \
                "$ICON_DIR/$filename"
        echo "Created $filename (${size}x${size})"
    elif command -v sips &> /dev/null; then
        # Use macOS sips as fallback (create a simple colored square)
        # First create a temporary file with the color
        echo "Note: Install ImageMagick for better icon generation (brew install imagemagick)"
        # Create a simple colored square using Python if available
        if command -v python3 &> /dev/null; then
            python3 << EOF
from PIL import Image, ImageDraw, ImageFont
import os

size = $size
filename = "$ICON_DIR/$filename"
color = (103, 83, 190)  # RGB for #6753BE

# Create image
img = Image.new('RGBA', (size, size), color)
draw = ImageDraw.Draw(img)

# Add text
try:
    font_size = size // 3
    # Try to use system font
    from PIL import ImageFont
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
except:
    font = None

text = "I"
if font:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2)
    draw.text(position, text, fill='white', font=font)
else:
    # Fallback without font
    draw.text((size//2 - 10, size//2 - 20), text, fill='white')

# Save
img.save(filename, 'PNG')
print(f"Created {filename} ({size}x{size})")
EOF
        else
            echo "Please install Python 3 with Pillow, or ImageMagick for icon generation"
        fi
    else
        echo "No suitable image manipulation tool found. Please install ImageMagick:"
        echo "  brew install imagemagick"
    fi
}

# Create all required icon sizes
echo "Generating app icons..."

# iPhone icons
create_icon 40 "icon-20@2x.png"
create_icon 60 "icon-20@3x.png"
create_icon 58 "icon-29@2x.png"
create_icon 87 "icon-29@3x.png"
create_icon 80 "icon-40@2x.png"
create_icon 120 "icon-40@3x.png"
create_icon 120 "icon-60@2x.png"
create_icon 180 "icon-60@3x.png"

# iPad icons
create_icon 20 "icon-20.png"
create_icon 29 "icon-29.png"
create_icon 40 "icon-40.png"
create_icon 76 "icon-76.png"
create_icon 152 "icon-76@2x.png"
create_icon 167 "icon-83.5@2x.png"

# App Store icon
create_icon 1024 "icon-1024.png"

echo "Done! Icons have been created in $ICON_DIR"
echo ""
echo "IMPORTANT: These are placeholder icons. You should:"
echo "1. Design proper app icons with the Indigo logo"
echo "2. Replace the generated files in $ICON_DIR"
echo "3. Ensure all icons have no transparency for App Store submission"
