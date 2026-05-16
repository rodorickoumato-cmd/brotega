"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getVendeursAdmin, changerStatutVendeur } from "@/app/actions/admin";
import Link from "next/link";

type Vendeur = {
  id: string;
  nom: string;
  slug: string;
  ville: string;
  statut: "en_attente" | "verifie" | "suspendu";
  categories: string[];
  nb_produits: number;
  note: number;
  created_at: string;
  utilisateur_id: string;
};

const STATUT_STYLE: Record<string, string> = {
  en_attente: "bg-yellow-50 border-yellow-200 text-yellow-700",
  verifie:    "bg-green-50 border-green-200 text-green-700",
  suspendu:   "bg-red-50 border-red-200 text-red-700",
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  verifie:    "Vérifié ✓",
  suspendu:   "Suspendu",
};

const FILTRES = ["Tous", "en_attente", "verifie", "suspendu"] as const;

export default function AdminVendeursPage() {
  const router = useRouter();
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Tous");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      const res = await getVendeursAdmin();
      setVendeurs((res.vendeurs as Vendeur[]) ?? []);
      setChargement(false);
    })();
  }, [router]);

  const handleStatut = async (vendeurId: string, statut: "verifie" | "suspendu" | "en_attente") => {
    setErreur("");
    setEnCours(vendeurId);
    const res = await changerStatutVendeur(vendeurId, statut);
    setEnCours(null);
    if (res.erreur) { setErreur(res.erreur); return; }
    setVendeurs((prev) => prev.map((v) => v.id === vendeurId ? { ...v, statut } : v));
  };

  const visibles = vendeurs.filter((v) => filtre === "Tous" || v.statut === filtre);
  const nbAttente = vendeurs.filter((v) => v.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Vendeurs 🏪</h1>
        <p className="text-white/70 text-sm mt-1">
          {vendeurs.length} boutiques
          {nbAttente > 0 && ` · ${nbAttente} en attente de validation`}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium">
            {erreur}
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTRES.map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtre === f
                  ? "bg-[#E63946] border-[#E63946] text-white"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {f === "Tous" ? "Tous" : (STATUT_LABEL[f] ?? f)}
            </button>
          ))}
        </div>

        {chargement && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-28" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-gray-500 font-medium">Aucun vendeur dans cette catégorie</p>
          </div>
        )}

        {!chargement && visibles.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-black text-gray-800 text-base">{v.nom}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {v.ville}
                    {v.categories.length > 0 && ` · ${v.categories.slice(0, 2).join(", ")}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.nb_produits} produit{v.nb_produits !== 1 ? "s" : ""}
                    {v.note > 0 && ` · ⭐ ${v.note.toFixed(1)}`}
                  </p>
                  <p className="text-xs font-mono text-gray-300 mt-0.5 tracking-widest">
                    #{v.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUT_STYLE[v.statut]}`}>
                  {STATUT_LABEL[v.statut]}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Inscrit le {new Date(v.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>

            <div className="px-4 pb-4 flex gap-2 flex-wrap">
              {v.statut !== "verifie" && (
                <button
                  onClick={() => handleStatut(v.id, "verifie")}
                  disabled={enCours === v.id}
                  className="bg-[#E63946] text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {enCours === v.id ? "..." : "✓ Vérifier"}
                </button>
              )}
              {v.statut !== "suspendu" && (
                <button
                  onClick={() => handleStatut(v.id, "suspendu")}
                  disabled={enCours === v.id}
                  className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {enCours === v.id ? "..." : "Suspendre"}
                </button>
              )}
              {v.statut === "suspendu" && (
                <button
                  onClick={() => handleStatut(v.id, "en_attente")}
                  disabled={enCours === v.id}
                  className="bg-gray-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  Réactiver
                </button>
              )}
              <Link
                href={`/vendeur/${v.slug}`}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-[#E63946]/40 transition-colors"
              >
                Voir boutique →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
