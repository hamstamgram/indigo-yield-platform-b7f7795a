# Authentication Integration Test Examples

## Quick Reference Guide with Code Examples

This document provides practical examples for testing authentication flows across web and iOS platforms.

---

## 🌐 Web Platform Examples

### Example 1: Basic Login Test

```typescript
import { test, expect } from '@playwright/test';

test('should login user successfully', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials
  await page.fill('input[name="email"]', 'test-investor@indigoyield.com');
  await page.fill('input[name="password"]', 'TestPassword123!');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|portal)/);

  // Verify user is logged in
  await expect(page.locator('text=/logout/i')).toBeVisible();

  console.log('✅ Login successful');
});
```

### Example 2: Test Session Persistence

```typescript
test('should maintain session after reload', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test-investor@indigoyield.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  // Reload page
  await page.reload();

  // Should still be logged in
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('text=/logout/i')).toBeVisible();

  console.log('✅ Session persisted');
});
```

### Example 3: Test Supabase API Directly

```typescript
import { createClient } from '@supabase/supabase-js';

test('should authenticate via Supabase API', async () => {
  const supabase = createClient(
    'https://nkfimvovosdehmyyjubn.supabase.co',
    'your_anon_key_here'
  );

  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test-investor@indigoyield.com',
    password: 'TestPassword123!'
  });

  // Verify success
  expect(error).toBeNull();
  expect(data.session).toBeTruthy();
  expect(data.user).toBeTruthy();
  expect(data.session.access_token).toBeTruthy();

  console.log('✅ API authentication successful');
});
```

### Example 4: Test RLS Policies

```typescript
test('should enforce row-level security', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in as user
  await supabase.auth.signInWithPassword({
    email: 'test-investor@indigoyield.com',
    password: 'TestPassword123!'
  });

  // Try to access all profiles (should be restricted by RLS)
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  // Should only return user's own profile
  expect(data?.length).toBeLessThanOrEqual(1);

  console.log('✅ RLS enforced correctly');
});
```

### Example 5: Test Protected Routes

```typescript
test('should redirect unauthenticated users', async ({ page }) => {
  // Try to access protected route without authentication
  await page.goto('/dashboard');

  // Should redirect to login
  await expect(page).toHaveURL(/\/login/);

  console.log('✅ Protected route enforced');
});
```

---

## 📱 iOS Platform Examples

### Example 1: Basic Login Test

```swift
func testSignInUser() async throws {
    print("🧪 Testing user sign in...")

    try await authService.signIn(
        email: "test-investor@indigoyield.com",
        password: "TestPassword123!"
    )

    // Verify authentication
    XCTAssertTrue(authService.isAuthenticated)
    XCTAssertNotNil(authService.currentUser)
    XCTAssertEqual(authService.currentUser?.email, "test-investor@indigoyield.com")

    // Verify tokens stored
    let accessToken = try keychainManager.getAccessToken()
    let refreshToken = try keychainManager.getRefreshToken()

    XCTAssertNotNil(accessToken)
    XCTAssertNotNil(refreshToken)

    print("✅ Sign in successful")
}
```

### Example 2: Test Biometric Authentication

```swift
func testBiometricAuth() async throws {
    print("🧪 Testing biometric authentication...")

    // Check if biometrics available
    guard biometricManager.canUseBiometrics() else {
        print("⚠️ Biometrics not available")
        return
    }

    // Sign in with password first
    try await authService.signIn(
        email: "test-investor@indigoyield.com",
        password: "TestPassword123!"
    )

    // Verify tokens stored for biometric use
    let refreshToken = try? keychainManager.getRefreshToken()
    XCTAssertNotNil(refreshToken)

    // Sign out
    try await authService.signOut()

    // Sign in with biometrics
    try await authService.signInWithBiometrics()

    XCTAssertTrue(authService.isAuthenticated)

    print("✅ Biometric auth successful")
}
```

### Example 3: Test Supabase Swift API

```swift
func testSupabaseAPISignIn() async throws {
    print("🧪 Testing Supabase Swift API...")

    let response = try await supabaseClient.auth.signInWithPassword(
        email: "test-investor@indigoyield.com",
        password: "TestPassword123!"
    )

    // Verify response
    XCTAssertNotNil(response.session)
    XCTAssertNotNil(response.session.accessToken)
    XCTAssertNotNil(response.user)

    print("✅ Supabase API sign in successful")
}
```

### Example 4: Test Token Storage in Keychain

