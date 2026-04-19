"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { souscrireAbonnement, getAbonnementActuel } from "@/app/actions/abonnements";

const plans = [
  {
    id: "gratuit",
    nom: "Gratuit",
    prix: 0,
    prixBarre: null,
    economie: null,
    pourcentage: null,
    periode: null,
    couleur: "gray",
    populaire: false,
    description: "Pour démarrer et tester la plateforme",
    limites: [
      { label: "3 produits maximum", inclus: true },
      { label: "1 photo par produit", inclus: true },
      { label: "Profil boutique basique", inclus: true },
      { label: "Support communautaire", inclus: true },
      { label: "Statistiques de vente", inclus: false },
      { label: "Badge vendeur vérifié", inclus: false },
      { label: "Mise en avant catalogue", inclus: false },
      { label: "Support WhatsApp prioritaire", inclus: false },
    ],
  },
  {
    id: "mensuel",
    nom: "Mensuel",
    prix: 2000,
    prixBarre: null,
    economie: null,
    pourcentage: null,
    periode: "/ mois",
    couleur: "green",
    populaire: false,
    description: "Pour les vendeurs qui démarrent",
    limites: [
      { label: "Produits illimités", inclus: true },
      { label: "5 photos par produit", inclus: true },
      { label: "Profil boutique complet", inclus: true },
      { label: "Support WhatsApp", inclus: true },
      { label: "Statistiques de vente", inclus: true },
      { label: "Badge vendeur vérifié", inclus: true },
      { label: "Mise en avant catalogue", inclus: false },
      { label: "Support prioritaire 24h/24", inclus: false },
    ],
  },
  {
    id: "trimestriel",
    nom: "Trimestriel",
    prix: 5000,
    prixBarre: 6000,
    economie: 1000,
    pourcentage: 17,
    periode: "/ 3 mois",
    couleur: "green",
    populaire: true,
    description: "Le meilleur rapport qualité-prix",
    limites: [
      { label: "Produits illimités", inclus: true },
      { label: "10 photos par produit", inclus: true },
      { label: "Profil boutique complet", inclus: true },
      { label: "Support WhatsApp prioritaire", inclus: true },
      { label: "Statistiques avancées", inclus: true },
      { label: "Badge vendeur vérifié", inclus: true },
      { label: "Mise en avant catalogue", inclus: true },
      { label: "Support prioritaire 24h/24", inclus: false },
    ],
  },
  {
    id: "semestriel",
    nom: "Semestriel",
    prix: 8000,
    prixBarre: 12000,
    economie: 4000,
    pourcentage: 33,
    periode: "/ 6 mois",
    couleur: "green",
    populaire: false,
    description: "Pour les vendeurs ambitieux",
    limites: [
      { label: "Produits illimités", inclus: true },
      { label: "Photos illimitées", inclus: true },
      { label: "Profil boutique premium", inclus: true },
      { label: "Support WhatsApp prioritaire", inclus: true },
      { label: "Statistiques avancées", inclus: true },
      { label: "Badge vendeur vérifié ✓", inclus: true },
      { label: "Mise en avant catalogue", inclus: true },
      { label: "Support prioritaire 24h/24", inclus: true },
    ],
  },
  {
    id: "annuel",
    nom: "Annuel",
    prix: 15000,
    prixBarre: 24000,
    economie: 9000,
    pourcentage: 37,
    periode: "/ an",
    couleur: "yellow",
    populaire: false,
    description: "Maximisez votre réussite sur Brotega",
    limites: [
      { label: "Produits illimités", inclus: true },
      { label: "Photos illimitées", inclus: true },
      { label: "Profil boutique premium + vidéo", inclus: true },
      { label: "Support WhatsApp VIP", inclus: true },
      { label: "Statistiques + export Excel", inclus: true },
      { label: "Badge vendeur vérifié ✓", inclus: true },
      { label: "Mise en avant catalogue #1", inclus: true },
      { label: "Support prioritaire 24h/24", inclus: true },
    ],
  },
];

