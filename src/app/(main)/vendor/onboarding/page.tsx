"use client";

import { useState } from "react";
import Link from "next/link";

export default function VendorOnboardingPage() {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "🎉 Bienvenue sur Brotega!",
      subtitle: "La marketplace qui paie bien les vendeurs africains",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
              <p className="text-3xl mb-2">♾️</p>
              <p className="font-bold text-emerald-900">Articles Illimités</p>
              <p className="text-sm text-emerald-700 mt-2">
                Publiez autant que vous voulez. Aucune limite!
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <p className="text-3xl mb-2">💰</p>
              <p className="font-bold text-blue-900">Frais Bas</p>
              <p className="text-sm text-blue-700 mt-2">
                5% seulement. Plus bas que Amazon & Jumia
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <p className="text-3xl mb-2">🚀</p>
              <p className="font-bold text-orange-900">Croissance</p>
              <p className="text-sm text-orange-700 mt-2">
                Plus vous publiez, plus vous gagnez!
              </p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Brotega est conçu pour les vendeurs africains qui rêvent de croissance.
            Pas de frais cachés, pas de complications. Juste une plateforme transparente
            et juste qui partage votre succès.
          </p>
        </div>
      ),
    },
    {
      title: "📊 Comment Ça Marche?",
      subtitle: "Simple, transparent, gagnant-gagnant",
      content: (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600 text-white font-bold">1</div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Publiez votre produit</p>
              <p className="text-sm text-gray-600">Gratuit. Illimité. Aucune limite.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600 text-white font-bold">2</div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Un client achète</p>
              <p className="text-sm text-gray-600">Paiement sécurisé via Brotega</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600 text-white font-bold">3</div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Vous gagnez 95%</p>
              <p className="text-sm text-gray-600">
                Frais Brotega: 5% seulement (déjà déduits)
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600 text-white font-bold">4</div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Paiement automatique</p>
              <p className="text-sm text-gray-600">Virement dans votre compte bancaire</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "💵 Potentiel de Gains Réel",
      subtitle: "C'est vraiment possible!",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 font-semibold mb-4">
            Exemple réaliste : Vous publiez 10 produits par jour
          </p>

          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Prix par produit</span>
                <span className="font-bold text-lg">100,000 XAF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Frais Brotega (5%)</span>
                <span className="font-bold text-lg text-red-600">-5,000 XAF</span>
              </div>
              <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center">
                <span className="text-gray-800 font-bold">Vous gagnez par produit</span>
                <span className="font-bold text-xl text-emerald-700">95,000 XAF ✓</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">950k</p>
              <p className="text-xs text-gray-600">Par jour</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">28.5M</p>
              <p className="text-xs text-gray-600">Par mois</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">342M</p>
              <p className="text-xs text-gray-600">Par an</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 italic">
            ⚠️ Cela dépend du volume de ventes et de la demande pour vos produits.
            Mais c'est un objectif réaliste et motivant!
          </p>
        </div>
      ),
    },
    {
      title: "🔒 Confiance & Sécurité",
      subtitle: "Vos données et votre argent sont protégés",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-2xl">🔐</span>
              <div>
                <p className="font-semibold text-gray-800">Paiements sécurisés</p>
                <p className="text-sm text-gray-600">
                  Escrow (séquestre) protège votre argent jusqu'à confirmation
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-gray-800">Dashboard transparent</p>
                <p className="text-sm text-gray-600">
                  Tracez chaque vente, chaque commission, chaque gain
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-semibold text-gray-800">Support local</p>
                <p className="text-sm text-gray-600">
                  Équipe francophone disponible 24/7 pour vos questions
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-gray-800">Frais justes</p>
                <p className="text-sm text-gray-600">
                  5% c'est moins que Amazon (15%), Jumia (20%), AliExpress (15%)
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "🚀 Prêt à Commencer?",
      subtitle: "Rejoignez les milliers de vendeurs qui gagnent sur Brotega",
      content: (
        <div className="space-y-4 text-center">
          <p className="text-gray-700">
            Il n'y a jamais eu de meilleur moment pour publier sans limite
            et transformer votre passion en revenus!
          </p>

          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-8 rounded-xl border border-emerald-200 my-6">
            <p className="text-4xl font-black text-emerald-700 mb-2">AUCUNE LIMITE</p>
            <p className="text-gray-700">
              Plus d'articles = Plus de revenus!
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/vendor/dashboard"
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all block"
            >
              🎬 Aller au Dashboard
            </Link>
            <Link
              href="/vendor/produits"
              className="w-full bg-emerald-100 text-emerald-700 font-bold py-3 rounded-lg hover:bg-emerald-200 transition-all block"
            >
              📦 Publier mon Premier Produit
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6">
            <span className="text-3xl font-black text-emerald-600">🚀 Brotega</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
            {currentStep.title}
          </h1>
          <p className="text-gray-600 text-lg">{currentStep.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-emerald-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {currentStep.content}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              step === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            ← Précédent
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
            >
              Suivant →
            </button>
          ) : (
            <Link
              href="/vendor/dashboard"
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all text-center"
            >
              Commencer! 🎉
            </Link>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && (
          <div className="text-center mt-4">
            <Link
              href="/vendor/dashboard"
              className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
            >
              Sauter la présentation →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
