// @ts-nocheck
/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit how often a function can be called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Create a debounced version of an async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout;
  let lastPromise: Promise<ReturnType<T>>;
  
  return function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);
      
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}

/**
 * Debounced search function specifically for user input
 */
export const debouncedSearch = debounce((
  searchTerm: string,
  callback: (term: string) => void
) => {
  if (searchTerm.trim().length > 0) {
    callback(searchTerm.trim());
  }
}, 300);

/**
 * Debounced save function for form inputs
 */
export const debouncedSave = debounce((
  data: any,
  saveFunction: (data: any) => Promise<void>
) => {
  saveFunction(data).catch(console.error);
}, 1000);

/**
 * Throttled scroll handler
 */
export const throttledScroll = throttle((
  callback: () => void
) => {
  callback();
}, 100);