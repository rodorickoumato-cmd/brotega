/**
 * SECRETS ROTATION - Production Grade
 * ✅ Track secret expiration
 * ✅ Alert before expiration
 * ✅ Rotation guidelines
 */

/**
 * Secret rotation schedule (days before expiration)
 */
const ROTATION_DAYS = {
  JWT_SECRET: 90, // Rotate every 90 days
  API_KEYS: 90,
  DATABASE_PASSWORD: 180, // Database password yearly
  SINGPAY_API_KEY: 365, // Annually
  CLOUDINARY_API_SECRET: 365,
};

/**
 * Alert thresholds (days before expiration)
 */
const ALERT_THRESHOLDS = {
  CRITICAL: 7, // Alert if < 7 days
  WARNING: 30, // Warning if < 30 days
};

export interface SecretMetadata {
  name: string;
  type: "api_key" | "password" | "token" | "certificate";
  createdAt: Date;
  rotationDaysInterval: number;
  lastRotatedAt: Date;
  expiresAt: Date;
  status: "active" | "rotated" | "expired" | "pending_rotation";
  alertLevel?: "critical" | "warning" | "none";
}

/**
 * Calculate expiration date
 */
export function calculateExpirationDate(
  createdAt: Date,
  rotationDays: number
): Date {
  const expires = new Date(createdAt);
  expires.setDate(expires.getDate() + rotationDays);
  return expires;
}

/**
 * Get alert level for secret
 */
export function getAlertLevel(
  expiresAt: Date
): "critical" | "warning" | "none" {
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < ALERT_THRESHOLDS.CRITICAL) {
    return "critical";
  }

  if (daysUntilExpiry < ALERT_THRESHOLDS.WARNING) {
    return "warning";
  }

  return "none";
}

/**
 * Check if secret needs rotation
 */
export function needsRotation(secretMetadata: SecretMetadata): boolean {
  const now = new Date();
  return now >= secretMetadata.expiresAt;
}

/**
 * Format secret metadata for display
 */
export function formatSecretStatus(
  secretMetadata: SecretMetadata
): {
  name: string;
  status: string;
  expiresIn: string;
  alertLevel: string;
} {
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (secretMetadata.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    name: secretMetadata.name,
    status: secretMetadata.status,
    expiresIn: `${daysUntilExpiry} days`,
    alertLevel: secretMetadata.alertLevel || "none",
  };
}

/**
 * Rotation checklist
 */
export const ROTATION_CHECKLIST = {
  JWT_SECRET: [
    "✅ Generate new JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    "✅ Set new JWT_SECRET in .env",
    "✅ Deploy new environment variable",
    "✅ All existing tokens invalidated (new secret required)",
    "✅ Users required to re-login",
    "✅ Monitor logs for auth failures",
    "✅ Verify authentication working",
    "✅ Document rotation date in audit log",
  ],

  API_KEYS: [
    "✅ Generate new API key in provider dashboard",
    "✅ Update in .env with new key",
    "✅ Test API calls with new key",
    "✅ Deploy updated environment",
    "✅ Revoke old API key in provider dashboard",
    "✅ Monitor API logs for failures",
    "✅ Document rotation date",
  ],

  DATABASE_PASSWORD: [
    "✅ Generate new strong password (min 16 chars, mixed case, symbols)",
    "✅ Change password in database provider",
    "✅ Update SUPABASE_SERVICE_ROLE_KEY in .env",
    "✅ Test database connections",
    "✅ Deploy updated credentials",
    "✅ Verify no connection failures",
    "✅ Revoke old password",
    "✅ Document rotation date",
  ],

  SINGPAY_API_KEY: [
    "✅ Request new API key from Singpay",
    "✅ Update SINGPAY_API_KEY in .env",
    "✅ Test payment transactions",
    "✅ Deploy to staging first",
    "✅ Deploy to production",
    "✅ Revoke old key with Singpay",
    "✅ Monitor payment logs",
    "✅ Document rotation date",
  ],
};

/**
 * Generate rotation reminder
 */
export function generateRotationReminder(
  secretName: string,
  expiresAt: Date,
  alertLevel: "critical" | "warning"
): string {
  const days = Math.ceil(
    (expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const severity = alertLevel === "critical" ? "🔴 CRITICAL" : "🟡 WARNING";

  return `${severity}: ${secretName} expires in ${days} days (${expiresAt.toLocaleDateString()}). See ROTATION_CHECKLIST for steps.`;
}

/**
 * Secrets to track (example)
 */
export const SECRETS_TO_TRACK: Record<string, SecretMetadata> = {
  JWT_SECRET: {
    name: "JWT_SECRET",
    type: "token",
    createdAt: new Date("2026-09-14"), // Set to actual date
    rotationDaysInterval: ROTATION_DAYS.JWT_SECRET,
    lastRotatedAt: new Date("2026-09-14"),
    expiresAt: calculateExpirationDate(
      new Date("2026-09-14"),
      ROTATION_DAYS.JWT_SECRET
    ),
    status: "active",
  },

  SINGPAY_API_KEY: {
    name: "SINGPAY_API_KEY",
    type: "api_key",
    createdAt: new Date("2026-01-01"), // Set to actual date
    rotationDaysInterval: ROTATION_DAYS.SINGPAY_API_KEY,
    lastRotatedAt: new Date("2026-01-01"),
    expiresAt: calculateExpirationDate(
      new Date("2026-01-01"),
      ROTATION_DAYS.SINGPAY_API_KEY
    ),
    status: "active",
  },
};

/**
 * Generate rotation schedule report
 */
export function generateRotationReport(
  secrets: Record<string, SecretMetadata> = SECRETS_TO_TRACK
): {
  critical: SecretMetadata[];
  warning: SecretMetadata[];
  healthy: SecretMetadata[];
} {
  const now = new Date();
  const critical: SecretMetadata[] = [];
  const warning: SecretMetadata[] = [];
  const healthy: SecretMetadata[] = [];

  for (const secret of Object.values(secrets)) {
    const daysUntilExpiry = Math.ceil(
      (secret.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < ALERT_THRESHOLDS.CRITICAL) {
      secret.alertLevel = "critical";
      critical.push(secret);
    } else if (daysUntilExpiry < ALERT_THRESHOLDS.WARNING) {
      secret.alertLevel = "warning";
      warning.push(secret);
    } else {
      secret.alertLevel = "none";
      healthy.push(secret);
    }
  }

  return { critical, warning, healthy };
}

/**
 * Recommended rotation schedule
 */
export const RECOMMENDED_SCHEDULE = `
## 🔄 SECRETS ROTATION SCHEDULE

### Monthly (1st of each month)
- Review upcoming expirations
- Check critical/warning alerts
- Generate audit report

### Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)
- Rotate API_KEYS (90 days)
- Rotate JWT_SECRET (90 days)
- Review access logs

### Annually (January 1st)
- Rotate DATABASE_PASSWORD (180 days)
- Rotate SINGPAY_API_KEY (365 days)
- Rotate CLOUDINARY_API_SECRET (365 days)
- Security audit

### After Security Incident
- Immediately rotate all secrets
- Audit who had access
- Reset user sessions
- Review logs for compromised data

## ⚠️ EMERGENCY ROTATION

If secret is compromised:
1. Immediately generate new secret
2. Deploy new value
3. Revoke old secret with provider
4. Audit access logs
5. Notify users if needed
`;
