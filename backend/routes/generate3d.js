const express = require('express');
const router = express.Router();
const { fal } = require('@fal-ai/client');
const mongoose = require('mongoose');

fal.config({ credentials: process.env.FAL_KEY });

function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];
  if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré.' });
  if (providedPassword !== adminPassword) return res.status(401).json({ error: 'Mot de passe admin incorrect.' });
  next();
}

// POST /api/generate-3d
// Body: { imageUrl: string, productId: string }
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

    console.log('[generate3d] GLB généré, téléchargement en cours...');

    // Télécharger le GLB et le stocker dans MongoDB pour qu'il ne disparaisse jamais
    let glbUrl = falGlbUrl;

    if (productId && mongoose.connection.readyState === 1) {
      try {
        const response = await fetch(falGlbUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const GlbFile = require('../models/GlbFile');

          await GlbFile.findOneAndUpdate(
            { productId },
            { productId, data: buffer, size: buffer.length },
            { upsert: true }
          );

          // URL permanente qui pointe vers notre propre backend
          const backendUrl = `${req.protocol}://${req.get('host')}`;
          glbUrl = `${backendUrl}/api/glb/${productId}`;

          console.log(`[generate3d] GLB sauvegardé dans MongoDB (${(buffer.length / 1024).toFixed(0)} KB) → ${glbUrl}`);
        } else {
          console.warn('[generate3d] Impossible de télécharger le GLB fal.ai, on garde l\'URL temporaire');
        }
      } catch (dlErr) {
        console.warn('[generate3d] Erreur téléchargement GLB:', dlErr.message, '— on garde l\'URL fal.ai');
      }
    }

    res.json({ glbUrl });

  } catch (err) {
    console.error('[generate3d] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur lors de la génération 3D: ' + err.message });
  }
});

module.exports = router;
