// URL absolue du site — jamais dérivée de `window.location.origin` côté
// composant client : au premier rendu (SSR, avant hydratation), `window`
// est indéfini, ce qui produisait un lien relatif figé dans les partages
// (ex: WhatsApp envoyait "/produit/xxx" au lieu de l'URL complète).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brotegafrica.org";

export function formatXAF(amount: number): string {
  return new Intl.NumberFormat("fr-GA", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDiscount(price: number, originalPrice: number): number {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const PROVINCES_GABON: Record<string, string[]> = {
  "Estuaire":         ["Libreville", "Owendo", "Akanda", "Ntoum", "Kango", "Cocobeach"],
  "Haut-Ogooué":      ["Franceville", "Moanda", "Mounana", "Okondja", "Bakoumba", "Lekoni", "Bongoville", "Akiéni"],
  "Moyen-Ogooué":     ["Lambaréné", "Ndjolé", "Sindara", "Bifoun", "Malinga"],
  "Ngounié":          ["Mouila", "Ndendé", "Fougamou", "Mimongo", "Lebamba", "Mbigou", "Mandji"],
  "Nyanga":           ["Tchibanga", "Mayumba", "Moabi", "Ndindi", "Mabanda"],
  "Ogooué-Ivindo":    ["Makokou", "Booué", "Mékambo", "Ovan", "Lopé"],
  "Ogooué-Lolo":      ["Koulamoutou", "Lastoursville", "Pana", "Lebombi"],
  "Ogooué-Maritime":  ["Port-Gentil", "Gamba", "Omboué", "Ntounga"],
  "Woleu-Ntem":       ["Oyem", "Bitam", "Mitzic", "Minvoul", "Médouneu", "Aboumi"],
};

export const CITIES_GABON = Object.values(PROVINCES_GABON).flat();