const temoignages = [
  {
    nom: "Adèle Moussounda",
    boutique: "Beauté Noire Précieuse",
    ville: "Libreville",
    avatar: "AM",
    couleur: "from-pink-400 to-purple-500",
    note: 5,
    texte: "Depuis que j'ai pris l'abonnement trimestriel, mes ventes ont triplé en 2 mois. Le badge vérifié inspire vraiment confiance aux clients. Je recommande à 100% !",
    plan: "Trimestriel",
  },
  {
    nom: "Jean-Baptiste Ondo",
    boutique: "TechGabon Store",
    ville: "Libreville",
    avatar: "JO",
    couleur: "from-blue-400 to-blue-600",
    note: 5,
    texte: "J'hésitais au début à payer un abonnement. Avec le plan annuel à 15 000 FCFA, j'économise 9 000 FCFA et je génère plus de 200 000 FCFA de ventes par mois. L'investissement est rentabilisé en quelques jours !",
    plan: "Annuel",
  },
  {
    nom: "Solange Mihindou",
    boutique: "Marché Mbolo",
    ville: "Oyem",
    avatar: "SM",
    couleur: "from-green-400 to-green-600",
    note: 5,
    texte: "La mise en avant dans le catalogue a tout changé. Mes produits alimentaires locaux apparaissent en premier. Je livre maintenant dans 4 villes du Gabon grâce à Brotega.",
    plan: "Semestriel",
  },
  {
    nom: "Rodrigue Nkoghe",
    boutique: "Artisan Gabonais",
    ville: "Lambaréné",
    avatar: "RN",
    couleur: "from-orange-400 to-red-500",
    note: 5,
    texte: "En tant qu'artisan, j'avais peur de la technologie. L'équipe Brotega m'a accompagné par WhatsApp. Aujourd'hui je vends mes masques Fang jusqu'à Port-Gentil !",
    plan: "Trimestriel",
  },
];

const faq = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    r: "Oui, vous pouvez passer à un plan supérieur à tout moment. La différence de prix est calculée au prorata. Pour passer à un plan inférieur, le changement prend effet à la prochaine échéance.",
  },
  {
    q: "Comment payer mon abonnement ?",
    r: "Vous pouvez payer par Airtel Money (*555# → code BROTEGA), Moov Money (*111# → code BROTEGA) ou par carte bancaire. Le paiement est sécurisé et instantané.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    r: "Non, aucun engagement. Vous pouvez annuler votre abonnement à tout moment depuis votre dashboard vendeur. Aucun frais de résiliation.",
  },
  {
    q: "Que se passe-t-il si je dépasse 3 produits avec le plan Gratuit ?",
    r: "Vous serez invité à passer à un plan payant. Vos produits existants resteront visibles, mais vous ne pourrez pas en ajouter de nouveaux sans passer à un abonnement supérieur.",
  },
  {
    q: "Le badge « Vendeur vérifié » est-il automatique ?",
    r: "Non, il nécessite la vérification de votre identité (CNI ou passeport) par notre équipe. Ce processus prend généralement 24 à 48 heures après soumission des documents.",
  },
];

function formatXAF(n: number) {
  return new Intl.NumberFormat("fr-GA", { style: "currency", currency: "XAF", minimumFractionDigits: 0 }).format(n);
}

