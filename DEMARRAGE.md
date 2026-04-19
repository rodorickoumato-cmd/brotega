# 🇬🇦 Brotega — Guide de démarrage

## Étape 1 — Corriger le conflit de routing (OBLIGATOIRE)

Avant de lancer le projet, supprimez ce fichier qui crée un conflit :

**Option A** — Double-cliquez sur `fix-routing.bat` dans le dossier du projet.

**Option B** — Ouvrez CMD dans le dossier et tapez :
```
del "src\app\(main)\page.tsx"
```

**Option C** — Dans VS Code, supprimez manuellement le fichier :
`src/app/(main)/page.tsx`

---

## Étape 2 — Lancer le projet

```bash
npm run dev
```

Puis ouvrez votre navigateur sur : **http://localhost:3000**

---

## Pages disponibles

| URL | Description |
|-----|-------------|
| `/` | Page d'accueil |
| `/catalogue` | Catalogue avec filtres |
| `/produit/[slug]` | Détail d'un produit |
| `/checkout` | Panier & Commande |
| `/auth/login` | Connexion |
| `/auth/register` | Inscription (acheteur ou vendeur) |
| `/vendor/register` | Créer une boutique (4 étapes) |
| `/vendor/dashboard` | Dashboard vendeur |
| `/vendeurs` | Liste de tous les vendeurs |
| `/vendeur/[slug]` | Page d'une boutique |

## Structure du projet

```
src/
├── app/
│   ├── (main)/           # Route group — Header + Footer automatique
│   │   ├── catalogue/    → /catalogue
│   │   ├── produit/      → /produit/[slug]
│   │   ├── checkout/     → /checkout
│   │   ├── auth/         → /auth/login et /auth/register
│   │   ├── vendor/       → /vendor/dashboard et /vendor/register
│   │   ├── vendeurs/     → /vendeurs
│   │   └── vendeur/      → /vendeur/[slug]
│   ├── page.tsx          # Homepage /
│   └── not-found.tsx     # Page 404
├── components/
│   ├── home/             # Sections page d'accueil
│   ├── layout/           # Header & Footer
│   ├── product/          # Carte produit
│   ├── cart/             # Sidebar panier
│   └── ui/               # Button, Badge, StarRating, Toaster
├── data/                 # Données mock (produits, vendeurs, catégories)
├── store/                # Contexte panier (React Context)
├── types/                # Types TypeScript
└── lib/                  # Utilitaires (formatXAF, cn, villes)
```

## Fonctionnalités

- 🛒 **Marketplace multi-vendeurs** avec 16 produits et 6 vendeurs
- 💰 **Devise XAF (Francs CFA)** — formatage automatique
- 📱 **Paiement Mobile Money** — Airtel Money et Moov Money
- 🚚 **Livraison** dans les 12 villes du Gabon
- 🔍 **Catalogue avec filtres** — catégorie, prix, ville, tri
- 🛍️ **Panier dynamique** avec sidebar animée
- ✅ **Checkout en 3 étapes** — adresse → paiement → confirmation
- 🏪 **Dashboard vendeur** — stats, commandes, analytiques
- 🎨 **10 catégories** adaptées au marché gabonais
- 📊 **Inscription vendeur** en 4 étapes avec vérification
