"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { assignerLivreur } from "@/app/actions/commandes";
import type { Livraison, Commande, Utilisateur } from "@/lib/supabase/database.types";
import { formatXAF } from "@/lib/utils";

type LivraisonRiche = Livraison & {
  commande: Pick<Commande, "id" | "code_court" | "total" | "adresse"> | null;
};

type AdresseLiv = { nom_complet?: string; ville?: string; quartier?: string };

export default function AdminLivraisonsPage() {
  const router = useRouter();
  const [livraisons, setLivraisons] = useState<LivraisonRiche[]>([]);
  const [livreurs, setLivreurs] = useState<Pick<Utilisateur, "id" | "nom">[]>([]);
  const [chargement, setChargement] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [en_cours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }

      // Livraisons en attente ou assignées
      const { data: livs } = await supabase
        .from("livraisons")
        .select("*")
        .in("statut", ["en_attente", "assignee"])
        .order("created_at", { ascending: false });

      const commandeIds = (livs ?? []).map((l) => l.commande_id);
      const { data: cmds } = commandeIds.length > 0
        ? await supabase
            .from("commandes")
            .select("id, code_court, total, adresse")
            .in("id", commandeIds)
        : { data: [] };

      const cmdMap = new Map((cmds ?? []).map((c) => [c.id, c]));
      const enrichies: LivraisonRiche[] = (livs ?? []).map((l) => ({
        ...l,
        commande: cmdMap.get(l.commande_id) ?? null,
      }));
      setLivraisons(enrichies);

      // Livreurs disponibles
      const { data: liv } = await supabase
        .from("utilisateurs").select("id, nom").eq("role", "livreur");
      setLivreurs(liv ?? []);

      setChargement(false);
    })();
  }, [router]);

  const handleAssigner = async (livraisonId: string) => {
    const livreurId = selections[livraisonId];
    if (!livreurId) { setErreur("Sélectionnez un livreur."); return; }
    setErreur("");
    setEnCours(livraisonId);
    const res = await assignerLivreur(livraisonId, livreurId);
    setEnCours(null);
    if (res.erreur) { setErreur(res.erreur); return; }
    setLivraisons((prev) => prev.map((l) =>
      l.id === livraisonId ? { ...l, statut: "assignee", livreur_id: livreurId } : l
    ));
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#00A550] px-5 pt-12 pb-6">
        <p className="text-white/70 text-sm">Admin</p>
        <h1 className="text-2xl font-black text-white">Livraisons 🚚</h1>
        <p className="text-white/70 text-sm mt-1">Assigner les livreurs aux commandes</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium">
            {erreur}
          </div>
        )}

        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-10 bg-gray-200 rounded-xl" />
          </div>
        ))}

        {!chargement && livraisons.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-gray-700">Toutes les livraisons sont assignées</p>
          </div>
        )}

        {!chargement && livraisons.map((l) => {
          const adresse = l.commande?.adresse as AdresseLiv | null;
          const estAssignee = l.statut === "assignee";
          const livreurNom = livreurs.find((lv) => lv.id === l.livreur_id)?.nom;

          return (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-gray-800 text-base">
                    {l.commande?.code_court ?? "—"}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    estAssignee
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-yellow-50 border-yellow-200 text-yellow-700"
                  }`}>
                    {estAssignee ? "Assignée" : "En attente"}
                  </span>
                </div>
                {adresse && (
                  <p className="text-sm text-gray-600">
                    📍 {adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}
                  </p>
                )}
                {l.commande?.total && (
                  <p className="text-sm font-black text-[#00A550] mt-1">{formatXAF(l.commande.total)}</p>
                )}
                {estAssignee && livreurNom && (
                  <p className="text-xs text-blue-600 mt-1 font-semibold">🏍️ {livreurNom}</p>
                )}
              </div>

              {!estAssignee && (
                <div className="px-4 py-3 flex gap-2">
                  <select
                    value={selections[l.id] ?? ""}
                    onChange={(e) => setSelections((p) => ({ ...p, [l.id]: e.target.value }))}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#00A550] transition-colors"
                  >
                    <option value="">Choisir un livreur</option>
                    {livreurs.map((lv) => (
                      <option key={lv.id} value={lv.id}>{lv.nom}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssigner(l.id)}
                    disabled={en_cours === l.id || !selections[l.id]}
                    className="bg-[#00A550] text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
                  >
                    {en_cours === l.id ? "..." : "Assigner"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
