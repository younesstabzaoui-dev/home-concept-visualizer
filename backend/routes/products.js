const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');

function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];
  if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré.' });
  if (providedPassword !== adminPassword) return res.status(401).json({ error: 'Mot de passe admin incorrect.' });
  next();
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const products = await Product.find(query).lean();
    res.json(products);
  } catch (err) {
    console.error('[products] Erreur lecture:', err);
    res.status(500).json({ error: 'Impossible de charger les produits.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/products
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, reference, category, image, lengthCm, depthCm, heightCm, description } = req.body;

    if (!name || !reference || !category || !lengthCm || !depthCm || !heightCm) {
      return res.status(400).json({ error: 'Champs requis manquants.' });
    }

    const validCategories = ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Catégorie invalide. Valeurs: ${validCategories.join(', ')}` });
    }

    const newProduct = new Product({
      id: uuidv4(),
      name, reference, category,
      image: image || '',
      lengthCm: Number(lengthCm),
      depthCm: Number(depthCm),
      heightCm: Number(heightCm),
      description: description || '',
    });

    await newProduct.save();
    res.status(201).json(newProduct.toObject());
  } catch (err) {
    console.error('[products] Erreur création:', err);
    res.status(500).json({ error: 'Erreur lors de la création du produit.' });
  }
});

// PUT /api/products/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, reference, category, image, lengthCm, depthCm, heightCm, description, glbUrl } = req.body;

    if (category) {
      const validCategories = ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: `Catégorie invalide.` });
      }
    }

    const update = {
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

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { new: true, lean: true }
    );

    if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
    res.json(product);
  } catch (err) {
    console.error('[products] Erreur modification:', err);
    res.status(500).json({ error: 'Erreur lors de la modification.' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id }).lean();
    if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
    res.json({ message: `Produit "${product.name}" supprimé.`, deleted: product });
  } catch (err) {
    console.error('[products] Erreur suppression:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
