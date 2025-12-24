// @ts-nocheck
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Custom matchers for Vitest
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
  toBeValidPercentage(received: number) {
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

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeWithinRange(floor: number, ceiling: number): T;
    toBeValidPercentage(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeWithinRange(floor: number, ceiling: number): any;
    toBeValidPercentage(): any;
  }
}
