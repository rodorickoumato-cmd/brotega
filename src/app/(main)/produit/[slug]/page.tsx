import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/data/products";
import { ProductPageClient } from "./ProductPageClient";
import { SupabaseProduitClient } from "./SupabaseProduitClient";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  if (UUID_RE.test(slug)) {
    const supabase = await createClient();
    const { data } = await supabase.from("produits").select("nom").eq("id", slug).single();
    return { title: data ? `${data.nom} — J'adore la Famille` : "Produit — J'adore la Famille" };
  }

  const product = getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable — J'adore la Famille" };
  return {
    title: `${product.name} — J'adore la Famille`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.images[0], alt: product.name }],
    },
  };
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Produit Supabase (UUID)
  if (UUID_RE.test(slug)) {
    const supabase = await createClient();
    const [{ data: produit }, ] = await Promise.all([
      supabase.from("produits").select("*").eq("id", slug).single(),
    ]);
    if (!produit) notFound();

    const { data: vendeur } = await supabase
      .from("vendeurs").select("*").eq("id", produit.vendeur_id).single();

    return <SupabaseProduitClient produit={produit} vendeur={vendeur ?? null} />;
  }

  // Produit mock (slug)
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return <ProductPageClient product={product} related={related} />;
}
