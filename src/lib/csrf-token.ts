/**
 * CSRF TOKEN PROTECTION - Production Grade
 * ✅ Generate unique tokens per session
 * ✅ Validate tokens on state-changing requests
 */

import crypto from "crypto";

/**
 * Generate CSRF token
 * Called once per session (stored in cookies + hidden form field)
 */
export function generateCSRFToken(): string {
  // 32-byte random token
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash CSRF token for storage
 * (Store hash, not plain token)
 */
export function hashCSRFToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Verify CSRF token
 * Compare incoming token against stored hash
 */
export function verifyCSRFToken(
  incomingToken: string | undefined,
  storedHash: string | undefined
): boolean {
  // ✅ Both must exist
  if (!incomingToken || !storedHash) {
    return false;
  }

  // ✅ Constant-time comparison
  const incomingHash = hashCSRFToken(incomingToken);
  return constantTimeEqual(incomingHash, storedHash);
}

/**
 * Constant-time string comparison (prevent timing attacks)
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get CSRF token from request
 * Checks: body, headers, cookies
 */
export function getCSRFToken(req: {
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}): string | undefined {
  // 1. Check POST body (_csrf field)
  if (req.body?._csrf) {
    return req.body._csrf;
  }

  // 2. Check header (X-CSRF-Token)
  const header = req.headers?.["x-csrf-token"];
  if (typeof header === "string") {
    return header;
  }

  // 3. Check cookie (csrf_token)
  if (req.cookies?.csrf_token) {
    return req.cookies.csrf_token;
  }

  return undefined;
}

/**
 * HTML form helper - insert CSRF field
 * Usage: <form>{{ csrfField(token) | safe }}</form>
 */
export function csrfField(token: string): string {
  return `<input type="hidden" name="_csrf" value="${token}" />`;
}

/**
 * HTTP header helper - return CSRF token in header
 * Usage: response.headers.set(...csrfHeaderPair(token))
 */
export function csrfHeaderPair(token: string): [string, string] {
  return ["X-CSRF-Token", token];
}

/**
 * Cookie setter for CSRF token
 * Store token hash in HttpOnly cookie
 */
export function setCSRFCookie(response: Response, tokenHash: string): void {
  const cookie = `csrf_token=${tokenHash}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`;
  response.headers.append("Set-Cookie", cookie);
}

/**
 * Middleware to check CSRF on POST/PUT/DELETE
 */
export async function checkCSRF(req: {
  method: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}): Promise<{ valid: boolean; error?: string }> {
  // Skip GET/OPTIONS (idempotent)
  if (["GET", "OPTIONS", "HEAD"].includes(req.method)) {
    return { valid: true };
  }

  // ✅ Check CSRF token on state-changing requests
  const incomingToken = getCSRFToken(req);
  const storedHash = req.cookies?.csrf_token;

  if (!incomingToken || !storedHash) {
    return {
      valid: false,
      error: "CSRF token missing",
    };
  }

  // ✅ Verify token
  const isValid = verifyCSRFToken(incomingToken, storedHash);
  if (!isValid) {
    return {
      valid: false,
      error: "CSRF token invalid",
    };
  }

  return { valid: true };
}
