/**
 * CORS CONFIGURATION - Production Grade
 * ✅ Whitelist trusted domains only
 * ✅ Prevent CORS-based attacks
 */

/**
 * Allowed origins (production URLs)
 * Add your frontend domain here
 */
const ALLOWED_ORIGINS = [
  // Development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",

  // Production
  "https://brotega.cm",
  "https://www.brotega.cm",
  "https://app.brotega.cm",

  // Staging
  "https://staging.brotega.cm",

  // Vercel deployments
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
];

/**
 * Allowed HTTP methods
 */
const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

/**
 * Allowed headers
 */
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Accept-Language",
  "X-CSRF-Token",
  "X-API-Key",
];

/**
 * Headers to expose to client
 */
const EXPOSED_HEADERS = [
  "Content-Type",
  "X-Total-Count",
  "X-Page-Count",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // ✅ Allow matching origins
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for response
 */
export function getCORSHeaders(origin: string | undefined): Record<string, string> {
  const isAllowed = isOriginAllowed(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : "", // Empty if not allowed
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": ALLOWED_HEADERS.join(", "),
    "Access-Control-Expose-Headers": EXPOSED_HEADERS.join(", "),
    "Access-Control-Max-Age": "86400", // 24 hours
    "Access-Control-Allow-Credentials": "true", // Allow cookies
  };
}

/**
 * Middleware for CORS verification
 */
export async function verifyCORS(
  req: { headers: Record<string, string | string[] | undefined> }
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowed = isOriginAllowed(origin);

  if (!allowed && origin) {
    console.warn(`[CORS] Rejected origin: ${origin}`);
  }

  return {
    allowed,
    headers: getCORSHeaders(origin),
  };
}

/**
 * Add CORS headers to response
 */
export function withCORS(
  response: Response,
  origin: string | undefined
): Response {
  const headers = getCORSHeaders(origin);

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Export configuration for reference
 */
export const CORS_CONFIG = {
  ALLOWED_ORIGINS,
  ALLOWED_METHODS,
  ALLOWED_HEADERS,
  EXPOSED_HEADERS,
};