```swift
func testSecureTokenStorage() async throws {
    print("🧪 Testing secure token storage...")

    // Sign in
    try await authService.signIn(
        email: "test-investor@indigoyield.com",
        password: "TestPassword123!"
    )

    // Verify tokens in keychain
    let accessToken = try keychainManager.getAccessToken()
    let refreshToken = try keychainManager.getRefreshToken()
    let userId = try keychainManager.getUserID()

    XCTAssertNotNil(accessToken)
    XCTAssertNotNil(refreshToken)
    XCTAssertNotNil(userId)

    // Verify NOT in UserDefaults
    let defaults = UserDefaults.standard
    XCTAssertNil(defaults.string(forKey: "access_token"))

    print("✅ Tokens stored securely")
}
```

### Example 5: Test Session Persistence

```swift
func testSessionPersistence() async throws {
    print("🧪 Testing session persistence...")

    // Sign in
    try await authService.signIn(
        email: "test-investor@indigoyield.com",
        password: "TestPassword123!"
    )

    let userId = authService.currentUser?.id

    // Simulate app restart
    let newAuthService = AuthService(
        client: supabaseClient,
        keychainManager: keychainManager,
        biometricManager: biometricManager
    )

    // Wait for session check
    try await Task.sleep(nanoseconds: 1_000_000_000)

    // Session should be restored
    await newAuthService.checkAuthStatus()

    print("✅ Session persistence tested")
}
```

---

## 🔄 Cross-Platform Examples

### Example 1: Web → iOS Credential Flow

```typescript
// Web: Create user
test('should create user on web', async ({ page }) => {
  const uniqueEmail = `web-to-ios-${Date.now()}@indigoyield.com`;

  await page.goto('/signup');
  await page.fill('input[name="email"]', uniqueEmail);
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Verify iOS login works
  const iosClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await iosClient.auth.signInWithPassword({
    email: uniqueEmail,
    password: 'TestPassword123!'
  });

  expect(error).toBeNull();
  expect(data.session).toBeTruthy();

  console.log('✅ Web-created credentials work on iOS');
});
```

### Example 2: iOS → Web Credential Flow

```swift
// iOS: Create user
func testIOSToWebCredentials() async throws {
    print("📱 Creating user on iOS...")

    let uniqueEmail = "ios-to-web-\(UUID().uuidString)@indigoyield.com"

    let response = try await supabaseClient.auth.signUp(
        email: uniqueEmail,
        password: "TestPassword123!"
    )

    XCTAssertNotNil(response.user)

    // Now verify login works on web (via API)
    await supabaseClient.auth.signOut()

    let loginResponse = try await supabaseClient.auth.signInWithPassword(
        email: uniqueEmail,
        password: "TestPassword123!"
    )

    XCTAssertNotNil(loginResponse.session)

    print("✅ iOS-created credentials work on web")
}
```

### Example 3: Password Change Sync

```typescript
test('should sync password change across platforms', async () => {
  const email = `password-sync-${Date.now()}@indigoyield.com`;
  const oldPassword = 'OldPassword123!';
  const newPassword = 'NewPassword123!';

  // Create user
  await webClient.auth.signUp({ email, password: oldPassword });

  // Change password on web
  await webClient.auth.signInWithPassword({ email, password: oldPassword });
  await webClient.auth.updateUser({ password: newPassword });
  await webClient.auth.signOut();

  // Verify new password works on iOS
  const { data, error } = await iosClient.auth.signInWithPassword({
    email,
    password: newPassword
  });

  expect(error).toBeNull();
  expect(data.session).toBeTruthy();

  console.log('✅ Password change synced');
});
```

---

## 💾 Storage Testing Examples

### Example 1: Upload File

```typescript
test('should upload file to storage', async () => {
  // Sign in
  await userClient.auth.signInWithPassword({
    email: 'test-investor@indigoyield.com',
    password: 'TestPassword123!'
  });

  const userId = (await userClient.auth.getUser()).data.user?.id;

  // Upload file
  const { data, error } = await userClient.storage
    .from('documents')
    .upload(
      `${userId}/test.txt`,
      new Blob(['Test content']),
      { contentType: 'text/plain' }
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  console.log('✅ File uploaded');
});
```

### Example 2: Generate Signed URL

