"use client";

import { useState, useEffect } from "react";
import type { VendorCommissionSettings, ProduitCommission } from "@/lib/supabase/database.types";
import { COMMISSION_MIN, COMMISSION_MAX } from "@/lib/rules";

interface CommissionConfig {
  config: VendorCommissionSettings;
  produits_custom: (ProduitCommission & { produit_nom: string })[];
  statistiques: {
    nb_produits_custom: number;
    commission_moyenne: number;
  };
}

export function CommissionDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommissionConfig | null>(null);
  const [editingDefaut, setEditingDefaut] = useState(false);
  const [newDefaut, setNewDefaut] = useState(0.05);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCommissionData();
  }, []);

  const loadCommissionData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vendor/commission");
      if (!res.ok) throw new Error("Impossible de charger la configuration");
      const data = await res.json();
      setData(data);
      setNewDefaut(data.config?.commission_defaut || 0.05);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDefaut = async () => {
    try {
      setError(null);
      const res = await fetch("/api/vendor/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_defaut: newDefaut }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur);
      }

      const result = await res.json();
      setMessage(result.message);
      setEditingDefaut(false);
      await loadCommissionData();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleResetProductCommission = async (produitId: string) => {
    try {
      setError(null);
      const res = await fetch(
        `/api/vendor/commission/produit/${produitId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur);
      }

      setMessage("Commission réinitialisée");
      await loadCommissionData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
        <div className="animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Messages ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
          ✓ {message}
        </div>
      )}

      {/* ─── Commission par Défaut ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">⚙️ Commission par Défaut</h3>
          <button
            onClick={() => setEditingDefaut(!editingDefaut)}
            className="text-sm text-[#E63946] hover:underline"
          >
            {editingDefaut ? "Annuler" : "Modifier"}
          </button>
        </div>

        {editingDefaut ? (
          <div className="space-y-3">
            <input
              type="range"
              min={COMMISSION_MIN}
              max={COMMISSION_MAX}
              step={0.01}
              value={newDefaut}
              onChange={(e) => setNewDefaut(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-[#E63946]">
                  {(newDefaut * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Min: {(COMMISSION_MIN * 100).toFixed(0)}% | Max: {(COMMISSION_MAX * 100).toFixed(0)}%
                </p>
              </div>
              <button
                onClick={handleUpdateDefaut}
                className="bg-[#E63946] text-white px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition-transform"
              >
                Confirmer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl font-black text-[#E63946]">
              {((data?.config?.commission_defaut || 0.05) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">
              Appliquée à tous les nouveaux produits (à moins de config spécifique)
            </p>
          </div>
        )}
      </div>

      {/* ─── Articles avec Commission Custom ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-800 mb-4">
          📦 Articles avec Commission Spécifique ({data?.statistiques.nb_produits_custom || 0})
        </h3>

        {data?.produits_custom && data.produits_custom.length > 0 ? (
          <div className="space-y-3">
            {data.produits_custom.map((pc) => (
              <div
                key={pc.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800 line-clamp-1">
                    {pc.produit_nom}
                  </p>
                  {pc.raison && (
                    <p className="text-xs text-gray-500 mt-0.5">{pc.raison}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-[#E63946]">
                    {(pc.commission * 100).toFixed(1)}%
                  </span>
                  <button
                    onClick={() => handleResetProductCommission(pc.produit_id)}
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucun article avec configuration spécifique
          </p>
        )}
      </div>

      {/* ─── Suggestions Stratégiques ─── */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h4 className="font-bold text-blue-900 mb-3">💡 Stratégies Suggérées</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-blue-900">📈 Articles Populaires</p>
            <p className="text-xs text-blue-700 mt-1">
              Commission basse (2-3%) → volume plus élevé
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-blue-900">🆕 Nouveaux Produits</p>
            <p className="text-xs text-blue-700 mt-1">
              Commission moyenne (5-7%) → gain équilibré
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-blue-900">🚀 À Écouler</p>
            <p className="text-xs text-blue-700 mt-1">
              Commission élevée (8-10%) → ventes rapides
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="font-semibold text-blue-900">👑 Articles Premium</p>
            <p className="text-xs text-blue-700 mt-1">
              Commission basse (2%) → exclusivité perçue
            </p>
          </div>
        </div>
      </div>

      {/* ─── Statistiques ─── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h4 className="font-bold text-gray-800 mb-3">📊 Votre Profil</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-600">Commission Moyenne</p>
            <p className="text-xl font-black text-[#E63946] mt-1">
              {data?.statistiques ? (data.statistiques.commission_moyenne * 100).toFixed(1) : "—"}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Produits en Config</p>
            <p className="text-xl font-black text-[#E63946] mt-1">
              {data?.statistiques.nb_produits_custom || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
