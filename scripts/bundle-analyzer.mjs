#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Bundle size thresholds (in bytes)
const THRESHOLDS = {
  initial: 200 * 1024,      // 200KB
  chunk: 50 * 1024,         // 50KB
  asset: 100 * 1024,        // 100KB
  total: 1024 * 1024,       // 1MB
};

async function analyzeBuild() {
  console.log(`${colors.cyan}📦 Bundle Analysis Starting...${colors.reset}\n`);

  try {
    // Run build with analyzer
    console.log(`${colors.blue}Building with webpack-bundle-analyzer...${colors.reset}`);

    const buildCommand = 'ANALYZE=true npm run build';
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse build output for stats
    const stats = await parseBuildStats();

    // Generate report
    await generateReport(stats);

    // Check thresholds
    checkThresholds(stats);

    console.log(`\n${colors.green}✨ Bundle analysis complete!${colors.reset}`);
    console.log(`${colors.cyan}Bundle analyzer should open in your browser automatically.${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error during bundle analysis:${colors.reset}`, error);
    process.exit(1);
  }
}

async function parseBuildStats() {
  const buildDir = path.join(process.cwd(), '.next');
  const statsFile = path.join(buildDir, 'analyze', 'client.html');

  // Read Next.js build manifest
  const buildManifestPath = path.join(buildDir, 'build-manifest.json');
  const buildManifest = JSON.parse(await fs.readFile(buildManifestPath, 'utf8'));

  // Get bundle sizes from build output
  const stats = {
    timestamp: new Date().toISOString(),
    bundles: {},
    chunks: {},
    assets: {},
    totals: {
      js: 0,
      css: 0,
      images: 0,
      total: 0,
    },
  };

  // Parse pages
  for (const [page, assets] of Object.entries(buildManifest.pages)) {
    const jsSize = await getAssetSizes(assets.filter(a => a.endsWith('.js')));
    const cssSize = await getAssetSizes(assets.filter(a => a.endsWith('.css')));

    stats.bundles[page] = {
      js: jsSize,
      css: cssSize,
      total: jsSize + cssSize,
      assets: assets.length,
    };

    stats.totals.js += jsSize;
    stats.totals.css += cssSize;
  }

  // Get chunk information
  const chunksDir = path.join(buildDir, 'static', 'chunks');
  try {
    const chunks = await fs.readdir(chunksDir);

    for (const chunk of chunks) {
      if (chunk.endsWith('.js')) {
        const chunkPath = path.join(chunksDir, chunk);
        const chunkStat = await fs.stat(chunkPath);
        stats.chunks[chunk] = chunkStat.size;
        stats.totals.js += chunkStat.size;
      }
    }
  } catch (error) {
    console.warn('Could not read chunks directory:', error.message);
  }

  stats.totals.total = stats.totals.js + stats.totals.css + stats.totals.images;

  return stats;
}

async function getAssetSizes(assets) {
  let totalSize = 0;

  for (const asset of assets) {
    try {
      const assetPath = path.join(process.cwd(), '.next', asset);
      const stat = await fs.stat(assetPath);
      totalSize += stat.size;
    } catch (error) {
      // Asset might not exist yet
    }
  }

  return totalSize;
}

