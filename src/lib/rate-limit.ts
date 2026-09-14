/**
 * SÉCURISÉ Rate Limiter - Production Grade
 * ✅ Redis-based
 * ✅ Per-IP tracking
 * ✅ Configurable windows
 */

import { Redis } from "@upstash/redis";

// ✅ Initialize Redis (Upstash or local)
const redis = new Redis({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  token: process.env.REDIS_TOKEN,
});

interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
  action: string; // "login" | "register" | "recover"
}

/**
 * Check rate limit
 * @returns {allowed: boolean, remaining: number, resetAt: Date}
 */
export async function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const key = `ratelimit:${config.action}:${ip}`;

  try {
    // ✅ Atomic increment
    const current = await redis.incr(key);

    // ✅ Set expiration on first request
    if (current === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    // ✅ Get TTL for reset time
    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + ttl * 1000);

    const allowed = current <= config.maxAttempts;
    const remaining = Math.max(0, config.maxAttempts - current);

    return { allowed, remaining, resetAt };
  } catch (err) {
    // ✅ Fail open (allow) if Redis down
    console.error(`[RateLimit] Redis error for ${key}:`, err);
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(),
    };
  }
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  ip: string,
  config: RateLimitConfig
): Promise<{
  attempts: number;
  remaining: number;
  resetAt: Date;
}> {
  const key = `ratelimit:${config.action}:${ip}`;

  try {
    const current = await redis.get<number>(key) || 0;
    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + Math.max(0, ttl) * 1000);

    return {
      attempts: current,
      remaining: Math.max(0, config.maxAttempts - current),
      resetAt,
    };
  } catch (err) {
    console.error(`[RateLimit] Status check failed:`, err);
    return {
      attempts: 0,
      remaining: config.maxAttempts,
      resetAt: new Date(),
    };
  }
}

/**
 * Reset rate limit (after successful action)
 */
export async function resetRateLimit(
  ip: string,
  config: RateLimitConfig
): Promise<void> {
  const key = `ratelimit:${config.action}:${ip}`;

  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[RateLimit] Reset failed:`, err);
  }
}

// ✅ Common rate limit configs
export const RATE_LIMITS = {
  LOGIN: { maxAttempts: 5, windowSeconds: 900, action: "login" }, // 5 tries per 15 min
  REGISTER: { maxAttempts: 3, windowSeconds: 3600, action: "register" }, // 3 tries per hour
  RECOVER: { maxAttempts: 3, windowSeconds: 3600, action: "recover" }, // 3 tries per hour
} as const;
