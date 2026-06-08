"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import { formaterPhoneGabon } from "@/lib/phone";
import type { Livraison, Commande } from "@/lib/supabase/database.types";

type LivraisonRiche = Livraison & {
  commande: Pick<Commande, "id" | "code_court" | "total" | "adresse"> | null;
};

type AdresseLiv = { nom_complet?: string; ville?: string; quartier?: string; details?: string; telephone?: string };

const STATUT_STYLE: Record<string, { label: string; bg: string; texte: string }> = {
  en_attente: { label: "En attente",  bg: "bg-yellow-50 border-yellow-200", texte: "text-yellow-700" },
  assignee:   { label: "Assignée",    bg: "bg-blue-50 border-blue-200",     texte: "text-blue-700"   },
  en_route:   { label: "En route 🏍️", bg: "bg-[#FEF2F2] border-[#E63946]/30", texte: "text-[#E63946]" },
  livree:     { label: "Livrée ✓",   bg: "bg-green-50 border-green-200",   texte: "text-green-600"  },
  echec:      { label: "Échec",       bg: "bg-red-50 border-red-200",       texte: "text-red-600"    },
};

function ModalCodeConfirmation({
  livraisonId,
  onSuccess,
  onClose,
}: {
  livraisonId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  const code = digits.join("");

  const handleDigit = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) {
      document.getElementById(`digit-${i + 1}`)?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      document.getElementById(`digit-${i - 1}`)?.focus();
    }
  };

  const handleSubmit = async () => {
    if (code.length !== 6) { setErreur("Saisissez les 6 chiffres"); return; }
    setLoading(true);
    setErreur("");
    try {
      const res = await fetch(`/api/livraisons/${livraisonId}/confirmer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { succes?: boolean; erreur?: string };
      if (data.erreur) { setErreur(data.erreur); return; }
      onSuccess();
    } catch {
      setErreur("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-[#E63946]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🔐</span>
          </div>
          <h3 className="text-lg font-black text-gray-800">Code de confirmation</h3>
          <p className="text-sm text-gray-500 mt-1">
            Demandez au client le code affiché sur son téléphone
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              id={`digit-${i}`}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-2xl font-black border-2 rounded-xl focus:border-[#E63946] focus:outline-none transition-colors"
            />
          ))}
        </div>

        {erreur && (
          <p className="text-sm text-red-600 font-medium text-center mb-3 bg-red-50 rounded-xl py-2 px-3">
            {erreur}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-50 active:scale-95 transition-all mb-3"
        >
          {loading ? "Vérification..." : "✅ Valider la livraison"}
        </button>
        <button
          onClick={onClose}
          className="w-full text-gray-500 font-medium py-2 text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export default function LivreurPage() {
  const router = useRouter();
  const [livraisons, setLivraisons] = useState<LivraisonRiche[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"actives" | "terminees">("actives");
  const [loading, setLoading] = useState<string | null>(null);
  const [modalLivraisonId, setModalLivraisonId] = useState<string | null>(null);
  const [nom, setNom] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login?redirect=/livreur"); return; }

      const { data: profil } = await supabase
        .from("utilisateurs").select("role, nom").eq("id", user.id).single();
      if (profil?.role !== "livreur" && profil?.role !== "admin") { router.push("/"); return; }
      setNom(profil?.nom ?? "Livreur");

      const { data: livs } = await supabase
        .from("livraisons")
        .select("*, remuneration_xaf, client_telephone, code_confirmation")
        .eq("livreur_id", user.id)
        .order("created_at", { ascending: false });

      const commandeIds = (livs ?? []).map((l) => l.commande_id);
      const { data: cmds } = commandeIds.length > 0
        ? await supabase.from("commandes").select("id, code_court, total, adresse").in("id", commandeIds)
        : { data: [] };

      const cmdMap = new Map((cmds ?? []).map((c) => [c.id, c]));
      setLivraisons((livs ?? []).map((l) => ({ ...l, commande: cmdMap.get(l.commande_id) ?? null })));
      setChargement(false);
    })();
  }, [router]);

  const actives   = livraisons.filter((l) => !["livree", "echec"].includes(l.statut));
  const terminees = livraisons.filter((l) =>  ["livree", "echec"].includes(l.statut));
  const liste     = onglet === "actives" ? actives : terminees;

  const totalGagne    = terminees.filter((l) => l.statut === "livree").reduce((s, l) => s + (l.remuneration_xaf ?? 0), 0);
  const gainsPendants = actives.reduce((s, l) => s + (l.remuneration_xaf ?? 0), 0);

  const demarrer = async (livraisonId: string) => {
    setLoading(livraisonId);
    try {
      const res = await fetch(`/api/livraisons/${livraisonId}/demarrer`, { method: "POST" });
      const data = await res.json() as { succes?: boolean; erreur?: string };
      if (data.erreur) { alert(data.erreur); return; }
      setLivraisons((prev) => prev.map((l) =>
        l.id === livraisonId ? { ...l, statut: "en_route" } : l
      ));
    } catch {
      alert("Erreur réseau. Réessayez.");
    } finally {
      setLoading(null);
    }
  };

  const onLivree = (livraisonId: string) => {
    setModalLivraisonId(null);
    setLivraisons((prev) => prev.map((l) =>
      l.id === livraisonId ? { ...l, statut: "livree" } : l
    ));
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {modalLivraisonId && (
        <ModalCodeConfirmation
          livraisonId={modalLivraisonId}
          onSuccess={() => onLivree(modalLivraisonId)}
          onClose={() => setModalLivraisonId(null)}
        />
      )}

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <p className="text-white/70 text-sm font-medium">Bonjour,</p>
        <h1 className="text-2xl font-black text-white">{nom} 🏍️</h1>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 rounded-2xl px-3 py-3 text-center">
            <p className="text-xl font-black text-white">{actives.length}</p>
            <p className="text-white/70 text-xs mt-0.5">En cours</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-3 text-center">
            <p className="text-xl font-black text-white">{terminees.filter((l) => l.statut === "livree").length}</p>
            <p className="text-white/70 text-xs mt-0.5">Livrées</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-3 text-center">
            <p className="text-lg font-black text-white">{formatXAF(totalGagne)}</p>
            <p className="text-white/70 text-xs mt-0.5">Gains</p>
          </div>
        </div>

        {gainsPendants > 0 && (
          <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-white/80 text-sm">À percevoir</span>
            <span className="text-white font-black text-sm">{formatXAF(gainsPendants)}</span>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 sticky top-0 z-10">
        {(["actives", "terminees"] as const).map((o) => (
          <button key={o} onClick={() => setOnglet(o)}
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${
              onglet === o ? "text-[#E63946] border-b-2 border-[#E63946]" : "text-gray-400"
            }`}>
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
          const s = STATUT_STYLE[l.statut] ?? STATUT_STYLE.en_attente;
          const adresse = l.commande?.adresse as AdresseLiv | null;
          const telephone = l.client_telephone ?? adresse?.telephone;
          const estActive = !["livree", "echec"].includes(l.statut);
          const remun = l.remuneration_xaf ?? 0;

          return (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-black text-base text-gray-800">{l.commande?.code_court ?? "—"}</span>
                    {remun > 0 && (
                      <span className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        +{formatXAF(remun)}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${s.bg} ${s.texte}`}>
                    {s.label}
                  </span>
                </div>

                {adresse && (
                  <div className="space-y-0.5 mb-2">
                    <p className="text-sm font-semibold text-gray-700">{adresse.nom_complet}</p>
                    <p className="text-sm text-gray-500">
                      📍 {adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}
                    </p>
                    {adresse.details && (
                      <p className="text-xs text-gray-400 italic">{adresse.details}</p>
                    )}
                  </div>
                )}

                {l.commande?.total && (
                  <p className="text-sm font-black text-[#E63946]">{formatXAF(l.commande.total)}</p>
                )}
              </div>

              {/* Actions */}
              {estActive && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-3">
                  <div className="flex gap-2">
                    {l.statut === "assignee" && (
                      <button
                        onClick={() => demarrer(l.id)}
                        disabled={loading === l.id}
                        className="flex-1 bg-[#E63946] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {loading === l.id ? "..." : "🏍️ Partir en livraison"}
                      </button>
                    )}

                    {l.statut === "en_route" && (
                      <button
                        onClick={() => setModalLivraisonId(l.id)}
                        className="flex-1 bg-[#E63946] text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-all"
                      >
                        🔐 Saisir le code client
                      </button>
                    )}

                    {telephone && (
                      <a
                        href={`tel:${telephone}`}
                        className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center text-lg active:scale-95 transition-all flex-shrink-0"
                        title="Appeler le client"
                      >
                        📞
                      </a>
                    )}

                    {l.commande?.id && (
                      <Link
                        href={`/messages/${l.commande.id}`}
                        className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center text-lg active:scale-95 transition-all flex-shrink-0"
                        title="Messagerie"
                      >
                        💬
                      </Link>
                    )}
                  </div>

                  {l.statut === "en_route" && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Demandez au client le code affiché sur son écran
                    </p>
                  )}
                </div>
              )}

              {l.statut === "livree" && remun > 0 && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                  <p className="text-xs text-green-600 font-semibold text-center">
                    ✅ Livraison validée — Gain : {formatXAF(remun)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
