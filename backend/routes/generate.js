const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const url = require('url');

const { generateInteriorRender } = require('../services/nanobanana');
const { analyzeRoom, analyzeProduct } = require('../services/roomAnalyzer');

// Configuration multer — stockage temporaire en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Format non supporté. Utilisez JPG, PNG ou WEBP.'));
  },
});

/**
 * Construit un prompt expert en design d'intérieur à partir des analyses vision.
 * Chaque élément visuel du meuble est ancré textuellement pour éviter
 * que Gemini Image dévie de la couleur/matière/texture d'origine.
 */
function buildExpertPrompt(roomDimensions, selectedProducts, roomAnalysis, productAnalyses) {
  const { widthM, depthM, heightM } = roomDimensions;

  // --- Section 1 : ancrage de la pièce ---
  const roomSection = `
=== ROOM TO RENDER ===
Dimensions: ${widthM}m wide × ${depthM}m deep${heightM ? ` × ${heightM}m high` : ''}.
${roomAnalysis}
CRITICAL: Keep the original room exactly as photographed — same walls, same floor, same ceiling, same lighting direction and intensity, same windows and architectural features. Do NOT alter the room in any way.`.trim();

  // --- Section 2 : description des meubles avec ancrage visuel ---
  const furnitureSection = selectedProducts.map(({ product, position }, index) => {
    const ratioW = Math.round((product.lengthCm / (widthM * 100)) * 100);
    const ratioD = Math.round((product.depthCm / (depthM * 100)) * 100);
    const analysis = productAnalyses[index] || '';

    return `
--- FURNITURE ITEM ${index + 1}: ${product.name.toUpperCase()} ---
Physical dimensions: ${product.lengthCm}cm long × ${product.depthCm}cm deep × ${product.heightCm || '?'}cm high
Scale in room: occupies ${ratioW}% of room width and ${ratioD}% of room depth
Placement: ${position}

VISUAL SPECIFICATIONS (reproduce EXACTLY — do not change any of these):
${analysis}

CRITICAL RULES for this item:
- The color described in PRIMARY_COLOR above must be reproduced with exact fidelity — do not alter, lighten, darken, or shift the hue
- The fabric/material texture must be clearly visible and match the FABRIC_MATERIAL and TEXTURE descriptions exactly
- The legs/base must match LEGS_BASE exactly — do not substitute or simplify
- The silhouette must match SILHOUETTE — do not reshape or resize beyond the stated proportions
- Use the provided reference image of this product as the visual source of truth`.trim();
  }).join('\n\n');

  // --- Section 3 : directives de rendu photographique ---
  const renderSection = `
=== RENDERING DIRECTIVES ===
Output: Ultra-photorealistic architectural interior photograph. 8K resolution quality.
Camera: Eye-level perspective, approximately 1.6m high, 24-35mm equivalent lens, slight depth of field.
Lighting: Exactly match the original room's lighting — same direction, same color temperature, same shadows. Furniture casts natural shadows consistent with the room's light source.
Style coherence: The furniture must visually belong to the room — shadows, reflections, and ambient occlusion must be physically accurate.
Brand context: Home Concept — French premium furniture brand. Clean lines, timeless elegance, neutral palette (beige, black, white, natural oak). The render should feel like a professional editorial shoot for a high-end design magazine.

ABSOLUTE PROHIBITIONS:
- Do NOT change any furniture color from its reference image
- Do NOT substitute a different furniture style or silhouette
- Do NOT add any furniture or objects not listed above
- Do NOT add any text, watermarks, or overlays
- Do NOT modify the room structure, walls, floor, or ceiling`.trim();

  return `${roomSection}\n\n=== FURNITURE TO PLACE ===\n${furnitureSection}\n\n${renderSection}`;
}

/**
 * Compresse une image buffer à max 1024px de large, format JPEG
 */
