import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUTS_VALIDES = [
  "en_attente_paiement", "payee_escrow", "confirmee_vendeur",
  "en_livraison", "livree", "litige", "remboursee", "annulee",
] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });

  const body = await req.json() as {
    commandeId: string;
    action: "changer_statut" | "annuler" | "rembourser" | "liberer_escrow";
    statut?: string;
    motif?: string;
  };

  if (!body.commandeId) return NextResponse.json({ erreur: "commandeId requis" }, { status: 400 });

  const admin = createAdminClient();

  const now = new Date().toISOString();

  if (body.action === "changer_statut") {
    if (!body.statut || !STATUTS_VALIDES.includes(body.statut as typeof STATUTS_VALIDES[number])) {
      return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
    }
    const s = body.statut as typeof STATUTS_VALIDES[number];
    await admin.from("commandes").update({
      statut: s,
      ...(s === "livree" ? { livree_at: now } : {}),
    }).eq("id", body.commandeId);
    return NextResponse.json({ succes: true });
  }

  if (body.action === "annuler") {
    await admin.from("commandes").update({ statut: "annulee" }).eq("id", body.commandeId);
    return NextResponse.json({ succes: true });
  }

  if (body.action === "rembourser") {
    await admin.from("commandes").update({ statut: "remboursee" }).eq("id", body.commandeId);
    return NextResponse.json({ succes: true });
  }

  if (body.action === "liberer_escrow") {
    await admin.from("commandes").update({ statut: "livree", livree_at: now }).eq("id", body.commandeId);
    return NextResponse.json({ succes: true });
  }

  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
