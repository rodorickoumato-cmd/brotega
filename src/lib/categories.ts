import { createAdminClient } from "@/lib/supabase/admin";
import { categories as CATEGORIES_STATIQUES } from "@/data/categories";
import type { Category } from "@/types";

type CatDB = {
  slug: string;
  nom: string;
  icone: string;
  couleur: string;
  bg: string;
  ordre: number;
};

function dbVersCategory(row: CatDB, index: number): Category {
  const statique = CATEGORIES_STATIQUES.find((c) => c.slug === row.slug);
  return {
    id: String(index + 1),
    name: row.nom,
    slug: row.slug,
    icon: row.icone,
    color: row.couleur,
    bg: row.bg,
    image: statique?.image ?? "",
    productCount: statique?.productCount ?? 0,
    subcategories: statique?.subcategories ?? [],
  };
}

export async function getCategories(): Promise<Category[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("categories_produits")
      .select("slug, nom, icone, couleur, bg, ordre")
      .eq("actif", true)
      .order("ordre");

    if (error || !data?.length) return CATEGORIES_STATIQUES;
    return data.map((row, i) => dbVersCategory(row as CatDB, i));
  } catch {
    return CATEGORIES_STATIQUES;
  }
}
