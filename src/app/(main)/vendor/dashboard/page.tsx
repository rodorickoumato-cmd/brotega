"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CommissionDisclosureModal } from "@/components/vendor/CommissionDisclosureModal";

interface VendorStats {
  totalArticles: number;
  totalVentes: number;
  totalGains: number;
  commissionMoyenne: number;
  articlesThisMonth: number;
  ventesThisMonth: number;
  gainsThisMonth: number;
}

export default function VendorDashboardPage() {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Charger stats depuis API
    setStats({
      totalArticles: 25,
      totalVentes: 145,
      totalGains: 13_750_000,
      commissionMoyenne: 0.05,
      articlesThisMonth: 12,
      ventesThisMonth: 42,
      gainsThisMonth: 3_990_000,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CommissionDisclosureModal />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            🎉 Bienvenue!
          </h1>
          <p className="text-lg text-gray-600">
            Publiez sans limites. Gagnez plus!
          </p>
        </div>

        {/* Announcement */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h2 className="text-3xl font-black mb-2">♾️ ILLIMITÉ!</h2>
          <p className="text-emerald-100">
            Publiez autant que vous voulez. Plus de limite de 3 produits!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-600">
            <p className="text-gray-600 text-sm">📦 Articles</p>
            <p className="text-3xl font-black text-gray-800 mt-2">
              {stats?.totalArticles}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-600">
            <p className="text-gray-600 text-sm">💼 Ventes</p>
            <p className="text-3xl font-black text-gray-800 mt-2">
              {stats?.totalVentes}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-600">
            <p className="text-gray-600 text-sm">💰 Gains</p>
            <p className="text-2xl font-black text-gray-800 mt-2">
              {(stats?.totalGains || 0).toLocaleString()} XAF
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/vendor/produits/nouveau"
            className="bg-emerald-600 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition"
          >
            <span className="text-4xl">📤</span>
            <h3 className="font-black text-lg mt-2 mb-2">Publier</h3>
            <p className="text-emerald-100 text-sm">
              Zéro limite. Zéro frais fixes!
            </p>
          </Link>

          <Link
            href="/vendor/configuration"
            className="bg-purple-600 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition"
          >
            <span className="text-4xl">⚙️</span>
            <h3 className="font-black text-lg mt-2 mb-2">Configuration</h3>
            <p className="text-purple-100 text-sm">
              Gérez votre boutique
            </p>
          </Link>

          <Link
            href="/vendor/wallet"
            className="bg-blue-600 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transition"
          >
            <span className="text-4xl">💳</span>
            <h3 className="font-black text-lg mt-2 mb-2">Paiements</h3>
            <p className="text-blue-100 text-sm">
              Tracez vos gains
            </p>
          </Link>
        </div>

        {/* Quick Tips */}
        <div className="bg-white rounded-xl shadow p-8">
          <h3 className="text-2xl font-black text-gray-800 mb-4">
            💡 Conseils pour réussir
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span>✓</span>
              <div>
                <p className="font-semibold">Photos de qualité</p>
                <p className="text-sm text-gray-600">Utilisez de bonnes images pour vos produits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span>✓</span>
              <div>
                <p className="font-semibold">Descriptions claires</p>
                <p className="text-sm text-gray-600">Détaillez bien vos articles</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span>✓</span>
              <div>
                <p className="font-semibold">Prix compétitifs</p>
                <p className="text-sm text-gray-600">Consultez les prix du marché</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span>✓</span>
              <div>
                <p className="font-semibold">Excellent service</p>
                <p className="text-sm text-gray-600">Répondez vite aux clients</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
