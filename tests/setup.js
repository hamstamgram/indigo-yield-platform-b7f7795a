// Jest setup file
// Configure test environment and global mocks

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging failed tests
  error: console.error,
};

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toBeValidPercentage(received) {
    const pass = typeof received === 'number' && received >= 0 && received <= 100;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid percentage`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid percentage (0-100)`,
        pass: false,
      };
    }
  },
});
