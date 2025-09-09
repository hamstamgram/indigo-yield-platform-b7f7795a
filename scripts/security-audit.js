#!/usr/bin/env node

/**
 * Security Audit Script
 * Performs comprehensive security checks on the application
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Security patterns to check
const SECURITY_PATTERNS = {
  // Sensitive data exposure
  secrets: [
    /api[_-]?key/gi,
    /secret[_-]?key/gi,
    /private[_-]?key/gi,
    /access[_-]?token/gi,
    /auth[_-]?token/gi,
    /password\s*=\s*["'][^"']+["']/gi,
    /token\s*=\s*["'][^"']+["']/gi,
    /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi,
  ],
  
  // Hardcoded credentials
  credentials: [
    /supabase[_-]?url\s*=\s*["']https:\/\/[^"']+["']/gi,
    /supabase[_-]?anon[_-]?key\s*=\s*["'][^"']+["']/gi,
    /database[_-]?url\s*=\s*["'][^"']+["']/gi,
    /mongodb:\/\/[^"'\s]+/gi,
    /postgres:\/\/[^"'\s]+/gi,
  ],
  
  // Vulnerable patterns
  vulnerabilities: {
    sqlInjection: [
      /query\s*\(\s*["'`].*\$\{.*\}.*["'`]\s*\)/gi,
      /query\s*\(\s*["'`].*\+.*["'`]\s*\)/gi,
      /exec\s*\(\s*["'`].*\$\{.*\}.*["'`]\s*\)/gi,
    ],
    xss: [
      /innerHTML\s*=\s*[^"'`]+/gi,
      /dangerouslySetInnerHTML/gi,
      /document\.write\(/gi,
      /eval\(/gi,
    ],
    csrf: [
      /csrf[_-]?token/gi,
      /x-csrf-token/gi,
    ],
    cors: [
      /Access-Control-Allow-Origin:\s*\*/gi,
      /cors\(\s*\{\s*origin:\s*true/gi,
    ],
  },
  
  // Security headers
  headers: [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'X-XSS-Protection',
  ],
};

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.env\.example/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
];

// Audit results
const auditResults = {
  secrets: [],
  credentials: [],
  vulnerabilities: {
    sqlInjection: [],
    xss: [],
    csrf: [],
    cors: [],
  },
  missingHeaders: [],
  insecureImports: [],
  httpCalls: [],
  filePermissions: [],
  dependencies: [],
  summary: {
    filesScanned: 0,
    issuesFound: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
};

/**
 * Scan a file for security issues
 */
async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    auditResults.summary.filesScanned++;
    
    // Check for secrets
    for (const pattern of SECURITY_PATTERNS.secrets) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Skip if it's likely a variable reference
          if (!match.includes('process.env') && !match.includes('import.meta.env')) {
            auditResults.secrets.push({
              file: relativePath,
              pattern: pattern.source,
              match: match.substring(0, 50) + '...',
              severity: 'critical',
            });
            auditResults.summary.critical++;
          }
        });
      }
    }
    
    // Check for hardcoded credentials
    for (const pattern of SECURITY_PATTERNS.credentials) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!match.includes('process.env') && !match.includes('import.meta.env')) {
            auditResults.credentials.push({
              file: relativePath,
              pattern: pattern.source,
              match: match.substring(0, 50) + '...',
              severity: 'critical',
            });
            auditResults.summary.critical++;
          }
        });
      }
    }
    
    // Check for vulnerabilities
    for (const [vulnType, patterns] of Object.entries(SECURITY_PATTERNS.vulnerabilities)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            auditResults.vulnerabilities[vulnType].push({
              file: relativePath,
              pattern: pattern.source,
              match: match.substring(0, 50) + '...',
              severity: vulnType === 'xss' || vulnType === 'sqlInjection' ? 'high' : 'medium',
            });
            if (vulnType === 'xss' || vulnType === 'sqlInjection') {
              auditResults.summary.high++;
            } else {
              auditResults.summary.medium++;
            }
          });
        }
      }
    }
    
    // Check for insecure HTTP calls
    const httpPattern = /http:\/\/(?!localhost|127\.0\.0\.1)/gi;
    const httpMatches = content.match(httpPattern);
    if (httpMatches) {
      httpMatches.forEach(match => {
        auditResults.httpCalls.push({
          file: relativePath,
          match: match,
          severity: 'medium',
        });
        auditResults.summary.medium++;
      });
    }
    
    // Check for dangerous imports
    const dangerousImports = [
      /require\(['"]child_process['"]\)/gi,
      /import.*child_process/gi,
      /require\(['"]fs['"]\)/gi,
      /import.*\bfs\b/gi,
      /require\(['"]eval['"]\)/gi,
    ];
    
    for (const pattern of dangerousImports) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          auditResults.insecureImports.push({
            file: relativePath,
            match: match,
            severity: 'low',
          });
          auditResults.summary.low++;
        });
      }
    }
    
  } catch (error) {
    // File might be binary or unreadable
  }
}

