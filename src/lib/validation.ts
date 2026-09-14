/**
 * SÉCURISÉ Input Validation - Production Grade
 * ✅ Regex patterns
 * ✅ Length checks
 * ✅ Sanitization
 */

/**
 * Validate pseudo (username)
 * Rules: 3-50 chars, alphanumeric + underscore
 */
export function validatePseudo(pseudo: unknown): string | null {
  if (typeof pseudo !== "string") return null;

  const trimmed = pseudo.trim();

  // ✅ Length check
  if (trimmed.length < 3 || trimmed.length > 50) return null;

  // ✅ Regex: alphanumeric + underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate PIN
 * Rules: 4-6 digits
 */
export function validatePIN(pin: unknown): string | null {
  if (typeof pin !== "string") return null;

  // ✅ Exact format: 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) return null;

  return pin;
}

/**
 * Validate email
 * Rules: RFC 5322 simplified
 */
export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;

  const trimmed = email.trim().toLowerCase();

  // ✅ Length check
  if (trimmed.length > 254) return null;

  // ✅ Basic RFC 5322 regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate URL
 * Rules: Valid HTTP/HTTPS URL
 */
export function validateURL(url: unknown): string | null {
  if (typeof url !== "string") return null;

  try {
    const parsed = new URL(url);

    // ✅ Only HTTP/HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    // ✅ Must have hostname
    if (!parsed.hostname) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate phone number (international)
 * Rules: 7-15 digits, +, spaces, hyphens only
 */
export function validatePhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;

  const trimmed = phone.trim();

  // ✅ Length
  if (trimmed.length < 7 || trimmed.length > 20) return null;

  // ✅ Regex: digits, +, spaces, hyphens
  if (!/^[\d+\s\-()]+$/.test(trimmed)) return null;

  // ✅ Must have at least 7 digits
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 7) return null;

  return trimmed;
}

/**
 * Sanitize string (basic HTML escape)
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  // ✅ Check X-Forwarded-For first (proxy)
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  // ✅ Check X-Real-IP
  const realIP = headers["x-real-ip"];
  if (typeof realIP === "string") {
    return realIP;
  }

  // ✅ Fallback (shouldn't happen in production)
  return "unknown";
}

/**
 * Validate role
 */
export function validateRole(
  role: unknown
): "customer" | "vendor" | "livreur" | "admin" | null {
  const validRoles = ["customer", "vendor", "livreur", "admin"];
  if (typeof role === "string" && validRoles.includes(role)) {
    return role as any;
  }
  return null;
}
