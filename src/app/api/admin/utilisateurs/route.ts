import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const perPage = 50;

  const admin = createAdminClient();

  // Récupérer les utilisateurs de la table publique
  const { data: utilisateurs, error } = await admin
    .from("utilisateurs")
    .select("id, nom, email, role, telephone, created_at")
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });

  // Récupérer les vendeurs pour savoir qui en a une
  const { data: vendeurs } = await admin
    .from("vendeurs")
    .select("utilisateur_id, id, nom, statut")
    .in("utilisateur_id", (utilisateurs ?? []).map((u) => u.id));

  const vendeurMap = new Map((vendeurs ?? []).map((v) => [v.utilisateur_id, v]));

  // Récupérer les statuts de ban depuis auth.users (par batch)
  const userIds = (utilisateurs ?? []).map((u) => u.id);
  const bansMap = new Map<string, boolean>();

  for (const uid of userIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user) {
        bansMap.set(uid, !!data.user.banned_until && new Date(data.user.banned_until) > new Date());
      }
    } catch { /* skip */ }
  }

  const result = (utilisateurs ?? []).map((u) => ({
    ...u,
    banni: bansMap.get(u.id) ?? false,
    boutique: vendeurMap.get(u.id) ?? null,
  }));

  return NextResponse.json({ utilisateurs: result });
}
