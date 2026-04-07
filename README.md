# Home Concept Interior Visualizer

Web app de visualisation d'intérieur pour Home Concept (Juvignac, Montpellier).
Permet à un client de visualiser des meubles Home Concept dans sa pièce via génération IA photoréaliste.

---

## Prérequis

- Node.js >= 18
- npm >= 9

---

## Installation et démarrage

### 1. Configurer le backend

```bash
cd backend
cp .env.example .env
```

Editer le fichier `.env` et renseigner :

```
NANO_BANANA_API_KEY=votre_clé_api_nano_banana
ADMIN_PASSWORD=votre_mot_de_passe_admin
PORT=3001
```

```bash
npm install
npm start
```

Le backend démarre sur `http://localhost:3001`

### 2. Démarrer le frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Le frontend est accessible sur `http://localhost:5173`

---

## Structure du projet

```
home-concept-visualizer/
  backend/
    server.js              Point d'entrée Express
    routes/
      products.js          CRUD catalogue (GET public, POST/PUT/DELETE admin)
      generate.js          POST /api/generate — appel Nano Banana
    services/
      nanobanana.js        Wrapper API Nano Banana (à compléter avec doc API)
    data/
      products.json        Catalogue produits (5 produits de démo inclus)
    .env.example           Template variables d'environnement
  frontend/
    src/
      components/
        UploadRoom.jsx     Step 1 — Upload photo pièce
        RoomDimensions.jsx Step 2 — Dimensions L x l (m)
        ProductCatalog.jsx Step 3 — Sélection meubles (max 4)
        PositionPrompt.jsx Step 4 — Placement texte libre
        LoadingState.jsx   Ecran attente génération
        RenderResult.jsx   Slider before/after
        AdminPanel.jsx     Tableau de bord admin
        AdminProductForm.jsx Formulaire ajout/édition produit
      pages/
        ClientApp.jsx      Flow client complet
        Admin.jsx          Page /admin protégée par mot de passe
      utils/
        proportionCalculator.js Calcul ratios meuble/pièce
        promptBuilder.js        Génération prompt Nano Banana
```

---

## Routes API

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | /api/products | Public | Liste tous les produits |
| GET | /api/products/:id | Public | Détail d'un produit |
| POST | /api/products | Admin | Ajouter un produit |
| PUT | /api/products/:id | Admin | Modifier un produit |
| DELETE | /api/products/:id | Admin | Supprimer un produit |
| POST | /api/generate | Public | Générer un rendu |
| GET | /api/health | Public | Santé du serveur |

Les routes admin nécessitent le header `x-admin-password`.

---

## Intégration Nano Banana

Le fichier `backend/services/nanobanana.js` est un wrapper prêt à compléter.
Les zones marquées `// TODO` indiquent les paramètres à adapter selon la doc API Nano Banana.

Une fois la doc reçue, mettre à jour :
1. L'endpoint (`/v1/generate` ou autre)
2. Le format d'authentification (`Bearer`, `Api-Key`, etc.)
3. Les noms de champs du payload (`reference_image`, `init_image`, etc.)
4. Le format de la réponse (`response.image`, `response.url`, etc.)

---

## Interface Admin

Accessible sur `/admin`.

Mot de passe défini par la variable `ADMIN_PASSWORD` dans `.env`.

Fonctionnalités :
- Liste des produits avec stats par catégorie
- Ajouter / Modifier / Supprimer des produits
- Validation complète des formulaires

---

## Calcul des proportions

Les meubles sont placés à l'échelle réelle dans le prompt grâce aux ratios :

```javascript
// Canapé 280cm dans une pièce de 5m de large
ratioWidth = 280 / (5 * 100) = 56%

// Ce ratio est injecté dans le prompt :
// "occupying approximately 56% of room width"
```

Voir `frontend/src/utils/proportionCalculator.js` pour l'implémentation complète.

---

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `NANO_BANANA_API_KEY` | Oui | Clé API Nano Banana |
| `NANO_BANANA_BASE_URL` | Non | URL base API (défaut: https://api.nanobanana.io) |
| `ADMIN_PASSWORD` | Oui | Mot de passe interface /admin |
| `PORT` | Non | Port serveur (défaut: 3001) |
| `NODE_ENV` | Non | development ou production |

---

## Produits de démo inclus

| Référence | Nom | Dimensions |
|-----------|-----|------------|
| HC-CAN-001 | Canapé Athena 3 places | 280×95×82 cm |
| HC-TBL-001 | Table basse Oria | 120×60×42 cm |
| HC-TRP-001 | Table à manger Lumino 6 places | 180×90×76 cm |
| HC-CHA-001 | Chaise Sena | 45×52×86 cm |
| HC-LIT-001 | Lit Noa 160×200 | 214×172×105 cm |
