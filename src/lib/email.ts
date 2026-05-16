import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "J'adore la Famille <noreply@mycssecret.com>";

export type EmailCommandeParams = {
  to: string;
  nom: string;
  codeCourt: string;
  total: number;
  articles: { nom: string; quantite: number; prix: number }[];
  modePaiement: string;
};

export type EmailVendeurParams = {
  to: string;
  nomVendeur: string;
  codeCourt: string;
  total: number;
  articles: { nom: string; quantite: number; prix: number }[];
};

function formatXAF(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function lignesArticles(articles: { nom: string; quantite: number; prix: number }[]) {
  return articles
    .map((a) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0">${a.nom}</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #f0f0f0">${a.quantite} × ${formatXAF(a.prix)}</td></tr>`)
    .join("");
}

export async function envoyerEmailConfirmationCommande(params: EmailCommandeParams) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Commande ${params.codeCourt} confirmée — J'adore la Famille`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;font-size:22px;margin:0">Commande confirmée ✓</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Code : <strong style="color:white">${params.codeCourt}</strong></p>
          </div>
          <p style="color:#333">Bonjour ${params.nom},</p>
          <p style="color:#555">Votre commande a bien été enregistrée sur J'adore la Famille.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${lignesArticles(params.articles)}
          </table>
          <div style="background:#f7f8fa;border-radius:8px;padding:16px;margin:16px 0">
            <div style="display:flex;justify-content:space-between"><span>Total</span><strong style="color:#E63946">${formatXAF(params.total)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px;color:#888"><span>Mode de paiement</span><span>${params.modePaiement}</span></div>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;margin-top:24px">J'adore la Famille — Votre marketplace gabonaise</p>
        </div>
      `,
    });
  } catch {
    // Email is best-effort — never crash the order flow
  }
}

export async function envoyerEmailNouvelleCommande(params: EmailVendeurParams) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Nouvelle commande ${params.codeCourt} — J'adore la Famille`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;font-size:22px;margin:0">Nouvelle commande 🛍️</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Code : <strong style="color:white">${params.codeCourt}</strong></p>
          </div>
          <p style="color:#333">Bonjour ${params.nomVendeur},</p>
          <p style="color:#555">Vous avez reçu une nouvelle commande sur J'adore la Famille.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${lignesArticles(params.articles)}
          </table>
          <div style="background:#f7f8fa;border-radius:8px;padding:16px;margin:16px 0">
            <div style="display:flex;justify-content:space-between"><span>Total à recevoir</span><strong style="color:#E63946">${formatXAF(params.total)}</strong></div>
          </div>
          <p style="color:#555">Connectez-vous à votre dashboard vendeur pour confirmer la commande.</p>
          <p style="color:#888;font-size:12px;text-align:center;margin-top:24px">J'adore la Famille — Votre marketplace gabonaise</p>
        </div>
      `,
    });
  } catch {
    // Email is best-effort
  }
}
