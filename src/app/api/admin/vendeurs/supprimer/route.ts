import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const { vendeurId, banEmail } = await req.json() as { vendeurId: string; banEmail?: boolean };
  if (!vendeurId) return NextResponse.json({ erreur: "vendeurId manquant" }, { status: 400 });

  const admin = createAdminClient();

  // Récupérer le vendeur + utilisateur_id avant suppression
  const { data: vendeur } = await admin
    .from("vendeurs").select("utilisateur_id, nom").eq("id", vendeurId).single();
  if (!vendeur) return NextResponse.json({ erreur: "Boutique introuvable" }, { status: 404 });

  // 1. Masquer tous les produits
  await admin.from("produits").update({ statut: "inactif" }).eq("vendeur_id", vendeurId);

  // 2. Supprimer les produits
  await admin.from("produits").delete().eq("vendeur_id", vendeurId);

  // 3. Supprimer la boutique
  const { error: errSupp } = await admin.from("vendeurs").delete().eq("id", vendeurId);
  if (errSupp) return NextResponse.json({ erreur: errSupp.message }, { status: 500 });

  // 4. Si option bannir email : bannir l'utilisateur auth (10 ans = inaccessible)
  if (banEmail && vendeur.utilisateur_id) {
    await admin.auth.admin.updateUserById(vendeur.utilisateur_id, {
      ban_duration: "87600h",
      user_metadata: { banni: true, banni_at: new Date().toISOString(), motif: "admin_suppression_boutique" },
    });
  }

  return NextResponse.json({ succes: true, nomBoutique: vendeur.nom });
}
