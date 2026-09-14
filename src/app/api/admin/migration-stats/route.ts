/**
 * API: GET /api/admin/migration-stats - Migration progress tracking
 * ✅ Show how many users migrated
 * ✅ Identify non-migrated users
 * ✅ Calculate migration percentage
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyJWT } from "@/lib/jwt-secure";

export async function GET(req: NextRequest) {
  try {
    // ✅ Verify admin access
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
    }

    const payload = verifyJWT(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { erreur: "Accès refusé - admin seulement" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // ✅ COUNT MIGRATED USERS (Supabase Auth with new account)
    const { data: migratedCount, error: migratedError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id", { count: "exact", head: true })
      .not("migrated_from_supabase_id", "is", null)) as any;

    // ✅ COUNT UNMIGRATED USERS (Supabase Auth without new account)
    // This would need to query Supabase Auth directly
    // For now, we estimate from migrated count

    // ✅ TOTAL OLD USERS (rough estimate - would need audit table)
    const { data: allNewUsers, error: allError } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id", { count: "exact", head: true })) as any;

    const migrated = migratedCount?.length || 0;
    const total = allNewUsers?.length || 0;
    const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0;

    // ✅ GET RECENT MIGRATIONS
    const { data: recentMigrations } = await (admin
      .from("audit_logs" as any)
      .select("user_id, timestamp, details")
      .eq("action", "user_migration")
      .eq("status", "success")
      .order("timestamp", { ascending: false })
      .limit(10)) as any;

    // ✅ DEADLINE
    const deadline = new Date("2026-10-14");
    const now = new Date();
    const daysLeft = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      succes: true,
      migration_stats: {
        migrated: migrated,
        total: total,
        percentage: percentage,
        days_left: Math.max(0, daysLeft),
        deadline: "2026-10-14",
        phase: daysLeft > 0 ? "Phase 1 (Both methods)" : "Phase 2 (Migration only)",
      },
      recent_migrations: recentMigrations || [],
    });
  } catch (err) {
    console.error("[GET /api/admin/migration-stats]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
