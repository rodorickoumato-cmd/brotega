import Link from "next/link";

// ─── Données des plans ────────────────────────────────────────────────────────

const PLANS_MARKETING = [
  {
    id: "gratuit",
    emoji: "🌱",
    nom: "Découverte",
    prix: 0,
    prixBarre: null,
    duree: null,
    economie: null,
    badge: null,
    tagline: "Pour commencer simplement",
    avantages: [
      "Jusqu'à 3 produits",
      "Accès marketplace",
      "Réception des commandes",
      "Support standard",
    ],
    note: "Idéal pour découvrir la plateforme avant de passer au niveau supérieur.",
    cta: "Commencer maintenant",
    ctaHref: "/vendor/register",
    ctaStyle: "secondary",
    populaire: false,
  },
  {
    id: "mensuel",
    emoji: "📦",
    nom: "Business Mensuel",
    prix: 2_000,
    prixBarre: null,
    duree: "mois",
    economie: null,
    badge: null,
    tagline: "Pour vendre sans limites",
    avantages: [
      "Produits illimités",
      "Boutique active",
      "Accès complet vendeur",
      "Support prioritaire",
      "Visibilité améliorée",
    ],
    note: "Recommandé pour les vendeurs actifs.",
    cta: "Activer mon abonnement",
    ctaHref: "/vendor/abonnement",
    ctaStyle: "primary",
    populaire: false,
  },
  {
    id: "trimestriel",
    emoji: "🚀",
    nom: "Business Trimestriel",
    prix: 5_000,
    prixBarre: 6_000,
    duree: "3 mois",
    economie: "1 000 XAF",
    badge: "Le plus choisi",
    tagline: "Le meilleur équilibre rentabilité / visibilité",
    avantages: [
      "Produits illimités",
      "Mise en avant améliorée",
      "Badge vendeur actif",
      "Plus de visibilité dans le catalogue",
      "Statistiques essentielles",
      "Support prioritaire",
    ],
    note: "Excellent pour développer rapidement ses ventes.",
    cta: "Profiter de l'offre",
    ctaHref: "/vendor/abonnement",
    ctaStyle: "premium",
    populaire: true,
  },
  {
    id: "semestriel",
    emoji: "💎",
    nom: "Business Semestriel",
    prix: 8_000,
    prixBarre: 12_000,
    duree: "6 mois",
    economie: "4 000 XAF",
    badge: "Recommandé",
    tagline: "Construisez une activité stable",
    avantages: [
      "Produits illimités",
      "Visibilité renforcée",
      "Priorité dans certaines catégories",
      "Statistiques avancées",
      "Badge vendeur recommandé",
      "Support accéléré",
    ],
    note: "Plus de stabilité = plus de confiance clients.",
    cta: "Développer mon activité",
    ctaHref: "/vendor/abonnement",
    ctaStyle: "primary",
    populaire: false,
  },
  {
    id: "annuel",
    emoji: "👑",
    nom: "Business Annuel Premium",
    prix: 15_000,
    prixBarre: 24_000,
    duree: "an",
    economie: "9 000 XAF",
    badge: "Meilleur prix",
    tagline: "La formule la plus rentable pour les vendeurs sérieux",
    avantages: [
      "Produits illimités",
      "Visibilité maximale",
      "Badge vendeur vérifié premium",
      "Priorité dans les recherches",
      "Mise en avant régulière",
      "Accès prioritaire aux nouveautés",
      "Support VIP",
    ],
    note: "Idéal pour transformer J'adore la Famille en véritable source de revenus.",
    cta: "Passer au niveau Premium",
    ctaHref: "/vendor/abonnement",
    ctaStyle: "premium",
    populaire: false,
  },
] as const;

function formatXAF(n: number) {
  return new Intl.NumberFormat("fr-GA", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
  }).format(n);
}

