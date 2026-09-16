/**
 * DEBUG ENDPOINT - Voir exactement ce qui existe dans la base
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    const validEmail = validateEmail(email);
    if (!validEmail) {
      return NextResponse.json({ erreur: "Email invalide" });
    }

    const admin = createAdminClient();

    // DEBUG 1: Chercher dans utilisateurs_auth_v2
    const { data: migratedUser, error: err1 } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, pseudo, role, email")
      .eq("email", validEmail)
      .maybeSingle()) as any;

    // DEBUG 2: Lister les utilisateurs dans utilisateurs_auth_v2
    const { data: allUsers, error: err2 } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id, email")
      .limit(5)) as any;

    return NextResponse.json({
      email: validEmail,
      found_in_auth_v2: !!migratedUser,
      migrated_user: migratedUser,
      err1: err1?.message,
      total_users_in_auth_v2: allUsers?.length || 0,
      err2: err2?.message
    });
  } catch (err: any) {
    return NextResponse.json({
      erreur: err.message,
      stack: err.toString()
    });
  }
}
