// Code commande court : BR-XXXXX (5 chars Crockford base32)
// ~33 millions de combinaisons. Lisible au téléphone, partageable WhatsApp/SMS.
// Crockford : exclut I, L, O, U pour éviter les confusions.

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 chars

export function genererCodeCommande(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let code = "BR-";
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[bytes[i] % 32];
  }
  return code;
}

export function validerCodeCommande(code: string): boolean {
  return /^BR-[0-9A-HJ-NP-TV-Z]{5}$/.test(code.toUpperCase());
}