// ─── Carte plan ───────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: typeof PLANS_MARKETING[number] }) {
  const isPopulaire = plan.populaire;
  const isFree = plan.prix === 0;

  return (
    <div className={`relative rounded-3xl overflow-hidden ${
      isPopulaire
        ? "border-2 border-[#E63946] shadow-xl shadow-[#E63946]/10"
        : "border border-gray-200 bg-white shadow-sm"
    } ${isPopulaire ? "bg-white" : ""}`}>

      {/* Badge populaire */}
      {plan.badge && (
        <div className={`absolute top-0 right-0 text-xs font-black px-3 py-1.5 rounded-bl-2xl ${
          isPopulaire ? "bg-[#E63946] text-white" : "bg-amber-100 text-amber-700"
        }`}>
          {isPopulaire ? "🔥 " : "⭐ "}{plan.badge}
        </div>
      )}

      <div className="p-6">
        {/* En-tête */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{plan.emoji}</span>
          <div className="flex-1">
            <h3 className={`font-black text-lg leading-tight ${isPopulaire ? "text-[#E63946]" : "text-gray-800"}`}>
              {plan.nom}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{plan.tagline}</p>
          </div>
        </div>

        {/* Prix */}
        <div className="mb-5">
          {isFree ? (
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${isPopulaire ? "text-[#E63946]" : "text-gray-800"}`}>
                Gratuit
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${isPopulaire ? "text-[#E63946]" : "text-gray-800"}`}>
                  {formatXAF(plan.prix)}
                </span>
                {plan.duree && (
                  <span className="text-sm text-gray-400 font-medium">/ {plan.duree}</span>
                )}
              </div>
              {plan.prixBarre && (
                <p className="text-sm text-gray-400 mt-0.5">
                  <span className="line-through">{formatXAF(plan.prixBarre)}</span>
                  {plan.economie && (
                    <span className="ml-2 text-[#E63946] font-bold">— {plan.economie} économisés</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>

        {/* Avantages */}
        <ul className="space-y-2 mb-5">
          {plan.avantages.map((a) => (
            <li key={a} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-[#E63946] font-black flex-shrink-0 mt-0.5">✔</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>

        {/* Note */}
        <p className="text-xs text-gray-400 italic mb-5 leading-relaxed">
          {plan.note}
        </p>

        {/* CTA */}
        <Link
          href={plan.ctaHref}
          className={`block w-full text-center font-black py-3.5 rounded-2xl text-sm transition-all active:scale-95 ${
            plan.ctaStyle === "premium"
              ? "bg-[#E63946] text-white shadow-lg shadow-[#E63946]/30"
              : plan.ctaStyle === "primary"
              ? "bg-[#E63946] text-white"
              : "bg-gray-100 text-gray-500 text-xs"
          }`}>
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevenirVendeurPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="bg-[#E63946] px-5 pt-14 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 text-[280px] font-black text-white flex items-center justify-center select-none pointer-events-none">
          🇬🇦
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">Offre de lancement — places limitées</span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            Développez votre business avec J'adore la Famille 🇬🇦
          </h1>
          <p className="text-white/80 text-sm mt-3 leading-relaxed">
            Vendez vos produits partout au Gabon, trouvez de nouveaux clients chaque jour et transformez votre activité en véritable source de revenus.
          </p>
          <p className="text-white font-black text-sm mt-3">
            🔥 Rejoignez une marketplace moderne conçue pour les vendeurs ambitieux.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4 pb-12 space-y-5">

        {/* ── Pourquoi nous rejoindre ────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <h2 className="font-black text-gray-800 mb-4">🚀 Pourquoi les vendeurs nous rejoignent ?</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Plus de visibilité",
              "Plus de clients",
              "Plus de commandes",
              "Gestion depuis téléphone",
              "Support WhatsApp rapide",
              "Adaptée au Gabon",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 bg-[#FEF2F2] rounded-xl px-3 py-2.5">
                <span className="text-[#E63946] font-black text-sm">✅</span>
                <span className="text-xs font-semibold text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bannière offre lancement ───────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex gap-3">
          <span className="text-2xl flex-shrink-0">⏳</span>
          <div>
            <p className="font-black text-amber-800 text-sm">Offre de lancement limitée</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Tarifs promotionnels actuellement disponibles. Les prix évolueront progressivement avec la croissance de la plateforme. Déjà plusieurs vendeurs actifs nous ont rejoints.
            </p>
          </div>
        </div>

        {/* ── Titre section plans ────────────────────────────── */}
        <div className="text-center pt-2">
          <h2 className="font-black text-xl text-gray-800">Nos formules vendeurs</h2>
          <p className="text-sm text-gray-500 mt-1">Choisissez le plan qui correspond à votre ambition</p>
        </div>

        {/* ── Plan populaire en avant ────────────────────────── */}
        <PlanCard plan={PLANS_MARKETING[2]} />

        {/* ── Autres plans ──────────────────────────────────── */}
        <div className="space-y-3">
          {[PLANS_MARKETING[1], PLANS_MARKETING[3], PLANS_MARKETING[4]].map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* ── Plan gratuit — discret ─────────────────────────── */}
        <div className="border border-dashed border-gray-200 rounded-3xl overflow-hidden">
          <PlanCard plan={PLANS_MARKETING[0]} />
        </div>

        {/* ── Réassurance ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "✅", label: "Annulation possible" },
              { icon: "⚡", label: "Activation immédiate" },
              { icon: "💬", label: "Support WhatsApp" },
              { icon: "📱", label: "Paiement Mobile Money" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-semibold text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA final ─────────────────────────────────────── */}
        <div className="bg-[#E63946] rounded-3xl p-6 text-center">
          <p className="text-xl font-black text-white mb-2">
            🚀 Commencez à vendre dès aujourd&apos;hui
          </p>
          <p className="text-white/80 text-sm mb-5 leading-relaxed">
            Développez votre visibilité, trouvez de nouveaux clients et faites évoluer votre activité avec une plateforme pensée pour le marché africain.
          </p>
          <Link
            href="/vendor/register"
            className="inline-block bg-white text-[#E63946] font-black px-8 py-4 rounded-2xl text-sm active:scale-95 transition-all shadow-lg">
            Ouvrir ma boutique gratuitement →
          </Link>
        </div>

      </div>
    </div>
  );
}
