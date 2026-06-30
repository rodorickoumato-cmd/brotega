import { createAdminClient } from "@/lib/supabase/admin";
import { fraisLivraison as fraisStatique, VILLE_PROVINCE } from "@/lib/rules";

type ProvinceMap = Record<string, string>;
type TarifsMap  = Record<string, Record<string, number>>;

async function chargerTarifs(): Promise<{ provinces: ProvinceMap; tarifs: TarifsMap; supplements: Record<string, number>; locale: number }> {
  try {
    const admin = createAdminClient();
    const [villesRes, tarifsRes, cfgRes] = await Promise.all([
      admin.from("villes_livraison").select("nom, province_code, supplement_xaf").eq("actif", true),
      admin.from("tarifs_livraison").select("province_vendeur, province_acheteur, tarif_xaf"),
      admin.from("app_config").select("valeur").eq("cle", "livraison_locale_xaf").maybeSingle(),
    ]);

    const provinces: ProvinceMap = {};
    const supplements: Record<string, number> = {};
    for (const v of villesRes.data ?? []) {
      provinces[v.nom] = v.province_code;
      if (v.supplement_xaf > 0) supplements[v.nom] = v.supplement_xaf;
    }

    const tarifs: TarifsMap = {};
    for (const t of tarifsRes.data ?? []) {
      if (!tarifs[t.province_vendeur]) tarifs[t.province_vendeur] = {};
      tarifs[t.province_vendeur][t.province_acheteur] = t.tarif_xaf;
    }

    const locale = (cfgRes.data?.valeur as number) ?? 1500;

    return { provinces, tarifs, supplements, locale };
  } catch {
    return { provinces: {}, tarifs: {}, supplements: {}, locale: 1500 };
  }
}

export async function fraisLivraisonDynamique(villeVendeur: string, villeAcheteur: string): Promise<number> {
  const { provinces, tarifs, supplements, locale } = await chargerTarifs();

  // Fallback sur la fonction statique si la DB ne retourne rien d'utilisable
  if (!Object.keys(provinces).length || !Object.keys(tarifs).length) {
    return fraisStatique(villeVendeur, villeAcheteur);
  }

  if (villeVendeur === villeAcheteur) return locale;

  const pV = provinces[villeVendeur] ?? VILLE_PROVINCE[villeVendeur] ?? "EST";
  const pA = provinces[villeAcheteur] ?? VILLE_PROVINCE[villeAcheteur] ?? "EST";

  const base = tarifs[pV]?.[pA] ?? fraisStatique(villeVendeur, villeAcheteur);
  const supp = supplements[villeAcheteur] ?? 0;

  return base + supp;
}
