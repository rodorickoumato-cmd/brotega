# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes essentielles

```bash
npm run dev      # Lancer en local → http://localhost:3000
npm run build    # Build de production (vérifie TypeScript + Next.js)
npm run lint     # ESLint
```

**Avant le premier `npm run dev`** : supprimer `src/app/(main)/page.tsx` qui crée un conflit de routing avec `src/app/page.tsx` (le fichier `fix-routing.bat` le fait automatiquement).

## Architecture

**Stack** : Next.js 16 (App Router) · Supabase (auth + BDD) · Tailwind CSS v4 · TypeScript · Vercel

**Backend mobile** : une app Flutter partage le même Supabase. Ne pas casser la structure des tables ou les politiques RLS sans coordonner avec le mobile.

### Clients Supabase — règle absolue

| Client | Fichier | Usage |
|---|---|---|
| `createClient()` | `src/lib/supabase/server.ts` | Server Components, API routes (respecte RLS) |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Bypass RLS — service_role — **serveur uniquement** |

Ne jamais exposer `createAdminClient()` dans du code côté navigateur.

### Loi interne — `src/lib/rules.ts`

Toutes les constantes et règles métier sont ici. Ne **jamais** hardcoder ces valeurs ailleurs :
- `PLANS` — tarifs et limites d'abonnement (gratuit 3 produits, payants illimités)
- `fraisLivraison(villeVendeur, villeAcheteur)` — matrice inter-provinces + suppléments
- `STATUTS_COMMANDE` — cycle de vie commande (8 états)
- `JOURS_AUTO_LIBERATION_ESCROW = 7` — libération automatique escrow
- `FRAIS_MOBILE_MONEY_TAUX = 0.03` — commission 3%

### Routing Next.js

```
src/app/
├── page.tsx                  # Homepage /
├── (main)/                   # Route group → layout avec Header + Footer
│   ├── catalogue/            # /catalogue
│   ├── produit/[slug]/       # /produit/:slug
│   ├── checkout/             # /checkout
│   ├── compte/               # /compte/* (profil, commandes, adresses, favoris)
│   ├── vendor/               # /vendor/dashboard, /vendor/wallet, /vendor/abonnement
│   ├── livreur/              # Dashboard livreur
│   ├── devenir-livreur/      # Candidature livreur
│   ├── messages/[commandeId] # Chat par commande
│   ├── reclamation/[commandeId]
│   └── admin/                # /admin/* — toutes les pages backoffice
├── api/                      # Route handlers (toujours Server)
│   ├── livraisons/[id]/      # demarrer · confirmer · echec
│   ├── commandes/            # confirmer-livraison · confirmer-vendeur
│   ├── webhooks/paiements    # Webhook callback Singpay (paiement entrant)
│   └── cron/escrow-release   # Cron Vercel 03:00 UTC quotidien
└── auth/callback/            # Callback OAuth Supabase
```

### Paiement Singpay Mobile Money

Provider dans `src/lib/payment/singpay.ts`. Points non-évidents :
- Authentification : `Authorization: Bearer {SINGPAY_API_KEY}`
- Numéro de téléphone : Singpay accepte format E.164 ou local (0XXXXXXXX) — le provider normalise automatiquement
- `reference` : alphanumérique + tirets/underscores, max 50 chars
- Callback entrant : `POST /api/webhooks/paiements` — vérifie la signature HMAC-SHA256 avec `SINGPAY_SECRET_KEY`
- Webhook headers : `X-Singpay-Signature` ou `X-Singpay-HMAC`
- Supporte Airtel Money et Moov Money (Gabon)
- Format de statut Singpay : pending, accepted, completed, failed

### Système livraison anti-fraude

Flux : commande payée → admin assigne livreur → `POST /api/livraisons/[id]/demarrer` (génère code 6 chiffres + rémunération 60%) → livreur remet colis → client donne le code → `POST /api/livraisons/[id]/confirmer` → escrow libéré → `POST /api/admin/livreurs/payer` verse la rémunération.

La colonne `remuneration_xaf` sur la table `livraisons` est calculée à 60% (`TAUX_REMUNERATION_LIVREUR = 0.6`) des `frais_livraison` de la commande.

### Variables d'environnement requises

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Paiement Singpay
PAYMENT_PROVIDER=singpay
SINGPAY_BASE_URL                                    # https://api.singpay.io
SINGPAY_MERCHANT_ID                                 # ID marchand Singpay
SINGPAY_API_KEY                                     # Bearer token API
SINGPAY_SECRET_KEY                                  # HMAC-SHA256 pour webhooks
SINGPAY_WEBHOOK_URL                                 # URL absolue callback

# Medias
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET

# Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   # Push notifications web

# Emails
RESEND_API_KEY                                      # Emails transactionnels

# IA
ANTHROPIC_API_KEY                                  # Chat IA vendeur
```

### Admin backoffice

Pages sous `/admin/*` — accessibles uniquement `role = admin`. Toutes les mutations critiques envoient une push notification. L'admin peut tout configurer sans redéploiement via `/admin/configuration` (table `app_config` Supabase).

### Bugs connus ouverts

1. **`fraisLivraisonDynamique` non branchée** — `src/lib/livraison.ts` existe mais les API routes utilisent encore `fraisLivraison()` statique de `rules.ts`. Les tarifs modifiés dans `/admin/tarifs-livraison` n'impactent pas le checkout.
2. **Escrow** — le cron `vercel.json` libère automatiquement à 03:00 UTC après 7 jours, mais pas de retry si le cron échoue.
