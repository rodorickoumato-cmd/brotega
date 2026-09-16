/**
 * Voir TOUS les emails existants
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: users, error } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, email, pseudo, migrated_from_supabase_id")
      .limit(100)) as any;

    return NextResponse.json({
      total: users?.length || 0,
      users: users || [],
      error: error?.message
    });
  } catch (err: any) {
    return NextResponse.json({ erreur: err.message });
  }
}
