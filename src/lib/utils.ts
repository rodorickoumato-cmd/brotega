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
