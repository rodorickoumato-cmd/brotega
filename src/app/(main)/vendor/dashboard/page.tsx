"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import { compresserImage, formatTaille } from "@/lib/imageCompressor";
import { getMesProduits } from "@/app/actions/produits";
import { categories } from "@/data/categories";
import type { Produit, Vendeur, Commande } from "@/lib/supabase/database.types";
import { PLANS, MAX_PRODUITS_GRATUIT, FRAIS_MOBILE_MONEY_TAUX } from "@/lib/rules";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { formaterPhoneGabon } from "@/lib/phone";
import type { ItemPanier, AdresseLivraison } from "@/app/actions/commandes";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashTab = "produits" | "commandes" | "gestion";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; url: string }
  | { status: "error"; message: string };

const UNITES = [
  { val: "piece",  label: "Pièce",    hint: "à l'unité"    },
  { val: "kg",     label: "Kg",       hint: "au kilogramme" },
  { val: "g",      label: "Gramme",   hint: "au gramme"    },
  { val: "litre",  label: "Litre",    hint: "au litre"     },
  { val: "cl",     label: "Cl",       hint: "au centilitre" },
  { val: "lot",    label: "Lot",      hint: "au lot"       },
  { val: "paquet", label: "Paquet",   hint: "au paquet"    },
  { val: "sac",    label: "Sac",      hint: "au sac"       },
  { val: "boite",  label: "Boîte",    hint: "à la boîte"   },
] as const;

type FormData = { nom: string; description: string; prix: string; unite: string; stock: string; categorie: string; imagePreview: string; imageUrl: string };
const emptyForm: FormData = { nom: "", description: "", prix: "", unite: "piece", stock: "", categorie: "", imagePreview: "", imageUrl: "" };

const STATUT_COMMANDE: Record<string, { label: string; cls: string }> = {
  en_attente_paiement: { label: "En attente",   cls: "bg-yellow-100 text-yellow-700" },
  payee_escrow:        { label: "Payée",         cls: "bg-blue-100 text-blue-700"    },
  confirmee_vendeur:   { label: "Confirmée",     cls: "bg-blue-100 text-blue-700"    },
  en_livraison:        { label: "En livraison",  cls: "bg-orange-100 text-orange-700"},
  livree:              { label: "Livrée ✓",     cls: "bg-green-100 text-green-700"  },
  annulee:             { label: "Annulée",       cls: "bg-red-100 text-red-700"      },
  remboursee:          { label: "Remboursée",    cls: "bg-gray-100 text-gray-600"    },
  litige:              { label: "Litige ⚠️",     cls: "bg-red-100 text-red-700"      },
};

// ─── Helpers stats ────────────────────────────────────────────────────────────

type CmdStat = { total: number; statut: string; articles: unknown; created_at: string };

function grouper7jours(cmds: CmdStat[]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const debut = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const fin   = new Date(debut.getTime() + 86_399_999);
    const slice = cmds.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= debut.getTime() && t <= fin.getTime() && !["annulee", "remboursee"].includes(c.statut);
    });
    return {
      label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }),
      count: slice.length,
      ca:    slice.reduce((s, c) => s + c.total, 0),
    };
  });
}

function topProduits(cmds: CmdStat[]) {
  const compteur: Record<string, { nom: string; count: number; ca: number; image?: string }> = {};
  cmds.forEach((c) => {
    (c.articles as ItemPanier[]).forEach((it) => {
      if (!compteur[it.produit_id]) compteur[it.produit_id] = { nom: it.nom, count: 0, ca: 0, image: it.image ?? undefined };
      compteur[it.produit_id].count += it.quantite;
      compteur[it.produit_id].ca    += it.prix_xaf * it.quantite;
    });
  });
  return Object.values(compteur).sort((a, b) => b.count - a.count).slice(0, 3);
}

// ─── Composant : section collapsible ─────────────────────────────────────────

