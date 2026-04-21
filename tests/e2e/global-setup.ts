import type { FullConfig } from '@playwright/test';

const REQUIRED_VARS = [
  'APP_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

const ALL_OR_NONE_GROUPS: readonly (readonly string[])[] = [
  ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
  ['E2E_INVESTOR_EMAIL', 'E2E_INVESTOR_PASSWORD'],
];

async function globalSetup(_config: FullConfig): Promise<void> {
  const missingRequired = REQUIRED_VARS.filter((name) => !process.env[name]);

  if (missingRequired.length > 0) {
    throw new Error(
      `Playwright globalSetup: missing required env vars: ${missingRequired.join(', ')}. ` +
        `Set them in .env.local or the shell before running tests.`,
    );
  }

  const partialGroups = ALL_OR_NONE_GROUPS.filter((group) => {
    const present = group.filter((name) => !!process.env[name]).length;
    return present > 0 && present < group.length;
  });

  if (partialGroups.length > 0) {
    const details = partialGroups
      .map((group) => `[${group.join(' + ')}]`)
      .join(', ');
    throw new Error(
      `Playwright globalSetup: partial credential groups detected: ${details}. ` +
        `Provide either all vars in a group or none of them.`,
    );
  }
}

export default globalSetup;