/**
 * Recursively scan directory
 */
async function scanDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Check if should exclude
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.js', '.jsx', '.ts', '.tsx', '.json', '.env'].includes(ext)) {
        await scanFile(fullPath);
      }
    }
  }
}

/**
 * Check environment variables
 */
async function checkEnvironmentVariables() {
  const envFiles = ['.env', '.env.local', '.env.production'];
  
  for (const envFile of envFiles) {
    try {
      const content = await fs.readFile(envFile, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for exposed secrets
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          
          // Check if value looks like a real secret
          if (value && value.length > 20 && !value.includes('your_') && !value.includes('xxx')) {
            console.log(`${colors.yellow}Warning: Possible exposed secret in ${envFile} at line ${index + 1}${colors.reset}`);
          }
        }
      });
    } catch (error) {
      // File doesn't exist
    }
  }
}

/**
 * Check package.json for vulnerable dependencies
 */
async function checkDependencies() {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    
    // List of packages with known security issues
    const vulnerablePackages = [
      { name: 'express', minVersion: '4.17.3', reason: 'Security fixes' },
      { name: 'axios', minVersion: '0.21.2', reason: 'SSRF vulnerability' },
      { name: 'lodash', minVersion: '4.17.21', reason: 'Prototype pollution' },
      { name: 'minimist', minVersion: '1.2.6', reason: 'Prototype pollution' },
    ];
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    for (const [name, version] of Object.entries(allDeps)) {
      const vuln = vulnerablePackages.find(p => p.name === name);
      if (vuln) {
        const cleanVersion = version.replace(/[\^~]/, '');
        if (cleanVersion < vuln.minVersion) {
          auditResults.dependencies.push({
            package: name,
            currentVersion: version,
            minVersion: vuln.minVersion,
            reason: vuln.reason,
            severity: 'high',
          });
          auditResults.summary.high++;
        }
      }
    }
  } catch (error) {
    console.error('Could not check dependencies:', error.message);
  }
}

/**
 * Check security headers configuration
 */
async function checkSecurityHeaders() {
  const configFiles = [
    'next.config.js',
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
  ];
  
  for (const configFile of configFiles) {
    try {
      const content = await fs.readFile(configFile, 'utf8');
      
      for (const header of SECURITY_PATTERNS.headers) {
        if (!content.includes(header)) {
          auditResults.missingHeaders.push({
            file: configFile,
            header: header,
            severity: 'medium',
          });
          auditResults.summary.medium++;
        }
      }
    } catch (error) {
      // Config file doesn't exist
    }
  }
}

/**
 * Generate security report
 */
