const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');

// ─── Fallback fichier JSON (si MongoDB non connecté) ─────────────────────────
function readFile() { return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')); }
function writeFile(products) { fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8'); }
function useDb() { return mongoose.connection.readyState === 1; }

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

    if (useDb()) {
      const Product = require('../models/Product');
      const query = category ? { category } : {};
      const products = await Product.find(query).lean();
      return res.json(products);
    }

    const products = readFile();
    if (category) return res.json(products.filter(p => p.category === category));
    res.json(products);
  } catch (err) {
    console.error('[products] Erreur lecture:', err);
    res.status(500).json({ error: 'Impossible de charger les produits.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    if (useDb()) {
      const Product = require('../models/Product');
      const product = await Product.findOne({ id: req.params.id }).lean();
      if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
      return res.json(product);
    }

    const products = readFile();
    const product = products.find(p => p.id === req.params.id);
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
      return res.status(400).json({ error: `Catégorie invalide.` });
    }

    const newProduct = {
      id: uuidv4(), name, reference, category,
      image: image || '',
      lengthCm: Number(lengthCm), depthCm: Number(depthCm), heightCm: Number(heightCm),
      description: description || '',
    };

    if (useDb()) {
      const Product = require('../models/Product');
      const doc = new Product(newProduct);
      await doc.save();
      return res.status(201).json(doc.toObject());
    }

    const products = readFile();
    products.push(newProduct);
    writeFile(products);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('[products] Erreur création:', err);
    res.status(500).json({ error: 'Erreur lors de la création.' });
  }
});

// PUT /api/products/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, reference, category, image, lengthCm, depthCm, heightCm, description, glbUrl } = req.body;
    if (category) {
      const validCategories = ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'];
      if (!validCategories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide.' });
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

    if (useDb()) {
      const Product = require('../models/Product');
      const product = await Product.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true, lean: true });
      if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
      return res.json(product);
    }

    const products = readFile();
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Produit non trouvé.' });
    products[index] = { ...products[index], ...update };
    writeFile(products);
    res.json(products[index]);
  } catch (err) {
    console.error('[products] Erreur modification:', err);
    res.status(500).json({ error: 'Erreur lors de la modification.' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (useDb()) {
      const Product = require('../models/Product');
      const product = await Product.findOneAndDelete({ id: req.params.id }).lean();
      if (!product) return res.status(404).json({ error: 'Produit non trouvé.' });
      return res.json({ message: `Produit "${product.name}" supprimé.`, deleted: product });
    }

    const products = readFile();
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Produit non trouvé.' });
    const deleted = products.splice(index, 1)[0];
    writeFile(products);
    res.json({ message: `Produit "${deleted.name}" supprimé.`, deleted });
  } catch (err) {
    console.error('[products] Erreur suppression:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
