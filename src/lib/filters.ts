// Système de filtrage avancé pour le catalogue

export type TriOption = "recent" | "prix-asc" | "prix-desc";

export type FiltresEtat = {
  recherche: string;
  categorie: string | null;
  tri: TriOption;
  prixMin: number;
  prixMax: number;
};

export type ProduitFiltre = {
  id: string;
  nom: string;
  prix: number;
  image: string | null;
  categorie: string | null;
  vendeur_id: string;
  created_at: string;
  vendeurs: { nom: string; slug: string; ville: string | null } | null;
};

/**
 * Applique tous les filtres et tri sur la liste de produits
 */
export function appliquerFiltres(
  produits: ProduitFiltre[],
  filtres: FiltresEtat
): ProduitFiltre[] {
  let resultat = [...produits];

  // Filtre par recherche
  if (filtres.recherche.trim()) {
    const q = filtres.recherche.toLowerCase();
    resultat = resultat.filter((p) =>
      p.nom.toLowerCase().includes(q) ||
      p.vendeurs?.nom.toLowerCase().includes(q)
    );
  }

  // Filtre par catégorie
  if (filtres.categorie) {
    resultat = resultat.filter((p) => p.categorie === filtres.categorie);
  }

  // Filtre par prix
  resultat = resultat.filter(
    (p) => p.prix >= filtres.prixMin && p.prix <= filtres.prixMax
  );

  // Tri
  if (filtres.tri === "prix-asc") {
    resultat.sort((a, b) => a.prix - b.prix);
  } else if (filtres.tri === "prix-desc") {
    resultat.sort((a, b) => b.prix - a.prix);
  } else {
    // recent (défaut)
    resultat.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return resultat;
}

/**
 * Détecte la plage de prix min/max des produits
 */
export function detecterPlagesPrix(produits: ProduitFiltre[]): { min: number; max: number } {
  if (produits.length === 0) return { min: 0, max: 1000000 };

  const prix = produits.map((p) => p.prix);
  return {
    min: Math.min(...prix),
    max: Math.max(...prix),
  };
}

/**
 * Récupère les statistiques des produits filtrés
 */
export function getStatsFiltrés(
  produits: ProduitFiltre[],
  filtrés: ProduitFiltre[]
): {
  total: number;
  visible: number;
  prixMoyen: number;
  categoriesUniques: number;
} {
  const prixMoyen =
    filtrés.length > 0
      ? filtrés.reduce((sum, p) => sum + p.prix, 0) / filtrés.length
      : 0;

  const categories = new Set(filtrés.map((p) => p.categorie).filter(Boolean));

  return {
    total: produits.length,
    visible: filtrés.length,
    prixMoyen: Math.round(prixMoyen),
    categoriesUniques: categories.size,
  };
}

/**
 * Formate les URL de recherche avec les paramètres
 */
export function buildSearchUrl(filtres: FiltresEtat): string {
  const params = new URLSearchParams();

  if (filtres.recherche.trim()) params.set("q", filtres.recherche.trim());
  if (filtres.categorie) params.set("categorie", filtres.categorie);
  if (filtres.tri !== "recent") params.set("tri", filtres.tri);
  if (filtres.prixMin > 0) params.set("prixMin", filtres.prixMin.toString());
  if (filtres.prixMax < 1000000) params.set("prixMax", filtres.prixMax.toString());

  return params.toString() ? `?${params.toString()}` : "";
}

/**
 * Parse les paramètres d'URL en objet FiltresEtat
 */
export function parseSearchParams(searchParams: URLSearchParams): FiltresEtat {
  const { min: prixMin, max: prixMax } = detecterPlagesPrix([]);

  return {
    recherche: searchParams.get("q") ?? "",
    categorie: searchParams.get("categorie") ?? null,
    tri: (searchParams.get("tri") ?? "recent") as TriOption,
    prixMin: parseInt(searchParams.get("prixMin") ?? prixMin.toString()),
    prixMax: parseInt(searchParams.get("prixMax") ?? prixMax.toString()),
  };
}