function generateReport() {
  console.log('\n' + colors.cyan + '=' .repeat(60) + colors.reset);
  console.log(colors.cyan + '                 SECURITY AUDIT REPORT' + colors.reset);
  console.log(colors.cyan + '=' .repeat(60) + colors.reset);
  
  // Summary
  console.log('\n' + colors.blue + '📊 Summary:' + colors.reset);
  console.log(`Files scanned: ${auditResults.summary.filesScanned}`);
  console.log(`Total issues: ${auditResults.summary.issuesFound}`);
  console.log(`${colors.red}Critical: ${auditResults.summary.critical}${colors.reset}`);
  console.log(`${colors.yellow}High: ${auditResults.summary.high}${colors.reset}`);
  console.log(`${colors.yellow}Medium: ${auditResults.summary.medium}${colors.reset}`);
  console.log(`${colors.green}Low: ${auditResults.summary.low}${colors.reset}`);
  
  // Secrets
  if (auditResults.secrets.length > 0) {
    console.log('\n' + colors.red + '🔑 Exposed Secrets:' + colors.reset);
    auditResults.secrets.forEach(issue => {
      console.log(`  ${issue.file}: ${issue.match}`);
    });
  }
  
  // Credentials
  if (auditResults.credentials.length > 0) {
    console.log('\n' + colors.red + '🔐 Hardcoded Credentials:' + colors.reset);
    auditResults.credentials.forEach(issue => {
      console.log(`  ${issue.file}: ${issue.match}`);
    });
  }
  
  // Vulnerabilities
  for (const [vulnType, issues] of Object.entries(auditResults.vulnerabilities)) {
    if (issues.length > 0) {
      console.log('\n' + colors.yellow + `⚠️  ${vulnType}:` + colors.reset);
      issues.forEach(issue => {
        console.log(`  ${issue.file}: ${issue.match}`);
      });
    }
  }
  
  // HTTP calls
  if (auditResults.httpCalls.length > 0) {
    console.log('\n' + colors.yellow + '🔓 Insecure HTTP Calls:' + colors.reset);
    auditResults.httpCalls.forEach(issue => {
      console.log(`  ${issue.file}: ${issue.match}`);
    });
  }
  
  // Dependencies
  if (auditResults.dependencies.length > 0) {
    console.log('\n' + colors.yellow + '📦 Vulnerable Dependencies:' + colors.reset);
    auditResults.dependencies.forEach(issue => {
      console.log(`  ${issue.package}@${issue.currentVersion} (needs ${issue.minVersion}): ${issue.reason}`);
    });
  }
  
  // Missing headers
  if (auditResults.missingHeaders.length > 0) {
    console.log('\n' + colors.yellow + '🛡️ Missing Security Headers:' + colors.reset);
    const uniqueHeaders = [...new Set(auditResults.missingHeaders.map(h => h.header))];
    uniqueHeaders.forEach(header => {
      console.log(`  ${header}`);
    });
  }
  
  // Recommendations
  console.log('\n' + colors.green + '✅ Recommendations:' + colors.reset);
  console.log('1. Move all secrets to environment variables');
  console.log('2. Use parameterized queries to prevent SQL injection');
  console.log('3. Sanitize user input to prevent XSS attacks');
  console.log('4. Implement CSRF tokens for state-changing operations');
  console.log('5. Configure proper security headers');
  console.log('6. Use HTTPS for all external API calls');
  console.log('7. Keep dependencies up to date');
  console.log('8. Implement proper authentication and authorization');
  console.log('9. Use Content Security Policy (CSP)');
  console.log('10. Regular security audits and penetration testing');
  
  // Calculate total issues
  auditResults.summary.issuesFound = 
    auditResults.summary.critical +
    auditResults.summary.high +
    auditResults.summary.medium +
    auditResults.summary.low;
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'security-audit-report.json');
  fs.writeFile(reportPath, JSON.stringify(auditResults, null, 2))
    .then(() => {
      console.log(`\n${colors.blue}📄 Full report saved to: ${reportPath}${colors.reset}`);
    });
  
  // Exit code based on severity
  if (auditResults.summary.critical > 0) {
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(colors.blue + '🔍 Starting security audit...' + colors.reset);
  
  try {
    // Scan source code
    await scanDirectory('./src');
    
    // Check environment variables
    await checkEnvironmentVariables();
    
    // Check dependencies
    await checkDependencies();
    
    // Check security headers
    await checkSecurityHeaders();
    
    // Generate report
    generateReport();
    
  } catch (error) {
    console.error(colors.red + 'Error during security audit:' + colors.reset, error);
    process.exit(1);
  }
}

// Run audit
main();
