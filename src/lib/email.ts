// Emails transactionnels via Brevo (API v3 REST — pas de dépendance npm)

const BREVO_URL  = "https://api.brevo.com/v3/smtp/email";
const API_KEY    = process.env.BREVO_API_KEY ?? "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "noreply@brotega.com";
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  ?? "Brotega";

async function envoyerEmail(to: string, subject: string, html: string): Promise<void> {
  if (!API_KEY) return; // best-effort — ne crash jamais si clé absente

  try {
    await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
  } catch {
    // Email best-effort — ne jamais bloquer le flux commande
  }
}

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
    .map((a) =>
      `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f0f0f0">${a.nom}</td>
        <td style="text-align:right;padding:6px 0;border-bottom:1px solid #f0f0f0">${a.quantite} × ${formatXAF(a.prix)}</td>
      </tr>`
    )
    .join("");
}

const FOOTER = `<p style="color:#888;font-size:12px;text-align:center;margin-top:24px">Brotega — Votre marketplace gabonaise</p>`;

export async function envoyerEmailConfirmationCommande(params: EmailCommandeParams) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;font-size:22px;margin:0">Commande confirmée ✓</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
          Code : <strong style="color:white">${params.codeCourt}</strong>
        </p>
      </div>
      <p style="color:#333">Bonjour ${params.nom},</p>
      <p style="color:#555">Votre commande a bien été enregistrée sur Brotega.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${lignesArticles(params.articles)}
      </table>
      <div style="background:#f7f8fa;border-radius:8px;padding:16px;margin:16px 0">
        <div style="display:flex;justify-content:space-between">
          <span>Total</span>
          <strong style="color:#E63946">${formatXAF(params.total)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px;color:#888">
          <span>Mode de paiement</span><span>${params.modePaiement}</span>
        </div>
      </div>
      <p style="color:#888;font-size:13px">
        Votre argent est sécurisé jusqu'à confirmation de livraison.
      </p>
      ${FOOTER}
    </div>
  `;
  await envoyerEmail(params.to, `Commande ${params.codeCourt} confirmée — Brotega`, html);
}

export async function envoyerEmailNouvelleCommande(params: EmailVendeurParams) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;font-size:22px;margin:0">Nouvelle commande 🛍️</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
          Code : <strong style="color:white">${params.codeCourt}</strong>
        </p>
      </div>
      <p style="color:#333">Bonjour ${params.nomVendeur},</p>
      <p style="color:#555">Vous avez reçu une nouvelle commande sur Brotega.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${lignesArticles(params.articles)}
      </table>
      <div style="background:#f7f8fa;border-radius:8px;padding:16px;margin:16px 0">
        <div style="display:flex;justify-content:space-between">
          <span>Total à recevoir</span>
          <strong style="color:#E63946">${formatXAF(params.total)}</strong>
        </div>
      </div>
      <p style="color:#555">Connectez-vous à votre dashboard vendeur pour confirmer la commande.</p>
      ${FOOTER}
    </div>
  `;
  await envoyerEmail(params.to, `Nouvelle commande ${params.codeCourt} — Brotega`, html);
}

// ── Emails post-paiement (déclenchés par le webhook PVIT) ──────────────────

export async function envoyerEmailConfirmationPaiement(params: EmailCommandeParams) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#16a34a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;font-size:22px;margin:0">Paiement confirmé ✓</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
          Code : <strong style="color:white">${params.codeCourt}</strong>
        </p>
      </div>
      <p style="color:#333">Bonjour ${params.nom},</p>
      <p style="color:#555">Votre paiement <strong style="color:#16a34a">${formatXAF(params.total)}</strong> a été reçu et vérifié.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${lignesArticles(params.articles)}
      </table>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
        <p style="color:#166534;font-size:13px;margin:0">
          🔒 Votre argent est sécurisé jusqu'à confirmation de livraison.
          En cas de non-livraison, remboursement automatique sous 48h.
        </p>
      </div>
      ${FOOTER}
    </div>
  `;
  await envoyerEmail(params.to, `Paiement confirmé — Commande ${params.codeCourt}`, html);
}

export async function envoyerEmailNouvelleCommandePaiement(params: EmailVendeurParams) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#E63946;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;font-size:22px;margin:0">Commande payée 💰</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
          Code : <strong style="color:white">${params.codeCourt}</strong>
        </p>
      </div>
      <p style="color:#333">Bonjour ${params.nomVendeur},</p>
      <p style="color:#555">Le paiement de la commande <strong>${params.codeCourt}</strong> a été confirmé.
      Les fonds sont sécurisés en escrow.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${lignesArticles(params.articles)}
      </table>
      <div style="background:#f7f8fa;border-radius:8px;padding:16px;margin:16px 0">
        <div style="display:flex;justify-content:space-between">
          <span>Montant en escrow</span>
          <strong style="color:#E63946">${formatXAF(params.total)}</strong>
        </div>
      </div>
      <p style="color:#555;font-size:13px">Connectez-vous à votre dashboard pour confirmer et préparer la commande.</p>
      ${FOOTER}
    </div>
  `;
  await envoyerEmail(params.to, `Commande ${params.codeCourt} payée — À préparer`, html);
}
