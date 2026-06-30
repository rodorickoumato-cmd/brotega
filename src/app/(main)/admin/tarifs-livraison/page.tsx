"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const PROVINCES = [
  { code: "EST", label: "Estuaire" },
  { code: "OMA", label: "Ogooué-Maritime" },
  { code: "MOY", label: "Moyen-Ogooué" },
  { code: "WNT", label: "Woleu-Ntem" },
  { code: "OIV", label: "Ogooué-Ivindo" },
  { code: "OLO", label: "Ogooué-Lolo" },
  { code: "HAO", label: "Haut-Ogooué" },
  { code: "NGO", label: "Ngounié" },
  { code: "NYA", label: "Nyanga" },
];

type Tarif = { province_vendeur: string; province_acheteur: string; tarif_xaf: number };
type Ville = { nom: string; province_code: string; supplement_xaf: number; actif: boolean };
type Toast = { message: string; type: "succes" | "erreur" };

export default function TarifsLivraisonPage() {
  const router = useRouter();
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [onglet, setOnglet] = useState<"tarifs" | "villes">("tarifs");
  const [chargement, setChargement] = useState(true);
  const [modifie, setModifie] = useState<Record<string, number>>({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [nouvelleVille, setNouvelleVille] = useState({ nom: "", province_code: "EST", supplement_xaf: 0 });

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const charger = useCallback(async () => {
    const [t, v] = await Promise.all([
      fetch("/api/admin/tarifs-livraison").then((r) => r.json()),
      fetch("/api/admin/villes-livraison").then((r) => r.json()),
    ]);
    setTarifs(t.tarifs ?? []);
    setVilles(v.villes ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      charger();
    })();
  }, [router, charger]);

  function getTarif(pV: string, pA: string): number {
    const key = `${pV}-${pA}`;
    if (key in modifie) return modifie[key];
    return tarifs.find((t) => t.province_vendeur === pV && t.province_acheteur === pA)?.tarif_xaf ?? 0;
  }

  function setTarifLocal(pV: string, pA: string, val: number) {
    setModifie((prev) => ({ ...prev, [`${pV}-${pA}`]: val }));
  }

  async function sauvegarderTarifs() {
    if (!Object.keys(modifie).length) return;
    setEnregistrement(true);
    const entrees = Object.entries(modifie).map(([cle, tarif_xaf]) => {
      const [province_vendeur, province_acheteur] = cle.split("-");
      return { province_vendeur, province_acheteur, tarif_xaf };
    });
    const res = await fetch("/api/admin/tarifs-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tarifs: entrees }),
    });
    const json = await res.json();
    setEnregistrement(false);
    if (json.succes) {
      afficherToast(`${entrees.length} tarif(s) sauvegardé(s).`, "succes");
      setModifie({});
      charger();
    } else {
      afficherToast(json.erreur ?? "Erreur.", "erreur");
    }
  }

  async function ajouterVille() {
    if (!nouvelleVille.nom) return;
    const res = await fetch("/api/admin/villes-livraison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleVille),
    });
    const json = await res.json();
    if (json.succes) {
      afficherToast("Ville ajoutée.", "succes");
      setNouvelleVille({ nom: "", province_code: "EST", supplement_xaf: 0 });
      charger();
    } else {
      afficherToast(json.erreur ?? "Erreur.", "erreur");
    }
  }

  async function toggleVille(nom: string, actif: boolean) {
    await fetch("/api/admin/villes-livraison", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, actif: !actif }),
    });
    charger();
  }

  const nbModif = Object.keys(modifie).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Dashboard Admin</Link>
        <h1 className="text-2xl font-black text-white">Tarifs Livraison</h1>
        <p className="text-white/70 text-sm mt-1">Modifier les tarifs inter-provinces et les villes couvertes</p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      {/* Onglets */}
      <div className="px-4 pt-4 flex gap-2">
        {(["tarifs", "villes"] as const).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === o ? "bg-[#E63946] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            {o === "tarifs" ? "Tarifs inter-provinces" : "Villes couvertes"}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {chargement ? (
          <div className="bg-white rounded-2xl h-40 animate-pulse" />
        ) : onglet === "tarifs" ? (
          <>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-blue-600 font-semibold">Guide de lecture</p>
              <p className="text-xs text-blue-500 mt-0.5">Ligne = province du vendeur · Colonne = province de l'acheteur · Prix en XAF</p>
            </div>

            {/* Matrice scrollable */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold min-w-[90px]">Vendeur ↓ / Acheteur →</th>
                      {PROVINCES.map((p) => (
                        <th key={p.code} className="px-2 py-2 text-center text-gray-600 font-bold min-w-[80px]">
                          {p.label.split("-")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PROVINCES.map((pV) => (
                      <tr key={pV.code} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-bold text-gray-700 bg-gray-50 whitespace-nowrap">
                          {pV.label.split("-")[0]}
                        </td>
                        {PROVINCES.map((pA) => {
                          const estDiag = pV.code === pA.code;
                          const val = getTarif(pV.code, pA.code);
                          const estModif = `${pV.code}-${pA.code}` in modifie;
                          return (
                            <td key={pA.code} className={`px-1 py-1 text-center ${estDiag ? "bg-gray-50" : ""}`}>
                              <input
                                type="number"
                                min={0}
                                step={500}
                                value={val}
                                onChange={(e) => setTarifLocal(pV.code, pA.code, parseInt(e.target.value) || 0)}
                                className={`w-[72px] text-center text-xs border rounded-lg px-1 py-1 focus:outline-none ${estModif ? "border-[#E63946] bg-red-50" : "border-gray-100 bg-white"}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {nbModif > 0 && (
              <button
                onClick={sauvegarderTarifs}
                disabled={enregistrement}
                className="w-full bg-[#E63946] text-white font-bold py-3 rounded-xl disabled:opacity-60"
              >
                {enregistrement ? "Sauvegarde…" : `Sauvegarder ${nbModif} modification(s)`}
              </button>
            )}
          </>
        ) : (
          <>
            {/* Formulaire nouvelle ville */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">Ajouter une ville</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                  <input
                    value={nouvelleVille.nom}
                    onChange={(e) => setNouvelleVille((v) => ({ ...v, nom: e.target.value }))}
                    placeholder="ex: Lambaréné"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Province</label>
                  <select
                    value={nouvelleVille.province_code}
                    onChange={(e) => setNouvelleVille((v) => ({ ...v, province_code: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Supplément ville (XAF) — pour les villes excentrées</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={nouvelleVille.supplement_xaf}
                  onChange={(e) => setNouvelleVille((v) => ({ ...v, supplement_xaf: parseInt(e.target.value) || 0 }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
              </div>
              <button
                onClick={ajouterVille}
                disabled={!nouvelleVille.nom}
                className="w-full bg-[#E63946] text-white font-bold py-3 rounded-xl disabled:opacity-60"
              >
                Ajouter la ville
              </button>
            </div>

            {/* Liste des villes */}
            <div className="space-y-2">
              {villes.map((v) => (
                <div key={v.nom} className={`bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 ${!v.actif ? "opacity-50" : ""}`}>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{v.nom}</p>
                    <p className="text-xs text-gray-400">
                      {PROVINCES.find((p) => p.code === v.province_code)?.label ?? v.province_code}
                      {v.supplement_xaf > 0 && ` · +${v.supplement_xaf.toLocaleString()} XAF`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleVille(v.nom, v.actif)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold ${v.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {v.actif ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