async function generateReport(stats) {
  const report = {
    summary: {
      timestamp: stats.timestamp,
      totalSize: formatBytes(stats.totals.total),
      jsSize: formatBytes(stats.totals.js),
      cssSize: formatBytes(stats.totals.css),
      imageSize: formatBytes(stats.totals.images),
    },
    pages: Object.entries(stats.bundles)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([page, data]) => ({
        page,
        size: formatBytes(data.total),
        js: formatBytes(data.js),
        css: formatBytes(data.css),
        assets: data.assets,
      })),
    largestChunks: Object.entries(stats.chunks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([chunk, size]) => ({
        chunk,
        size: formatBytes(size),
      })),
    recommendations: generateRecommendations(stats),
  };

  // Save report
  const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log(`\n${colors.bright}📊 Bundle Analysis Summary${colors.reset}`);
  console.log('═══════════════════════════════════════');
  console.log(`Total Size: ${colors.yellow}${report.summary.totalSize}${colors.reset}`);
  console.log(`JavaScript: ${colors.blue}${report.summary.jsSize}${colors.reset}`);
  console.log(`CSS: ${colors.green}${report.summary.cssSize}${colors.reset}`);
  console.log(`Images: ${colors.cyan}${report.summary.imageSize}${colors.reset}`);

  console.log(`\n${colors.bright}📄 Largest Pages:${colors.reset}`);
  report.pages.forEach((page, i) => {
    console.log(`${i + 1}. ${page.page}: ${page.size} (${page.assets} assets)`);
  });

  console.log(`\n${colors.bright}📦 Largest Chunks:${colors.reset}`);
  report.largestChunks.forEach((chunk, i) => {
    console.log(`${i + 1}. ${chunk.chunk}: ${chunk.size}`);
  });

  if (report.recommendations.length > 0) {
    console.log(`\n${colors.bright}💡 Recommendations:${colors.reset}`);
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log(`\n${colors.cyan}Full report saved to: ${reportPath}${colors.reset}`);

  return report;
}

function generateRecommendations(stats) {
  const recommendations = [];

  // Check for large bundles
  Object.entries(stats.bundles).forEach(([page, data]) => {
    if (data.total > THRESHOLDS.chunk * 3) {
      recommendations.push(`Consider code splitting for ${page} (${formatBytes(data.total)})`);
    }
  });

  // Check for large chunks
  Object.entries(stats.chunks).forEach(([chunk, size]) => {
    if (size > THRESHOLDS.chunk) {
      if (chunk.includes('node_modules')) {
        recommendations.push(`Large vendor chunk detected: ${chunk} (${formatBytes(size)})`);
      } else {
        recommendations.push(`Large application chunk: ${chunk} (${formatBytes(size)})`);
      }
    }
  });

  // Check total size
  if (stats.totals.total > THRESHOLDS.total) {
    recommendations.push(`Total bundle size exceeds 1MB threshold (${formatBytes(stats.totals.total)})`);
  }

  // CSS optimization
  if (stats.totals.css > 100 * 1024) {
    recommendations.push('Consider using CSS modules or atomic CSS to reduce stylesheet size');
  }

  // General recommendations
  if (stats.totals.js > 500 * 1024) {
    recommendations.push('Enable dynamic imports for heavy components');
    recommendations.push('Review and remove unused dependencies');
    recommendations.push('Consider using lighter alternatives for large libraries');
  }

  return recommendations;
}

function checkThresholds(stats) {
  const failures = [];

  // Check initial bundle
  const initialBundle = stats.bundles['/'] || stats.bundles['/_app'];
  if (initialBundle && initialBundle.total > THRESHOLDS.initial) {
    failures.push(`Initial bundle exceeds ${formatBytes(THRESHOLDS.initial)} threshold`);
  }

  // Check largest chunk
  const largestChunk = Math.max(...Object.values(stats.chunks));
  if (largestChunk > THRESHOLDS.chunk * 2) {
    failures.push(`Largest chunk exceeds ${formatBytes(THRESHOLDS.chunk * 2)} threshold`);
  }

  // Check total size
  if (stats.totals.total > THRESHOLDS.total) {
    failures.push(`Total size exceeds ${formatBytes(THRESHOLDS.total)} threshold`);
  }

  if (failures.length > 0) {
    console.log(`\n${colors.red}⚠️  Threshold Violations:${colors.reset}`);
    failures.forEach(failure => {
      console.log(`  • ${failure}`);
    });
  } else {
    console.log(`\n${colors.green}✅ All size thresholds passed!${colors.reset}`);
  }

  return failures.length === 0;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Bundle Analyzer Script
----------------------
Analyzes webpack bundle sizes and generates optimization recommendations.

Usage:
  node bundle-analyzer.mjs [options]

Options:
  --help, -h     Show this help message
  --open         Open analyzer in browser (default)
  --json         Output JSON report only

Examples:
  node bundle-analyzer.mjs
  node bundle-analyzer.mjs --json
    `);
    return;
  }

  await analyzeBuild();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeBuild, parseBuildStats, generateReport };