import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const admin = createAdminClient();

  // Livreurs avec leurs stats de livraisons
  const { data: livreurs } = await admin
    .from("utilisateurs")
    .select("id, nom, email, telephone, created_at, suspendu, motif_suspension")
    .eq("role", "livreur")
    .order("created_at", { ascending: false });

  if (!livreurs?.length) return NextResponse.json({ livreurs: [] });

  const livreurIds = livreurs.map((l) => l.id);

  const { data: livraisons } = await admin
    .from("livraisons")
    .select("livreur_id, statut, remuneration_xaf, remuneration_versee")
    .in("livreur_id", livreurIds);

  const statsParLivreur: Record<string, {
    en_cours: number;
    livrees: number;
    gains_total: number;
    gains_en_attente: number;
    gains_non_verses: number;
  }> = {};

  for (const l of livraisons ?? []) {
    if (!l.livreur_id) continue;
    if (!statsParLivreur[l.livreur_id]) {
      statsParLivreur[l.livreur_id] = { en_cours: 0, livrees: 0, gains_total: 0, gains_en_attente: 0, gains_non_verses: 0 };
    }
    const s = statsParLivreur[l.livreur_id];
    if (l.statut === "livree") {
      s.livrees++;
      s.gains_total += l.remuneration_xaf ?? 0;
      if (!(l as { remuneration_versee?: boolean }).remuneration_versee) {
        s.gains_non_verses += l.remuneration_xaf ?? 0;
      }
    } else if (["assignee", "en_route"].includes(l.statut)) {
      s.en_cours++;
      s.gains_en_attente += l.remuneration_xaf ?? 0;
    }
  }

  const result = livreurs.map((l) => ({
    ...l,
    stats: statsParLivreur[l.id] ?? { en_cours: 0, livrees: 0, gains_total: 0, gains_en_attente: 0 },
  }));

  return NextResponse.json({ livreurs: result });
}
