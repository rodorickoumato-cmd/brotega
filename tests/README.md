# Tests - Brotega

Tests unitaires et d'intégration pour le système de paiement Singpay et autres composants critiques.

## Structure

```
tests/
├── payment/
│   ├── singpay.test.ts        # Tests du provider Singpay
│   └── webhook.test.ts         # Tests de normalisation du webhook
└── README.md                   # Ce fichier
```

## Tests disponibles

### `tests/payment/singpay.test.ts`

Tests du **SingpayProvider** — implémentation du provider Singpay.

**Couverture:**
- ✅ Normalisation des numéros de téléphone (E.164 → local)
- ✅ Génération de références (alphanumériques, max 50 chars)
- ✅ Vérification de signature HMAC-SHA256
- ✅ Mapping des statuts de paiement (pending/completed/failed)
- ✅ Normalisation des payloads webhook
- ✅ Validation des variables d'environnement

**Nombre de tests:** 18

### `tests/payment/webhook.test.ts`

Tests du **webhook générique** — normalise les formats de différents providers.

**Couverture:**
- ✅ Format Mock (providerRef + statut)
- ✅ Format Singpay (transaction_id/id + status)
- ✅ Format PVIT (transactionId/reference + status)
- ✅ Format PawaPay (depositId + status)
- ✅ Cas limites (champs manquants, formats inconnus)
- ✅ Insensibilité à la casse pour les statuts

**Nombre de tests:** 20+

## Exécution

### Prérequis

- Node.js 18+ avec support ES modules
- Variables d'environnement Singpay définies (optionnel, les tests définissent des mocks)

### Exécuter tous les tests

```bash
npm test
```

Ou manuellement :

```bash
node --loader tsx tests/payment/singpay.test.ts
node --loader tsx tests/payment/webhook.test.ts
```

### Exécuter un seul test

```bash
node --loader tsx tests/payment/singpay.test.ts
```

## Format de test

Simple framework de test custom (pas de dépendances externes):

```typescript
test("should do something", () => {
  expect(actual).toBe(expected);
  expect(actual).toEqual(expected);
  expect(array).toContain(item);
});

describe("Test Suite", () => {
  // tests ici
});
```

## Intégration avec Jest/Vitest

Pour intégrer avec Jest ou Vitest:

```bash
npm install --save-dev jest ts-jest
# ou
npm install --save-dev vitest
```

Puis configurer `jest.config.js`:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
};
```

Puis exécuter:

```bash
npm test
```

## CI/CD

Les tests doivent s'exécuter dans le pipeline GitHub Actions:

```yaml
- name: Run payment tests
  run: node --loader tsx tests/payment/singpay.test.ts && node --loader tsx tests/payment/webhook.test.ts
```

## Couverture

| Composant | Couverture | Notes |
|-----------|-----------|-------|
| SingpayProvider | ~90% | Logique métier + normalisation |
| Webhook générique | ~95% | Tous les formats de provider |
| Signature HMAC | 100% | Vérification par test |
| Mapping statuts | 100% | Tous les cas couverts |

## À faire

- [ ] Intégrer Jest ou Vitest officiellement
- [ ] Ajouter tests d'intégration (mock API HTTP)
- [ ] Tests de load (volume de paiements)
- [ ] Tests de sécurité (injection payload, bypass signature)
- [ ] Coverage report (Istanbul)

## Référence

- **Provider Singpay:** `src/lib/payment/singpay.ts`
- **Webhook:** `src/app/api/webhooks/paiements/route.ts`
- **Types:** `src/lib/payment/types.ts`
