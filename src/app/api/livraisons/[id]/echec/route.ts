import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerPushUtilisateurs } from "@/lib/push";

const RAISONS_VALIDES = ["client_absent", "adresse_incorrecte", "client_injoignable", "autre"] as const;
type Raison = typeof RAISONS_VALIDES[number];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: livraisonId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });

  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "livreur" && profil?.role !== "admin") {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }

  const { raison, note } = await req.json() as { raison: Raison; note?: string };
  if (!RAISONS_VALIDES.includes(raison)) {
    return NextResponse.json({ erreur: "Raison invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: livraison } = await admin
    .from("livraisons")
    .select("id, livreur_id, statut, commande_id")
    .eq("id", livraisonId)
    .single();

  if (!livraison) return NextResponse.json({ erreur: "Livraison introuvable" }, { status: 404 });
  if (profil?.role === "livreur" && livraison.livreur_id !== user.id) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }
  if (livraison.statut !== "en_route") {
    return NextResponse.json({ erreur: "Seule une livraison en route peut être signalée" }, { status: 400 });
  }

  const noteFinale = note?.trim()
    ? `${raison} — ${note.trim()}`
    : raison;

  await admin.from("livraisons").update({
    statut: "echec",
    note_livreur: noteFinale,
    code_confirmation: null,
  }).eq("id", livraisonId);

  // Repasse la commande en confirmee_vendeur pour que l'admin puisse réassigner
  const { data: commande } = await admin
    .from("commandes")
    .select("utilisateur_id, vendeur_id, code_court")
    .eq("id", livraison.commande_id)
    .single();

  await admin.from("commandes").update({
    statut: "confirmee_vendeur",
    livreur_id: null,
  }).eq("id", livraison.commande_id);

  // Notifie l'admin (tous les admins)
  const { data: admins } = await admin
    .from("utilisateurs").select("id").eq("role", "admin");
  if (admins?.length) {
    void envoyerPushUtilisateurs(admins.map((a) => a.id), {
      title: "Incident de livraison ⚠️",
      body: `Commande ${commande?.code_court ?? ""} — ${raison.replace("_", " ")}. À réassigner.`,
      url: "/admin/livraisons",
      tag: "incident-livraison",
    });
  }

  // Notifie le client
  if (commande?.utilisateur_id) {
    void envoyerPushUtilisateurs([commande.utilisateur_id], {
      title: "Incident sur votre livraison",
      body: "Votre commande n'a pas pu être livrée. Notre équipe vous contacte.",
      url: `/commande/${commande.code_court}`,
      tag: "incident-client",
    });
  }

  return NextResponse.json({ succes: true });
}
