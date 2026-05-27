import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegister } from "@/components/sw/ServiceWorkerRegister";
import { PushPermissionBanner } from "@/components/ui/PushPermissionBanner";

const CATEGORIES = [
  { icon: "🥗", label: "Alimentation", slug: "alimentation" },
  { icon: "👗", label: "Mode & Vêtements", slug: "mode" },
  { icon: "📱", label: "Électronique", slug: "electronique" },
  { icon: "🏠", label: "Maison & Déco", slug: "maison" },
  { icon: "💄", label: "Beauté & Santé", slug: "beaute" },
  { icon: "🌿", label: "Artisanat", slug: "artisanat" },
];

const GARANTIES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    titre: "Mobile Money",
    desc: "Airtel & Moov Money",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    titre: "Paiement sécurisé",
    desc: "Argent bloqué jusqu'à livraison",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    titre: "Livraison rapide",
    desc: "Partout au Gabon",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    titre: "Vendeurs vérifiés",
    desc: "Boutiques contrôlées",
  },
];

export default function HomePage() {
  return (
    <>
      <ServiceWorkerRegister />
      <PushPermissionBanner />
      <Header />
      <main className="flex-1 bg-[#F7F8FA]">

        {/* Hero */}
        <div className="bg-[#E63946] px-5 pt-10 pb-16">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">
            La marketplace du Gabon
          </p>
          <h1 className="text-3xl font-black text-white leading-tight mb-3">
            Achetez et vendez<br />en toute confiance
          </h1>
          <p className="text-white/80 text-sm mb-7 leading-relaxed">
            Produits locaux livrés partout au Gabon.<br />
            Paiement sécurisé Airtel &amp; Moov Money.
          </p>
          <div className="flex gap-3">
            <Link
              href="/catalogue"
              className="bg-white text-[#E63946] font-black px-5 py-3 rounded-xl text-sm shadow-lg active:scale-95 transition-transform"
            >
              Voir les produits
            </Link>
            <Link
              href="/vendor/register"
              className="bg-white/10 border border-white/30 text-white font-semibold px-5 py-3 rounded-xl text-sm active:scale-95 transition-transform"
            >
              Vendre ici
            </Link>
          </div>
        </div>

        {/* Catégories */}
        <div className="-mt-6 mx-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-800 text-base mb-4">Parcourir par catégorie</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogue?categorie=${c.slug}`}
                className="flex flex-col items-center gap-1.5 bg-[#F7F8FA] hover:bg-[#FEF2F2] rounded-xl py-3.5 px-2 active:scale-95 transition-all border border-transparent hover:border-[#E63946]/20"
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Garanties */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          {GARANTIES.map((g) => (
            <div key={g.titre} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
              <div className="text-[#E63946] flex-shrink-0 mt-0.5">{g.icon}</div>
              <div>
                <p className="font-bold text-sm text-gray-800">{g.titre}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA vendeur */}
        <div className="mx-4 mt-4 mb-10 bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Vous êtes commerçant ?</p>
          <h3 className="text-white font-black text-lg mb-1">Ouvrez votre boutique</h3>
          <p className="text-gray-400 text-xs mb-4">3 produits gratuits · Sans commission · Accès immédiat</p>
          <Link
            href="/vendor/register"
            className="inline-flex items-center gap-2 bg-[#E63946] text-white font-black px-5 py-3 rounded-xl text-sm active:scale-95 transition-transform"
          >
            Commencer gratuitement
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

      </main>
      <Footer />
    </>
  );
}
