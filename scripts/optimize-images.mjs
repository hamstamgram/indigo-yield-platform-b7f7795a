#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORMATS = ['webp', 'avif'];
const SIZES = [640, 768, 1024, 1280, 1536, 1920];
const QUALITY = {
  webp: 80,
  avif: 70,
  jpeg: 85,
};

async function generatePlaceholder(inputPath) {
  try {
    const placeholder = await sharp(inputPath)
      .resize(20, 20, { fit: 'inside' })
      .blur(10)
      .jpeg({ quality: 50 })
      .toBuffer();

    return `data:image/jpeg;base64,${placeholder.toString('base64')}`;
  } catch (error) {
    console.error(`Error generating placeholder for ${inputPath}:`, error);
    return null;
  }
}

async function optimizeImage(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const stats = { original: 0, optimized: 0, formats: {} };

  try {
    // Get original file size
    const originalStats = await fs.stat(inputPath);
    stats.original = originalStats.size;

    // Generate placeholder
    const placeholder = await generatePlaceholder(inputPath);

    // Process each format
    for (const format of FORMATS) {
      stats.formats[format] = [];

      // Process each size
      for (const width of SIZES) {
        const outputPath = path.join(
          outputDir,
          `${filename}-${width}.${format}`
        );

        try {
          await sharp(inputPath)
            .resize(width, null, {
              withoutEnlargement: true,
              fit: 'inside',
            })
            [format]({ quality: QUALITY[format] })
            .toFile(outputPath);

          const outputStats = await fs.stat(outputPath);
          stats.formats[format].push({
            width,
            size: outputStats.size,
            path: outputPath,
          });
          stats.optimized += outputStats.size;

          console.log(`  ✅ Generated: ${filename}-${width}.${format}`);
        } catch (error) {
          console.error(`  ❌ Error processing ${width}px ${format}:`, error.message);
        }
      }
    }

    // Generate manifest
    const manifest = {
      original: path.basename(inputPath),
      placeholder,
      formats: stats.formats,
      savings: Math.round((1 - stats.optimized / (stats.original * FORMATS.length * SIZES.length)) * 100),
    };

    const manifestPath = path.join(outputDir, `${filename}.manifest.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return stats;
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, error);
    return null;
  }
}

async function processDirectory(inputDir, outputDir) {
  console.log('🖼️  Image Optimization Starting...\n');
  console.log(`Input: ${inputDir}`);
  console.log(`Output: ${outputDir}\n`);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Get all image files
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      console.log('No images found to optimize.');
      return;
    }

    console.log(`Found ${imageFiles.length} images to optimize.\n`);

    let totalOriginal = 0;
    let totalOptimized = 0;
    const results = [];

    // Process each image
    for (const file of imageFiles) {
      console.log(`Processing: ${file}`);
      const inputPath = path.join(inputDir, file);
      const stats = await optimizeImage(inputPath, outputDir);

      if (stats) {
        totalOriginal += stats.original;
        totalOptimized += stats.optimized;
        results.push({ file, ...stats });
      }
      console.log('');
    }

    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      inputDir,
      outputDir,
      totalImages: imageFiles.length,
      totalOriginalSize: totalOriginal,
      totalOptimizedSize: totalOptimized,
      totalSavings: Math.round((1 - totalOptimized / (totalOriginal * FORMATS.length)) * 100),
      images: results,
    };

    const reportPath = path.join(outputDir, 'optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('═══════════════════════════════════════');
    console.log('✨ Image Optimization Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`  • Images processed: ${imageFiles.length}`);
    console.log(`  • Original size: ${formatBytes(totalOriginal)}`);
    console.log(`  • Optimized size: ${formatBytes(totalOptimized)} (per format)`);
    console.log(`  • Average savings: ${report.totalSavings}%`);
    console.log(`  • Formats generated: ${FORMATS.join(', ')}`);
    console.log(`  • Sizes generated: ${SIZES.join(', ')}`);
    console.log(`\n📁 Output: ${outputDir}`);
    console.log(`📄 Report: ${reportPath}`);
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('Error processing directory:', error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Image Optimization Script
-------------------------
Optimizes images by generating WebP and AVIF formats in multiple sizes.

Usage:
  node optimize-images.mjs [input-dir] [output-dir]

Arguments:
  input-dir   Directory containing images (default: public/images)
  output-dir  Directory for optimized images (default: public/images/optimized)

Options:
  --help, -h  Show this help message

Examples:
  node optimize-images.mjs
  node optimize-images.mjs public/assets public/assets/optimized
    `);
    return;
  }

  const inputDir = args[0] || path.join(process.cwd(), 'public', 'images');
  const outputDir = args[1] || path.join(process.cwd(), 'public', 'images', 'optimized');

  await processDirectory(inputDir, outputDir);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { optimizeImage, generatePlaceholder };