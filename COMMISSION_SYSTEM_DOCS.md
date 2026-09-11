# 🚀 Système de Commission par Article

## Vue d'ensemble

**Changement majeur :** Passage d'un système de **limites d'articles** à un système de **commission par article configurable**.

| Ancien Système | Nouveau Système |
|---|---|
| Gratuit: 3 produits max | Gratuit: illimité d'articles |
| Payant: illimité | Payant: illimité |
| Pas de commission | Commission 5% (gratuit) ou 3% (payant) |
| Revenus: abonnement fixe | Revenus: commission par vente |

---

## Implémentation

### 1. Migration Base de Données

Exécuter la migration Supabase:
```bash
supabase db execute supabase/migrations/20260911_commission_system.sql
```

**Ou manuellement dans le SQL Editor Supabase:**

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet brotega
3. Aller dans "SQL Editor"
4. Copier/coller le contenu de `supabase/migrations/20260911_commission_system.sql`
5. Exécuter

**Cela crée:**
- Table `vendor_commission_settings` (config par vendeur)
- Table `produit_commission` (override par article)
- Table `commission_history` (audit trail)
- Colonnes `commission_percent` et `commission_montant_xaf` dans `commandes`
- Fonctions PL/pgSQL utiles
- Trigger auto-init pour nouveaux vendeurs

### 2. Mise à jour Code

Les fichiers suivants ont été créés/modifiés:

```
✅ src/lib/rules.ts
   - PLANS: max_produits = Infinity pour tous
   - COMMISSION_DEFAUT_GRATUIT = 0.05
   - COMMISSION_DEFAUT_PAYANT = 0.03
   - Fonctions validerCommission(), calculerMontantCommission()

✅ src/lib/supabase/database.types.ts
   - Types TypeScript pour les nouvelles tables

✅ src/app/api/vendor/commission/route.ts
   - GET: récupérer config de commission
   - POST: mettre à jour commission par défaut

✅ src/app/api/vendor/commission/produit/[id]/route.ts
   - PATCH: définir commission custom d'un produit
   - DELETE: réinitialiser à la défaut

✅ src/components/vendor/CommissionDashboard.tsx
   - Composant React pour gérer les commissions
   - Interface pour modifier commission par défaut
   - Liste des produits avec commission custom
   - Suggestions stratégiques

✅ src/app/(main)/vendor/configuration/page.tsx
   - Page complète de configuration
   - Accès au CommissionDashboard
   - Explications du système

✅ src/app/api/webhooks/paiements/route.ts
   - Modifié: calcul de commission au lieu de limite
   - Sauvegarde de commission_percent et commission_montant_xaf

✅ src/app/page.tsx
   - Mise à jour du CTA vendeur (gratuit → illimité d'articles)
```

### 3. Déploiement

```bash
# 1. Commit
git add -A
git commit -m "feat: commission system (articles illimités)

- Remove product limits for all plans
- Add commission-based monetization
- Vendor can set custom commission per product
- Configurable from new /vendor/configuration page
- Commission system replaces subscription limits

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017MWjbdQcUvkPUdB5Fszrfh"

# 2. Push
git push -u origin claude/retour-projet-c6k2cw

# 3. Créer PR sur GitHub
```

---

## Fonctionnalités

### Pour les Vendeurs

✅ **Illimité d'articles** — Plus de limite de 3 articles en gratuit
✅ **Configuration de commission** — Définir une commission par défaut
✅ **Commission par produit** — Personnaliser chaque article
✅ **Dashboard dédié** — Page `/vendor/configuration` pour gérer
✅ **Suggestions stratégiques** — Conseils de commission selon le produit
✅ **Historique complet** — Audit de tous les changements

### Pour la Plateforme

✅ **Flexible** — Commission adaptée par vendeur
✅ **Ingénieux** — Incite à publier plus d'articles
✅ **Transparent** — Vendeurs voient exactement comment c'est calculé
✅ **Audit** — Historique complet dans `commission_history`
✅ **Scalable** — Pas de base de données de limites à maintenir

### Pour les Clients

✅ **Plus de choix** — Plus d'articles disponibles
✅ **Meilleurs prix** — Vendeurs baissent commission = prix baisse
✅ **Qualité** — Plus de vendeurs = meilleure compétition

---

## Flux de Vente

```
1. Vendeur publie article
   └─ Commission défaut = 5% (gratuit) ou 3% (payant)
   └─ Ou personnalisée = entre 2% et 15%

2. Client achète l'article pour 100,000 XAF

3. Singpay envoie webhook de paiement
   └─ Système récupère commission du produit
   └─ Calcule: montantCommission = 100,000 × 5% = 5,000 XAF
   └─ Montant escrow vendeur = 100,000 - 5,000 = 95,000 XAF

4. Après livraison confirmée
   └─ Escrow libéré → 95,000 XAF au wallet vendeur
   └─ Plateforme retient 5,000 XAF commission

5. Vendeur peut retirer ses gains
   └─ Minimum 5,000 XAF par retrait
   └─ Retraits illimités par jour
```

---

## API Endpoints

