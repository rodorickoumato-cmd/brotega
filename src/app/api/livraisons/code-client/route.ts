import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const commandeId = req.nextUrl.searchParams.get("commandeId");
  if (!commandeId) return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  // Vérifier que l'utilisateur est bien l'acheteur de cette commande
  const { data: commande } = await supabase
    .from("commandes")
    .select("id, utilisateur_id, statut")
    .eq("id", commandeId)
    .maybeSingle();

  if (!commande || commande.utilisateur_id !== user.id) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }

  if (commande.statut !== "en_livraison") {
    return NextResponse.json({ code: null });
  }

  // RLS policy (migration 002) autorise le client à lire sa livraison
  const { data: livraison } = await supabase
    .from("livraisons")
    .select("code_confirmation")
    .eq("commande_id", commandeId)
    .eq("statut", "en_route")
    .maybeSingle();

  return NextResponse.json({ code: livraison?.code_confirmation ?? null });
}
