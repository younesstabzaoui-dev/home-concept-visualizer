const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

// Importe products.json dans MongoDB si la collection est vide
async function seedProducts() {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return;

    const filePath = path.join(__dirname, '../data/products.json');
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    await Product.insertMany(data, { ordered: false });
    console.log(`[seed] ${data.length} produits importés depuis products.json`);
  } catch (err) {
    console.error('[seed] Erreur import:', err.message);
  }
}

module.exports = { seedProducts };
