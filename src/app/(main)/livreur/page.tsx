"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import type { Livraison, Commande } from "@/lib/supabase/database.types";

type LivraisonAvecCommande = Livraison & {
  commande: Pick<Commande, "id" | "code_court" | "total" | "adresse"> | null;
};

const STATUT_STYLE: Record<Livraison["statut"], { label: string; bg: string; texte: string }> = {
  en_attente:  { label: "En attente",   bg: "bg-yellow-50  border-yellow-200", texte: "text-yellow-700" },
  assignee:    { label: "Assignée",     bg: "bg-blue-50    border-blue-200",   texte: "text-blue-700"   },
  en_route:    { label: "En route",     bg: "bg-[#FEF2F2]  border-[#E63946]/30", texte: "text-[#E63946]" },
  livree:      { label: "Livrée ✓",    bg: "bg-gray-50    border-gray-200",   texte: "text-gray-500"   },
  echec:       { label: "Échec",        bg: "bg-red-50     border-red-200",    texte: "text-red-600"    },
};

export default function LivreurPage() {
  const router = useRouter();
  const [livraisons, setLivraisons] = useState<LivraisonAvecCommande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"actives" | "terminees">("actives");
  const [maj, setMaj] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login?redirect=/livreur"); return; }

      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "livreur" && profil?.role !== "admin") {
        router.push("/");
        return;
      }

      const { data: livs } = await supabase
        .from("livraisons")
        .select("*")
        .eq("livreur_id", user.id)
        .order("created_at", { ascending: false });

      const commandeIds = (livs ?? []).map((l) => l.commande_id);
      const { data: cmds } = commandeIds.length > 0
        ? await supabase
            .from("commandes")
            .select("id, code_court, total, adresse")
            .in("id", commandeIds)
        : { data: [] };

      const cmdMap = new Map((cmds ?? []).map((c) => [c.id, c]));
      const enrichies: LivraisonAvecCommande[] = (livs ?? []).map((l) => ({
        ...l,
        commande: cmdMap.get(l.commande_id) ?? null,
      }));
      setLivraisons(enrichies);
      setChargement(false);
    })();
  }, [router]);

  const changerStatut = async (livraisonId: string, statut: Livraison["statut"]) => {
    const supabase = createClient();
    setMaj(livraisonId);
    const { error } = await supabase
      .from("livraisons")
      .update({
        statut,
        ...(statut === "en_route"  ? { assignee_at: new Date().toISOString() } : {}),
        ...(statut === "livree"    ? { livree_at: new Date().toISOString() } : {}),
      })
      .eq("id", livraisonId);
    setMaj(null);

    if (!error) {
      setLivraisons((prev) =>
        prev.map((l) => l.id === livraisonId ? { ...l, statut } : l)
      );
    }
  };

  const actives   = livraisons.filter((l) => !["livree", "echec"].includes(l.statut));
  const terminees = livraisons.filter((l) =>  ["livree", "echec"].includes(l.statut));
  const liste = onglet === "actives" ? actives : terminees;

  type AdresseLiv = { nom_complet?: string; ville?: string; quartier?: string; details?: string };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <p className="text-white/70 text-sm font-medium">Tableau de bord</p>
        <h1 className="text-2xl font-black text-white">Mes livraisons 🏍️</h1>

        {/* Stats rapides */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/15 rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-white">{actives.length}</p>
            <p className="text-white/70 text-xs mt-0.5">En cours</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-white">
              {livraisons.filter((l) => l.statut === "livree").length}
            </p>
            <p className="text-white/70 text-xs mt-0.5">Livrées</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-black text-white">{livraisons.length}</p>
            <p className="text-white/70 text-xs mt-0.5">Total</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 sticky top-0 z-10">
        {(["actives", "terminees"] as const).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${
              onglet === o
                ? "text-[#E63946] border-b-2 border-[#E63946]"
                : "text-gray-400"
            }`}
          >
            {o === "actives" ? `En cours (${actives.length})` : `Terminées (${terminees.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-10 bg-gray-200 rounded-xl" />
          </div>
        ))}

        {!chargement && liste.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">{onglet === "actives" ? "🏍️" : "✅"}</div>
            <p className="font-bold text-gray-700">
              {onglet === "actives" ? "Aucune livraison en cours" : "Aucune livraison terminée"}
            </p>
          </div>
        )}

        {!chargement && liste.map((l) => {
          const s = STATUT_STYLE[l.statut];
          const adresse = l.commande?.adresse as AdresseLiv | null;

          return (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Top */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-base text-gray-800">
                    {l.commande?.code_court ?? "—"}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${s.bg} ${s.texte}`}>
                    {s.label}
                  </span>
                </div>
                {adresse && (
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p className="font-semibold">{adresse.nom_complet}</p>
                    <p className="text-gray-500">
                      📍 {adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}
                    </p>
                    {adresse.details && (
                      <p className="text-xs text-gray-400 italic">{adresse.details}</p>
                    )}
                  </div>
                )}
                {l.commande?.total && (
                  <p className="text-sm font-black text-[#E63946] mt-1">
                    {formatXAF(l.commande.total)}
                  </p>
                )}
              </div>

              {/* Actions — 2 max : action principale + chat */}
              {!["livree", "echec"].includes(l.statut) && (
                <div className="px-4 py-3 flex gap-2">
                  {l.statut === "assignee" && (
                    <button
                      onClick={() => changerStatut(l.id, "en_route")}
                      disabled={maj === l.id}
                      className="flex-1 bg-[#E63946] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {maj === l.id ? "..." : "🏍️ Partir en livraison"}
                    </button>
                  )}
                  {l.statut === "en_route" && (
                    <button
                      onClick={() => changerStatut(l.id, "livree")}
                      disabled={maj === l.id}
                      className="flex-1 bg-[#E63946] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {maj === l.id ? "..." : "✅ Marquer livrée"}
                    </button>
                  )}
                  {l.commande?.id && (
                    <Link
                      href={`/messages/${l.commande.id}`}
                      className="w-12 h-12 border-2 border-gray-200 text-gray-600 font-bold rounded-xl text-lg flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
                    >
                      💬
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
