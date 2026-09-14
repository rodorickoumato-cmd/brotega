/**
 * AUDIT LOGGING - Production Grade
 * ✅ Log sensitive operations
 * ✅ Track user actions for compliance
 * ✅ Detect anomalies
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "user_register"
  | "password_reset"
  | "pin_reset"
  | "admin_access"
  | "vendor_create"
  | "vendor_update"
  | "order_create"
  | "order_confirm"
  | "order_cancel"
  | "payment_success"
  | "payment_failed"
  | "delivery_start"
  | "delivery_complete"
  | "data_export"
  | "role_change"
  | "permission_change"
  | "suspicious_activity";

export interface AuditEntry {
  user_id?: string;
  action: AuditAction;
  resource_type: string; // "user", "order", "payment", "admin", etc
  resource_id?: string;
  status: "success" | "failure" | "pending";
  ip_address: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Log audit event to database
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();

    await (admin
      .from("audit_logs" as any)
      .insert({
        user_id: entry.user_id || null,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id || null,
        status: entry.status,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent || null,
        details: entry.details || null,
        timestamp: entry.timestamp || new Date().toISOString(),
      })) as any;
  } catch (err) {
    console.error("[AUDIT] Failed to log event:", err);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Log login attempt
 */
export async function logLogin(userId: string, ip: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: "user_login",
    resource_type: "user",
    resource_id: userId,
    status: "success",
    ip_address: ip,
    user_agent: userAgent,
  });
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(pseudo: string, ip: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    action: "user_login",
    resource_type: "user",
    status: "failure",
    ip_address: ip,
    user_agent: userAgent,
    details: { pseudo },
  });
}

/**
 * Log password/PIN reset
 */
export async function logPINReset(userId: string, ip: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: "pin_reset",
    resource_type: "user",
    resource_id: userId,
    status: "success",
    ip_address: ip,
    user_agent: userAgent,
  });
}

/**
 * Log admin access
 */
export async function logAdminAccess(
  adminId: string,
  action: string,
  ip: string,
  userAgent?: string,
  resourceId?: string
): Promise<void> {
  await logAuditEvent({
    user_id: adminId,
    action: "admin_access",
    resource_type: "admin",
    resource_id: resourceId,
    status: "success",
    ip_address: ip,
    user_agent: userAgent,
    details: { action },
  });
}

/**
 * Log payment event
 */
export async function logPayment(
  userId: string,
  paymentId: string,
  status: "success" | "failure",
  ip: string,
  amount?: number
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: status === "success" ? "payment_success" : "payment_failed",
    resource_type: "payment",
    resource_id: paymentId,
    status: "success",
    ip_address: ip,
    details: { amount },
  });
}

/**
 * Log order creation
 */
export async function logOrderCreate(
  userId: string,
  orderId: string,
  ip: string,
  totalAmount?: number
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: "order_create",
    resource_type: "order",
    resource_id: orderId,
    status: "success",
    ip_address: ip,
    details: { total_amount: totalAmount },
  });
}

/**
 * Log delivery event
 */
export async function logDelivery(
  driverId: string,
  deliveryId: string,
  action: "delivery_start" | "delivery_complete",
  ip: string
): Promise<void> {
  await logAuditEvent({
    user_id: driverId,
    action,
    resource_type: "delivery",
    resource_id: deliveryId,
    status: "success",
    ip_address: ip,
  });
}

/**
 * Log data export (compliance)
 */
export async function logDataExport(
  userId: string,
  dataType: string,
  ip: string,
  recordCount?: number
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action: "data_export",
    resource_type: "data",
    status: "success",
    ip_address: ip,
    details: { data_type: dataType, record_count: recordCount },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  reason: string,
  ip: string,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  console.warn(`[SECURITY] Suspicious activity detected: ${reason}`);

  await logAuditEvent({
    user_id: userId,
    action: "suspicious_activity",
    resource_type: "security",
    status: "failure",
    ip_address: ip,
    details: { reason, ...details },
  });
}

/**
 * Get audit logs for user
 */
export async function getUserAuditLogs(userId: string, limit = 50): Promise<AuditEntry[]> {
  try {
    const admin = createAdminClient();

    const { data, error } = await (admin
      .from("audit_logs" as any)
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit)) as any;

    if (error) {
      console.error("[AUDIT] Failed to fetch logs:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[AUDIT] Error:", err);
    return [];
  }
}

/**
 * Get audit logs for admin review
 */
export async function getAuditLogs(
  filter?: { action?: AuditAction; status?: string; days?: number },
  limit = 100
): Promise<AuditEntry[]> {
  try {
    const admin = createAdminClient();

    let query = admin.from("audit_logs" as any).select("*");

    if (filter?.action) {
      query = query.eq("action", filter.action);
    }

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    if (filter?.days) {
      const since = new Date();
      since.setDate(since.getDate() - filter.days);
      query = query.gte("timestamp", since.toISOString());
    }

    const { data, error } = await (query
      .order("timestamp", { ascending: false })
      .limit(limit)) as any;

    if (error) {
      console.error("[AUDIT] Failed to fetch logs:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[AUDIT] Error:", err);
    return [];
  }
}
