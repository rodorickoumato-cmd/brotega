// Helpers téléphone Gabon
// Nouveau format (2024) : +241 6X/7X XX XX XX — 8 chiffres après l'indicatif
// Ancien format : +241 0X XX XX XX — aussi accepté pour compatibilité
// Opérateurs : Airtel (06/07), Moov (04/05), autres (60-79)

export function nettoyerPhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

// Convertit toute saisie vers E.164 +241XXXXXXXX
// Accepte : "66030848", "6 60 30 84 8", "+24166030848", "24166030848"
export function vers241(input: string): string | null {
  const clean = nettoyerPhone(input);
  if (!clean) return null;

  // Déjà en +241XXXXXXXX (8 chiffres)
  if (/^\+241[0-9]{8}$/.test(clean)) return clean;
  // 241XXXXXXXX
  if (/^241[0-9]{8}$/.test(clean)) return "+" + clean;
  // 8 chiffres locaux (avec ou sans 0 initial)
  if (/^[0-9]{8}$/.test(clean)) return "+241" + clean;

  return null;
}

export function validerPhoneGabon(input: string): boolean {
  return vers241(input) !== null;
}

// Affichage convivial : +241 66 03 08 48
export function formaterPhoneGabon(e164: string): string {
  const m = e164.match(/^\+241(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return e164;
  return `+241 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
