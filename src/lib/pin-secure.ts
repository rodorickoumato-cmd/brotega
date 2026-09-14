/**
 * SÉCURISÉ PIN Hasher - Production Grade
 * ✅ bcrypt instead of SHA256
 * ✅ 12 rounds (~250ms per hash)
 * ✅ Salt generation
 */

import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12; // ~250ms per hash (brute-force resistant)

/**
 * Hash PIN securely with bcrypt
 * @param pin 4-6 digit PIN
 * @returns hashed PIN
 */
export async function hashPIN(pin: string): Promise<string> {
  // ✅ Validate PIN format
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must be 4-6 digits");
  }

  // ✅ bcrypt with 12 rounds (~250ms per attempt)
  // Attack scenarios:
  // - GPU brute-force (1 billion SHA256/sec → 10ms per 10k PINs)
  // - bcrypt (1,000 ops/sec max → 10,000ms per 10k PINs)
  // - Reduction factor: 1000x slower
  const hash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
  return hash;
}

/**
 * Verify PIN against hash
 * @param pin Plain PIN
 * @param hash Stored hash
 * @returns true if matches
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  // ✅ Validate PIN format
  if (!/^\d{4,6}$/.test(pin)) {
    return false;
  }

  try {
    // ✅ Constant-time comparison with bcrypt
    return await bcrypt.compare(pin, hash);
  } catch (err) {
    console.error("[PIN] Verification error:", err);
    return false;
  }
}
