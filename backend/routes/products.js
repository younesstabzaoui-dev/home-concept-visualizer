const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');

function readProducts() {
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

// Middleware vérification admin
function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré sur le serveur.' });
  }

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Mot de passe admin incorrect.' });
  }

  next();
}

// GET /api/products — liste tous les produits (public)
router.get('/', (req, res) => {
  try {
    const products = readProducts();
    const { category } = req.query;

    if (category) {
      const filtered = products.filter(p => p.category === category);
      return res.json(filtered);
    }

    res.json(products);
  } catch (err) {
    console.error('[products] Erreur lecture:', err);
    res.status(500).json({ error: 'Impossible de charger les produits.' });
  }
});

// GET /api/products/:id — détail d'un produit (public)
router.get('/:id', (req, res) => {
  try {
    const products = readProducts();
    const product = products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    res.json(product);
  } catch (err) {
    console.error('[products] Erreur lecture produit:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/products — ajouter un produit (admin only)
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, reference, category, image, lengthCm, depthCm, heightCm, description } = req.body;

    if (!name || !reference || !category || !lengthCm || !depthCm || !heightCm) {
      return res.status(400).json({
        error: 'Champs requis manquants: name, reference, category, lengthCm, depthCm, heightCm'
      });
    }

    const validCategories = ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Catégorie invalide. Valeurs acceptées: ${validCategories.join(', ')}`
      });
    }

    const products = readProducts();

    const newProduct = {
      id: uuidv4(),
      name,
      reference,
      category,
      image: image || '',
      lengthCm: Number(lengthCm),
      depthCm: Number(depthCm),
      heightCm: Number(heightCm),
      description: description || '',
    };

    products.push(newProduct);
    writeProducts(products);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('[products] Erreur création:', err);
    res.status(500).json({ error: 'Erreur lors de la création du produit.' });
  }
});

// PUT /api/products/:id — modifier un produit (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const products = readProducts();
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    const { name, reference, category, image, lengthCm, depthCm, heightCm, description, glbUrl } = req.body;

    if (category) {
      const validCategories = ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          error: `Catégorie invalide. Valeurs acceptées: ${validCategories.join(', ')}`
        });
      }
    }

    products[index] = {
      ...products[index],
      ...(name && { name }),
      ...(reference && { reference }),
      ...(category && { category }),
      ...(image !== undefined && { image }),
      ...(lengthCm && { lengthCm: Number(lengthCm) }),
      ...(depthCm && { depthCm: Number(depthCm) }),
      ...(heightCm && { heightCm: Number(heightCm) }),
      ...(description !== undefined && { description }),
      ...(glbUrl !== undefined && { glbUrl }),
    };

    writeProducts(products);
    res.json(products[index]);
  } catch (err) {
    console.error('[products] Erreur modification:', err);
    res.status(500).json({ error: 'Erreur lors de la modification du produit.' });
  }
});

// DELETE /api/products/:id — supprimer un produit (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const products = readProducts();
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    const deleted = products.splice(index, 1)[0];
    writeProducts(products);

    res.json({ message: `Produit "${deleted.name}" supprimé avec succès.`, deleted });
  } catch (err) {
    console.error('[products] Erreur suppression:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du produit.' });
  }
});

module.exports = router;