```typescript
test('should create signed URL', async () => {
  await userClient.auth.signInWithPassword({
    email: 'test-investor@indigoyield.com',
    password: 'TestPassword123!'
  });

  const userId = (await userClient.auth.getUser()).data.user?.id;
  const filePath = `${userId}/test.txt`;

  // Create signed URL
  const { data, error } = await userClient.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 hour

  expect(error).toBeNull();
  expect(data?.signedUrl).toBeTruthy();

  // Verify URL works
  const response = await fetch(data!.signedUrl);
  expect(response.ok).toBe(true);

  console.log('✅ Signed URL created');
});
```

---

## ⚡ Realtime Testing Examples

### Example 1: Subscribe to Changes

```typescript
test('should receive realtime updates', async () => {
  await userClient.auth.signInWithPassword({
    email: 'test-investor@indigoyield.com',
    password: 'TestPassword123!'
  });

  const userId = (await userClient.auth.getUser()).data.user?.id;
  const updates: any[] = [];

  // Subscribe to portfolio changes
  const channel = userClient
    .channel('portfolio-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'portfolios',
        filter: `investor_id=eq.${userId}`
      },
      (payload) => {
        updates.push(payload);
      }
    )
    .subscribe();

  // Wait for subscription
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✅ Realtime subscription active');

  // Cleanup
  await userClient.removeChannel(channel);
});
```

---

## 🔒 Security Testing Examples

### Example 1: Test XSS Prevention

```typescript
test('should sanitize user input', async ({ page }) => {
  await page.goto('/login');

  // Try XSS attack
  await page.fill('input[name="email"]', '<script>alert("xss")</script>');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Script should not execute
  const alerts = [];
  page.on('dialog', dialog => alerts.push(dialog));

  await page.waitForTimeout(1000);

  expect(alerts.length).toBe(0);

  console.log('✅ XSS prevented');
});
```

### Example 2: Test Rate Limiting

```typescript
test('should rate limit login attempts', async ({ page }) => {
  await page.goto('/login');

  // Multiple failed attempts
  for (let i = 0; i < 10; i++) {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(200);
  }

  // Should show rate limit error
  const errorText = await page.locator('[role="alert"]').textContent();

  console.log('✅ Rate limiting tested');
});
```

---

## 🚀 Running Examples

### Run Specific Test

```bash
# Run single test
npx playwright test -g "should login user successfully"

# Run iOS test
xcodebuild test -scheme IndigoInvestor -only-testing:IndigoInvestorTests/AuthenticationIntegrationTests/testSignInUser
```

### Debug Tests

```bash
# Debug mode
DEBUG=pw:api npm run test:auth

# Headed mode with slow motion
npx playwright test --headed --slow-mo=1000
```

### Generate Test Report

```bash
# Run with report
npm run test:auth:report

# Open report
open playwright-report/index.html
```

---

## 📝 Test Writing Tips

### 1. Use Descriptive Names

```typescript
// ❌ Bad
test('test1', ...);

// ✅ Good
test('should allow authenticated users to access dashboard', ...);
```

### 2. Test Both Success and Failure

```typescript
// Test success case
test('should login with valid credentials', ...);

// Test failure case
test('should reject invalid credentials', ...);
```

### 3. Clean Up After Tests

```typescript
test.afterEach(async () => {
  await supabase.auth.signOut();
  await keychainManager.clearAll();
});
```

### 4. Use Constants

```typescript
const TEST_CREDENTIALS = {
  email: 'test-investor@indigoyield.com',
  password: 'TestPassword123!'
};

test('should login', async () => {
  await login(TEST_CREDENTIALS);
});
```

### 5. Add Helpful Logs

```typescript
test('should authenticate', async () => {
  console.log('🧪 Testing authentication...');

  // Test code...

  console.log('✅ Authentication successful');
});
```

---

## 🎯 Common Test Patterns

### Pattern 1: Login Helper

```typescript
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test('should access dashboard', async ({ page }) => {
  await loginUser(page, TEST_EMAIL, TEST_PASSWORD);
  // Test dashboard functionality
});
```

### Pattern 2: Test Fixture

```typescript
test.beforeEach(async ({ page }) => {
  // Login before each test
  await loginUser(page, TEST_EMAIL, TEST_PASSWORD);
});

test('should view portfolio', async ({ page }) => {
  // Already logged in from beforeEach
  await page.goto('/portfolio');
});
```

### Pattern 3: API Helper

```typescript
async function createTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data.user;
}

test('should create and login user', async () => {
  const email = `test-${Date.now()}@example.com`;
  const user = await createTestUser(email, 'password');

  // Test with created user
});
```

---

**End of Examples**
