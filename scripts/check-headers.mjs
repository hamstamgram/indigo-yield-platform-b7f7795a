#!/usr/bin/env node

import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs/promises';
import path from 'path';

const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:5173';

// Required security headers
const REQUIRED_HEADERS = {
  'strict-transport-security': {
    required: true,
    minValue: 'max-age=63072000',
    description: 'Forces HTTPS connections'
  },
  'x-content-type-options': {
    required: true,
    value: 'nosniff',
    description: 'Prevents MIME type sniffing'
  },
  'x-frame-options': {
    required: true,
    value: 'DENY',
    description: 'Prevents clickjacking'
  },
  'referrer-policy': {
    required: true,
    acceptableValues: ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer'],
    description: 'Controls referrer information'
  },
  'permissions-policy': {
    required: true,
    mustContain: ['camera=()', 'microphone=()', 'geolocation=()'],
    description: 'Restricts browser features'
  },
  'content-security-policy': {
    required: true,
    mustContain: ["default-src", "script-src", "style-src", "frame-ancestors 'none'"],
    description: 'Prevents XSS and data injection'
  },
  'cross-origin-opener-policy': {
    required: false,
    value: 'same-origin',
    description: 'Isolates browsing context'
  },
  'cross-origin-resource-policy': {
    required: false,
    value: 'same-site',
    description: 'Prevents resource loading from other origins'
  }
};

async function fetchHeaders(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'HEAD',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function validateHeader(headerName, headerValue, requirements) {
  const result = {
    name: headerName,
    present: !!headerValue,
    value: headerValue,
    valid: false,
    issues: []
  };

  if (!headerValue) {
    if (requirements.required) {
      result.issues.push('Header is missing');
    }
    return result;
  }

  // Check exact value match
  if (requirements.value) {
    result.valid = headerValue.toLowerCase() === requirements.value.toLowerCase();
    if (!result.valid) {
      result.issues.push(`Expected "${requirements.value}", got "${headerValue}"`);
    }
  }
  // Check acceptable values
  else if (requirements.acceptableValues) {
    result.valid = requirements.acceptableValues.some(v => 
      headerValue.toLowerCase().includes(v.toLowerCase())
    );
    if (!result.valid) {
      result.issues.push(`Value not in acceptable list: ${requirements.acceptableValues.join(', ')}`);
    }
  }
  // Check minimum value (for HSTS)
  else if (requirements.minValue) {
    result.valid = headerValue.includes(requirements.minValue);
    if (!result.valid) {
      result.issues.push(`Should include at least "${requirements.minValue}"`);
    }
  }
  // Check must contain values
  else if (requirements.mustContain) {
    const missing = requirements.mustContain.filter(item => !headerValue.includes(item));
    result.valid = missing.length === 0;
    if (!result.valid) {
      result.issues.push(`Missing required directives: ${missing.join(', ')}`);
    }
  } else {
    result.valid = true;
  }

  return result;
}

async function analyzeCSP(cspHeader) {
  const directives = {};
  const parts = cspHeader.split(';').map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    const [directive, ...values] = part.split(' ');
    if (directive) {
      directives[directive] = values.join(' ');
    }
  }

  return {
    directives,
    analysis: {
      hasDefaultSrc: !!directives['default-src'],
      hasScriptSrc: !!directives['script-src'],
      hasStyleSrc: !!directives['style-src'],
      hasFrameAncestors: !!directives['frame-ancestors'],
      hasObjectSrc: directives['object-src'] === "'none'",
      allowsUnsafeInline: (directives['script-src'] || '').includes('unsafe-inline'),
      allowsUnsafeEval: (directives['script-src'] || '').includes('unsafe-eval')
    }
  };
}

