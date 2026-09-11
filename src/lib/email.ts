// Emails transactionnels via Brevo (API v3 REST — pas de dépendance npm)
// Système de templates unifié pour cohérence visuelle et maintenabilité

const BREVO_URL  = "https://api.brevo.com/v3/smtp/email";
const API_KEY    = process.env.BREVO_API_KEY ?? "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "noreply@brotega.com";
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  ?? "J'adore la Famille";

// ─── Palette cohérente ────────────────────────────────────────────────────────
const COLORS = {
  primary:    "#E63946",  // Rouge J'adore la Famille
  success:    "#16a34a",  // Vert confirmé
  bg:         "#F7F8FA",  // Gris fond
  text:       "#333333",  // Texte foncé
  textLight:  "#666666",  // Texte clair
  border:     "#E5E7EB",  // Bordure
};

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

// ─── Helpers de formatage ──────────────────────────────────────────────────────
function formatXAF(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

// ─── Composants de template réutilisables ─────────────────────────────────────
function emailHeader(titre: string, emoji: string, codeCourt: string, bgColor: string = COLORS.primary) {
  return `
    <div style="background:${bgColor};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <h1 style="color:white;font-size:22px;margin:0;font-weight:900">${emoji} ${titre}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">
        Code : <strong style="color:white">${codeCourt}</strong>
      </p>
    </div>
  `;
}

function emailArticles(articles: { nom: string; quantite: number; prix: number }[]) {
  return articles
    .map((a) =>
      `<tr>
        <td style="padding:8px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px">${a.nom}</td>
        <td style="text-align:right;padding:8px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.textLight};font-size:13px">${a.quantite} × ${formatXAF(a.prix)}</td>
      </tr>`
    )
    .join("");
}

function emailSummary(lignes: { label: string; valeur: string; bold?: boolean }[]) {
  return `
    <div style="background:${COLORS.bg};border-radius:8px;padding:16px;margin:16px 0;border:1px solid ${COLORS.border}">
      ${lignes
        .map((l) =>
          `<div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:${COLORS.textLight};font-size:13px">${l.label}</span>
            <strong style="color:${l.bold ? COLORS.primary : COLORS.text};font-size:14px;font-weight:700">${l.valeur}</strong>
          </div>`
        )
        .join("")}
    </div>
  `;
}

function emailFooter() {
  return `
    <div style="border-top:1px solid ${COLORS.border};padding-top:24px;margin-top:24px">
      <p style="color:${COLORS.textLight};font-size:12px;text-align:center;margin:0">
        <strong style="color:${COLORS.primary}">J'adore la Famille</strong> — Votre marketplace gabonaise<br />
        <a href="https://brotega.vercel.app" style="color:${COLORS.primary};text-decoration:none;font-size:11px">Aller sur la plateforme</a>
      </p>
    </div>
  `;
}

function emailWrapper(contenu: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background: #FFFFFF; }
          img { max-width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#FFFFFF">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          ${contenu}
        </div>
      </body>
    </html>
  `;
}

export async function envoyerEmailConfirmationCommande(params: EmailCommandeParams) {
  const contenu = `
    ${emailHeader("Commande confirmée", "✓", params.codeCourt)}
    <p style="color:${COLORS.text};font-size:15px;margin:0 0 12px;line-height:1.5">Bonjour ${params.nom},</p>
    <p style="color:${COLORS.textLight};font-size:14px;margin:0 0 16px;line-height:1.6">Votre commande a bien été enregistrée et en attente de paiement.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${emailArticles(params.articles)}
    </table>

    ${emailSummary([
      { label: "Total", valeur: formatXAF(params.total), bold: true },
      { label: "Mode de paiement", valeur: params.modePaiement },
    ])}

    <div style="background:#f0f0f0;border-left:4px solid ${COLORS.primary};padding:12px 16px;margin:16px 0;border-radius:4px">
      <p style="color:${COLORS.textLight};font-size:12px;margin:0;line-height:1.5">
        💡 <strong>Prochaine étape :</strong> Effectuez le paiement Singpay (Airtel ou Moov Money) pour confirmer votre commande.
      </p>
    </div>

    ${emailFooter()}
  `;

  await envoyerEmail(params.to, `Commande ${params.codeCourt} — J'adore la Famille`, emailWrapper(contenu));
}

export async function envoyerEmailNouvelleCommande(params: EmailVendeurParams) {
  const contenu = `
    ${emailHeader("Nouvelle commande", "🛍️", params.codeCourt)}
    <p style="color:${COLORS.text};font-size:15px;margin:0 0 12px;line-height:1.5">Bonjour ${params.nomVendeur},</p>
    <p style="color:${COLORS.textLight};font-size:14px;margin:0 0 16px;line-height:1.6">Vous avez reçu une nouvelle commande en attente de paiement client.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${emailArticles(params.articles)}
    </table>

    ${emailSummary([
      { label: "Total à recevoir", valeur: formatXAF(params.total), bold: true },
    ])}

    <div style="background:#f0f0f0;border-left:4px solid ${COLORS.primary};padding:12px 16px;margin:16px 0;border-radius:4px">
      <p style="color:${COLORS.textLight};font-size:12px;margin:0;line-height:1.5">
        💼 <strong>Action :</strong> Connectez-vous à votre dashboard pour voir les détails et préparer la commande.
      </p>
    </div>

    ${emailFooter()}
  `;

  await envoyerEmail(params.to, `Nouvelle commande ${params.codeCourt} — J'adore la Famille`, emailWrapper(contenu));
}

// ── Emails post-paiement (déclenchés par le webhook Singpay) ──────────────────

export async function envoyerEmailConfirmationPaiement(params: EmailCommandeParams) {
  const contenu = `
    ${emailHeader("Paiement confirmé", "✓", params.codeCourt, COLORS.success)}
    <p style="color:${COLORS.text};font-size:15px;margin:0 0 12px;line-height:1.5">Bonjour ${params.nom},</p>
    <p style="color:${COLORS.textLight};font-size:14px;margin:0 0 16px;line-height:1.6">Votre paiement de <strong>${formatXAF(params.total)}</strong> a été reçu et vérifié par Singpay.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${emailArticles(params.articles)}
    </table>

    ${emailSummary([
      { label: "Montant payé", valeur: formatXAF(params.total), bold: true },
      { label: "Mode de paiement", valeur: "Singpay (Airtel/Moov Money)" },
    ])}

    <div style="background:#f0fdf4;border-left:4px solid ${COLORS.success};padding:12px 16px;margin:16px 0;border-radius:4px">
      <p style="color:#166534;font-size:12px;margin:0;line-height:1.5">
        🔒 <strong>Escrow sécurisé :</strong> Votre argent est bloqué jusqu'à confirmation de livraison. En cas de non-livraison, remboursement automatique sous 48h.
      </p>
    </div>

    ${emailFooter()}
  `;

  await envoyerEmail(params.to, `Paiement confirmé — Commande ${params.codeCourt}`, emailWrapper(contenu));
}

export async function envoyerEmailNouvelleCommandePaiement(params: EmailVendeurParams) {
  const contenu = `
    ${emailHeader("Commande payée", "💰", params.codeCourt)}
    <p style="color:${COLORS.text};font-size:15px;margin:0 0 12px;line-height:1.5">Bonjour ${params.nomVendeur},</p>
    <p style="color:${COLORS.textLight};font-size:14px;margin:0 0 16px;line-height:1.6">Le paiement de la commande <strong>${params.codeCourt}</strong> a été confirmé par le client. Les fonds sont maintenant sécurisés en escrow.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${emailArticles(params.articles)}
    </table>

    ${emailSummary([
      { label: "Montant en escrow", valeur: formatXAF(params.total), bold: true },
      { label: "Statut", valeur: "En attente de préparation" },
    ])}

    <div style="background:#f0f0f0;border-left:4px solid ${COLORS.primary};padding:12px 16px;margin:16px 0;border-radius:4px">
      <p style="color:${COLORS.textLight};font-size:12px;margin:0;line-height:1.5">
        📦 <strong>À faire :</strong> Préparez la commande et confirmez via votre dashboard. Vous recevrez votre paiement après confirmation de livraison.
      </p>
    </div>

    ${emailFooter()}
  `;

  await envoyerEmail(params.to, `Commande ${params.codeCourt} payée — À préparer`, emailWrapper(contenu));
}