async function compressImage(buffer) {
  return await sharp(buffer)
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Télécharge une image depuis une URL et la retourne en base64
 */
function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(imageUrl);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    lib.get(imageUrl, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} pour ${imageUrl}`));
        return;
      }
      const mime = res.headers['content-type'] || 'image/jpeg';
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ data: Buffer.concat(chunks).toString('base64'), mime }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * POST /api/generate
 * Body (multipart/form-data):
 *   - roomImage: File (JPG/PNG/WEBP)
 *   - roomDimensions: JSON string { widthM, depthM, heightM? }
 *   - selectedProducts: JSON string [{ product: {...}, position: "..." }]
 */
router.post('/', upload.single('roomImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image de la pièce manquante (champ: roomImage).' });
    }

    let roomDimensions, selectedProducts;
    try { roomDimensions = JSON.parse(req.body.roomDimensions); }
    catch { return res.status(400).json({ error: 'roomDimensions doit être un JSON valide.' }); }
    try { selectedProducts = JSON.parse(req.body.selectedProducts); }
    catch { return res.status(400).json({ error: 'selectedProducts doit être un JSON valide.' }); }

    const { widthM, depthM } = roomDimensions;
    if (!widthM || !depthM || widthM < 2 || widthM > 15 || depthM < 2 || depthM > 15) {
      return res.status(400).json({ error: 'Dimensions invalides. Valeurs acceptées : 2m–15m.' });
    }
    if (!selectedProducts?.length) {
      return res.status(400).json({ error: 'Au moins un produit doit être sélectionné.' });
    }
    if (selectedProducts.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 produits simultanément.' });
    }
    for (const item of selectedProducts) {
      if (!item.product || !item.position) {
        return res.status(400).json({ error: 'Chaque produit doit avoir un objet "product" et une "position".' });
      }
    }

    // ÉTAPE 1 — Compression de l'image pièce
    console.log('[generate] Étape 1 — Compression image pièce...');
    const compressedRoomImage = await compressImage(req.file.buffer);
    const roomImageBase64 = compressedRoomImage.toString('base64');

    // ÉTAPE 2 — Téléchargement des images produits
    console.log('[generate] Étape 2 — Chargement images produits...');
    const productImagesBase64 = [];
    for (const { product } of selectedProducts) {
      if (!product.image) { productImagesBase64.push(null); continue; }

      if (product.image.startsWith('data:')) {
        const [header, data] = product.image.split(',');
        const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        productImagesBase64.push({ data, mime });
      } else {
        try {
          const result = await fetchImageAsBase64(product.image);
          productImagesBase64.push(result);
        } catch (e) {
          console.warn(`[generate] Image produit non chargée: ${e.message}`);
          productImagesBase64.push(null);
        }
      }
    }

    // ÉTAPE 3 — Analyse vision en parallèle (pièce + tous les produits)
    console.log('[generate] Étape 3 — Analyse vision (pièce + produits)...');
    const [roomAnalysis, ...productAnalyses] = await Promise.all([
      analyzeRoom(roomImageBase64, 'image/jpeg').catch(e => {
        console.warn('[generate] Analyse pièce échouée, fallback:', e.message);
        return '';
      }),
      ...selectedProducts.map(({ product }, i) => {
        const imgData = productImagesBase64[i];
        if (!imgData) return Promise.resolve('');
        return analyzeProduct(imgData.data, imgData.mime, product).catch(e => {
          console.warn(`[generate] Analyse produit ${product.name} échouée:`, e.message);
          return '';
        });
      }),
    ]);

    console.log('[generate] Analyse pièce:\n', roomAnalysis.substring(0, 300));

    // ÉTAPE 4 — Construction du prompt expert
    console.log('[generate] Étape 4 — Construction prompt expert...');
    const prompt = buildExpertPrompt(roomDimensions, selectedProducts, roomAnalysis, productAnalyses);
    console.log('[generate] Prompt longueur:', prompt.length, 'caractères');

    // ÉTAPE 5 — Génération image
    console.log('[generate] Étape 5 — Génération image Gemini...');
    const validProductImages = productImagesBase64.filter(Boolean);
    const result = await generateInteriorRender({
      prompt,
      roomImageBase64,
      roomImageMime: 'image/jpeg',
      productImagesBase64: validProductImages,
    });

    console.log('[generate] Rendu généré avec succès.');
    res.json({
      success: true,
      generatedImage: `data:${result.mimeType};base64,${result.imageBase64}`,
      prompt,
    });

  } catch (err) {
    console.error('[generate] Erreur:', err.message);

    if (err.message.includes('API') || err.message.includes('Gemini')) {
      return res.status(503).json({
        error: 'Le service de génération est temporairement indisponible. Veuillez réessayer dans quelques instants.',
        retryable: true,
      });
    }

    res.status(500).json({
      error: 'Une erreur est survenue lors de la génération. Veuillez réessayer.',
      retryable: true,
    });
  }
});

module.exports = router;
