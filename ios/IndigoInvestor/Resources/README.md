# IndigoInvestor Resources

This directory contains all the visual assets and resources for the IndigoInvestor iOS app.

## Assets.xcassets

The Assets catalog contains:

### AppIcon.appiconset
- App icons for all required iOS sizes (iPhone and iPad)
- Marketing icon for App Store (1024x1024)
- **Important**: Current icons are placeholders. Replace with actual Indigo logo designs.

### Color Sets
- **IndigoBrand.colorset**: The primary Indigo brand purple color (#6753BE)
- **AccentColor.colorset**: The app's accent color (matches brand color)

## Icon Generation

To generate placeholder icons (requires ImageMagick or Python with Pillow):

```bash
cd Resources
chmod +x generate_icons.sh
./generate_icons.sh
```

## Brand Guidelines

### Primary Color
- **Indigo Purple**: #6753BE (RGB: 103, 83, 190)
- Used for primary buttons, navigation, and brand elements

### Typography
The app uses the Indigo wordmark style:
- Font: Helvetica Bold or similar sans-serif
- Letter spacing: Slightly expanded
- The "GO" portion could be styled differently (lighter weight or opacity)

## App Icon Design Requirements

When creating the final app icon:

1. **No Alpha Channel**: App Store requires icons without transparency
2. **Corner Radius**: iOS will apply corner radius automatically - design with square corners
3. **Simple Design**: Should be recognizable at small sizes (20x20 minimum)
4. **Brand Consistency**: Match the Indigo brand guidelines
5. **Platform Variants**: Consider different designs for iOS/iPadOS if needed

## Required Icon Sizes

### iPhone
- 20pt: 40×40px (@2x), 60×60px (@3x)
- 29pt: 58×58px (@2x), 87×87px (@3x)
- 40pt: 80×80px (@2x), 120×120px (@3x)
- 60pt: 120×120px (@2x), 180×180px (@3x)

### iPad
- 20pt: 20×20px (@1x), 40×40px (@2x)
- 29pt: 29×29px (@1x), 58×58px (@2x)
- 40pt: 40×40px (@1x), 80×80px (@2x)
- 76pt: 76×76px (@1x), 152×152px (@2x)
- 83.5pt: 167×167px (@2x)

### App Store
- 1024×1024px (@1x)

## Additional Resources

To add more image assets:
1. Add them to the Assets.xcassets folder
2. Create appropriate `.imageset` directories
3. Include `Contents.json` with proper scale variants (@1x, @2x, @3x)

For vector assets (PDF), place a single PDF in the imageset and set "Preserve Vector Data" in Xcode.
