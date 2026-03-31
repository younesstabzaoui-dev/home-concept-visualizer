require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://homeconcept-france.fr', 'https://visualizer.homeconcept-france.fr']
    : ['http://localhost:5173', 'http://localhost:3000'],
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

app.use('/api/products', productsRouter);
app.use('/api/generate', generateRouter);

// Route santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
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

app.listen(PORT, () => {
  console.log(`\n Home Concept Visualizer — Backend`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Sante: http://localhost:${PORT}/api/health`);
  console.log(`  Gemini Vision: ${process.env.GEMINI_API_KEY ? 'Configuré ✓' : 'NON CONFIGURÉ (definir GEMINI_API_KEY dans .env)'}`)
  console.log(`  fal.ai FLUX:   ${process.env.FAL_KEY && process.env.FAL_KEY !== 'your_fal_api_key_here' ? 'Configuré ✓' : 'NON CONFIGURÉ (definir FAL_KEY dans .env)'}`);
  console.log(`  Admin: ${process.env.ADMIN_PASSWORD ? 'Configuré' : 'NON CONFIGURÉ (definir ADMIN_PASSWORD dans .env)'}\n`);
});

module.exports = app;
