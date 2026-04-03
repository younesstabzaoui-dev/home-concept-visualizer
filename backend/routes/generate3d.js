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

// Télécharge une URL en Buffer avec suivi de redirections
function downloadBuffer(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Trop de redirections'));
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadBuffer(response.headers.location, maxRedirects - 1).then(resolve).catch(reject);
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
    request.setTimeout(120000, () => { request.destroy(); reject(new Error('Download timeout 120s')); });
  });
}

// POST /api/generate-3d
router.post('/', requireAdmin, async (req, res) => {
  req.setTimeout(300000);

  try {
    const { imageUrl, productId } = req.body;

    if (!imageUrl) return res.status(400).json({ error: 'imageUrl requis.' });
    if (!productId) return res.status(400).json({ error: 'productId requis.' });
    if (!process.env.FAL_KEY || process.env.FAL_KEY === 'your_fal_api_key_here') {
      return res.status(503).json({ error: 'FAL_KEY non configuré.' });
    }

    // Attendre que MongoDB soit connecté (max 15s — cold start Render)
    if (mongoose.connection.readyState !== 1) {
      console.log('[3D] Attente connexion MongoDB...');
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (mongoose.connection.readyState === 1) break;
      }
      if (mongoose.connection.readyState !== 1) {
        console.error('[3D] MongoDB toujours non connecté après 15s');
        return res.status(503).json({ error: 'Base de données non disponible. Réessayez dans 30 secondes.' });
      }
      console.log('[3D] MongoDB connecté OK');
    }

    console.log(`[3D] 1/3 Génération TRELLIS — produit ${productId}`);

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
      console.error('[3D] Réponse fal.ai inattendue:', JSON.stringify(result?.data).substring(0, 200));
      return res.status(500).json({ error: 'GLB non retourné par fal.ai.' });
    }

    console.log(`[3D] 2/3 Téléchargement GLB: ${falGlbUrl.substring(0, 80)}...`);

    // Vérifier MongoDB (re-check après la longue génération fal.ai)
    if (mongoose.connection.readyState !== 1) {
      console.log('[3D] MongoDB déconnecté après génération, attente reconnexion...');
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (mongoose.connection.readyState === 1) break;
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Base de données non disponible. Réessayez.' });
      }
    }

    // Télécharger le fichier GLB
    let buffer;
    try {
      buffer = await downloadBuffer(falGlbUrl);
      console.log(`[3D] GLB téléchargé: ${(buffer.length / 1024).toFixed(0)} KB`);
    } catch (dlErr) {
      console.error(`[3D] Erreur téléchargement: ${dlErr.message}`);
      return res.status(500).json({ error: `Erreur téléchargement GLB: ${dlErr.message}` });
    }

    // Sauvegarder dans MongoDB
    console.log(`[3D] 3/3 Sauvegarde dans MongoDB...`);
    try {
      const GlbFile = require('../models/GlbFile');
      await GlbFile.findOneAndUpdate(
        { productId },
        { productId, data: buffer, size: buffer.length },
        { upsert: true, new: true }
      );
      console.log(`[3D] GLB sauvegardé dans MongoDB OK`);
    } catch (saveErr) {
      console.error(`[3D] Erreur sauvegarde MongoDB: ${saveErr.message}`);
      return res.status(500).json({ error: `Erreur sauvegarde: ${saveErr.message}` });
    }

    // Marquer le produit comme ayant un GLB stocké
    try {
      const Product = require('../models/Product');
      await Product.findOneAndUpdate(
        { id: productId },
        { $set: { glbUrl: 'stored' } }
      );
      console.log(`[3D] Produit ${productId} marqué glbUrl=stored`);
    } catch (updateErr) {
      console.error(`[3D] Erreur update produit: ${updateErr.message}`);
      // Non bloquant — le GLB est quand même sauvé
    }

    console.log(`[3D] TERMINÉ — produit ${productId}`);
    res.json({ success: true, glbUrl: 'stored', size: buffer.length });

  } catch (err) {
    console.error('[3D] Erreur globale:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur génération 3D: ' + err.message });
    }
  }
});

module.exports = router;
