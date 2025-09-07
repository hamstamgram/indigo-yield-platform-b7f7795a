#!/usr/bin/env node

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Icon sizes to generate
const iconSizes = [
  { size: 192, maskable: false },
  { size: 192, maskable: true },
  { size: 256, maskable: false },
  { size: 384, maskable: false },
  { size: 512, maskable: false },
  { size: 512, maskable: true },
];

// Apple Touch Icons
const appleSizes = [60, 76, 120, 152, 180];

// Shortcut icons
const shortcutIcons = [
  { name: 'dashboard', size: 96 },
  { name: 'statements', size: 96 },
];

// SVG template for the base icon
const createBaseSVG = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4f46e5"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">IY</text>
</svg>
`;

// SVG template for maskable icons (with safe area padding)
const createMaskableSVG = (size: number) => {
  const padding = size * 0.1; // 10% padding for safe area
  const innerSize = size - (padding * 2);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4f46e5"/>
  <circle cx="${size/2}" cy="${size/2}" r="${innerSize/2}" fill="#6366f1"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.25}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">IY</text>
</svg>
`;
};

// Dashboard icon SVG
const createDashboardSVG = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4f46e5" rx="${size * 0.1}"/>
  <rect x="${size * 0.2}" y="${size * 0.3}" width="${size * 0.25}" height="${size * 0.4}" fill="white" opacity="0.9"/>
  <rect x="${size * 0.55}" y="${size * 0.2}" width="${size * 0.25}" height="${size * 0.5}" fill="white" opacity="0.9"/>
</svg>
`;

// Statements icon SVG
const createStatementsSVG = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4f46e5" rx="${size * 0.1}"/>
  <rect x="${size * 0.2}" y="${size * 0.15}" width="${size * 0.6}" height="${size * 0.7}" fill="white" opacity="0.9"/>
  <rect x="${size * 0.3}" y="${size * 0.25}" width="${size * 0.4}" height="${size * 0.05}" fill="#4f46e5"/>
  <rect x="${size * 0.3}" y="${size * 0.35}" width="${size * 0.4}" height="${size * 0.05}" fill="#4f46e5"/>
  <rect x="${size * 0.3}" y="${size * 0.45}" width="${size * 0.4}" height="${size * 0.05}" fill="#4f46e5"/>
</svg>
`;

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');

  // Create directories
  const iconsDir = join(rootDir, 'public', 'icons');
  const screenshotsDir = join(rootDir, 'public', 'screenshots');
  
  await mkdir(iconsDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  // Generate main app icons
  for (const { size, maskable } of iconSizes) {
    const svg = maskable ? createMaskableSVG(size) : createBaseSVG(size);
    const suffix = maskable ? '-maskable' : '';
    const outputPath = join(iconsDir, `icon-${size}x${size}${suffix}.png`);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputPath}`);
  }

  // Generate Apple Touch Icons
  for (const size of appleSizes) {
    const svg = createBaseSVG(size);
    const outputPath = join(rootDir, 'public', `apple-touch-icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated apple-touch-icon-${size}x${size}.png`);
  }

  // Generate default Apple Touch Icon
  const defaultAppleSVG = createBaseSVG(180);
  await sharp(Buffer.from(defaultAppleSVG))
    .png()
    .toFile(join(rootDir, 'public', 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  // Generate favicon
  const faviconSVG = createBaseSVG(32);
  await sharp(Buffer.from(faviconSVG))
    .png()
    .toFile(join(rootDir, 'public', 'favicon-32x32.png'));
  
  const favicon16SVG = createBaseSVG(16);
  await sharp(Buffer.from(favicon16SVG))
    .png()
    .toFile(join(rootDir, 'public', 'favicon-16x16.png'));
  
  console.log('✅ Generated favicon files');

  // Generate shortcut icons
  for (const { name, size } of shortcutIcons) {
    const svg = name === 'dashboard' ? createDashboardSVG(size) : createStatementsSVG(size);
    const outputPath = join(iconsDir, `${name}-${size}x${size}.png`);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${name} shortcut icon`);
  }

  // Generate placeholder screenshots
  const desktopScreenshot = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="#f9fafb"/>
  <rect x="0" y="0" width="1920" height="80" fill="#4f46e5"/>
  <text x="100" y="50" font-family="system-ui" font-size="24" font-weight="bold" fill="white">Indigo Yield Platform</text>
  <rect x="100" y="150" width="400" height="300" fill="#e5e7eb" rx="8"/>
  <rect x="550" y="150" width="400" height="300" fill="#e5e7eb" rx="8"/>
  <rect x="1000" y="150" width="400" height="300" fill="#e5e7eb" rx="8"/>
  <rect x="100" y="500" width="1720" height="400" fill="#e5e7eb" rx="8"/>
</svg>
`;

  const mobileScreenshot = `
<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="844" fill="#f9fafb"/>
  <rect x="0" y="0" width="390" height="100" fill="#4f46e5"/>
  <text x="20" y="60" font-family="system-ui" font-size="20" font-weight="bold" fill="white">Indigo Yield</text>
  <rect x="20" y="120" width="350" height="150" fill="#e5e7eb" rx="8"/>
  <rect x="20" y="290" width="350" height="150" fill="#e5e7eb" rx="8"/>
  <rect x="20" y="460" width="350" height="150" fill="#e5e7eb" rx="8"/>
</svg>
`;

  await sharp(Buffer.from(desktopScreenshot))
    .png()
    .toFile(join(screenshotsDir, 'dashboard-desktop.png'));
  console.log('✅ Generated desktop screenshot');

  await sharp(Buffer.from(mobileScreenshot))
    .png()
    .toFile(join(screenshotsDir, 'dashboard-mobile.png'));
  console.log('✅ Generated mobile screenshot');

  console.log('🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
