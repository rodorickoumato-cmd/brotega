# Migration du Système de Paiement: PVIT → Singpay

## Vue d'ensemble

Le système de paiement a été migré de **PVIT** (agrégateur complexe avec configuration dynamique) à **Singpay** (plateforme plus simple et accessible).

**Date**: 20 août 2026
**Status**: ✅ Complet

## Raisons du changement

1. **Onboarding simplifié**: Singpay nécessite moins de documents et de configuration
2. **Réduction de la complexité**: Credentials gérés via env vars (pas d'UI admin pour la configuration)
3. **Compatibilité mobile**: Supporte Airtel Money + Moov Money (Gabon) comme PVIT
4. **API plus simple**: Endpoints directs, HMAC-SHA256 pour les webhooks

## Architecture

### Avant (PVIT)
```
PAYMENT_PROVIDER=pvit
├── PvitProvider (src/lib/payment/pvit.ts)
├── Config dynamique (table pvit_config)
├── Admin UI pour comptes marchands (Airtel/Moov)
└── Webhook /api/webhooks/paiements (normalise PVIT)
```

### Après (Singpay)
```
PAYMENT_PROVIDER=singpay
├── SingpayProvider (src/lib/payment/singpay.ts)
├── Config via env vars uniquement (pas de DB)
├── Pas d'UI admin (credentials static)
└── Webhook /api/webhooks/paiements (normalise Singpay)
```

## Variables d'environnement

### À supprimer
```bash
PVIT_BASE_URL
PVIT_SLUG
PVIT_ACCOUNT_CODE
PVIT_REST_TOKEN
PVIT_STATUS_TOKEN
PVIT_SECRET
PVIT_CALLBACK_URL_CODE
```

### À ajouter
```bash
PAYMENT_PROVIDER=singpay
SINGPAY_BASE_URL              # https://api.singpay.io
SINGPAY_MERCHANT_ID           # ID marchand Singpay
SINGPAY_API_KEY              # Bearer token
SINGPAY_SECRET_KEY           # HMAC-SHA256 secret
SINGPAY_WEBHOOK_URL          # URL callback absolue
```

## Changements de code

### Fichiers créés
- `src/lib/payment/singpay.ts` — Provider Singpay avec interface standard

### Fichiers supprimés
- `src/lib/payment/pvit.ts` — Provider PVIT (obsolète)
- `src/app/actions/pvit.ts` — Gestion config PVIT (obsolète)
- `src/app/api/pvit/reception/route.ts` — Webhook renouvellement clé PVIT (obsolète)

### Fichiers modifiés
- `src/lib/payment/index.ts` — Factory provider (ajoute Singpay)
- `src/app/api/webhooks/paiements/route.ts` — Webhook générique (normalise Singpay)
- `src/app/(main)/admin/page.tsx` — Alertes dashboard (supprime alertes PVIT)
- `src/app/(main)/admin/configuration/page.tsx` — UI config (supprime section PVIT)
- `CLAUDE.md` — Documentation env vars

## Format de paiement Singpay

### Initiation
```typescript
POST /v1/payments
{
  merchant_id: string,
  reference: string,
  amount: number,
  currency: "XAF",
  phone: string,
  operator: "AIRTEL_MONEY" | "MOOV_MONEY",
  description: string,
  callback_url: string,
  metadata: Record<string, any>
}
```

### Webhook entrant
```typescript
{
  transaction_id: string,
  status: "pending" | "accepted" | "completed" | "failed",
  amount: number,
  phone: string,
  metadata: Record<string, any>
}
```

**Signature**: HMAC-SHA256 dans header `X-Singpay-Signature` ou `X-Singpay-HMAC`

## Migration données

### Paiements existants
✅ Pas d'impact — champ `provider_ref` reste valide, `provider` change selon env var

### Audit
✅ Table `pvit_config` conservée (historique only) — voir `audit_log` pour les modifications

### Dashboard admin
✅ Alertes PVIT supprimées (config statique maintenant)

## Déploiement

### Checklist
1. ✅ Code Singpay intégré (provider, webhook, factory)
2. ✅ Code PVIT supprimé
3. ✅ CLAUDE.md mis à jour
4. ✅ Admin UI nettoyée
5. ✅ Migrations Supabase documentées
6. **TODO**: Tests d'intégration Singpay
7. **TODO**: Configuration Vercel env vars
8. **TODO**: Redirect `/admin/configuration` si lien PVIT reste

### Rollback
En cas de problème, revenir à PVIT:
1. `git revert <commit-range>`
2. Rétablir `PAYMENT_PROVIDER=pvit` env var
3. Redéployer

## Référence

- **Provider Singpay**: `src/lib/payment/singpay.ts`
- **Webhook**: `src/app/api/webhooks/paiements/route.ts`
- **Types**: `src/lib/payment/types.ts`
- **Config**: `CLAUDE.md` (Variables d'environnement)