async function main() {
  console.log(`\n🔍 Security Headers Check`);
  console.log(`URL: ${AUDIT_BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    // Fetch headers
    const response = await fetchHeaders(AUDIT_BASE_URL);
    
    if (response.statusCode === 401) {
      console.log('⚠️  Preview URL requires authentication. Headers from auth page:\n');
    } else if (response.statusCode >= 400) {
      console.log(`⚠️  Received status code ${response.statusCode}\n`);
    }

    const results = {
      url: AUDIT_BASE_URL,
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      headers: {},
      summary: {
        total: Object.keys(REQUIRED_HEADERS).length,
        present: 0,
        valid: 0,
        missing: 0,
        invalid: 0
      },
      score: 0
    };

    // Validate each header
    for (const [headerName, requirements] of Object.entries(REQUIRED_HEADERS)) {
      const headerValue = response.headers[headerName];
      const validation = validateHeader(headerName, headerValue, requirements);
      
      results.headers[headerName] = {
        ...validation,
        description: requirements.description,
        required: requirements.required
      };

      if (validation.present) {
        results.summary.present++;
        if (validation.valid) {
          results.summary.valid++;
          console.log(`✅ ${headerName}: ${validation.value?.substring(0, 100)}...`);
        } else {
          results.summary.invalid++;
          console.log(`⚠️  ${headerName}: ${validation.issues.join('; ')}`);
        }
      } else if (requirements.required) {
        results.summary.missing++;
        console.log(`❌ ${headerName}: Missing (required)`);
      } else {
        console.log(`ℹ️  ${headerName}: Missing (optional)`);
      }
    }

    // Calculate score
    const requiredHeaders = Object.entries(REQUIRED_HEADERS)
      .filter(([_, r]) => r.required).length;
    const validRequired = Object.entries(results.headers)
      .filter(([name, result]) => REQUIRED_HEADERS[name].required && result.valid).length;
    
    results.score = Math.round((validRequired / requiredHeaders) * 100);

    // Analyze CSP in detail
    const cspHeader = response.headers['content-security-policy'];
    if (cspHeader) {
      results.cspAnalysis = await analyzeCSP(cspHeader);
      console.log('\n📋 CSP Analysis:');
      console.log('  Directives found:', Object.keys(results.cspAnalysis.directives).join(', '));
      console.log('  Allows unsafe-inline:', results.cspAnalysis.analysis.allowsUnsafeInline ? '⚠️ Yes' : '✅ No');
      console.log('  Allows unsafe-eval:', results.cspAnalysis.analysis.allowsUnsafeEval ? '⚠️ Yes' : '✅ No');
    }

    // Write results to JSON
    const outputPath = path.join('artifacts', 'headers', 'results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📊 Results saved to ${outputPath}`);

    // Write markdown report
    const mdPath = path.join('artifacts', 'security', 'security-headers.md');
    const mdContent = `# Security Headers Report

**URL**: ${AUDIT_BASE_URL}
**Date**: ${results.timestamp}
**Score**: ${results.score}%

## Summary
- Total Headers Checked: ${results.summary.total}
- Present: ${results.summary.present}
- Valid: ${results.summary.valid}
- Missing: ${results.summary.missing}
- Invalid: ${results.summary.invalid}

## Header Details

| Header | Status | Value | Issues |
|--------|--------|-------|--------|
${Object.entries(results.headers).map(([name, result]) => 
  `| ${name} | ${result.valid ? '✅' : result.present ? '⚠️' : '❌'} | ${result.value ? result.value.substring(0, 50) + '...' : 'Missing'} | ${result.issues.join(', ') || 'None'} |`
).join('\n')}

## Recommendations
${results.summary.missing > 0 ? '1. Add missing required headers to vercel.json\n' : ''}
${results.summary.invalid > 0 ? '2. Fix invalid header values\n' : ''}
${results.cspAnalysis?.analysis.allowsUnsafeInline ? '3. Consider removing unsafe-inline from CSP\n' : ''}
${results.cspAnalysis?.analysis.allowsUnsafeEval ? '4. Consider removing unsafe-eval from CSP\n' : ''}
${results.score < 100 ? '5. Aim for 100% compliance with required headers' : '✅ All required headers are properly configured'}
`;

    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.writeFile(mdPath, mdContent);
    console.log(`📄 Markdown report saved to ${mdPath}`);

    // Exit with appropriate code
    process.exit(results.score === 100 ? 0 : 1);

  } catch (error) {
    console.error('❌ Error checking headers:', error.message);
    
    // Save error report
    const errorReport = {
      url: AUDIT_BASE_URL,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    };
    
    const errorPath = path.join('artifacts', 'headers', 'error.json');
    await fs.mkdir(path.dirname(errorPath), { recursive: true });
    await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
    
    process.exit(1);
  }
}

main().catch(console.error);
