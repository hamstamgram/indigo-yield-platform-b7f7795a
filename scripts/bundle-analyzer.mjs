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

async function analyzeBuild() {
  console.log(`${colors.cyan}📦 Bundle Analysis Starting...${colors.reset}\n`);

  try {
    // Run build with analyzer
    console.log(`${colors.blue}Building with rollup-plugin-visualizer...${colors.reset}`);

    const buildCommand = 'ANALYZE=true npm run build';
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    console.log(stdout);

    const statsPath = path.join(process.cwd(), 'dist', 'stats.html');

    try {
      await fs.access(statsPath);
      console.log(`\n${colors.green}✨ Bundle analysis complete!${colors.reset}`);
      console.log(`${colors.cyan}Report generated at: ${statsPath}${colors.reset}`);
      console.log(`${colors.cyan}It should have opened in your default browser.${colors.reset}`);
    } catch (e) {
      console.error(`${colors.red}Error: stats.html not found at ${statsPath}${colors.reset}`);
    }

    // Simple size check on dist folder
    console.log(`\n${colors.bright}Simple Size Check (dist/assets):${colors.reset}`);
    const assetsDir = path.join(process.cwd(), 'dist', 'assets');

    try {
      const files = await fs.readdir(assetsDir);
      for (const file of files) {
        const filePath = path.join(assetsDir, file);
        const stats = await fs.stat(filePath);
        const sizeKb = (stats.size / 1024).toFixed(2);

        let color = colors.green;
        if (stats.size > 500 * 1024) color = colors.red; // > 500KB
        else if (stats.size > 200 * 1024) color = colors.yellow; // > 200KB

        console.log(`${color}${file}: ${sizeKb} KB${colors.reset}`);
      }
    } catch (error) {
      console.log("Could not list assets dir (maybe empty):", error.message);
    }

  } catch (error) {
    console.error(`${colors.red}Error during bundle analysis:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBuild().catch(console.error);
}

export { analyzeBuild };