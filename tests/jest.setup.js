/**
 * Jest setup file for custom matchers and global configuration
 */

// Custom matcher for range checking
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
  toBeValidPercentage(received) {
    const pass = typeof received === 'number' && received >= 0 && received <= 100;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid percentage`
          : `expected ${received} to be a valid percentage (0-100)`,
      pass,
    };
  },
});
