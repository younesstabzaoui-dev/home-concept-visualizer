const express = require('express');
const router = express.Router();
const { fal } = require('@fal-ai/client');
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

fal.config({ credentials: process.env.FAL_KEY });

function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];
  if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré.' });
  if (providedPassword !== adminPassword) return res.status(401).json({ error: 'Mot de passe admin incorrect.' });
  next();
}

// Télécharge une URL en Buffer (compatible toutes versions Node)
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadBuffer(response.headers.location).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(60000, () => { request.destroy(); reject(new Error('Download timeout')); });
  });
}

// POST /api/generate-3d
// Body: { imageUrl: string, productId: string }
// Timeout étendu : cette route peut prendre 60-90s (génération IA + download)
router.post('/', requireAdmin, async (req, res) => {
  // Timeout étendu pour cette route (2 minutes)
  req.setTimeout(120000);
  res.setTimeout(120000);

  try {
    const { imageUrl, productId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl requis dans le body.' });
    }
    if (!productId) {
      return res.status(400).json({ error: 'productId requis dans le body.' });
    }
    if (!process.env.FAL_KEY || process.env.FAL_KEY === 'your_fal_api_key_here') {
      return res.status(503).json({ error: 'FAL_KEY non configuré sur le serveur.' });
    }

    console.log('[generate3d] Étape 1/3 — Génération TRELLIS pour:', imageUrl.substring(0, 80));

    const result = await fal.subscribe('fal-ai/trellis', {
      input: {
        image_url: imageUrl,
        texture_size: 1024,
        mesh_simplify: 0.95,
        ss_guidance_strength: 7.5,
        ss_sampling_steps: 12,
        slat_guidance_strength: 3,
        slat_sampling_steps: 12,
      },
      logs: false,
    });

    const raw = result?.data?.model_file || result?.data?.glb || result?.data?.model_mesh;
    const falGlbUrl = typeof raw === 'string' ? raw : raw?.url;

    if (!falGlbUrl) {
      console.error('[generate3d] Réponse inattendue fal.ai:', JSON.stringify(result?.data));
      return res.status(500).json({ error: 'GLB non retourné par fal.ai.' });
    }

    // Si MongoDB n'est pas connecté, retourner l'URL fal.ai (temporaire)
    if (mongoose.connection.readyState !== 1) {
      console.warn('[generate3d] MongoDB non connecté — URL fal.ai temporaire retournée');
      return res.json({ glbUrl: falGlbUrl });
    }

    // Étape 2 : Télécharger le GLB
    console.log('[generate3d] Étape 2/3 — Téléchargement GLB...');
    const buffer = await downloadBuffer(falGlbUrl);
    console.log(`[generate3d] GLB téléchargé (${(buffer.length / 1024).toFixed(0)} KB)`);

    // Étape 3 : Sauvegarder dans MongoDB
    console.log('[generate3d] Étape 3/3 — Sauvegarde dans MongoDB...');
    const GlbFile = require('../models/GlbFile');
    await GlbFile.findOneAndUpdate(
      { productId },
      { productId, data: buffer, size: buffer.length },
      { upsert: true }
    );

    // URL permanente relative — le frontend la résout via son proxy API
    const glbUrl = `/api/glb/${productId}`;

    // Mettre à jour le produit avec l'URL permanente
    const Product = require('../models/Product');
    await Product.findOneAndUpdate({ id: productId }, { $set: { glbUrl } });

    console.log(`[generate3d] Terminé ! GLB permanent : ${glbUrl}`);
    res.json({ glbUrl });

  } catch (err) {
    console.error('[generate3d] Erreur:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors de la génération 3D: ' + err.message });
    }
  }
});

module.exports = router;
