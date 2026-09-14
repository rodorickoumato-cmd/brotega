/**
 * PHOTO MODERATION - Production Grade
 * ✅ Validate photo uploads
 * ✅ Prevent malicious files
 * ✅ Size/format restrictions
 */

import crypto from "crypto";

/**
 * Allowed MIME types for delivery photos
 */
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Allowed file extensions
 */
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/**
 * Max file size (5 MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Min file size (100 KB - prevent placeholder images)
 */
const MIN_FILE_SIZE = 100 * 1024;

/**
 * Magic number signatures (file header validation)
 */
const MAGIC_NUMBERS: Record<string, Buffer> = {
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  "image/webp": Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}

/**
 * Validate photo file
 */
export async function validatePhoto(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<PhotoValidationResult> {
  // ✅ Check MIME type
  if (!ALLOWED_MIMES.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type not allowed: ${mimeType}. Allowed: ${ALLOWED_MIMES.join(", ")}`,
    };
  }

  // ✅ Check file extension
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension not allowed: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // ✅ Check file size
  if (buffer.length < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `File too small: ${Math.round(buffer.length / 1024)}KB. Minimum: ${Math.round(MIN_FILE_SIZE / 1024)}KB`,
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${Math.round(buffer.length / 1024)}KB. Maximum: ${Math.round(MAX_FILE_SIZE / 1024)}KB`,
    };
  }

  // ✅ Check magic numbers (file signature)
  const magicNumber = MAGIC_NUMBERS[mimeType];
  if (magicNumber && !buffer.subarray(0, magicNumber.length).equals(magicNumber)) {
    return {
      valid: false,
      error: "File header mismatch (possible spoofed file)",
    };
  }

  // ✅ Check for embedded code/scripts (simple XSS detection)
  const content = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
  if (/<script|javascript:|onerror|onclick/i.test(content)) {
    return {
      valid: false,
      error: "Potentially malicious content detected",
    };
  }

  return {
    valid: true,
    mimeType,
    size: buffer.length,
  };
}

/**
 * Generate safe filename
 * Prevent path traversal and special characters
 */
export function sanitizeFilename(filename: string, userId: string): string {
  // ✅ Remove path traversal
  let safe = filename.replace(/\.\./g, "");
  safe = safe.split("/").pop() || "photo";
  safe = safe.split("\\").pop() || "photo";

  // ✅ Allow only safe characters
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, "_");

  // ✅ Trim length
  if (safe.length > 100) {
    const ext = safe.split(".").pop();
    safe = safe.substring(0, 90) + "." + ext;
  }

  // ✅ Add user ID and timestamp (make unique)
  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString("hex");
  const basename = safe.split(".")[0];
  const ext = safe.split(".").pop();

  return `${timestamp}_${hash}_${basename}.${ext}`;
}

/**
 * Generate upload path
 */
export function getUploadPath(userId: string, filename: string, type = "deliveries"): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const safe = sanitizeFilename(filename, userId);

  return `/${type}/${timestamp}/${userId}/${safe}`;
}

/**
 * Generate photo hash (for deduplication)
 */
export function generatePhotoHash(buffer: Buffer): string {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/**
 * Check if photo is duplicate
 */
export async function checkPhotoDuplicate(
  photoHash: string,
  userId: string
): Promise<boolean> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data } = await (admin
      .from("delivery_photos" as any)
      .select("id")
      .eq("photo_hash", photoHash)
      .eq("user_id", userId)
      .single()) as any;

    return !!data; // True if exists
  } catch (err) {
    return false; // Assume not duplicate on error
  }
}

/**
 * Metadata for uploaded photo
 */
export interface PhotoMetadata {
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: string;
  userId: string;
}

/**
 * Complete photo upload validation pipeline
 */
export async function validatePhotoUpload(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
): Promise<{
  valid: boolean;
  error?: string;
  metadata?: PhotoMetadata;
}> {
  // 1. ✅ Basic validation
  const validation = await validatePhoto(buffer, filename, mimeType);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  // 2. ✅ Generate hash
  const hash = generatePhotoHash(buffer);

  // 3. ✅ Check for duplicates
  const isDuplicate = await checkPhotoDuplicate(hash, userId);
  if (isDuplicate) {
    return {
      valid: false,
      error: "Duplicate photo (already uploaded)",
    };
  }

  // 4. ✅ Return metadata
  return {
    valid: true,
    metadata: {
      filename,
      mimeType: validation.mimeType!,
      size: validation.size!,
      hash,
      uploadedAt: new Date().toISOString(),
      userId,
    },
  };
}

/**
 * Mark photo as verified (admin review)
 */
export async function markPhotoVerified(
  photoId: string,
  verifiedBy: string
): Promise<void> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    await (admin
      .from("delivery_photos" as any)
      .update({
        verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq("id", photoId)) as any;
  } catch (err) {
    console.error("[MODERATION] Failed to mark photo verified:", err);
  }
}

/**
 * Reject photo (flag as suspicious/inappropriate)
 */
export async function rejectPhoto(
  photoId: string,
  reason: string,
  rejectedBy: string
): Promise<void> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    await (admin
      .from("delivery_photos" as any)
      .update({
        verified: false,
        rejection_reason: reason,
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", photoId)) as any;
  } catch (err) {
    console.error("[MODERATION] Failed to reject photo:", err);
  }
}
