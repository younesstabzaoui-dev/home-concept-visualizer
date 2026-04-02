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
    client.get(url, (response) => {
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
    }).on('error', reject);
  });
}

// Sauvegarde le GLB dans MongoDB en arrière-plan (ne bloque pas la réponse)
async function saveGlbInBackground(falGlbUrl, productId, backendBaseUrl) {
  try {
    const buffer = await downloadBuffer(falGlbUrl);
    const GlbFile = require('../models/GlbFile');

    await GlbFile.findOneAndUpdate(
      { productId },
      { productId, data: buffer, size: buffer.length },
      { upsert: true }
    );

    // Mettre à jour le glbUrl du produit vers l'URL permanente
    const Product = require('../models/Product');
    const permanentUrl = `${backendBaseUrl}/api/glb/${productId}`;
    await Product.findOneAndUpdate({ id: productId }, { $set: { glbUrl: permanentUrl } });

    console.log(`[generate3d] GLB sauvegardé dans MongoDB (${(buffer.length / 1024).toFixed(0)} KB) → ${permanentUrl}`);
  } catch (err) {
    console.error('[generate3d] Erreur sauvegarde arrière-plan:', err.message);
  }
}

// POST /api/generate-3d
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { imageUrl, productId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl requis dans le body.' });
    }

    if (!process.env.FAL_KEY || process.env.FAL_KEY === 'your_fal_api_key_here') {
      return res.status(503).json({ error: 'FAL_KEY non configuré sur le serveur.' });
    }

    console.log('[generate3d] Génération TRELLIS pour:', imageUrl.substring(0, 80));

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

    console.log('[generate3d] GLB généré:', falGlbUrl.substring(0, 80));

    // Répondre immédiatement avec l'URL fal.ai (temporaire)
    res.json({ glbUrl: falGlbUrl });

    // En arrière-plan : télécharger et sauvegarder dans MongoDB pour rendre permanent
    if (productId && mongoose.connection.readyState === 1) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const backendBaseUrl = `${protocol}://${host}`;
      saveGlbInBackground(falGlbUrl, productId, backendBaseUrl);
    }

  } catch (err) {
    console.error('[generate3d] Erreur:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors de la génération 3D: ' + err.message });
    }
  }
});

module.exports = router;
