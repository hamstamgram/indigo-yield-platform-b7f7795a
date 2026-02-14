/**
 * Batch Helper
 * Utilities for processing large arrays in chunks to avoid URL length limits (URI Too Long)
 * common with Supabase 'in' queries.
 */

/**
 * Process items in batches and merge resulting arrays.
 * Use this when the Supabase query returns an array of rows.
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<R[] | null>
): Promise<R[]> {
  const results: R[] = [];

  // Process sequentially to avoid overwhelming the database connection pool
  // or use Promise.all for concurrency if needed (but mindful of connections)
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const batchResults = await processFn(batch);
      if (batchResults && Array.isArray(batchResults)) {
        results.push(...batchResults);
      }
    } catch (error) {
      console.error(`Batch processing failed for chunk ${i}-${i + batchSize}`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Process items in batches and merge resulting Maps.
 * Use this for aggregation queries that return Maps.
 */
export async function batchMapProcess<T, K, V>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<Map<K, V>>
): Promise<Map<K, V>> {
  const mergedMap = new Map<K, V>();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const batchMap = await processFn(batch);
      batchMap.forEach((value, key) => {
        mergedMap.set(key, value);
      });
    } catch (error) {
      console.error(`Batch map processing failed for chunk ${i}-${i + batchSize}`, error);
      throw error;
    }
  }

  return mergedMap;
}
