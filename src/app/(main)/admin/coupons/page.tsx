"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCouponsAdmin, creerCoupon, toggleCouponActif, supprimerCoupon } from "@/app/actions/coupons";
import { formatXAF } from "@/lib/utils";
import Link from "next/link";

type Coupon = {
  id: string;
  code: string;
  type: "pourcentage" | "montant_fixe" | "livraison_gratuite";
  valeur: number;
  utilisation_max: number | null;
  utilisation_actuelle: number;
  montant_min_xaf: number;
  actif: boolean;
  expire_le: string | null;
  created_at: string;
};

type Toast = { message: string; type: "succes" | "erreur" };

const TYPE_LABEL: Record<Coupon["type"], string> = {
  pourcentage: "Pourcentage",
  montant_fixe: "Montant fixe",
  livraison_gratuite: "Livraison gratuite",
};

function detailReduction(c: Coupon): string {
  if (c.type === "pourcentage") return `${c.valeur}%`;
  if (c.type === "montant_fixe") return formatXAF(c.valeur);
  return "Livraison offerte";
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "", type: "pourcentage" as Coupon["type"], valeur: 10,
    utilisationMax: "", montantMinXaf: 0, expireLe: "",
  });

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const charger = useCallback(async () => {
    const res = await getCouponsAdmin();
    if (res.coupons) setCoupons(res.coupons as Coupon[]);
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

  async function handleCreer() {
    setEnregistrement(true);
    const res = await creerCoupon({
      code: form.code,
      type: form.type,
      valeur: form.valeur,
      utilisationMax: form.utilisationMax ? parseInt(form.utilisationMax, 10) : null,
      montantMinXaf: form.montantMinXaf,
      expireLe: form.expireLe ? new Date(form.expireLe).toISOString() : null,
    });
    setEnregistrement(false);
    if (res.succes) {
      afficherToast("Coupon créé.", "succes");
      setAjoutOuvert(false);
      setForm({ code: "", type: "pourcentage", valeur: 10, utilisationMax: "", montantMinXaf: 0, expireLe: "" });
      await charger();
    } else {
      afficherToast(res.erreur ?? "Erreur", "erreur");
    }
  }

  async function handleToggle(id: string, actif: boolean) {
    setEnCours(id);
    const res = await toggleCouponActif(id, !actif);
    setEnCours(null);
    if (res.succes) { afficherToast(!actif ? "Coupon activé." : "Coupon désactivé.", "succes"); await charger(); }
    else afficherToast(res.erreur ?? "Erreur", "erreur");
  }

  async function handleSupprimer(id: string) {
    setEnCours(id);
    const res = await supprimerCoupon(id);
    setEnCours(null);
    if (res.succes) { afficherToast("Coupon supprimé.", "succes"); await charger(); }
    else afficherToast(res.erreur ?? "Erreur", "erreur");
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Coupons 🏷️</h1>
        <p className="text-white/70 text-sm mt-1">{coupons.length} code{coupons.length > 1 ? "s" : ""} créé{coupons.length > 1 ? "s" : ""}</p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 py-5 space-y-4">
        <button
          onClick={() => setAjoutOuvert((v) => !v)}
          className="w-full bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-gray-100 font-bold text-gray-700"
        >
          <span>+ Nouveau coupon</span>
          <span className="text-gray-400">{ajoutOuvert ? "▲" : "▼"}</span>
        </button>

        {ajoutOuvert && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="GABON2026"
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 uppercase focus:outline-none focus:border-[#E63946]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Coupon["type"] })}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
              >
                <option value="pourcentage">Pourcentage (%)</option>
                <option value="montant_fixe">Montant fixe (XAF)</option>
                <option value="livraison_gratuite">Livraison gratuite</option>
              </select>
            </div>

            {form.type !== "livraison_gratuite" && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Valeur {form.type === "pourcentage" ? "(%)" : "(XAF)"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.valeur}
                  onChange={(e) => setForm({ ...form, valeur: Number(e.target.value) })}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Utilisation max</label>
                <input
                  type="number"
                  min={1}
                  value={form.utilisationMax}
                  onChange={(e) => setForm({ ...form, utilisationMax: e.target.value })}
                  placeholder="Illimité"
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Commande min (XAF)</label>
                <input
                  type="number"
                  min={0}
                  value={form.montantMinXaf}
                  onChange={(e) => setForm({ ...form, montantMinXaf: Number(e.target.value) })}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Expiration <span className="font-normal text-gray-400">(facultatif)</span></label>
              <input
                type="date"
                value={form.expireLe}
                onChange={(e) => setForm({ ...form, expireLe: e.target.value })}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
              />
            </div>

            <button
              onClick={handleCreer}
              disabled={enregistrement || !form.code.trim()}
              className="w-full bg-[#E63946] text-white font-bold py-3 rounded-xl active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {enregistrement ? "Création…" : "Créer le coupon"}
            </button>
          </div>
        )}

        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
        ))}

        {!chargement && coupons.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🏷️</div>
            <p className="text-gray-500 font-medium">Aucun coupon créé</p>
          </div>
        )}

        {!chargement && coupons.map((c) => {
          const expire = c.expire_le && new Date(c.expire_le) < new Date();
          const epuise = c.utilisation_max !== null && c.utilisation_actuelle >= c.utilisation_max;
          return (
            <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-gray-800 font-mono">{c.code}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  c.actif && !expire && !epuise
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}>
                  {!c.actif ? "Désactivé" : expire ? "Expiré" : epuise ? "Épuisé" : "Actif"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {TYPE_LABEL[c.type]} · {detailReduction(c)}
                {c.montant_min_xaf > 0 && ` · min. ${formatXAF(c.montant_min_xaf)}`}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>
                  Utilisé {c.utilisation_actuelle}{c.utilisation_max !== null ? ` / ${c.utilisation_max}` : ""} fois
                  {c.expire_le && ` · expire le ${new Date(c.expire_le).toLocaleDateString("fr-FR")}`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(c.id, c.actif)}
                  disabled={enCours === c.id}
                  className="flex-1 text-xs font-bold py-2 rounded-xl border-2 border-gray-200 text-gray-700 disabled:opacity-50"
                >
                  {enCours === c.id ? "…" : c.actif ? "Désactiver" : "Activer"}
                </button>
                {c.utilisation_actuelle === 0 && (
                  <button
                    onClick={() => handleSupprimer(c.id)}
                    disabled={enCours === c.id}
                    className="flex-1 text-xs font-bold py-2 rounded-xl border-2 border-red-100 text-red-600 disabled:opacity-50"
                  >
                    Supprimer
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
