import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES_VALIDES = ["acheteur", "vendeur", "livreur", "admin"] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { userId, role } = await req.json() as { userId: string; role: string };
  if (!userId || !role) return NextResponse.json({ erreur: "userId et role requis" }, { status: 400 });
  if (!ROLES_VALIDES.includes(role as typeof ROLES_VALIDES[number])) {
    return NextResponse.json({ erreur: "Rôle invalide" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ erreur: "Vous ne pouvez pas changer votre propre rôle" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("utilisateurs").update({ role: role as "acheteur" | "vendeur" | "livreur" | "admin" }).eq("id", userId);
  return NextResponse.json({ succes: true });
}
