import Link from "next/link";

const steps = [
  {
    num: "01",
    title: "Créez votre compte",
    desc: "Inscrivez-vous gratuitement en moins de 2 minutes. Un simple numéro de téléphone suffit pour démarrer.",
    icon: "👤",
  },
  {
    num: "02",
    title: "Configurez votre boutique",
    desc: "Donnez un nom à votre boutique, ajoutez une description et choisissez vos catégories de vente.",
    icon: "🏪",
  },
  {
    num: "03",
    title: "Ajoutez vos produits",
    desc: "Publiez vos produits avec photos, descriptions et prix. Vos articles sont en ligne en quelques minutes.",
    icon: "📦",
  },
  {
    num: "04",
    title: "Recevez des commandes",
    desc: "Les clients passent commande et paient en ligne. Vous êtes notifié instantanément sur WhatsApp.",
    icon: "🔔",
  },
  {
    num: "05",
    title: "Livrez et encaissez",
    desc: "Livrez vos clients et recevez votre paiement directement sur Airtel Money ou Moov Money.",
    icon: "💰",
  },
];

const avantages = [
  { icon: "🆓", title: "Gratuit", desc: "Création de boutique 100% gratuite, sans frais d'inscription ni abonnement mensuel." },
  { icon: "💸", title: "Commission réduite", desc: "Seulement 5% de commission par vente. Gardez 95% de vos revenus." },
  { icon: "📊", title: "Dashboard puissant", desc: "Gérez vos produits, commandes et analyses depuis un tableau de bord intuitif." },
  { icon: "📱", title: "Paiement Mobile Money", desc: "Recevez vos paiements sur Airtel Money ou Moov Money automatiquement." },
  { icon: "🚚", title: "Livraison facilitée", desc: "Accès à notre réseau de livraison dans 12 villes gabonaises." },
  { icon: "✅", title: "Badge vérifié", desc: "Obtenez le badge « Vendeur vérifié » pour inspirer confiance aux acheteurs." },
];

export default function VendrePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#E63946] to-[#C1121F] rounded-3xl p-8 text-white text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black mb-3">Vendez sur J'adore la Famille 🇬🇦</h1>
        <p className="text-white/80 text-lg mb-6 max-w-xl mx-auto">
          Rejoignez plus de 500 vendeurs et touchez des milliers de clients dans tout le Gabon.
        </p>
        <Link
          href="/vendor/register"
          className="inline-flex items-center gap-2 bg-[#FFD100] hover:bg-[#E6BC00] text-[#1A202C] font-black px-8 py-3.5 rounded-xl transition-colors text-lg"
        >
          🏪 Créer ma boutique gratuitement
        </Link>
        <p className="text-white/60 text-xs mt-3">Aucune carte bancaire requise · Boutique en ligne en 5 minutes</p>
      </div>

      {/* Étapes */}
      <div className="mb-12">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">Comment ça marche ?</h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.num} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-5">
              <div className="w-12 h-12 bg-[#E63946] rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {s.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{s.icon}</span>
                  <h3 className="font-bold text-gray-800">{s.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avantages */}
      <div className="mb-10">
        <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">Pourquoi vendre sur J'adore la Famille ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {avantages.map((a) => (
            <div key={a.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="font-bold text-gray-800 mb-1">{a.title}</h3>
              <p className="text-sm text-gray-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div className="text-center bg-[#FEF2F2] rounded-2xl p-8">
        <h2 className="text-2xl font-black text-gray-800 mb-2">Prêt à commencer ?</h2>
        <p className="text-gray-500 mb-5">Votre boutique en ligne vous attend. Démarrez aujourd'hui.</p>
        <Link href="/vendor/register" className="inline-flex bg-[#E63946] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#C1121F] transition-colors">
          Créer ma boutique →
        </Link>
      </div>
    </div>
  );
}
