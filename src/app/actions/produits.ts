"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, MAX_PRODUITS_GRATUIT } from "@/lib/rules";

type ProduitInput = {
  id?: string;
  nom: string;
  description?: string | null;
  prix: number;
  unite?: string;
  stock?: number | null;
  categorie?: string | null;
  image?: string | null;
};

export async function sauvegarderProduit(produit: ProduitInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs")
      .select("id")
      .eq("utilisateur_id", user.id)
      .single();
    if (!vendeur) return { erreur: "Aucune boutique trouvée." };

    // Admin = accès illimité sans vérification d'abonnement
    const { data: profil } = await supabase
      .from("utilisateurs").select("role").eq("id", user.id).single();
    const isAdmin = profil?.role === "admin";

    if (produit.id) {
      const { error } = await supabase
        .from("produits")
        .update({
          nom: produit.nom,
          description: produit.description ?? null,
          prix: produit.prix,
          unite: produit.unite ?? "piece",
          stock: produit.stock ?? null,
          categorie: produit.categorie ?? null,
          image: produit.image ?? null,
        })
        .eq("id", produit.id)
        .eq("vendeur_id", vendeur.id);
      if (error) return { erreur: error.message };
    } else {
      if (!isAdmin) {
        const { data: abo } = await supabase
          .from("abonnements")
          .select("plan")
          .eq("vendeur_id", vendeur.id)
          .eq("statut", "actif")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const planId = (abo?.plan ?? "gratuit") as keyof typeof PLANS;
        const planMax = PLANS[planId]?.max_produits ?? MAX_PRODUITS_GRATUIT;
        const max = Number.isFinite(planMax) ? (planMax as number) : 9999;

        const { count, error: countError } = await supabase
          .from("produits")
          .select("*", { count: "exact", head: true })
          .eq("vendeur_id", vendeur.id);

        if (countError) return { erreur: countError.message };
        if ((count ?? 0) >= max) {
          return { erreur: `Limite atteinte (${max} produits max). Passez à un abonnement supérieur.` };
        }
      }

      const { error: insertError } = await supabase.from("produits").insert({
        vendeur_id: vendeur.id,
        nom: produit.nom,
        description: produit.description ?? null,
        prix: produit.prix,
        unite: produit.unite ?? "piece",
        stock: produit.stock ?? null,
        categorie: produit.categorie ?? null,
        image: produit.image ?? null,
        statut: "actif",
      });

      if (insertError) return { erreur: insertError.message };
    }

    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function changerStatutProduit(produitId: string, statut: "actif" | "inactif") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return { erreur: "Boutique introuvable." };

    const { error } = await supabase
      .from("produits")
      .update({ statut })
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return { erreur: error.message };
    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function supprimerProduit(produitId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { erreur: "Non authentifié." };

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return { erreur: "Boutique introuvable." };

    const { error } = await supabase
      .from("produits")
      .delete()
      .eq("id", produitId)
      .eq("vendeur_id", vendeur.id);

    if (error) return { erreur: error.message };
    return { succes: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erreur: "Erreur serveur : " + msg };
  }
}

export async function getMesProduits() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: vendeur } = await supabase
      .from("vendeurs").select("id").eq("utilisateur_id", user.id).single();
    if (!vendeur) return [];

    const { data } = await supabase
      .from("produits")
      .select("*")
      .eq("vendeur_id", vendeur.id)
      .order("created_at", { ascending: false });

    return data ?? [];
  } catch {
    return [];
  }
}

// ── Modération admin (Phase 2 — Admin Center) ───────────────────
// Signalement + retrait a posteriori, décidé explicitement avec l'utilisateur :
// les vendeurs publient toujours instantanément, aucun blocage à la publication.

async function verifierAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non connecté" as const, userId: null };
  const { data: profil } = await supabase
    .from("utilisateurs").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return { erreur: "Accès refusé" as const, userId: null };
  return { erreur: null, userId: user.id };
}

export async function getSignalementsAdmin() {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur, signalements: null };

  const admin = createAdminClient();
  const { data: signalements, error } = await admin
    .from("signalements_produits")
    .select("id, produit_id, motif, statut, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { erreur: error.message, signalements: null };
  if (!signalements?.length) return { erreur: null, signalements: [] };

  // Jointure manuelle (cohérent avec le reste de l'admin — voir getVendeursAdmin)
  const produitIds = [...new Set(signalements.map((s) => s.produit_id))];
  const { data: produits } = await admin
    .from("produits")
    .select("id, nom, statut, vendeur_id")
    .in("id", produitIds);
  const produitMap = new Map((produits ?? []).map((p) => [p.id, p]));

  return {
    erreur: null,
    signalements: signalements.map((s) => ({ ...s, produit: produitMap.get(s.produit_id) ?? null })),
  };
}

export async function traiterSignalementAdmin(signalementId: string) {
  const { erreur, userId } = await verifierAdmin();
  if (erreur || !userId) return { erreur: erreur ?? "Non autorisé" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("signalements_produits")
    .update({ statut: "traite", traite_par: userId, traite_le: new Date().toISOString() })
    .eq("id", signalementId);

  if (error) return { erreur: error.message };
  return { succes: true };
}

export async function changerStatutProduitAdmin(produitId: string, statut: "actif" | "inactif") {
  const { erreur } = await verifierAdmin();
  if (erreur) return { erreur };

  const admin = createAdminClient();
  const { error } = await admin.from("produits").update({ statut }).eq("id", produitId);
  if (error) return { erreur: error.message };
  return { succes: true };
}
