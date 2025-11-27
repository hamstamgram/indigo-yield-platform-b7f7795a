/**
 * Debug cleanup utilities to remove console logs and debug code
 */

// Keep default console behavior; do not suppress logs in production

// Clean up common debug patterns
export const cleanupUtils = {
  // Remove test data patterns
  isTestData: (data: any): boolean => {
    if (typeof data === "string") {
      return (
        data.includes("test") ||
        data.includes("debug") ||
        data.includes("sample") ||
        data.includes("placeholder")
      );
    }
    return false;
  },

  // Remove debug attributes from objects
  cleanObject: (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;

    const cleaned = { ...obj };

    // Remove debug properties
    delete cleaned._debug;
    delete cleaned.__debug;
    delete cleaned.debug;
    delete cleaned.test;
    delete cleaned._test;

    return cleaned;
  },

  // Clean up arrays of objects
  cleanArray: (arr: any[]): any[] => {
    return arr
      .filter((item) => !cleanupUtils.isTestData(item))
      .map((item) => cleanupUtils.cleanObject(item));
  },
};

// Performance monitoring cleanup
export const perfCleanup = {
  // Remove performance marks in production
  clearMarks: () => {
    if (typeof performance !== "undefined" && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  },

  // Clean up intervals and timeouts
  cleanupTimers: () => {
    // This would be called on component unmount or app cleanup
    // Implementation depends on specific timer tracking needs
  },
};

// Initialize cleanup on app load
if (process.env.NODE_ENV === "production") {
  // Clean up after 30 seconds in production
  setTimeout(() => {
    perfCleanup.clearMarks();
  }, 30000);
}
