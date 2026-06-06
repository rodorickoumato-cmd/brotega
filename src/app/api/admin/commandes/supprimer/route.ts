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

  const { commandeId } = await req.json() as { commandeId: string };
  if (!commandeId) return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });

  const admin = createAdminClient();

  // Supprimer les enregistrements liés manuellement si pas de CASCADE en BDD
  await admin.from("livraisons").delete().eq("commande_id", commandeId);
  await admin.from("reclamations").delete().eq("commande_id", commandeId);

  const { error } = await admin.from("commandes").delete().eq("id", commandeId);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });

  return NextResponse.json({ succes: true });
}
