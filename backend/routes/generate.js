const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const url = require('url');

const { generateInteriorRender } = require('../services/nanobanana');

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
 * Construit un prompt court et direct pour Gemini Image.
 * Les images produits sont déjà labelisées dans nanobanana.js,
 * donc le prompt ne fait que donner les instructions de placement.
 */
function buildExpertPrompt(roomDimensions, selectedProducts) {
  const { widthM, depthM, heightM } = roomDimensions;

  const placements = selectedProducts.map(({ product, position }) =>
    `- "${product.name}" (${product.lengthCm}×${product.depthCm}cm): ${position}`
  ).join('\n');

  return `Place the furniture from the reference images into the room photo. The result must look like a real interior photograph taken by a professional real estate photographer — not a 3D render or CGI.

Room: ${widthM}m wide × ${depthM}m deep${heightM ? `, ${heightM}m ceiling` : ''}.

PLACEMENT:
${placements}

STYLE: Architectural interior photography, shot on a Canon EOS R5 with a 24mm wide-angle lens, natural lighting matching the room photo, sharp focus, realistic shadows and reflections.

RULES:
- Keep the room IDENTICAL — same walls, floor, ceiling, windows, lighting, perspective. Change absolutely nothing about the room.
- Each furniture piece must match its reference image exactly — same color, same material, same texture, same shape, same legs.
- Scale each piece realistically using the cm dimensions above relative to the room size.
- Furniture casts soft natural shadows consistent with the room's visible light source.
- Do not add any extra objects, people, text, or watermarks.`;
}

/**
 * Compresse une image buffer à max 1024px de large, format JPEG
 */
async function compressImage(buffer) {
  return await sharp(buffer)
    .resize({ width: 2048, withoutEnlargement: true })
    .jpeg({ quality: 92 })
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

    // ÉTAPE 2 — Téléchargement des images produits avec noms
    console.log('[generate] Étape 2 — Chargement images produits...');
    const productImages = [];
    for (const { product } of selectedProducts) {
      if (!product.image) continue;

      let imgData = null;
      if (product.image.startsWith('data:')) {
        const [header, data] = product.image.split(',');
        const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        imgData = { data, mime };
      } else {
        try {
          imgData = await fetchImageAsBase64(product.image);
        } catch (e) {
          console.warn(`[generate] Image produit non chargée: ${e.message}`);
        }
      }

      if (imgData) {
        productImages.push({ ...imgData, name: product.name });
      }
    }

    // ÉTAPE 3 — Construction du prompt (court et direct)
    console.log('[generate] Étape 3 — Construction prompt...');
    const prompt = buildExpertPrompt(roomDimensions, selectedProducts);
    console.log('[generate] Prompt (%d chars):\n%s', prompt.length, prompt);

    // ÉTAPE 4 — Génération image Gemini (images labelisées + prompt court)
    console.log('[generate] Étape 4 — Génération image Gemini...');
    const result = await generateInteriorRender({
      prompt,
      roomImageBase64,
      roomImageMime: 'image/jpeg',
      productImages,
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
