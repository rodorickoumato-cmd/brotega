import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/utils";
import { categories } from "@/data/categories";
import type { Produit } from "@/lib/supabase/database.types";

// ─── Carte produit ─────────────────────────────────────────────────────────────

function ProduitCard({ produit }: { produit: Produit }) {
  const cat = categories.find((c) => c.slug === produit.categorie);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-all">
      <div className="w-full aspect-square bg-gray-100 relative">
        {produit.image ? (
          <img src={produit.image} alt={produit.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
        )}
        {cat && (
          <span className="absolute top-2 left-2 text-xs font-bold bg-white/90 text-gray-700 px-2 py-0.5 rounded-full">
            {cat.icon} {cat.name}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-black text-gray-800 text-sm leading-tight line-clamp-2">{produit.nom}</p>
        {produit.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{produit.description}</p>
        )}
        <p className="text-[#E63946] font-black text-base mt-2">{formatXAF(produit.prix)}</p>
      </div>
    </div>
  );
}

// ─── Page vendeur ──────────────────────────────────────────────────────────────

export default async function VendeurPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!vendeur) notFound();

  const { data: produits } = await supabase
    .from("produits")
    .select("*")
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "actif")
    .order("created_at", { ascending: false });

  const liste = produits ?? [];
  const initiales = vendeur.nom.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-5 pb-10">
        <Link href="/catalogue" className="text-white/70 text-sm">← Catalogue</Link>

        <div className="flex items-center gap-4 mt-4">
          {vendeur.logo_url ? (
            <img src={vendeur.logo_url} alt={vendeur.nom}
              className="w-16 h-16 rounded-2xl border-4 border-white/30 object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {initiales}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white leading-tight">{vendeur.nom}</h1>
              {vendeur.statut === "verifie" && (
                <span className="text-xs font-bold bg-white text-[#E63946] px-2 py-0.5 rounded-full flex-shrink-0">
                  ✓ Vérifié
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm mt-0.5">📍 {vendeur.ville}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {liste.length} produit{liste.length !== 1 ? "s" : ""}
              {vendeur.note > 0 && ` · ⭐ ${vendeur.note.toFixed(1)} (${vendeur.nb_avis} avis)`}
            </p>
          </div>
        </div>

        {vendeur.description && (
          <p className="text-white/80 text-sm mt-4 leading-relaxed">{vendeur.description}</p>
        )}

        {/* Catégories */}
        {vendeur.categories?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {vendeur.categories.map((c: string) => (
              <span key={c} className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Bouton WhatsApp */}
        {vendeur.whatsapp && (
          <a
            href={`https://wa.me/${vendeur.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-sm active:scale-95 transition-all">
            💬 Contacter sur WhatsApp
          </a>
        )}

        {/* Grille produits */}
        {liste.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="font-black text-gray-700 mb-1">Boutique vide</p>
            <p className="text-sm text-gray-400">Ce vendeur n'a pas encore de produits actifs.</p>
          </div>
        ) : (
          <>
            <h2 className="font-black text-gray-800 text-base">
              Produits ({liste.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {liste.map((p) => <ProduitCard key={p.id} produit={p} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
