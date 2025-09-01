#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface MigrationIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

const UNSAFE_PATTERNS = [
  {
    pattern: /DROP\s+COLUMN/gi,
    issue: 'DROP COLUMN is unsafe for zero-downtime deployments',
    severity: 'error' as const,
    suggestion: 'Use a multi-step migration: 1) Stop reading the column, 2) Deploy, 3) Drop the column',
  },
  {
    pattern: /DROP\s+TABLE/gi,
    issue: 'DROP TABLE is unsafe for zero-downtime deployments',
    severity: 'error' as const,
    suggestion: 'Use feature flags to stop using the table before dropping it',
  },
  {
    pattern: /ALTER\s+TABLE\s+.*\s+RENAME\s+TO/gi,
    issue: 'RENAME TABLE is unsafe for zero-downtime deployments',
    severity: 'error' as const,
    suggestion: 'Create a view with the new name pointing to the old table',
  },
  {
    pattern: /ALTER\s+TABLE\s+.*\s+RENAME\s+COLUMN/gi,
    issue: 'RENAME COLUMN is unsafe for zero-downtime deployments',
    severity: 'error' as const,
    suggestion: 'Add a new column, dual-write, migrate data, then remove old column',
  },
  {
    pattern: /CREATE\s+INDEX(?!\s+CONCURRENTLY)/gi,
    issue: 'CREATE INDEX without CONCURRENTLY blocks writes',
    severity: 'error' as const,
    suggestion: 'Use CREATE INDEX CONCURRENTLY to avoid blocking',
  },
  {
    pattern: /ALTER\s+TABLE\s+.*\s+ADD\s+.*\s+NOT\s+NULL(?!\s+DEFAULT)/gi,
    issue: 'Adding NOT NULL without DEFAULT can fail on existing data',
    severity: 'error' as const,
    suggestion: 'Add column as nullable, backfill, then add NOT NULL constraint',
  },
  {
    pattern: /LOCK\s+TABLE/gi,
    issue: 'Explicit table locks can cause downtime',
    severity: 'error' as const,
    suggestion: 'Avoid explicit locks, use row-level locking instead',
  },
  {
    pattern: /ALTER\s+TABLE\s+.*\s+ALTER\s+COLUMN\s+.*\s+TYPE/gi,
    issue: 'Changing column type requires full table rewrite',
    severity: 'warning' as const,
    suggestion: 'Consider adding a new column and migrating data gradually',
  },
  {
    pattern: /TRUNCATE/gi,
    issue: 'TRUNCATE removes all data and is not transactional with other tables',
    severity: 'warning' as const,
    suggestion: 'Use DELETE with conditions for safer data removal',
  },
  {
    pattern: /UPDATE\s+(?!.*WHERE)/gi,
    issue: 'UPDATE without WHERE clause affects all rows',
    severity: 'warning' as const,
    suggestion: 'Add a WHERE clause to limit the scope of updates',
  },
];

const REQUIRED_PATTERNS = [
  {
    pattern: /BEGIN;|START\s+TRANSACTION;/gi,
    message: 'Migration should be wrapped in a transaction',
  },
  {
    pattern: /COMMIT;/gi,
    message: 'Migration should commit the transaction',
  },
];

function checkMigrationSafety(filePath: string): MigrationIssue[] {
  const issues: MigrationIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check for unsafe patterns
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('--') || line.trim().startsWith('/*')) {
      return;
    }

    UNSAFE_PATTERNS.forEach(({ pattern, issue, severity, suggestion }) => {
      if (pattern.test(line)) {
        issues.push({
          file: path.basename(filePath),
          line: index + 1,
          issue,
          severity,
          suggestion,
        });
      }
    });
  });

  // Check for transaction wrapping
  const hasBegin = /BEGIN;|START\s+TRANSACTION;/gi.test(content);
  const hasCommit = /COMMIT;/gi.test(content);

  if (!hasBegin || !hasCommit) {
    issues.push({
      file: path.basename(filePath),
      line: 0,
      issue: 'Migration is not wrapped in a transaction',
      severity: 'warning',
      suggestion: 'Wrap the migration in BEGIN; ... COMMIT; for atomicity',
    });
  }

  // Check for missing IF EXISTS/IF NOT EXISTS
  if (/CREATE\s+TABLE(?!\s+IF\s+NOT\s+EXISTS)/gi.test(content)) {
    issues.push({
      file: path.basename(filePath),
      line: 0,
      issue: 'CREATE TABLE without IF NOT EXISTS',
      severity: 'warning',
      suggestion: 'Use CREATE TABLE IF NOT EXISTS for idempotency',
    });
  }

  if (/DROP\s+TABLE(?!\s+IF\s+EXISTS)/gi.test(content)) {
    issues.push({
      file: path.basename(filePath),
      line: 0,
      issue: 'DROP TABLE without IF EXISTS',
      severity: 'warning',
      suggestion: 'Use DROP TABLE IF EXISTS for idempotency',
    });
  }

  return issues;
}

async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    process.exit(0);
  }

  // Find all SQL migration files
  const migrationFiles = await glob(`${migrationsDir}/*.sql`);
  
  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    process.exit(0);
  }

  console.log(`Checking ${migrationFiles.length} migration files for safety issues...\\n`);

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;

  migrationFiles.forEach(file => {
    const issues = checkMigrationSafety(file);
    
    if (issues.length > 0) {
      console.log(`\\n📁 ${path.basename(file)}`);
      console.log('─'.repeat(50));
      
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        const location = issue.line > 0 ? `Line ${issue.line}` : 'File-level';
        
        console.log(`${icon} [${location}] ${issue.issue}`);
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
        
        if (issue.severity === 'error') {
          errorCount++;
        } else {
          warningCount++;
        }
        totalIssues++;
      });
    }
  });

  // Summary
  console.log('\\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Files checked: ${migrationFiles.length}`);
  console.log(`  Issues found: ${totalIssues}`);
  console.log(`    Errors: ${errorCount}`);
  console.log(`    Warnings: ${warningCount}`);

  // Provide recommendations
  if (errorCount > 0) {
    console.log('\\n⛔ Critical issues found that will block deployment.');
    console.log('Please fix all errors before proceeding.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\\n⚠️  Warnings found. Review and address if needed.');
    process.exit(0);
  } else {
    console.log('\\n✅ All migrations are safe for zero-downtime deployment!');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error checking migrations:', error);
    process.exit(1);
  });
}

export { checkMigrationSafety, MigrationIssue };
