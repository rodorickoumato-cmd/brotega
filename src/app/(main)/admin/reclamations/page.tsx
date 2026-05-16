"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getReclamationsAdmin, resoudreReclamation } from "@/app/actions/reclamations";
import type { Reclamation, Commande, Utilisateur } from "@/lib/supabase/database.types";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type ReclamationRiche = Reclamation & {
  commande: Pick<Commande, "id" | "code_court" | "total"> | null;
  acheteur: Pick<Utilisateur, "id" | "nom"> | null;
};

const STATUT_STYLE: Record<Reclamation["statut"], { label: string; cls: string }> = {
  ouverte:          { label: "Ouverte",        cls: "bg-red-50 border-red-200 text-red-700"     },
  en_cours:         { label: "En cours",        cls: "bg-blue-50 border-blue-200 text-blue-700"  },
  resolue_acheteur: { label: "→ Acheteur",      cls: "bg-green-50 border-green-200 text-green-700" },
  resolue_vendeur:  { label: "→ Vendeur",        cls: "bg-amber-50 border-amber-200 text-amber-700" },
  fermee:           { label: "Fermée",           cls: "bg-gray-50 border-gray-200 text-gray-500" },
};

export default function AdminReclamationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReclamationRiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"ouvertes" | "traitees">("ouvertes");
  const [formsOuverts, setFormsOuverts] = useState<Set<string>>(new Set());
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
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

      const recls = await getReclamationsAdmin();

      // Récupérer infos commandes et acheteurs
      const commandeIds = [...new Set(recls.map((r) => r.commande_id))];
      const utilisateurIds = [...new Set(recls.map((r) => r.utilisateur_id))];

      const { data: cmds } = commandeIds.length > 0
        ? await supabase.from("commandes").select("id, code_court, total").in("id", commandeIds)
        : { data: [] };

      const { data: users } = utilisateurIds.length > 0
        ? await supabase.from("utilisateurs").select("id, nom").in("id", utilisateurIds)
        : { data: [] };

      const cmdMap = new Map((cmds ?? []).map((c) => [c.id, c]));
      const userMap = new Map((users ?? []).map((u) => [u.id, u]));

      const enrichies: ReclamationRiche[] = recls.map((r) => ({
        ...r,
        commande: cmdMap.get(r.commande_id) ?? null,
        acheteur: userMap.get(r.utilisateur_id) ?? null,
      }));

      setItems(enrichies);
      setChargement(false);
    })();
  }, [router]);

  const handleResoudre = async (reclamationId: string, faveur: "acheteur" | "vendeur") => {
    const resolution = resolutions[reclamationId] ?? "";
    setErreur("");
    setEnCours(reclamationId);
    const res = await resoudreReclamation({ reclamationId, resolution, faveur });
    setEnCours(null);
    if (res.erreur) { setErreur(res.erreur); return; }
    const statutResolution = faveur === "acheteur" ? "resolue_acheteur" : "resolue_vendeur" as const;
    setItems((prev) => prev.map((r) =>
      r.id === reclamationId ? { ...r, statut: statutResolution, resolution } : r
    ));
    setFormsOuverts((prev) => { const s = new Set(prev); s.delete(reclamationId); return s; });
  };

  const ouvertes  = items.filter((r) => ["ouverte", "en_cours"].includes(r.statut));
  const traitees  = items.filter((r) => !["ouverte", "en_cours"].includes(r.statut));
  const liste = onglet === "ouvertes" ? ouvertes : traitees;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <p className="text-white/70 text-sm">Admin</p>
        <h1 className="text-2xl font-black text-white">Réclamations ⚠️</h1>
        <p className="text-white/70 text-sm mt-1">Gérer les litiges acheteurs</p>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 sticky top-0 z-10">
        {(["ouvertes", "traitees"] as const).map((o) => (
          <button key={o} onClick={() => setOnglet(o)}
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${
              onglet === o ? "text-[#E63946] border-b-2 border-[#E63946]" : "text-gray-400"
            }`}>
            {o === "ouvertes" ? `Ouvertes (${ouvertes.length})` : `Traitées (${traitees.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium flex items-center justify-between">
            {erreur}
            <button onClick={() => setErreur("")} className="text-red-400 ml-2">✕</button>
          </div>
        )}

        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}

        {!chargement && liste.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">{onglet === "ouvertes" ? "✅" : "📋"}</div>
            <p className="font-bold text-gray-700">
              {onglet === "ouvertes" ? "Aucune réclamation ouverte" : "Aucune réclamation traitée"}
            </p>
          </div>
        )}

        {!chargement && liste.map((r) => {
          const s = STATUT_STYLE[r.statut];
          const formOuvert = formsOuverts.has(r.id);
          const peutResoudre = ["ouverte", "en_cours"].includes(r.statut);

          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-black text-gray-800">
                      {r.acheteur?.nom ?? "Acheteur"}{" "}
                      <span className="font-normal text-gray-400 text-sm">→</span>{" "}
                      <Link href={`/commande/${r.commande?.code_court}`}
                        className="text-[#E63946] text-sm font-bold">
                        {r.commande?.code_court ?? r.commande_id.slice(0, 8)}
                      </Link>
                    </p>
                    {r.commande?.total && (
                      <p className="text-xs text-gray-400">{formatXAF(r.commande.total)}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${s.cls}`}>
                    {s.label}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-gray-500 mb-1">Motif</p>
                  <p className="text-sm text-gray-800">{r.motif}</p>
                </div>

                {r.resolution && (
                  <div className="bg-[#FEF2F2] rounded-xl p-3">
                    <p className="text-xs font-bold text-[#E63946] mb-1">Décision</p>
                    <p className="text-sm text-gray-800">{r.resolution}</p>
                  </div>
                )}
              </div>

              {peutResoudre && !formOuvert && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setFormsOuverts((prev) => new Set([...prev, r.id]))}
                    className="w-full border-2 border-[#E63946] text-[#E63946] font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all"
                  >
                    Résoudre ce litige
                  </button>
                </div>
              )}

              {peutResoudre && formOuvert && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                      Décision de l&apos;admin
                    </label>
                    <textarea
                      value={resolutions[r.id] ?? ""}
                      onChange={(e) => setResolutions((p) => ({ ...p, [r.id]: e.target.value }))}
                      placeholder="Expliquez la décision prise..."
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E63946] transition-colors resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResoudre(r.id, "acheteur")}
                      disabled={en_cours === r.id || !resolutions[r.id]?.trim()}
                      className="bg-green-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all"
                    >
                      {en_cours === r.id ? "..." : "✅ Acheteur"}
                    </button>
                    <button
                      onClick={() => handleResoudre(r.id, "vendeur")}
                      disabled={en_cours === r.id || !resolutions[r.id]?.trim()}
                      className="bg-amber-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all"
                    >
                      {en_cours === r.id ? "..." : "🏪 Vendeur"}
                    </button>
                  </div>
                  <button
                    onClick={() => setFormsOuverts((prev) => { const s = new Set(prev); s.delete(r.id); return s; })}
                    className="w-full text-gray-400 text-sm py-1"
                  >
                    Annuler
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