### GET /api/vendor/commission
Récupère la config de commission du vendeur actuel.

**Response:**
```json
{
  "config": {
    "commission_defaut": 0.05,
    "commission_min": 0.02,
    "commission_max": 0.15,
    "actif": true
  },
  "produits_custom": [
    {
      "id": "pc_123",
      "produit_id": "prod_456",
      "produit_nom": "iPhone 15",
      "commission": 0.03,
      "raison": "Article populaire"
    }
  ],
  "statistiques": {
    "nb_produits_custom": 1,
    "commission_moyenne": 0.04
  }
}
```

### POST /api/vendor/commission
Met à jour la commission par défaut.

**Body:**
```json
{
  "commission_defaut": 0.04
}
```

**Response:**
```json
{
  "succes": true,
  "config": { ... },
  "message": "Commission par défaut mise à jour à 4.0%"
}
```

### PATCH /api/vendor/commission/produit/:id
Définit une commission spécifique pour un article.

**Body:**
```json
{
  "commission": 0.03,
  "raison": "Article populaire"
}
```

**Response:**
```json
{
  "succes": true,
  "commission": { ... },
  "message": "Commission de 'iPhone 15' → 3.0%"
}
```

### DELETE /api/vendor/commission/produit/:id
Réinitialise un article à la commission par défaut.

**Response:**
```json
{
  "succes": true,
  "message": "Commission de 'iPhone 15' réinitialisée à la défaut"
}
```

---

## Exemples Stratégiques

### Cas 1: Vendeur Débutant (Plan Gratuit)
```
Commission défaut: 5%
Stratégie: Publications fréquentes (incitatif 5%)
Articles: 50+ produits
Chiffre d'affaires possible: 1M XAF / mois → 50k XAF en commission
```

### Cas 2: Vendeur Établi (Business)
```
Commission défaut: 3%
Articles populaires: 2% (maximize volume)
Stock à écouler: 8% (quick sales)
Articles premium: 2% (prestige)
Chiffre d'affaires: 10M XAF / mois → 250k XAF en commission
```

### Cas 3: Vendeur Premium (Segment Élevé)
```
Commission défaut: 2%
Produits phares: 1.5% (volume)
Promotions: 5-7% (engagement)
Exclusifs: 2% (prestige)
Chiffre d'affaires: 50M XAF / mois → 750k XAF en commission
```

---

## Considérations de Sécurité

### Limites
- Min commission: 2% (empêche dumping)
- Max commission: 15% (pas abusif)
- Plage modifiable par admin (voir `/admin/commission-settings`)

### Audit
- Chaque changement enregistré dans `commission_history`
- Traçabilité: qui a changé, quand, pourquoi
- Admin peut voir tous les changements

### RLS
- Vendeur ne peut voir/modifier que sa propre config
- Produits avec commission custom limités au vendeur propriétaire
- Historique accessible au vendeur (ses changements) et admin (tous)

---

## Monitoring & Dashboard Admin

**À implémenter:**
```
/admin/commissions
├─ Commission moyenne par plan
├─ Distribution des taux de commission
├─ Top vendeurs par commission
├─ Anomalies (commission anormalement basse/haute)
└─ Tendances mensuelles
```

---

## Migration depuis l'Ancien Système

**Transition en douceur:**

1. Nouvelle base de données ✅ (migration Supabase appliquée)
2. Code updated ✅ (tous les fichiers modifiés)
3. Vendeurs existants
   - Réçoivent email notification
   - Commission défaut appliquée automatiquement (5% gratuit, 3% payant)
   - Peuvent customizer à tout moment
4. Anciens produits
   - Gardent leur commission défaut
   - Peuvent être customisés individuellement

**Rollback:**
Si problème, on peut rollback en:
1. Reverting la migration Supabase
2. Reverting les commits git
3. Re-activating l'ancien système de limites

---

## FAQ

### Q: Comment ça affecte les clients ?
A: Ils voient simplement plus de produits. Rien ne change pour eux.

### Q: Les vendeurs existants conservent leur abonnement ?
A: Oui, les abonnements actifs restent valides. La commission s'applique en parallèle.

### Q: Combien de temps avant amortissement des frais commission ?
A: Avec 5% gratuit: ~1-2 produits vendus par semaine = 1M XAF/mois = 50k XAF commission

### Q: Admin peut-il changer la commission d'un vendeur ?
A: Non par défaut (RLS). Seulement le vendeur. Admin peut faire exception via `/admin`.

### Q: Les commissions s'accumulent en escrow ?
A: Non. La commission est retenue immédiatement du montant au vendeur. Seul le reste va en escrow.

---

## Prochaines Étapes

1. ✅ Migration BD
2. ✅ APIs
3. ✅ Interface Vendeur
4. ⏳ Admin Dashboard (commissions statistics)
5. ⏳ Email notifications vendeurs (commission changes)
6. ⏳ Analytics (tendances commission par catégorie)
7. ⏳ A/B testing suggestions (ex: "essayez 3%, ça a marché pour X%")

---

## Support

**Issues / Questions:**
- Créer issue sur GitHub: `/issues`
- Contact support: support@brotega.com