export default function AbonnementPage() {
  const [planActif, setPlanActif] = useState<string | null>(null);
  const [faqOuverte, setFaqOuverte] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Charge l'abonnement actuel depuis Supabase au montage
  useEffect(() => {
    getAbonnementActuel().then((abo) => {
      if (abo) setPlanActif(abo.plan);
    });
  }, []);

  const handleChoisir = async (planId: string) => {
    if (planId === "gratuit") {
      toast("Vous utilisez déjà le plan Gratuit. Choisissez un plan payant pour débloquer plus de fonctionnalités.", "info");
      return;
    }
    if (planActif === planId) {
      toast("Vous êtes déjà abonné à ce plan.", "info");
      return;
    }

    setLoading(true);
    const result = await souscrireAbonnement(planId);
    setLoading(false);

    if (result.erreur) {
      if (result.erreur.includes("connecté") || result.erreur.includes("boutique")) {
        toast(result.erreur + " → Connectez-vous d'abord.", "error");
      } else {
        toast(result.erreur, "error");
      }
      return;
    }

    setPlanActif(planId);
    toast(
      `🎉 Abonnement ${plans.find((p) => p.id === planId)?.nom} activé ! Bienvenue dans la famille Brotega Pro.`,
      "success"
    );
  };

  return (
    <div className="bg-[#F7F8FA] min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#00A550] via-[#007A3D] to-[#004d26] text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            🇬🇦 Spécialement conçu pour les vendeurs gabonais
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Boostez vos ventes sur<br />
            <span className="text-[#FFD100]">Brotega</span>
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
            Choisissez le plan adapté à votre activité. Sans engagement, sans frais cachés. Annulez quand vous voulez.
          </p>

          {/* Compteur d'urgence */}
          <div className="inline-flex items-center gap-2 bg-[#FF6B00]/90 px-5 py-2.5 rounded-xl text-sm font-bold animate-pulse">
            ⏰ Offre limitée — Prix valables encore <span className="font-black text-yellow-200 mx-1">6 jours</span>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10 pt-8 border-t border-white/20">
            {[
              ["500+", "Vendeurs actifs"],
              ["98%", "Satisfaction"],
              ["3×", "Plus de visibilité"],
              ["0 FCFA", "Frais de résiliation"],
            ].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-[#FFD100]">{val}</p>
                <p className="text-white/70 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-16">
          {plans.map((plan) => {
            const isAnnuel = plan.id === "annuel";
            const isGratuit = plan.id === "gratuit";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl flex flex-col transition-all duration-300 ${
                  plan.populaire
                    ? "bg-gradient-to-b from-[#00A550] to-[#007A3D] text-white shadow-2xl shadow-[#00A550]/30 scale-105 z-10 border-2 border-[#FFD100]"
                    : isAnnuel
                    ? "bg-gradient-to-b from-[#1A202C] to-[#2D3748] text-white shadow-xl"
                    : "bg-white shadow-sm border border-gray-100"
                }`}
              >
                {/* Badge populaire */}
                {plan.populaire && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFD100] text-[#1A202C] text-xs font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                    ⭐ LE PLUS POPULAIRE
                  </div>
                )}

                {/* Badge économie */}
                {plan.pourcentage && (
                  <div className={`absolute -top-3 right-3 text-xs font-black px-3 py-1 rounded-full shadow ${plan.populaire ? "bg-[#FFD100] text-[#1A202C]" : "bg-red-500 text-white"}`}>
                    -{plan.pourcentage}%
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.populaire || isAnnuel ? "text-white/60" : "text-gray-400"}`}>
                    {plan.nom}
                  </p>
                  <p className={`text-xs mb-4 leading-snug ${plan.populaire || isAnnuel ? "text-white/70" : "text-gray-500"}`}>
                    {plan.description}
                  </p>

                  {/* Prix */}
                  <div className="mb-4">
                    {plan.prixBarre && (
                      <p className={`text-sm line-through ${plan.populaire || isAnnuel ? "text-white/50" : "text-gray-400"}`}>
                        {formatXAF(plan.prixBarre)}
                      </p>
                    )}
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl font-black ${plan.populaire ? "text-white" : isAnnuel ? "text-[#FFD100]" : isGratuit ? "text-gray-700" : "text-[#00A550]"}`}>
                        {plan.prix === 0 ? "Gratuit" : formatXAF(plan.prix)}
                      </span>
                      {plan.periode && (
                        <span className={`text-xs mb-1.5 ${plan.populaire || isAnnuel ? "text-white/60" : "text-gray-400"}`}>
                          {plan.periode}
                        </span>
                      )}
                    </div>
                    {plan.economie && (
                      <p className={`text-xs font-semibold mt-0.5 ${plan.populaire ? "text-[#FFD100]" : "text-green-600"}`}>
                        Économisez {formatXAF(plan.economie)} 🎉
                      </p>
                    )}
                  </div>

                  {/* Fonctionnalités */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.limites.map((l, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${!l.inclus ? "opacity-40" : ""}`}>
                        <span className={`mt-0.5 flex-shrink-0 font-bold ${l.inclus ? (plan.populaire ? "text-[#FFD100]" : isAnnuel ? "text-[#FFD100]" : "text-[#00A550]") : "text-gray-400"}`}>
                          {l.inclus ? "✓" : "✗"}
                        </span>
                        <span className={plan.populaire || isAnnuel ? "text-white/90" : "text-gray-600"}>
                          {l.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Bouton */}
                  <button
                    onClick={() => handleChoisir(plan.id)}
                    disabled={loading && planActif === plan.id}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-70 ${
                      plan.populaire
                        ? "bg-[#FFD100] text-[#1A202C] hover:bg-yellow-300 shadow-lg"
                        : isAnnuel
                        ? "bg-[#FFD100] text-[#1A202C] hover:bg-yellow-300"
                        : isGratuit
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-[#00A550] text-white hover:bg-[#007A3D]"
                    }`}
                  >
                    {loading && planActif === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Traitement…
                      </span>
                    ) : isGratuit ? (
                      "Plan actuel"
                    ) : plan.populaire ? (
                      "🚀 Choisir ce plan"
                    ) : (
                      "Choisir ce plan"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bandeau garantie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-center">
            {[
              { icon: "🔒", titre: "Paiement sécurisé", desc: "Airtel Money, Moov Money & carte" },
              { icon: "↩️", titre: "Sans engagement", desc: "Annulez à tout moment" },
              { icon: "⚡", titre: "Activation immédiate", desc: "Votre plan actif en moins de 5 min" },
              { icon: "💬", titre: "Support WhatsApp", desc: "Notre équipe vous accompagne" },
            ].map((g) => (
              <div key={g.titre}>
                <div className="text-3xl mb-2">{g.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{g.titre}</p>
                <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignages */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-800 mb-2">Ce que disent nos vendeurs</h2>
            <p className="text-gray-500">Des centaines de vendeurs gabonais font déjà confiance à Brotega Pro.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {temoignages.map((t) => (
              <div key={t.nom} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.couleur} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{t.nom}</p>
                    <p className="text-xs text-gray-500 truncate">🏪 {t.boutique} · 📍 {t.ville}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: t.note }).map((_, i) => (
                        <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">Plan {t.plan}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic">« {t.texte} »</p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparaison tableau */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-16">
          <div className="p-6 border-b">
            <h2 className="text-xl font-black text-gray-800">Comparaison détaillée des plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-gray-500 font-semibold text-xs uppercase">Fonctionnalité</th>
                  {plans.map((p) => (
                    <th key={p.id} className={`px-4 py-3 text-center text-xs font-bold ${p.populaire ? "text-[#00A550]" : "text-gray-500"}`}>
                      {p.populaire && <span className="block text-[10px] text-[#FFD100] bg-[#00A550] rounded px-1 mb-0.5">POPULAIRE</span>}
                      {p.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  "Nombre de produits",
                  "Photos par produit",
                  "Profil boutique",
                  "Statistiques de vente",
                  "Badge vendeur vérifié",
                  "Mise en avant catalogue",
                  "Support WhatsApp",
                  "Support prioritaire 24h/24",
                ].map((feature, fi) => (
                  <tr key={feature} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-gray-700">{feature}</td>
                    {plans.map((p) => {
                      const valeurs = [
                        ["3 max", "Illimité", "Illimité", "Illimité", "Illimité"],
                        ["1", "5", "10", "Illimité", "Illimité"],
                        ["Basique", "Complet", "Complet", "Premium", "Premium + vidéo"],
                        ["✗", "✓", "✓", "Avancées", "Avancées + export"],
                        ["✗", "✓", "✓", "✓", "✓"],
                        ["✗", "✗", "✓", "✓", "✓ (#1)"],
                        ["Communauté", "✓", "Prioritaire", "Prioritaire", "VIP"],
                        ["✗", "✗", "✗", "✓", "✓"],
                      ];
                      const val = valeurs[fi][plans.indexOf(p)];
                      const positif = val !== "✗";
                      return (
                        <td key={p.id} className={`px-4 py-3.5 text-center text-xs font-semibold ${p.populaire ? "bg-[#E8F7EE]" : ""} ${positif ? "text-[#00A550]" : "text-gray-300"}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="px-5 py-4 font-bold text-gray-800">Prix</td>
                  {plans.map((p) => (
                    <td key={p.id} className={`px-4 py-4 text-center ${p.populaire ? "bg-[#E8F7EE]" : ""}`}>
                      <p className={`font-black text-sm ${p.populaire ? "text-[#00A550]" : p.id === "annuel" ? "text-[#1A202C]" : "text-gray-700"}`}>
                        {p.prix === 0 ? "Gratuit" : formatXAF(p.prix)}
                      </p>
                      {p.prixBarre && (
                        <p className="text-xs text-gray-400 line-through">{formatXAF(p.prixBarre)}</p>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4"></td>
                  {plans.map((p) => (
                    <td key={p.id} className={`px-4 py-4 text-center ${p.populaire ? "bg-[#E8F7EE]" : ""}`}>
                      <button
                        onClick={() => handleChoisir(p.id)}
                        disabled={p.id === "gratuit"}
                        className={`text-xs font-bold px-3 py-2 rounded-lg transition-all ${
                          p.populaire
                            ? "bg-[#00A550] text-white hover:bg-[#007A3D]"
                            : p.id === "gratuit"
                            ? "bg-gray-100 text-gray-400 cursor-default"
                            : "border border-[#00A550] text-[#00A550] hover:bg-[#E8F7EE]"
                        }`}
                      >
                        {p.id === "gratuit" ? "Actuel" : "Choisir"}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-800 mb-2">Questions fréquentes</h2>
            <p className="text-gray-500">Tout ce que vous devez savoir sur nos abonnements.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faq.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setFaqOuverte(faqOuverte === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-gray-800 text-sm pr-4">{f.q}</span>
                  <span className={`text-[#00A550] font-bold text-xl flex-shrink-0 transition-transform duration-200 ${faqOuverte === i ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {faqOuverte === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {f.r}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="bg-gradient-to-br from-[#00A550] to-[#007A3D] rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 text-[200px] flex items-center justify-center pointer-events-none select-none">🚀</div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-black mb-3">Prêt à développer votre activité ?</h2>
            <p className="text-white/80 mb-2 max-w-lg mx-auto">
              Rejoignez les 500+ vendeurs qui font confiance à Brotega Pro. Commencez aujourd'hui.
            </p>
            <p className="text-[#FFD100] text-sm font-semibold mb-6">
              ⏰ Offre spéciale — Économisez jusqu'à 9 000 FCFA cette semaine uniquement
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => handleChoisir("trimestriel")}
                className="bg-[#FFD100] hover:bg-yellow-300 text-[#1A202C] font-black px-8 py-3.5 rounded-xl transition-colors text-base"
              >
                🚀 Démarrer avec le plan Trimestriel
              </button>
              <Link
                href="/vendor/register"
                className="border-2 border-white/40 hover:bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center"
              >
                Créer ma boutique d'abord
              </Link>
            </div>
            <p className="text-white/50 text-xs mt-4">Sans engagement · Annulation facile · Support 6j/7</p>
          </div>
        </div>

        {/* Lien retour dashboard */}
        <div className="text-center mt-8">
          <Link href="/vendor/dashboard" className="text-sm text-gray-400 hover:text-[#00A550] transition-colors">
            ← Retour au dashboard vendeur
          </Link>
        </div>
      </div>
    </div>
  );
}
