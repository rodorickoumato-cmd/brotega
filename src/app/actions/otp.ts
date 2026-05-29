"use server";

const BREVO_URL    = "https://api.brevo.com/v3/smtp/email";
const API_KEY      = process.env.BREVO_API_KEY ?? "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "noreply@brotegafrica.org";
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  ?? "J'adore la Famille";

function genererOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function envoyerOtp(email: string): Promise<{ succes: true; otp: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse email invalide.");
  }
  if (!API_KEY) {
    throw new Error("BREVO_API_KEY manquant dans .env.local");
  }

  const otp = genererOtp();

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
      to:          [{ email }],
      subject:     "Votre code de vérification J'adore la Famille",
      htmlContent: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;font-size:20px;margin:0">Code de vérification</h1>
          </div>
          <p style="color:#333">Voici votre code à usage unique :</p>
          <div style="background:#f7f8fa;border-radius:12px;padding:24px;text-align:center;margin:16px 0">
            <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#E63946">${otp}</span>
          </div>
          <p style="color:#888;font-size:13px">Ce code expire dans 10 minutes. Ne le partagez jamais.</p>
          <p style="color:#ccc;font-size:11px;text-align:center;margin-top:24px">J'adore la Famille — brotegafrica.org</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (body["message"] ?? `HTTP ${res.status}`) as string;
    throw new Error("Erreur Brevo : " + msg);
  }

  // En production, stocker le hash de l'OTP en DB/session — pas le plain-text
  // Ici on retourne le code pour le test uniquement
  return { succes: true, otp };
}
