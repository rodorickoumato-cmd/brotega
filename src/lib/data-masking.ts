/**
 * DATA MASKING - Production Grade
 * ✅ Mask sensitive information (GPS, addresses, phones)
 * ✅ Redact before sending to client
 */

/**
 * Mask GPS coordinates (privacy protection)
 * Reduces precision from ~10m to ~1km
 *
 * Example:
 * Input:  3.8480, 11.5021
 * Output: 3.848, 11.502
 */
export function maskGPS(latitude: number, longitude: number): { lat: string; lng: string } {
  if (!latitude || !longitude) {
    return { lat: "XX.XXX", lng: "XX.XXX" };
  }

  return {
    lat: latitude.toFixed(3), // 3 decimals = ~111m precision
    lng: longitude.toFixed(3),
  };
}

/**
 * Mask phone number (security + privacy)
 *
 * Examples:
 * +237123456789 → +237****6789
 * 237123456789  → 237****6789
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return "XX-XXXX";
  }

  const cleaned = phone.replace(/\D/g, ""); // Remove non-digits
  if (cleaned.length < 4) {
    return "XX-XXXX";
  }

  const lastFour = cleaned.slice(-4);
  const prefix = cleaned.slice(0, cleaned.length - 8); // Keep area code

  return `${prefix}****${lastFour}`;
}

/**
 * Mask email address
 *
 * Examples:
 * user@example.com → u***@example.com
 * a@b.com          → a***@b.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "XX@XXXX.com";
  }

  const [local, domain] = email.split("@");

  if (local.length <= 1) {
    return `${local}***@${domain}`;
  }

  const masked = local[0] + "***";
  return `${masked}@${domain}`;
}

/**
 * Mask street address (keep only city/country)
 *
 * Example:
 * "123 Main St, Yaoundé, Cameroon" → "Yaoundé, Cameroon"
 */
export function maskAddress(address: string): string {
  if (!address) {
    return "Address masked";
  }

  // Keep only last 2 parts (city, country)
  const parts = address.split(",").map((p) => p.trim());

  if (parts.length <= 2) {
    return address; // Already short enough
  }

  return parts.slice(-2).join(", ");
}

/**
 * Mask name (first letter + asterisks)
 *
 * Examples:
 * "John Doe"    → "J***, D***"
 * "Alice"       → "A***"
 */
export function maskName(name: string): string {
  if (!name) {
    return "A***";
  }

  const parts = name.split(" ");
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + "***";
    })
    .join(" ");
}

/**
 * Mask credit card number
 *
 * Example:
 * "4111111111111111" → "4111****1111"
 */
export function maskCardNumber(card: string): string {
  if (!card || card.length < 8) {
    return "****";
  }

  const cleaned = card.replace(/\D/g, "");
  const first4 = cleaned.slice(0, 4);
  const last4 = cleaned.slice(-4);

  return `${first4}****${last4}`;
}

/**
 * Mask IP address
 *
 * Examples:
 * "192.168.1.100" → "192.168.1.***"
 * "2001:db8::1"   → "2001:db8:****"
 */
export function maskIP(ip: string): string {
  if (!ip) {
    return "***.***.***.*";
  }

  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    parts[3] = "***";
    return parts.join(".");
  }

  // IPv6
  if (ip.includes(":")) {
    const parts = ip.split(":");
    parts[parts.length - 1] = "****";
    return parts.join(":");
  }

  return "***";
}

/**
 * Redact entire object based on sensitivity level
 */
export function redactObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: Record<string, "email" | "phone" | "address" | "gps" | "name" | "card" | "ip">
): T {
  const redacted = { ...obj };

  for (const [field, maskType] of Object.entries(sensitiveFields)) {
    if (!(field in redacted)) continue;

    const value = redacted[field as keyof T];
    if (!value) continue;

    switch (maskType) {
      case "email":
        redacted[field as keyof T] = maskEmail(String(value)) as any;
        break;
      case "phone":
        redacted[field as keyof T] = maskPhone(String(value)) as any;
        break;
      case "address":
        redacted[field as keyof T] = maskAddress(String(value)) as any;
        break;
      case "name":
        redacted[field as keyof T] = maskName(String(value)) as any;
        break;
      case "card":
        redacted[field as keyof T] = maskCardNumber(String(value)) as any;
        break;
      case "ip":
        redacted[field as keyof T] = maskIP(String(value)) as any;
        break;
      case "gps":
        if (typeof value === "object" && "lat" in value && "lng" in value) {
          redacted[field as keyof T] = maskGPS(value.lat, value.lng) as any;
        }
        break;
    }
  }

  return redacted;
}

/**
 * Standard masking for delivery data
 */
export function maskDeliveryData(delivery: any): any {
  return redactObject(delivery, {
    client_phone: "phone",
    client_email: "email",
    client_address: "address",
    driver_phone: "phone",
    driver_location: "gps",
    client_location: "gps",
    client_name: "name",
    driver_name: "name",
  });
}

/**
 * Standard masking for user profile
 */
export function maskUserProfile(user: any): any {
  return redactObject(user, {
    phone: "phone",
    email: "email",
    address: "address",
    name: "name",
  });
}
