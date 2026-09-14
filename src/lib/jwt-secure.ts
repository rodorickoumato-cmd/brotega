/**
 * SÉCURISÉ JWT Helper - Production Grade
 * ✅ Signature verification
 * ✅ No hardcoded fallbacks
 * ✅ Base64url encoding
 */

import crypto from "crypto";

// ✅ STRICT: Throw if JWT_SECRET missing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable must be set. " +
    "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

interface JWTPayload {
  user_id: string;
  role: "customer" | "vendor" | "livreur" | "admin";
  iat: number;
  exp: number;
}

/**
 * Generate signed JWT - Production Grade
 */
export function generateJWT(
  userId: string,
  role: "customer" | "vendor" | "livreur" | "admin" = "customer"
): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    user_id: userId,
    role,
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days
  };

  // ✅ Base64url encoding (no padding)
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));

  // ✅ HMAC-SHA256 signature
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify JWT signature - CRITICAL for security
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // ✅ Verify signature before decoding payload
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    // ✅ Constant-time comparison (prevent timing attacks)
    if (!constantTimeEqual(signatureB64, expectedSignature)) {
      console.warn("[JWT] Invalid signature");
      return null;
    }

    // ✅ Only decode if signature is valid
    const payload = JSON.parse(base64urlDecode(payloadB64)) as JWTPayload;

    // ✅ Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn("[JWT] Token expired");
      return null;
    }

    return payload;
  } catch (err) {
    console.error("[JWT] Verification failed:", err);
    return null;
  }
}

// ✅ Base64url encoding (RFC 4648)
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64").toString();
}

// ✅ Constant-time comparison (prevent timing attacks)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
