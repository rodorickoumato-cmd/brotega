/**
 * CACHING STRATEGY - Production Grade
 * ✅ Redis caching for expensive queries
 * ✅ Cache invalidation strategy
 * ✅ TTL-based expiration
 */

import { Redis } from "@upstash/redis";

// Initialize Redis
const redis = new Redis({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  token: process.env.REDIS_TOKEN,
});

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  // User data - long lived (user rarely changes)
  USER_PROFILE: 3600, // 1 hour

  // Product data - medium lived (price/stock updates)
  PRODUCT: 300, // 5 minutes
  PRODUCT_CATEGORY: 600, // 10 minutes
  PRODUCT_SEARCH: 300, // 5 minutes

  // Delivery data - short lived (changes frequently)
  DELIVERY_STATUS: 60, // 1 minute
  DELIVERY_LIST: 120, // 2 minutes

  // Order data
  ORDER: 300, // 5 minutes
  ORDER_SUMMARY: 600, // 10 minutes

  // Static data - long lived
  CITIES: 86400, // 24 hours
  TARIFFS: 3600, // 1 hour
  CONFIGURATION: 3600, // 1 hour

  // Rate limiting counters
  RATE_LIMIT: 900, // 15 minutes (managed separately)
};

/**
 * Generate cache key
 */
export function getCacheKey(
  resource: string,
  id?: string,
  suffix?: string
): string {
  const parts = ["cache", resource];
  if (id) parts.push(id);
  if (suffix) parts.push(suffix);
  return parts.join(":");
}

/**
 * Get from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    if (data) {
      console.log(`[CACHE] HIT: ${key}`);
      return data;
    }
  } catch (err) {
    console.error(`[CACHE] Get error for ${key}:`, err);
    // Fail open - return null, let app fetch fresh data
  }
  return null;
}

/**
 * Set cache
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.PRODUCT
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`[CACHE] SET: ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    console.error(`[CACHE] Set error for ${key}:`, err);
    // Don't fail - caching is optional
  }
}

/**
 * Delete cache entry
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`[CACHE] DELETE: ${key}`);
  } catch (err) {
    console.error(`[CACHE] Delete error for ${key}:`, err);
  }
}

/**
 * Delete cache by pattern (prefix)
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    // Note: Upstash Redis has limited pattern matching
    // For production, use dedicated cache invalidation system
    const keys = await redis.keys(`${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE] DELETE PATTERN: ${pattern}* (${keys.length} keys)`);
    }
  } catch (err) {
    console.error(`[CACHE] Delete pattern error for ${pattern}:`, err);
  }
}

/**
 * Cache-aside pattern
 * Usage: const user = await cached('user:123', () => fetchUser(123), CACHE_TTL.USER_PROFILE)
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.PRODUCT
): Promise<T> {
  try {
    // Try cache first
    const cached = await getCached<T>(key);
    if (cached) return cached;

    // Cache miss - fetch fresh data
    const data = await fetcher();

    // Store in cache
    await setCached(key, data, ttl);

    return data;
  } catch (err) {
    console.error(`[CACHE] Error in cached():`, err);
    // If cache error, still try to fetch
    return fetcher();
  }
}

/**
 * Invalidate related caches when data changes
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    deleteCached(getCacheKey("user", userId)),
    deleteCached(getCacheKey("user", userId, "profile")),
    deleteCached(getCacheKey("user", userId, "orders")),
    deleteCached(getCacheKey("user", userId, "addresses")),
  ]);
}

export async function invalidateProductCache(productId: string): Promise<void> {
  await Promise.all([
    deleteCached(getCacheKey("product", productId)),
    deleteCached(getCacheKey("product", productId, "details")),
    deleteCachedPattern("product_search"), // Invalidate all searches
  ]);
}

export async function invalidateDeliveryCache(deliveryId: string): Promise<void> {
  await deleteCached(getCacheKey("delivery", deliveryId, "status"));
}

export async function invalidateTariffCache(): Promise<void> {
  await deleteCachedPattern("tariff");
  await deleteCachedPattern("delivery");
}

/**
 * Warm up cache with frequently accessed data
 * Run on startup
 */
export async function warmupCache(): Promise<void> {
  try {
    console.log("[CACHE] Starting cache warmup...");

    // Note: Implement based on your most accessed data
    // Example:
    // const cities = await fetchCities();
    // await setCached(getCacheKey("cities"), cities, CACHE_TTL.CITIES);

    console.log("[CACHE] Warmup complete");
  } catch (err) {
    console.error("[CACHE] Warmup error:", err);
  }
}

/**
 * Cache statistics
 * Note: Upstash Redis has limited stats - use dashboard for full info
 */
export async function getCacheStats(): Promise<{
  status: string;
} | null> {
  try {
    // Upstash Redis doesn't expose info() - use dashboard for stats
    // This is a placeholder for monitoring
    return { status: "ok" };
  } catch (err) {
    console.error("[CACHE] Stats error:", err);
    return null;
  }
}
