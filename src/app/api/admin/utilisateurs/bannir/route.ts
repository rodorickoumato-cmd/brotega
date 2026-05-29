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

  const { userId, action, motif } = await req.json() as {
    userId: string;
    action: "bannir" | "debannir" | "supprimer" | "suspendre" | "reactiver";
    motif?: string;
  };

  if (!userId || !action) return NextResponse.json({ erreur: "Paramètres manquants" }, { status: 400 });

  // Empêcher l'admin de se bannir lui-même
  if (userId === user.id) return NextResponse.json({ erreur: "Impossible de modifier votre propre compte" }, { status: 400 });

  const admin = createAdminClient();

  if (action === "bannir") {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "87600h",
      user_metadata: { banni: true, banni_at: new Date().toISOString(), motif: motif ?? "décision admin" },
    });
    // Suspendre aussi sa boutique si il en a une
    await admin.from("vendeurs").update({ statut: "suspendu" }).eq("utilisateur_id", userId);
    return NextResponse.json({ succes: true, action: "banni" });
  }

  if (action === "debannir") {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
      user_metadata: { banni: false, debanni_at: new Date().toISOString() },
    });
    return NextResponse.json({ succes: true, action: "débanni" });
  }

  if (action === "supprimer") {
    // Supprimer boutique + produits en cascade
    const { data: vendeurData } = await admin
      .from("vendeurs").select("id").eq("utilisateur_id", userId).maybeSingle();
    if (vendeurData) {
      await admin.from("produits").delete().eq("vendeur_id", vendeurData.id);
      await admin.from("vendeurs").delete().eq("id", vendeurData.id);
    }
    // Supprimer l'utilisateur auth (irréversible)
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ succes: true, action: "supprimé" });
  }

  if (action === "suspendre") {
    await admin.from("utilisateurs").update({
      suspendu: true,
      motif_suspension: motif ?? "décision admin",
    }).eq("id", userId);
    return NextResponse.json({ succes: true, action: "suspendu" });
  }

  if (action === "reactiver") {
    await admin.from("utilisateurs").update({
      suspendu: false,
      motif_suspension: null,
    }).eq("id", userId);
    return NextResponse.json({ succes: true, action: "réactivé" });
  }

  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
