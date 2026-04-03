require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les uploads statiquement
app.use('/uploads', express.static(uploadsDir));

// Routes
const productsRouter = require('./routes/products');
const generateRouter = require('./routes/generate');
const generate3dRouter = require('./routes/generate3d');

app.use('/api/products', productsRouter);
app.use('/api/generate', generateRouter);
app.use('/api/generate-3d', generate3dRouter);

// Debug : lister les GLB stockés dans MongoDB
app.get('/api/glb/debug', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ error: 'MongoDB non connecté', readyState: mongoose.connection.readyState });
    }
    const GlbFile = require('./models/GlbFile');
    const files = await GlbFile.find({}, { productId: 1, size: 1, createdAt: 1, _id: 0 }).lean();
    const Product = require('./models/Product');
    const products = await Product.find({}, { id: 1, name: 1, glbUrl: 1, _id: 0 }).lean();
    res.json({
      mongoConnected: true,
      glbFiles: files.map(f => ({ productId: f.productId, sizeKB: Math.round((f.size || 0) / 1024), date: f.createdAt })),
      products: products.map(p => ({ id: p.id, name: p.name, glbUrl: p.glbUrl || null })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir les fichiers GLB stockés dans MongoDB
app.get('/api/glb/:productId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'MongoDB non connecté.' });
    }
    const GlbFile = require('./models/GlbFile');
    const glb = await GlbFile.findOne({ productId: req.params.productId });
    if (!glb || !glb.data) {
      console.warn(`[glb] GLB non trouvé pour productId=${req.params.productId}`);
      return res.status(404).json({ error: 'GLB non trouvé.' });
    }
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Length': glb.data.length,
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
    });
    res.send(glb.data);
  } catch (err) {
    console.error('[glb] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Vérification mot de passe admin
app.post('/api/admin/verify', (req, res) => {
  const pwd = req.headers['x-admin-password']
  if (!pwd || pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' })
  }
  res.json({ ok: true })
});

// Route santé + diagnostic MongoDB
app.get('/api/health', (req, res) => {
  const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: {
      state: mongoStates[mongoose.connection.readyState] || 'unknown',
      readyState: mongoose.connection.readyState,
      uriConfigured: !!process.env.MONGODB_URI,
      uriPreview: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NON DÉFINI',
    },
    env: {
      falKey: !!process.env.FAL_KEY,
      adminPassword: !!process.env.ADMIN_PASSWORD,
    },
  });
});

// Gestion erreurs multer et globales
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop volumineux. Maximum 20 MB.' });
  }
  if (err.message && err.message.includes('Format non supporté')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[server] Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable.` });
});

// Connexion MongoDB avec retry
if (process.env.MONGODB_URI) {
  console.log('  MongoDB: Connexion en cours...');
  console.log('  MongoDB URI:', process.env.MONGODB_URI.substring(0, 30) + '...');
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  })
    .then(async () => {
      console.log('  MongoDB: Connecté ✓ (readyState=' + mongoose.connection.readyState + ')');
      const { seedProducts } = require('./services/productSeeder');
      await seedProducts();
    })
    .catch(err => {
      console.error('  MongoDB: ERREUR CONNEXION:', err.message);
      console.error('  MongoDB: Vérifiez MONGODB_URI et la whitelist IP sur Atlas');
    });

  mongoose.connection.on('error', err => console.error('  MongoDB event error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('  MongoDB: Déconnecté'));
  mongoose.connection.on('reconnected', () => console.log('  MongoDB: Reconnecté ✓'));
} else {
  console.error('  ⚠️  MONGODB_URI NON DÉFINI — les GLB 3D ne pourront pas être sauvegardés !');
  console.error('  ⚠️  Ajoutez MONGODB_URI dans les variables d\'environnement de Render');
}

app.listen(PORT, () => {
  console.log(`\n Home Concept Visualizer — Backend`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Sante: http://localhost:${PORT}/api/health`);
  console.log(`  Gemini Vision: ${process.env.GEMINI_API_KEY ? 'Configuré ✓' : 'NON CONFIGURÉ (definir GEMINI_API_KEY dans .env)'}`)
  console.log(`  fal.ai FLUX:   ${process.env.FAL_KEY && process.env.FAL_KEY !== 'your_fal_api_key_here' ? 'Configuré ✓' : 'NON CONFIGURÉ (definir FAL_KEY dans .env)'}`);
  console.log(`  Admin: ${process.env.ADMIN_PASSWORD ? 'Configuré' : 'NON CONFIGURÉ (definir ADMIN_PASSWORD dans .env)'}\n`);
});

module.exports = app;
