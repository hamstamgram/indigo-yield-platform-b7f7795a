#!/usr/bin/env node

/**
 * Extract and inline critical CSS for faster initial page load
 * Run this as part of the build process
 */

const fs = require('fs').promises;
const path = require('path');
const { PurgeCSS } = require('purgecss');
const postcss = require('postcss');
const cssnano = require('cssnano');

// Configuration
const CONFIG = {
  htmlFile: path.join(__dirname, '../dist/index.html'),
  cssFiles: [
    path.join(__dirname, '../dist/assets/*.css'),
  ],
  outputFile: path.join(__dirname, '../dist/index.html'),
  criticalSelectors: [
    // Always include these selectors
    'html',
    'body',
    '#root',
    '.App',
    // Loading states
    '.animate-pulse',
    '.animate-spin',
    '.animate-shimmer',
    '.skeleton',
    '.loading',
    // Above the fold components
    'header',
    'nav',
    'main',
    '.hero',
    '.container',
    // Typography
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span',
    // Critical utilities
    '.flex',
    '.grid',
    '.block',
    '.inline-block',
    '.hidden',
    '.absolute',
    '.relative',
    '.fixed',
    '.sticky',
    // Dark mode
    '.dark',
    ':root',
  ],
};

async function extractCriticalCSS() {
  try {
    console.log('🔍 Extracting critical CSS...');
    
    // Read HTML file
    const html = await fs.readFile(CONFIG.htmlFile, 'utf8');
    
    // Find all CSS files
    const cssFiles = [];
    const distDir = path.join(__dirname, '../dist/assets');
    const files = await fs.readdir(distDir);
    
    for (const file of files) {
      if (file.endsWith('.css')) {
        cssFiles.push(path.join(distDir, file));
      }
    }
    
    if (cssFiles.length === 0) {
      console.log('⚠️  No CSS files found in dist/assets');
      return;
    }
    
    // Read all CSS content
    let allCSS = '';
    for (const cssFile of cssFiles) {
      const content = await fs.readFile(cssFile, 'utf8');
      allCSS += content + '\n';
    }
    
    // Extract critical CSS using PurgeCSS
    const purgeCSSResult = await new PurgeCSS().purge({
      content: [
        {
          raw: html,
          extension: 'html',
        },
      ],
      css: [
        {
          raw: allCSS,
        },
      ],
      safelist: {
        standard: CONFIG.criticalSelectors,
        deep: [/^(dark|light)/, /^animate-/],
        greedy: [/^bg-/, /^text-/, /^border-/],
      },
      fontFace: true,
      keyframes: true,
      variables: true,
    });
    
    let criticalCSS = purgeCSSResult[0].css;
    
    // Optimize critical CSS with PostCSS and cssnano
    const result = await postcss([
      cssnano({
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
        }],
      }),
    ]).process(criticalCSS, { from: undefined });
    
    criticalCSS = result.css;
    
    console.log(`✨ Extracted ${(criticalCSS.length / 1024).toFixed(2)}KB of critical CSS`);
    
    // Inline critical CSS in HTML
    const criticalStyleTag = `
    <style id="critical-css">
      ${criticalCSS}
    </style>
    `;
    
    // Insert critical CSS before closing </head> tag
    let updatedHTML = html.replace('</head>', `${criticalStyleTag}</head>`);
    
    // Add preload for full CSS
    for (const cssFile of cssFiles) {
      const fileName = path.basename(cssFile);
      const preloadLink = `<link rel="preload" href="/assets/${fileName}" as="style">`;
      updatedHTML = updatedHTML.replace('</head>', `${preloadLink}\n  </head>`);
    }
    
    // Write updated HTML
    await fs.writeFile(CONFIG.outputFile, updatedHTML);
    
    console.log('✅ Critical CSS inlined successfully!');
    
    // Generate report
    const report = {
      originalCSSSize: (allCSS.length / 1024).toFixed(2) + 'KB',
      criticalCSSSize: (criticalCSS.length / 1024).toFixed(2) + 'KB',
      reduction: ((1 - criticalCSS.length / allCSS.length) * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString(),
    };
    
    await fs.writeFile(
      path.join(__dirname, '../dist/critical-css-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📊 Report:', report);
    
  } catch (error) {
    console.error('❌ Error extracting critical CSS:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  extractCriticalCSS();
}

module.exports = { extractCriticalCSS };
