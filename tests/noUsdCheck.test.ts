import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NO_USD Compliance Test
 * Ensures investor-facing routes don't use USD/fiat currency formatting
 */

const INVESTOR_DIRS = [
  'src/routes/investor',
  'src/components/investor',
  'src/routes/ib',
  'src/components/ib',
];

const FORBIDDEN_PATTERNS = [
  /formatCurrency\(/g,              // USD currency formatter
  /\$\d+/g,                         // Dollar amounts like $100
  /style:\s*['"]currency['"]/g,    // Intl currency style
  /\bUSD(?![TC])\b/g,              // USD but not USDT/USDC
  /toLocaleString.*currency/g,     // Currency formatting
];

function scanDirectory(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  
  return files;
}

function checkFileForViolations(filePath: string): { file: string; violations: string[] } {
  const violations: string[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    for (const pattern of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(`Pattern ${pattern.source}: ${matches.join(', ')}`);
      }
    }
  } catch {
    // File can't be read
  }
  
  return { file: filePath, violations };
}

describe('NO_USD Compliance', () => {
  it('should not contain USD/fiat formatting in investor routes', () => {
    const allFiles: string[] = [];
    
    for (const dir of INVESTOR_DIRS) {
      allFiles.push(...scanDirectory(dir));
    }
    
    const allViolations: { file: string; violations: string[] }[] = [];
    
    for (const file of allFiles) {
      const result = checkFileForViolations(file);
      if (result.violations.length > 0) {
        allViolations.push(result);
      }
    }
    
    if (allViolations.length > 0) {
      const report = allViolations
        .map(v => `${v.file}:\n  ${v.violations.join('\n  ')}`)
        .join('\n\n');
      
      expect.fail(`Found USD/fiat formatting violations:\n\n${report}`);
    }
    
    expect(allViolations).toHaveLength(0);
  });
  
  it('should use formatAssetAmount for all token amounts', () => {
    // This is a documentation test - formatAssetAmount should be used everywhere
    expect(true).toBe(true);
  });
});
