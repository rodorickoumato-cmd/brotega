import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const CATEGORIES = [
  { icon: "🥗", label: "Alimentation", slug: "alimentation" },
  { icon: "👗", label: "Mode", slug: "mode" },
  { icon: "📱", label: "Électronique", slug: "electronique" },
  { icon: "🏠", label: "Maison", slug: "maison" },
  { icon: "💄", label: "Beauté", slug: "beaute" },
  { icon: "🌿", label: "Artisanat", slug: "artisanat" },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#F7F8FA]">

        {/* Hero */}
        <div className="bg-[#E63946] px-5 pt-8 pb-14">
          <p className="text-white/70 text-sm font-medium mb-1">Bienvenue sur</p>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            J'adore la Famille 🇬🇦
          </h1>
          <p className="text-white/80 text-sm mb-6">
            Le marché gabonais en ligne — Airtel & Moov Money
          </p>
          <Link
            href="/catalogue"
            className="inline-block bg-white text-[#E63946] font-black px-6 py-3 rounded-2xl text-sm shadow-lg active:scale-95 transition-all"
          >
            Voir les produits →
          </Link>
        </div>

        {/* Catégories */}
        <div className="-mt-6 mx-4 bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-black text-gray-800 mb-4">Catégories</h2>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogue?categorie=${c.slug}`}
                className="flex flex-col items-center gap-1.5 bg-[#F7F8FA] rounded-2xl py-3 px-2 active:scale-95 transition-all"
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pourquoi J'adore la Famille */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-2xl mb-2">📱</div>
            <p className="font-bold text-sm text-gray-800">Mobile Money</p>
            <p className="text-xs text-gray-500 mt-0.5">Airtel & Moov Money acceptés</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="font-bold text-sm text-gray-800">Paiement sécurisé</p>
            <p className="text-xs text-gray-500 mt-0.5">Argent bloqué jusqu'à livraison</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-2xl mb-2">🚚</div>
            <p className="font-bold text-sm text-gray-800">Livraison rapide</p>
            <p className="text-xs text-gray-500 mt-0.5">Partout au Gabon</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-2xl mb-2">🏪</div>
            <p className="font-bold text-sm text-gray-800">Vendeurs vérifiés</p>
            <p className="text-xs text-gray-500 mt-0.5">Boutiques contrôlées</p>
          </div>
        </div>

        {/* CTA vendeur */}
        <div className="mx-4 mt-4 mb-8 bg-[#E63946] rounded-3xl p-6">
          <p className="text-white/80 text-xs font-medium mb-1">Vous vendez quelque chose ?</p>
          <h3 className="text-white font-black text-lg mb-3">Ouvrez votre boutique gratuitement</h3>
          <Link
            href="/vendor/register"
            className="inline-block bg-white text-[#E63946] font-black px-5 py-2.5 rounded-xl text-sm active:scale-95 transition-all"
          >
            Commencer →
          </Link>
        </div>

      </main>
      <Footer />
    </>
  );
}
