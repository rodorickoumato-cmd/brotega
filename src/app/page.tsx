import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegister } from "@/components/sw/ServiceWorkerRegister";
import { PushPermissionBanner } from "@/components/ui/PushPermissionBanner";
import { createClient } from "@/lib/supabase/server";
import { formatXAF } from "@/lib/utils";

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

async function loadProduitsPop() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("produits")
      .select("id, nom, prix, image, categorie, created_at, vendeurs(nom)")
      .eq("statut", "actif")
      .order("created_at", { ascending: false })
      .limit(8);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const produits = await loadProduitsPop();

  return (
    <>
      <ServiceWorkerRegister />
      <PushPermissionBanner />
      <Header />
      <main className="flex-1 bg-[#F7F8FA]">

        {/* Hero — Simplifié pour la clarté */}
        <div className="bg-[#E63946] px-5 pt-8 pb-6">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
            La marketplace du Gabon
          </p>
          <h1 className="text-2xl font-black text-white leading-tight mb-2">
            Produits locaux livrés partout
          </h1>
          <p className="text-white/80 text-xs mb-4">
            Paiement sécurisé Singpay (Airtel &amp; Moov Money)
          </p>
          <Link
            href="/catalogue"
            className="inline-block bg-white text-[#E63946] font-black px-4 py-2.5 rounded-lg text-sm active:scale-95 transition-transform"
          >
            Voir tous les produits →
          </Link>
        </div>

        {/* Catégories — Accès rapide */}
        <div className="-mt-3 mx-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/catalogue?categorie=${c.slug}`}
                className="flex flex-col items-center gap-1 bg-[#F7F8FA] hover:bg-[#FEF2F2] rounded-lg py-3 px-2 active:scale-95 transition-all border border-transparent hover:border-[#E63946]/20"
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Produits populaires — EN PRIORITÉ */}
        <div className="mx-4 mt-4">
          <h2 className="font-black text-gray-800 text-base mb-3 flex items-center gap-2">
            ✨ Produits populaires
          </h2>
          {produits.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {produits.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/produit/${p.id}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden relative">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-gray-800 text-sm line-clamp-2">{p.nom}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.vendeurs?.nom}</p>
                    <p className="font-black text-[#E63946] text-sm mt-2">{formatXAF(p.prix)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <p className="text-gray-500">Aucun produit disponible pour le moment</p>
              <Link href="/vendor/register" className="text-[#E63946] font-bold text-sm mt-2 inline-block">
                Devenez vendeur →
              </Link>
            </div>
          )}
        </div>

        {/* Garanties — Confiance */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2.5">
          {GARANTIES.map((g) => (
            <div key={g.titre} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-start gap-2">
              <div className="text-[#E63946] flex-shrink-0 mt-0.5 w-5 h-5">{g.icon}</div>
              <div>
                <p className="font-bold text-xs text-gray-800">{g.titre}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Vendeur — Discret mais accessible */}
        <div className="mx-4 mt-4 mb-6 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
          <p className="text-gray-600 text-xs font-semibold mb-2">💼 Vendeur ?</p>
          <p className="text-gray-700 text-sm font-bold mb-3">Ouvrez votre boutique gratuitement</p>
          <p className="text-gray-500 text-xs mb-3">📦 Illimité d'articles • Accès immédiat • Support 24/7</p>
          <Link
            href="/vendor/register"
            className="text-[#E63946] font-black text-sm inline-flex items-center gap-1 hover:underline active:scale-95 transition-transform"
          >
            Commencer →
          </Link>
        </div>

      </main>
      <Footer />
    </>
  );
}
