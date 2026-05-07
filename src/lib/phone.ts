// Helpers téléphone Gabon
// Format E.164 : +241XXXXXXXX (8 chiffres après l'indicatif)
// Mobile : commence par 0 (04, 05, 06, 07 Airtel ; 02, 03, 06, 07 Moov)

export function nettoyerPhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

// Convertit toute saisie utilisateur vers E.164 +241XXXXXXXX
// Accepte : "01 23 45 67", "+241 01 23 45 67", "24101234567", "01234567"
export function vers241(input: string): string | null {
  const clean = nettoyerPhone(input);
  if (!clean) return null;

  // Déjà en +241XXXXXXXX
  if (/^\+241[0-9]{8}$/.test(clean)) return clean;
  // 241XXXXXXXX
  if (/^241[0-9]{8}$/.test(clean)) return "+" + clean;
  // 0XXXXXXX (8 chiffres locaux)
  if (/^0[0-9]{7}$/.test(clean)) return "+241" + clean;
  // XXXXXXXX (8 chiffres sans 0)
  if (/^[0-9]{8}$/.test(clean)) return "+241" + clean;

  return null;
}

export function validerPhoneGabon(input: string): boolean {
  return vers241(input) !== null;
}

// Affichage convivial : +241 01 23 45 67
export function formaterPhoneGabon(e164: string): string {
  const m = e164.match(/^\+241(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return e164;
  return `+241 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