function Section({ titre, icon, children, defaut = true }: {
  titre: string; icon: string; children: React.ReactNode; defaut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(defaut);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setOuvert((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="font-black text-gray-800 text-sm">{titre}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${ouvert ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {ouvert && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─── Section Statistiques ─────────────────────────────────────────────────────

function SectionStats({ cmds, chargement }: { cmds: CmdStat[]; chargement: boolean }) {
  const actives = cmds.filter((c) => !["annulee", "remboursee"].includes(c.statut));

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMoisPrecedent   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const caMois     = actives.filter((c) => new Date(c.created_at) >= debutMois).reduce((s, c) => s + c.total, 0);
  const caM1       = actives.filter((c) => { const d = new Date(c.created_at); return d >= debutMoisPrecedent && d <= finMoisPrecedent; }).reduce((s, c) => s + c.total, 0);
  const caTotal    = actives.reduce((s, c) => s + c.total, 0);
  const nbLivrees  = cmds.filter((c) => c.statut === "livree").length;
  const nbTotal    = cmds.length;
  const tauxLiv    = nbTotal > 0 ? Math.round((nbLivrees / nbTotal) * 100) : 0;
  const ticketMoy  = actives.length > 0 ? Math.round(caTotal / actives.length) : 0;
  const evolution  = caM1 > 0 ? Math.round(((caMois - caM1) / caM1) * 100) : null;

  const jours = grouper7jours(cmds);
  const maxCA = Math.max(...jours.map((j) => j.ca), 1);

  const statutsDist = [
    { label: "Livrées",    count: cmds.filter((c) => c.statut === "livree").length,              cls: "bg-green-500" },
    { label: "En cours",   count: cmds.filter((c) => ["payee_escrow", "confirmee_vendeur", "en_livraison"].includes(c.statut)).length, cls: "bg-blue-500" },
    { label: "Litiges",    count: cmds.filter((c) => c.statut === "litige").length,              cls: "bg-orange-500" },
    { label: "Annulées",   count: cmds.filter((c) => ["annulee", "remboursee"].includes(c.statut)).length, cls: "bg-gray-400" },
  ].filter((s) => s.count > 0);

  const tops = topProduits(cmds);

  if (chargement) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (cmds.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="font-bold text-gray-600 text-sm">Pas encore de données</p>
        <p className="text-xs text-gray-400 mt-1">Les statistiques apparaîtront dès vos premières ventes</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#FEF2F2] rounded-2xl p-3.5">
          <p className="text-[11px] font-bold text-[#E63946] uppercase tracking-wide">Ce mois</p>
          <p className="text-xl font-black text-gray-800 mt-1 leading-none">{formatXAF(caMois)}</p>
          {evolution !== null && (
            <p className={`text-xs font-bold mt-1 ${evolution >= 0 ? "text-green-600" : "text-red-500"}`}>
              {evolution >= 0 ? "+" : ""}{evolution}% vs mois préc.
            </p>
          )}
        </div>
        <div className="bg-gray-50 rounded-2xl p-3.5">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-xl font-black text-gray-800 mt-1 leading-none">{formatXAF(caTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{actives.length} commandes</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3.5">
          <p className="text-[11px] font-bold text-green-600 uppercase tracking-wide">Taux livraison</p>
          <p className="text-2xl font-black text-green-700 mt-1 leading-none">{tauxLiv}%</p>
          <p className="text-xs text-green-600 mt-1">{nbLivrees} / {nbTotal}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-3.5">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wide">Ticket moyen</p>
          <p className="text-lg font-black text-purple-700 mt-1 leading-none">{formatXAF(ticketMoy)}</p>
          <p className="text-xs text-purple-400 mt-1">par commande</p>
        </div>
      </div>

      {/* Graphe 7 jours */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Chiffre d&apos;affaires — 7 derniers jours</p>
        <div className="space-y-1.5">
          {jours.map((j) => (
            <div key={j.label} className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 w-14 shrink-0">{j.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#E63946] to-[#ff6b75] rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${Math.max((j.ca / maxCA) * 100, j.ca > 0 ? 8 : 0)}%` }}
                >
                  {j.ca > 0 && j.ca / maxCA > 0.25 && (
                    <span className="text-white text-[9px] font-black whitespace-nowrap">{j.count}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-gray-500 w-20 text-right shrink-0">
                {j.ca > 0 ? formatXAF(j.ca) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution statuts */}
      {statutsDist.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5">Répartition des commandes</p>
          <div className="flex gap-2 flex-wrap">
            {statutsDist.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.cls}`} />
                <span className="text-xs font-bold text-gray-600">{s.label}</span>
                <span className="text-xs font-black text-gray-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top produits */}
      {tops.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5">Top produits vendus</p>
          <div className="space-y-2">
            {tops.map((p, i) => (
              <div key={p.nom} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-white" : "bg-amber-600 text-white"
                }`}>{i + 1}</div>
                {p.image && (
                  <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{p.nom}</p>
                  <p className="text-xs text-gray-400">Vendu {p.count}× · {formatXAF(p.ca)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Promotions ───────────────────────────────────────────────────────

function SectionPromos({
  produits,
  cmds,
  onUpdate,
}: {
  produits: Produit[];
  cmds: CmdStat[];
  onUpdate: (id: string, actif: boolean, prix: number | null, fin: string | null) => Promise<void>;
}) {
  const [edits, setEdits] = useState<Record<string, { actif: boolean; prix: string; fin: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const getEdit = (p: Produit) => edits[p.id] ?? {
    actif: p.promo_actif,
    prix: p.prix_promo?.toString() ?? "",
    fin: p.promo_fin ? p.promo_fin.slice(0, 10) : "",
  };

  const setEdit = (id: string, field: "actif" | "prix" | "fin", val: string | boolean) =>
    setEdits((prev) => ({ ...prev, [id]: { ...getEdit(produits.find((x) => x.id === id)!), [field]: val } }));

  const handleSave = async (p: Produit) => {
    const e = getEdit(p);
    const prix = e.prix ? parseInt(e.prix) : null;
    setSaving((prev) => ({ ...prev, [p.id]: true }));
    await onUpdate(p.id, e.actif, prix, e.fin ? new Date(e.fin).toISOString() : null);
    setSaving((prev) => ({ ...prev, [p.id]: false }));
    setEdits((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
  };

  // Suggestions intelligentes : produits actifs non commandés depuis 14 jours
  const commandesProduitIds = new Set(
    cmds.flatMap((c) => (c.articles as ItemPanier[]).map((it) => it.produit_id))
  );
  const since14j = new Date(); since14j.setDate(since14j.getDate() - 14);
  const suggestions = produits.filter((p) =>
    p.statut === "actif" && !p.promo_actif && !commandesProduitIds.has(p.id) &&
    new Date(p.created_at) < since14j
  );

  const actifs = produits.filter((p) => p.statut === "actif");

  return (
    <div className="p-4 space-y-4">
      {/* Suggestion intelligente */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-xl mt-0.5">💡</span>
            <div>
              <p className="font-black text-amber-800 text-sm">
                {suggestions.length === 1
                  ? `"${suggestions[0].nom}" n'a pas été vendu depuis plus de 14 jours`
                  : `${suggestions.length} produits sans vente depuis 14+ jours`}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Une promotion peut relancer les ventes. Proposez -10% à -30%.
              </p>
            </div>
          </div>
        </div>
      )}

      {actifs.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">Aucun produit actif.</p>
      )}

      {actifs.map((p) => {
        const e = getEdit(p);
        const modifie = edits[p.id] !== undefined;
        const reduction = e.actif && e.prix ? Math.round(((p.prix - parseInt(e.prix)) / p.prix) * 100) : null;
        const isSugg = suggestions.some((s) => s.id === p.id);

        return (
          <div key={p.id} className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${
            e.actif ? "border-[#E63946] bg-[#FEF2F2]" : isSugg ? "border-amber-200 bg-amber-50/50" : "border-gray-100"
          }`}>
            {/* Header produit */}
            <div className="flex items-center gap-3">
              {p.image && (
                <img src={p.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-800 truncate">{p.nom}</p>
                <p className="text-xs text-gray-500">
                  Prix normal : <span className="font-bold">{formatXAF(p.prix)}</span>
                  {reduction !== null && reduction > 0 && (
                    <span className="ml-2 text-[#E63946] font-black">−{reduction}%</span>
                  )}
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setEdit(p.id, "actif", !e.actif)}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${e.actif ? "bg-[#E63946]" : "bg-gray-200"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${e.actif ? "left-6" : "left-0.5"}`} />
              </button>
            </div>

            {/* Champs promo actifs */}
            {e.actif && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">Prix promo (FCFA)</label>
                    <input
                      type="number"
                      value={e.prix}
                      onChange={(ev) => setEdit(p.id, "prix", ev.target.value)}
                      placeholder={`Ex: ${Math.round(p.prix * 0.8)}`}
                      min={1}
                      max={p.prix - 1}
                      className="w-full border-2 border-[#E63946]/40 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-[#E63946] bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">Fin de promo</label>
                    <input
                      type="date"
                      value={e.fin}
                      onChange={(ev) => setEdit(p.id, "fin", ev.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full border-2 border-[#E63946]/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E63946] bg-white"
                    />
                  </div>
                </div>
                {e.prix && parseInt(e.prix) >= p.prix && (
                  <p className="text-xs text-red-500 font-medium">Le prix promo doit être inférieur au prix normal.</p>
                )}
              </div>
            )}

            {/* Bouton sauvegarder */}
            {(modifie || (e.actif !== p.promo_actif)) && (
              <button
                onClick={() => handleSave(p)}
                disabled={saving[p.id] || (e.actif && (!e.prix || parseInt(e.prix) >= p.prix))}
                className="w-full bg-[#E63946] text-white font-black py-2.5 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {saving[p.id] ? "Enregistrement…" : e.actif ? "Activer la promotion" : "Désactiver la promotion"}
              </button>
            )}

            {/* Promo active - infos */}
            {p.promo_actif && !edits[p.id] && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#E63946]">
                  En promo : {p.prix_promo ? formatXAF(p.prix_promo) : "—"}
                </span>
                {p.promo_fin && (
                  <span className="text-gray-400">
                    Jusqu&apos;au {new Date(p.promo_fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Stock avancé ─────────────────────────────────────────────────────

function SectionStock({ produits, onStockChange }: {
  produits: Produit[];
  onStockChange: (id: string, stock: number | null) => Promise<void>;
}) {
  const [vals,   setVals]   = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [filtre, setFiltre] = useState<"tous" | "rupture" | "faible">("tous");

  const ruptures = produits.filter((p) => p.statut === "actif" && p.stock !== null && p.stock <= 0);
  const faibles  = produits.filter((p) => p.statut === "actif" && p.stock !== null && p.stock > 0 && p.stock <= 5);
  const actifs   = produits.filter((p) => p.statut === "actif");

  const liste = filtre === "rupture" ? ruptures : filtre === "faible" ? faibles : actifs;

  const handleSave = async (p: Produit) => {
    const val = vals[p.id];
    const stock = val === "" || val === undefined ? null : parseInt(val);
    setSaving((prev) => ({ ...prev, [p.id]: true }));
    await onStockChange(p.id, stock);
    setSaving((prev) => ({ ...prev, [p.id]: false }));
    setVals((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
  };

  const getVal = (p: Produit) => vals[p.id] !== undefined ? vals[p.id] : (p.stock?.toString() ?? "");

  const stockColor = (p: Produit) => {
    if (p.stock === null) return "text-gray-400";
    if (p.stock <= 0) return "text-red-600";
    if (p.stock <= 5) return "text-orange-500";
    return "text-green-600";
  };

  const stockBg = (p: Produit) => {
    if (p.stock === null) return "bg-gray-100";
    if (p.stock <= 0) return "bg-red-100";
    if (p.stock <= 5) return "bg-orange-100";
    return "bg-green-100";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setFiltre("tous")}
          className={`rounded-xl p-3 text-center border-2 transition-all ${filtre === "tous" ? "border-[#E63946] bg-[#FEF2F2]" : "border-gray-100 bg-gray-50"}`}>
          <p className="text-xl font-black text-gray-800">{actifs.length}</p>
          <p className="text-[10px] font-bold text-gray-500 mt-0.5">Produits</p>
        </button>
        <button onClick={() => setFiltre("rupture")}
          className={`rounded-xl p-3 text-center border-2 transition-all ${filtre === "rupture" ? "border-red-500 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
          <p className={`text-xl font-black ${ruptures.length > 0 ? "text-red-600" : "text-gray-400"}`}>{ruptures.length}</p>
          <p className="text-[10px] font-bold text-red-400 mt-0.5">Ruptures</p>
        </button>
        <button onClick={() => setFiltre("faible")}
          className={`rounded-xl p-3 text-center border-2 transition-all ${filtre === "faible" ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-gray-50"}`}>
          <p className={`text-xl font-black ${faibles.length > 0 ? "text-orange-500" : "text-gray-400"}`}>{faibles.length}</p>
          <p className="text-[10px] font-bold text-orange-400 mt-0.5">Faibles</p>
        </button>
      </div>

      {liste.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-3">
          {filtre === "rupture" ? "Aucune rupture de stock ✅" :
           filtre === "faible"  ? "Aucun stock faible ✅" :
           "Aucun produit actif."}
        </p>
      )}

      {/* Liste avec éditeur inline */}
      <div className="space-y-2">
        {liste.map((p) => {
          const val = getVal(p);
          const changed = vals[p.id] !== undefined;

          return (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl p-3 ${stockBg(p)}`}>
              {p.image && (
                <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{p.nom}</p>
                <p className={`text-xs font-black ${stockColor(p)}`}>
                  {p.stock === null ? "Illimité" : p.stock <= 0 ? "Rupture" : p.stock <= 5 ? `⚠️ ${p.stock} restant${p.stock > 1 ? "s" : ""}` : `${p.stock} en stock`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setVals((v) => ({ ...v, [p.id]: String(Math.max(0, parseInt(getVal(p) || "0") - 1)) }))}
                  className="w-8 h-8 bg-white rounded-lg font-black text-gray-600 text-lg flex items-center justify-center active:scale-95 shadow-sm"
                >−</button>
                <input
                  type="number"
                  value={val}
                  min={0}
                  onChange={(e) => setVals((v) => ({ ...v, [p.id]: e.target.value }))}
                  placeholder="∞"
                  className="w-14 bg-white rounded-lg text-center text-sm font-black py-1.5 border border-gray-200 focus:outline-none focus:border-[#E63946]"
                />
                <button
                  onClick={() => setVals((v) => ({ ...v, [p.id]: String(parseInt(getVal(p) || "0") + 1) }))}
                  className="w-8 h-8 bg-white rounded-lg font-black text-gray-600 text-lg flex items-center justify-center active:scale-95 shadow-sm"
                >+</button>
                {changed && (
                  <button
                    onClick={() => handleSave(p)}
                    disabled={saving[p.id]}
                    className="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center active:scale-95 disabled:opacity-40 shadow-sm"
                  >
                    {saving[p.id] ? (
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modals existantes (inchangées) ──────────────────────────────────────────

function ProductFormModal({
  produit, nomBoutique, onSave, onClose,
}: {
  produit: Produit | null;
  nomBoutique: string;
  onSave: (nom: string, description: string | null, prix: number, unite: string, stock: number | null, categorie: string | null, image: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormData>(() =>
    produit
      ? { nom: produit.nom, description: produit.description ?? "", prix: produit.prix.toString(), unite: produit.unite ?? "piece", stock: produit.stock?.toString() ?? "", categorie: produit.categorie ?? "", imagePreview: produit.image ?? "", imageUrl: produit.image ?? "" }
      : emptyForm
  );
  const [errors, setErrors] = useState<{ nom?: string; prix?: string; image?: string; server?: string }>({});
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [infoCompression, setInfoCompression] = useState<{ avant: number; apres: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field === "nom" ? "nom" : field === "prix" ? "prix" : "image"]: undefined }));
  };

  const uploadVersCloudinaire = async (fichier: File): Promise<string> => {
    setUpload({ status: "uploading", progress: 0 });
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const data = new globalThis.FormData();
      data.append("file", fichier);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setUpload({ status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          if (res.url) { setUpload({ status: "done", url: res.url }); resolve(res.url); }
          else { const m = res.error ?? "Erreur inconnue"; setUpload({ status: "error", message: m }); reject(new Error(m)); }
        } else {
          const m = "Problème de connexion. Vérifiez votre réseau.";
          setUpload({ status: "error", message: m }); reject(new Error(m));
        }
      });
      xhr.addEventListener("error", () => { const m = "Pas de connexion internet."; setUpload({ status: "error", message: m }); reject(new Error(m)); });
      xhr.open("POST", "/api/upload");
      xhr.send(data);
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) { setErrors((p) => ({ ...p, image: "Ce fichier n'est pas une image." })); return; }
    setErrors((p) => ({ ...p, image: undefined }));
    setCropSrc(URL.createObjectURL(fichier));
  };

  const handleCropConfirm = async (fichierRogne: File) => {
    URL.revokeObjectURL(cropSrc ?? "");
    setCropSrc(null);
    setInfoCompression(null);
    setUpload({ status: "uploading", progress: 0 });
    try {
      const res = await compresserImage(fichierRogne, 1200, 0.88);
      setInfoCompression({ avant: res.tailleAvant, apres: res.tailleApres });
      setForm((p) => ({ ...p, imagePreview: res.preview, imageUrl: "" }));
      const url = await uploadVersCloudinaire(res.fichier);
      setForm((p) => ({ ...p, imagePreview: url, imageUrl: url }));
    } catch (err) { setErrors((p) => ({ ...p, image: err instanceof Error ? err.message : "Échec upload." })); }
  };

  const handleCropAnnuler = () => { URL.revokeObjectURL(cropSrc ?? ""); setCropSrc(null); };

  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (!form.nom.trim() || form.nom.trim().length < 2) errs.nom = "Nom requis (min. 2 caractères).";
    if (!form.prix || Number(form.prix) <= 0) errs.prix = "Prix doit être supérieur à 0.";
    if (!form.imagePreview) errs.image = "Ajoutez une photo du produit.";
    if (upload.status === "uploading") errs.image = "Attendez la fin de l'envoi...";
    if (upload.status === "error") errs.image = "La photo n'a pas pu être envoyée. Appuyez sur Réessayer.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) { bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSubmitting(true);
    try {
      const erreur = await onSave(form.nom.trim(), form.description.trim() || null, Number(form.prix), form.unite || "piece", form.stock ? Number(form.stock) : null, form.categorie || null, form.imageUrl || null);
      if (erreur) { setErrors((p) => ({ ...p, server: erreur })); bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors((p) => ({ ...p, server: msg || "Erreur inattendue. Réessayez." }));
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {cropSrc && <ImageCropModal src={cropSrc} onConfirm={handleCropConfirm} onAnnuler={handleCropAnnuler} />}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="font-black text-lg text-gray-800">{produit ? "Modifier le produit" : "Ajouter un produit"}</h2>
              <p className="text-xs text-gray-400">{nomBoutique}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
          </div>
          <div ref={bodyRef} className="overflow-y-auto flex-1 p-5 space-y-5">
            {(errors.nom || errors.prix || errors.image || errors.server) && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium space-y-1">
                <p className="font-black text-red-800 mb-1">Corrigez les erreurs suivantes :</p>
                {errors.image  && <p>📷 {errors.image}</p>}
                {errors.nom    && <p>✏️ {errors.nom}</p>}
                {errors.prix   && <p>💰 {errors.prix}</p>}
                {errors.server && <p>❌ {errors.server}</p>}
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Photo du produit <span className="text-red-400">*</span></label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
              {!form.imagePreview && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={upload.status === "uploading"}
                  className="w-full py-6 bg-[#E63946] text-white rounded-2xl font-bold flex flex-col items-center gap-2 disabled:opacity-60 active:scale-95 transition-all">
                  <span className="text-3xl">📷</span><span>Choisir une photo</span>
                  <span className="text-white/70 text-xs font-normal">Depuis votre téléphone ou galerie</span>
                </button>
              )}
              {form.imagePreview && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#E63946]">
                  <img src={form.imagePreview} alt="Aperçu" className="w-full h-44 object-cover" />
                  {upload.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 p-4">
                      <p className="text-white font-bold text-sm">Envoi en cours...</p>
                      <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                        <div className="bg-[#E63946] h-full rounded-full transition-all" style={{ width: `${Math.max((upload as { status: "uploading"; progress: number }).progress, 5)}%` }} />
                      </div>
                    </div>
                  )}
                  {upload.status === "done" && <div className="absolute top-2 right-2 bg-[#E63946] text-white text-xs font-bold px-3 py-1 rounded-full">✓ Enregistrée</div>}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={upload.status === "uploading"}
                    className="absolute bottom-2 right-2 bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow disabled:opacity-50">Changer</button>
                </div>
              )}
              {upload.status === "done" && infoCompression && (
                <p className="text-xs text-[#E63946] mt-2 bg-[#FEF2F2] rounded-xl px-3 py-2">⚡ Compressée : {formatTaille(infoCompression.avant)} → {formatTaille(infoCompression.apres)}</p>
              )}
              {upload.status === "error" && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-red-700 mb-1">❌ {(upload as { status: "error"; message: string }).message}</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-xs bg-red-500 text-white font-bold px-4 py-2 rounded-lg">Réessayer</button>
                </div>
              )}
              {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Nom du produit <span className="text-red-400">*</span></label>
              <input type="text" value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex : Manioc frais 2 kg, Pagne wax..." maxLength={100}
                className={`w-full border-2 rounded-2xl px-4 py-4 text-base focus:outline-none transition-colors ${errors.nom ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#E63946]"}`} />
              {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Description <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Décrivez votre produit : taille, matière, couleur..." maxLength={500} rows={3}
                className="w-full border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-4 py-3 text-base focus:outline-none transition-colors resize-none" />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/500</p>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Catégorie <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
              <select value={form.categorie} onChange={(e) => set("categorie", e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-4 py-4 text-base focus:outline-none transition-colors bg-white appearance-none">
                <option value="">— Choisir une catégorie —</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Prix de vente <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" min={0} value={form.prix} onChange={(e) => set("prix", e.target.value)} placeholder="0"
                    className={`w-full border-2 rounded-2xl px-4 py-4 pr-16 text-base focus:outline-none transition-colors ${errors.prix ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#E63946]"}`} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">FCFA</span>
                </div>
                <select value={form.unite} onChange={(e) => set("unite", e.target.value)}
                  className="w-28 border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-3 py-4 text-sm font-bold text-gray-700 focus:outline-none bg-white appearance-none text-center">
                  {UNITES.map((u) => <option key={u.val} value={u.val}>{u.label}</option>)}
                </select>
              </div>
              {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
              {form.prix && Number(form.prix) > 0 && (
                <p className="text-sm font-black text-[#E63946] mt-2">{formatXAF(Number(form.prix))} / {UNITES.find(u => u.val === form.unite)?.hint ?? form.unite}</p>
              )}
              <div className="mt-3 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="text-xs font-black text-blue-800">Frais Mobile Money</p>
                  <p className="text-xs text-blue-700 mt-0.5">Pour les paiements Airtel Money, {(FRAIS_MOBILE_MONEY_TAUX * 100).toFixed(0)}% de frais sont ajoutés. Vous recevez votre prix intégral.</p>
                  {form.prix && Number(form.prix) > 0 && (
                    <p className="text-xs font-bold text-blue-800 mt-1.5">Client Airtel paiera : {formatXAF(Math.ceil(Number(form.prix) * (1 + FRAIS_MOBILE_MONEY_TAUX)))}</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Stock disponible <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
              <div className="flex gap-3 items-center">
                <input type="number" min={0} value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="Illimité"
                  className="w-36 border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-4 py-3.5 text-base focus:outline-none transition-colors" />
                <p className="text-xs text-gray-400 flex-1">
                  {form.stock ? Number(form.stock) <= 5 ? `⚠️ Faible stock — les acheteurs verront "Plus que ${form.stock} disponible"` : `${form.stock} ${UNITES.find(u => u.val === form.unite)?.label ?? ""} en stock` : "Laissez vide pour un stock illimité"}
                </p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl space-y-3">
            {upload.status === "uploading" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 font-bold text-center animate-pulse">⏳ Photo en cours d&apos;envoi — attendez avant de valider</div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 active:scale-95 transition-all">Annuler</button>
              <button onClick={handleSubmit} disabled={submitting || upload.status === "uploading"}
                className="flex-[2] py-3.5 bg-[#E63946] text-white rounded-2xl text-sm font-black disabled:opacity-50 active:scale-95 transition-all">
                {submitting ? "⏳ Enregistrement..." : upload.status === "uploading" ? `⏳ Photo en cours... ${(upload as { status: "uploading"; progress: number }).progress ?? 0}%` : produit ? "Enregistrer ✓" : "Ajouter le produit →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const plans = [
    { id: "mensuel",     label: "Business Mensuel",     prix: 2_000,  duree: "30 jours",  populaire: false },
    { id: "trimestriel", label: "Business Trimestriel", prix: 5_000,  duree: "3 mois",    populaire: true  },
    { id: "semestriel",  label: "Business Semestriel",  prix: 8_000,  duree: "6 mois",    populaire: false },
    { id: "annuel",      label: "Business Annuel",      prix: 15_000, duree: "1 an",       populaire: false },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-[#E63946] to-[#c1121f] px-6 py-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-white font-black text-xl leading-tight">Limite atteinte</h2>
              <p className="text-white/80 text-sm mt-1">Votre plan Découverte est limité à 3 produits.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-white text-sm font-medium">Avec un abonnement Business : <span className="font-black">produits illimités</span></p>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Choisissez votre plan</p>
          {plans.map((p) => (
            <div key={p.id} className={`relative rounded-2xl border-2 p-4 transition-all ${p.populaire ? "border-[#E63946] bg-[#FEF2F2]" : "border-gray-200"}`}>
              {p.populaire && <span className="absolute -top-2.5 left-4 bg-[#E63946] text-white text-xs font-black px-3 py-0.5 rounded-full">Le plus choisi</span>}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-black text-base ${p.populaire ? "text-[#E63946]" : "text-gray-800"}`}>{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.duree} · Produits illimités</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className={`font-black text-lg ${p.populaire ? "text-[#E63946]" : "text-gray-800"}`}>{p.prix.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-gray-400">FCFA</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 space-y-2.5 bg-white">
          <Link href="/vendor/abonnement" onClick={onClose} className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base text-center block active:scale-95 transition-all">Voir tous les abonnements →</Link>
          <button onClick={onClose} className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all">Plus tard</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ nom, onConfirm, onCancel }: { nom: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🗑️</div>
        <h3 className="font-black text-lg text-gray-800 mb-2">Supprimer ce produit ?</h3>
        <p className="text-sm text-gray-500 mb-6"><span className="font-semibold text-gray-700">&quot;{nom}&quot;</span> sera définitivement retiré de votre boutique.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-black active:scale-95 transition-all">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

function FicheExpedition({ commande, onConfirmer, onClose }: {
  commande: Commande;
  onConfirmer: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const articles = commande.articles as ItemPanier[];
  const adresse  = commande.adresse  as AdresseLivraison;
  const peutConfirmer = commande.statut === "payee_escrow";
  const handleConfirmer = async () => { setLoading(true); await onConfirmer(commande.id); setLoading(false); onClose(); };
  const modeLabel: Record<string, string> = { airtel_money: "Airtel Money", moov_money: "Moov Money", especes: "Espèces à la livraison" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-[#1A202C] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest">Fiche expédition</p>
            <p className="text-white font-black text-xl tracking-widest mt-0.5">{commande.code_court}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black text-[#E63946] text-base">{formatXAF(commande.total)}</span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          <div className="px-5 py-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Articles à préparer — {articles.length} article{articles.length > 1 ? "s" : ""}</p>
            <div className="space-y-3">
              {articles.map((it) => (
                <div key={it.produit_id} className="flex items-center gap-3">
                  {it.image ? <img src={it.image} alt={it.nom} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100" /> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center"><svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm leading-tight">{it.nom}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatXAF(it.prix_xaf)} × {it.quantite}</p>
                  </div>
                  <span className="bg-[#E63946] text-white font-black text-sm px-2.5 py-1 rounded-lg flex-shrink-0">×{it.quantite}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Livrer à</p>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                <p className="font-black text-gray-800">{adresse.nom_complet}</p>
              </div>
              <a href={`tel:${adresse.telephone}`} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-blue-200 active:scale-95 transition-all">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></div>
                <div className="flex-1"><p className="font-black text-gray-800 text-sm">{formaterPhoneGabon(adresse.telephone)}</p><p className="text-xs text-green-600 font-medium">Appuyer pour appeler</p></div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </a>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                <div><p className="font-bold text-gray-800 text-sm">{adresse.ville}{adresse.quartier ? ` — ${adresse.quartier}` : ""}</p>{adresse.details && <p className="text-xs text-gray-500 italic mt-0.5">{adresse.details}</p>}</div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Paiement</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">{commande.mode_paiement ? (modeLabel[commande.mode_paiement] ?? commande.mode_paiement) : ""}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${commande.statut === "payee_escrow" || commande.statut === "confirmee_vendeur" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {commande.statut === "en_attente_paiement" ? "En attente" : "Paiement reçu"}
              </span>
            </div>
            {commande.mode_paiement === "especes" && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">Collectez {formatXAF(commande.total)} en espèces lors de la remise au client.</p>}
          </div>
          <div className="px-5 py-3"><p className="text-xs text-gray-400">Commande du {new Date(commande.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
          {peutConfirmer && <button onClick={handleConfirmer} disabled={loading} className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl text-base disabled:opacity-50 active:scale-95 transition-all">{loading ? "Confirmation…" : "Confirmer — je prépare cette commande"}</button>}
          <button onClick={onClose} className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function VendorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<DashTab>("produits");
  const [vendeur, setVendeur] = useState<Vendeur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [statsCommandes, setStatsCommandes] = useState<CmdStat[]>([]);
  const [chargementStats, setChargementStats] = useState(false);
  const [maxProduits, setMaxProduits] = useState(MAX_PRODUITS_GRATUIT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [ficheCommande, setFicheCommande] = useState<Commande | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState("");

  const loadStats = useCallback(async (vendeurId: string) => {
    if (statsCommandes.length > 0) return;
    setChargementStats(true);
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data } = await supabase
      .from("commandes")
      .select("id, total, statut, articles, created_at")
      .eq("vendeur_id", vendeurId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    setStatsCommandes((data as CmdStat[]) ?? []);
    setChargementStats(false);
  }, [statsCommandes.length]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login?redirect=/vendor/dashboard"); return; }
        const { data: v } = await supabase.from("vendeurs").select("*").eq("utilisateur_id", user.id).single();
        if (!v) { router.push("/vendor/register"); return; }
        setVendeur(v);

        const [prodData, aboData, cmdData] = await Promise.all([
          getMesProduits(),
          supabase.from("abonnements").select("plan").eq("vendeur_id", v.id).eq("statut", "actif")
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("commandes").select("*").eq("vendeur_id", v.id)
            .order("created_at", { ascending: false }).limit(20),
        ]);

        // Vérifier si l'utilisateur est admin
        const { data: profilUtilisateur } = await supabase
          .from("utilisateurs").select("role").eq("id", user.id).single();
        const adminRole = profilUtilisateur?.role === "admin";
        setIsAdmin(adminRole);

        setProduits(prodData);
        if (adminRole) {
          setMaxProduits(9999); // Admin = produits illimités
        } else {
          const planId = (aboData.data?.plan ?? "gratuit") as keyof typeof PLANS;
          const planMax = PLANS[planId]?.max_produits ?? MAX_PRODUITS_GRATUIT;
          setMaxProduits(Number.isFinite(planMax) ? (planMax as number) : 9999);
        }
        setCommandes(cmdData.data ?? []);
      } catch { setErreurGlobale("Erreur de chargement. Actualisez la page."); }
      finally { setChargement(false); }
    })();
  }, [router]);

  const handleTabChange = (newTab: DashTab) => {
    setTab(newTab);
    if (newTab === "gestion" && vendeur && statsCommandes.length === 0) {
      loadStats(vendeur.id);
    }
  };

  const openAdd   = () => { if (limiteAtteinte) { setShowUpgrade(true); return; } setEditing(null); setShowForm(true); setErreurGlobale(""); };
  const openEdit  = (p: Produit) => { setEditing(p); setShowForm(true); setErreurGlobale(""); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async (nom: string, description: string | null, prix: number, unite: string, stock: number | null, categorie: string | null, image: string | null): Promise<string | null> => {
    const r = await fetch("/api/produits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing?.id, nom, description, prix, unite, stock, categorie, image }) });
    const res = await r.json() as { succes?: boolean; erreur?: string };
    if (res.erreur) return res.erreur;
    closeForm();
    setProduits(await getMesProduits());
    return null;
  };

  const handleToggleStatut = async (p: Produit) => {
    const nvStatut = p.statut === "actif" ? "inactif" : "actif";
    setProduits((prev) => prev.map((x) => x.id === p.id ? { ...x, statut: nvStatut } : x));
    const r = await fetch(`/api/produits?id=${p.id}&statut=${nvStatut}`, { method: "PATCH" });
    const res = await r.json() as { succes?: boolean; erreur?: string };
    if (res.erreur) { setProduits((prev) => prev.map((x) => x.id === p.id ? { ...x, statut: p.statut } : x)); setErreurGlobale(res.erreur); }
  };

  const handleDelete = async (id: string) => {
    const saved = produits.find((p) => p.id === id);
    setProduits((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    const r = await fetch(`/api/produits?id=${id}`, { method: "DELETE" });
    const res = await r.json() as { succes?: boolean; erreur?: string };
    if (res.erreur) { if (saved) setProduits((prev) => [saved, ...prev]); setErreurGlobale(res.erreur); }
  };

  const handleConfirmerCommande = async (commandeId: string) => {
    try {
      const r = await fetch("/api/commandes/confirmer-vendeur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandeId }) });
      const res = await r.json() as { succes?: boolean; erreur?: string };
      if (res.erreur) { setErreurGlobale(res.erreur); return; }
      setCommandes((prev) => prev.map((c) => c.id === commandeId ? { ...c, statut: "confirmee_vendeur" as const } : c));
    } catch { setErreurGlobale("Erreur réseau. Réessayez."); }
  };

  const handlePromoUpdate = async (id: string, actif: boolean, prix: number | null, fin: string | null) => {
    const r = await fetch("/api/produits/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, prix_promo: prix, promo_actif: actif, promo_fin: fin }) });
    const res = await r.json() as { succes?: boolean; erreur?: string };
    if (res.erreur) { setErreurGlobale(res.erreur); return; }
    setProduits((prev) => prev.map((p) => p.id === id ? { ...p, promo_actif: actif, prix_promo: actif ? prix : null, promo_fin: actif ? fin : null } : p));
  };

  const handleStockChange = async (id: string, stock: number | null) => {
    const r = await fetch(`/api/produits?id=${id}&stock=${stock ?? ""}`, { method: "PATCH" });
    const res = await r.json() as { succes?: boolean; erreur?: string };
    if (res.erreur) { setErreurGlobale(res.erreur); return; }
    setProduits((prev) => prev.map((p) => p.id === id ? { ...p, stock } : p));
  };

  const initiales    = vendeur?.nom?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const planActif    = maxProduits > MAX_PRODUITS_GRATUIT ? "payant" : "gratuit";
  const limiteAtteinte = produits.length >= maxProduits;

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {showForm && vendeur && <ProductFormModal produit={editing} nomBoutique={vendeur.nom} onSave={handleSave} onClose={closeForm} />}
      {deleteId && <DeleteConfirm nom={produits.find((p) => p.id === deleteId)?.nom ?? ""} onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />}
      {ficheCommande && (
        <FicheExpedition commande={ficheCommande}
          onConfirmer={async (id) => { await handleConfirmerCommande(id); setFicheCommande((prev) => prev?.id === id ? { ...prev, statut: "confirmee_vendeur" as const } : prev); }}
          onClose={() => setFicheCommande(null)} />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">{initiales}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-xl leading-tight truncate">{vendeur?.nom}</p>
            <p className="text-white/70 text-sm mt-0.5">📍 {vendeur?.ville}</p>
            {vendeur?.statut === "verifie" && <span className="inline-block mt-1.5 text-xs font-bold bg-white text-[#E63946] px-2 py-0.5 rounded-full">✓ Boutique vérifiée</span>}
            {vendeur?.statut === "suspendu" && <span className="inline-block mt-1.5 text-xs font-bold bg-red-400 text-white px-2 py-0.5 rounded-full">Boutique suspendue</span>}
            {isAdmin && <span className="inline-block mt-1.5 text-xs font-bold bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full">👑 Administrateur — Accès illimité</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {[
            { label: "Produits",   value: produits.length,                                                                                            icon: "🛍️" },
            { label: "Commandes",  value: commandes.length,                                                                                           icon: "📦" },
            { label: "En attente", value: commandes.filter((c) => c.statut === "payee_escrow").length, icon: "⏳" },
          ].map((s) => (
            <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/80 text-xs mt-0.5">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {erreurGlobale && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">{erreurGlobale}</p>
            <button onClick={() => setErreurGlobale("")} className="text-red-400 ml-3">✕</button>
          </div>
        )}

        {planActif === "gratuit" && !isAdmin && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${limiteAtteinte ? "bg-red-50 border-2 border-[#E63946]/40" : "bg-amber-50 border border-amber-200"}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${limiteAtteinte ? "bg-[#E63946]" : "bg-amber-200"}`}>
              {limiteAtteinte ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> : <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black ${limiteAtteinte ? "text-[#E63946]" : "text-amber-700"}`}>
                {limiteAtteinte ? "Limite atteinte — 3 produits sur 3" : `Plan Découverte — ${produits.length} / ${maxProduits} produits`}
              </p>
              <p className={`text-xs mt-0.5 ${limiteAtteinte ? "text-gray-600" : "text-amber-600"}`}>
                {limiteAtteinte ? "Passez Business pour ajouter des produits illimités" : "Passez Business pour vendre sans limite"}
              </p>
            </div>
            <button onClick={() => setShowUpgrade(true)} className={`flex-shrink-0 text-sm font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all ${limiteAtteinte ? "bg-[#E63946] text-white" : "bg-amber-200 text-amber-800"}`}>
              {limiteAtteinte ? "S&apos;abonner" : "Voir les offres"}
            </button>
          </div>
        )}

        {/* ── Onglets ── */}
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm gap-1 overflow-x-auto scrollbar-hide">
          {([
            { id: "produits"  as DashTab, label: "Produits",   icon: "🛍️", badge: 0 },
            { id: "commandes" as DashTab, label: "Commandes",  icon: "📦", badge: commandes.filter((c) => c.statut === "payee_escrow").length },
            { id: "gestion"   as DashTab, label: "Gestion",    icon: "📊", badge: 0 },
          ]).map((t) => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className={`relative flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${tab === t.id ? "bg-[#E63946] text-white shadow-sm" : "text-gray-500"}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${tab === t.id ? "bg-white text-[#E63946]" : "bg-[#E63946] text-white"}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Produits ── */}
        {tab === "produits" && (
          <div className="space-y-3">
            <button onClick={openAdd}
              className={`w-full font-black py-4 rounded-2xl text-base active:scale-95 transition-all flex items-center justify-center gap-2 ${limiteAtteinte ? "bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300" : "bg-[#E63946] text-white"}`}>
              {limiteAtteinte ? <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Limite atteinte — S&apos;abonner</> : <><span className="text-xl">+</span> Ajouter un produit</>}
            </button>

            {produits.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                <div className="text-6xl mb-4">🛍️</div>
                <p className="font-black text-gray-700 text-lg mb-2">Boutique vide</p>
                <p className="text-gray-400 mb-6">Ajoutez votre premier produit.</p>
                {!limiteAtteinte && <button onClick={openAdd} className="bg-[#E63946] text-white font-black px-8 py-4 rounded-2xl text-base active:scale-95 transition-all">+ Ajouter un produit</button>}
              </div>
            ) : (
              produits.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                      {p.image ? <img src={p.image} alt={p.nom} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🖼️</div>}
                      {p.promo_actif && <div className="absolute top-1 left-1 bg-[#E63946] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">PROMO</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-800 text-base leading-tight">{p.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.promo_actif && p.prix_promo ? (
                          <>
                            <p className="text-[#E63946] font-black text-base">{formatXAF(p.prix_promo)}</p>
                            <p className="text-gray-400 text-xs line-through">{formatXAF(p.prix)}</p>
                          </>
                        ) : (
                          <p className="text-[#E63946] font-black text-lg">{formatXAF(p.prix)}<span className="text-sm font-normal text-gray-400 ml-1">/ {UNITES.find(u => u.val === p.unite)?.label ?? p.unite}</span></p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.statut === "actif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.statut === "actif" ? "✓ En vente" : "Masqué"}
                        </span>
                        {p.stock !== null && p.stock !== undefined && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock <= 0 ? "bg-red-100 text-red-600" : p.stock <= 5 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                            {p.stock <= 0 ? "Rupture" : p.stock <= 5 ? `⚠️ ${p.stock} restant${p.stock > 1 ? "s" : ""}` : `${p.stock} en stock`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                    <button onClick={() => openEdit(p)} className="py-3 text-sm font-bold text-[#E63946] active:bg-red-50 transition-all">✏️ Modifier</button>
                    <button onClick={() => handleToggleStatut(p)} className="py-3 text-sm font-bold text-gray-600 active:bg-gray-50 transition-all">{p.statut === "actif" ? "👁️ Masquer" : "👁️ Afficher"}</button>
                    <button onClick={() => setDeleteId(p.id)} className="py-3 text-sm font-bold text-red-500 active:bg-red-50 transition-all">🗑️ Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Onglet Commandes ── */}
        {tab === "commandes" && (
          <div className="space-y-3">
            {commandes.filter((c) => c.statut === "payee_escrow").length > 0 && (
              <div className="bg-[#FEF2F2] border border-[#E63946]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#E63946] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-black text-[#E63946] text-sm">{commandes.filter((c) => c.statut === "payee_escrow").length} commande{commandes.filter((c) => c.statut === "payee_escrow").length > 1 ? "s" : ""} à confirmer</p>
                  <p className="text-xs text-gray-500 mt-0.5">Appuyez sur &quot;Fiche&quot; pour voir les détails et confirmer</p>
                </div>
              </div>
            )}
            {commandes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                <p className="font-black text-gray-700 mb-1">Aucune commande</p>
                <p className="text-sm text-gray-400">Vos commandes apparaîtront ici dès qu&apos;un client achète.</p>
              </div>
            ) : (
              commandes.map((c) => {
                const s = STATUT_COMMANDE[c.statut] ?? { label: c.statut, cls: "bg-gray-100 text-gray-600" };
                const articles = c.articles as ItemPanier[];
                const adresse = c.adresse as AdresseLivraison;
                const urgent = c.statut === "payee_escrow";
                return (
                  <div key={c.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${urgent ? "border-[#E63946]/30" : "border-gray-100"}`}>
                    {urgent && <div className="bg-[#E63946] px-4 py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white animate-pulse" /><p className="text-white font-black text-xs">À confirmer — paiement reçu</p></div>}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-gray-800 text-base">{c.code_court}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                          </div>
                          <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}&nbsp;·&nbsp;{articles.length} article{articles.length > 1 ? "s" : ""}</p>
                        </div>
                        <p className="font-black text-[#E63946] flex-shrink-0">{formatXAF(c.total)}</p>
                      </div>
                      {adresse && (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-3">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <p className="text-xs text-gray-600 font-medium truncate">{adresse.nom_complet} — {adresse.ville}{adresse.quartier ? `, ${adresse.quartier}` : ""}</p>
                        </div>
                      )}
                      <button onClick={() => setFicheCommande(c)}
                        className={`w-full font-black py-3 rounded-xl text-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${urgent ? "bg-[#E63946] text-white" : "bg-gray-100 text-gray-700"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Fiche expédition
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Onglet Gestion ── */}
        {tab === "gestion" && (
          <div className="space-y-3">
            <Section titre="Statistiques" icon="📊">
              <SectionStats cmds={statsCommandes} chargement={chargementStats} />
            </Section>
            <Section titre="Promotions" icon="🏷️" defaut={false}>
              <SectionPromos produits={produits} cmds={statsCommandes} onUpdate={handlePromoUpdate} />
            </Section>
            <Section titre="Gestion du stock" icon="📦" defaut={false}>
              <SectionStock produits={produits} onStockChange={handleStockChange} />
            </Section>
          </div>
        )}

        {/* Actions rapides */}
        {vendeur && (
          <Link href={`/vendeur/${vendeur.slug}`} className="block w-full text-center bg-white rounded-2xl py-4 text-[#E63946] font-bold text-base shadow-sm active:scale-95 transition-all border border-[#E63946]/20">
            👀 Voir ma boutique
          </Link>
        )}
        <Link href="/vendor/wallet" className="block w-full text-center bg-white rounded-2xl py-4 text-gray-700 font-bold text-base shadow-sm active:scale-95 transition-all">
          💰 Mon portefeuille
        </Link>
      </div>
    </div>
  );
}
