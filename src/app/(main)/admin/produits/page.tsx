"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSignalementsAdmin, traiterSignalementAdmin, changerStatutProduitAdmin } from "@/app/actions/produits";
import Link from "next/link";

type Signalement = {
  id: string;
  produit_id: string;
  motif: string;
  statut: "en_attente" | "traite";
  created_at: string;
  produit: { id: string; nom: string; statut: "actif" | "inactif"; vendeur_id: string } | null;
};

type Toast = { message: string; type: "succes" | "erreur" };
type Filtre = "en_attente" | "traite" | "Tous";

export default function AdminProduitsPage() {
  const router = useRouter();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("en_attente");
  const [enCours, setEnCours] = useState<string | null>(null);

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const charger = useCallback(async () => {
    const res = await getSignalementsAdmin();
    if (res.signalements) setSignalements(res.signalements as Signalement[]);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      await charger();
    })();
  }, [router, charger]);

  async function handleToggleProduit(s: Signalement) {
    if (!s.produit) return;
    const nouveauStatut = s.produit.statut === "actif" ? "inactif" : "actif";
    setEnCours(s.id);
    const res = await changerStatutProduitAdmin(s.produit.id, nouveauStatut);
    if (res.succes) {
      setSignalements((prev) => prev.map((x) =>
        x.produit?.id === s.produit!.id && x.produit ? { ...x, produit: { ...x.produit, statut: nouveauStatut } } : x
      ));
      afficherToast(nouveauStatut === "inactif" ? "Produit désactivé." : "Produit réactivé.", "succes");
    } else {
      afficherToast(res.erreur ?? "Erreur", "erreur");
    }
    setEnCours(null);
  }

  async function handleTraiter(id: string) {
    setEnCours(id);
    const res = await traiterSignalementAdmin(id);
    if (res.succes) {
      setSignalements((prev) => prev.map((x) => x.id === id ? { ...x, statut: "traite" } : x));
      afficherToast("Signalement marqué traité.", "succes");
    } else {
      afficherToast(res.erreur ?? "Erreur", "erreur");
    }
    setEnCours(null);
  }

  const visibles = signalements.filter((s) => filtre === "Tous" || s.statut === filtre);
  const nbEnAttente = signalements.filter((s) => s.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Produits signalés 📦</h1>
        <p className="text-white/70 text-sm mt-1">{nbEnAttente} signalement{nbEnAttente > 1 ? "s" : ""} en attente</p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {(["en_attente", "traite", "Tous"] as Filtre[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtre === f ? "bg-[#E63946] border-[#E63946] text-white" : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {f === "en_attente" ? "En attente" : f === "traite" ? "Traités" : "Tous"}
            </button>
          ))}
        </div>

        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-24 animate-pulse mb-3" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-500 font-medium">Aucun signalement {filtre === "en_attente" ? "en attente" : ""}</p>
          </div>
        )}

        <div className="space-y-3">
          {visibles.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-black text-gray-800">{s.produit?.nom ?? "Produit supprimé"}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  s.statut === "en_attente" ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"
                }`}>
                  {s.statut === "en_attente" ? "En attente" : "Traité"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{s.motif}</p>
              <p className="text-xs text-gray-400 mb-3">
                {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {s.produit && ` · Produit actuellement ${s.produit.statut === "actif" ? "actif" : "désactivé"}`}
              </p>
              {s.produit && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleProduit(s)}
                    disabled={enCours === s.id}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 disabled:opacity-50 ${
                      s.produit.statut === "actif" ? "border-red-100 text-red-600" : "border-green-100 text-green-600"
                    }`}
                  >
                    {enCours === s.id ? "…" : s.produit.statut === "actif" ? "Désactiver le produit" : "Réactiver le produit"}
                  </button>
                  {s.statut === "en_attente" && (
                    <button
                      onClick={() => handleTraiter(s.id)}
                      disabled={enCours === s.id}
                      className="flex-1 text-xs font-bold py-2 rounded-xl border-2 border-gray-200 text-gray-700 disabled:opacity-50"
                    >
                      Marquer traité
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
