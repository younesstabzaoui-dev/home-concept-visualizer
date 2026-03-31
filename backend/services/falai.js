/**
 * fal.ai — FLUX Kontext Service
 * ==============================
 * Remplace Gemini Image pour la génération d'intérieur.
 * FLUX Kontext est spécialisé image-to-image avec préservation
 * fidèle du style, des couleurs et des textures.
 *
 * Endpoint multi-images : fal-ai/flux-pro/kontext/max/multi
 * → Accepte pièce vide + images produits comme références visuelles
 * → Retourne une URL CDN (téléchargée et convertie en base64)
 */

const { fal } = require('@fal-ai/client');
const https = require('https');
const http = require('http');

/**
 * Génère un rendu d'intérieur via FLUX Kontext.
 *
 * @param {Object} params
 * @param {string} params.prompt - Prompt expert décrivant le rendu
 * @param {string} params.roomImageBase64 - Photo pièce en base64
 * @param {string} params.roomImageMime - MIME type (ex: image/jpeg)
 * @param {Array<{data: string, mime: string}>} params.productImagesBase64 - Images produits
 * @returns {Promise<{imageBase64: string, mimeType: string}>}
 */
async function generateInteriorRender({ prompt, roomImageBase64, roomImageMime = 'image/jpeg', productImagesBase64 = [] }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY non défini dans les variables d\'environnement.');

  fal.config({ credentials: apiKey });

  // On envoie UNIQUEMENT la photo de la pièce.
  // Les produits sont décrits textuellement via le prompt expert (couleur, tissu, texture, proportion).
  // Raison : FLUX Kontext max/multi mélange visuellement les images sans respecter
  // les instructions spatiales. Avec une seule image + prompt détaillé, il suit mieux
  // les proportions et le placement.
  const roomDataUri = `data:${roomImageMime};base64,${roomImageBase64}`;
  const endpoint = 'fal-ai/flux-pro/kontext/max';

  const input = {
    prompt,
    image_url: roomDataUri,
    guidance_scale: 5,       // Plus élevé = suit mieux les instructions de placement
    num_inference_steps: 40, // Plus d'étapes = meilleure qualité
    output_format: 'jpeg',
    num_images: 1,
  };

  console.log(`[falai] Endpoint: ${endpoint} | prompt: ${prompt.length} chars`);

  const result = await fal.subscribe(endpoint, { input });

  const generatedUrl = result?.data?.images?.[0]?.url;
  if (!generatedUrl) {
    throw new Error('fal.ai n\'a retourné aucune image. Vérifier le prompt et les paramètres.');
  }

  console.log(`[falai] Image générée: ${generatedUrl}`);

  // Télécharger l'image depuis le CDN fal.media et la convertir en base64
  const { data: imageBase64, mime: mimeType } = await downloadImageAsBase64(generatedUrl);

  return { imageBase64, mimeType };
}

/**
 * Télécharge une image depuis une URL et la retourne en base64
 */
function downloadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(imageUrl);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    lib.get(imageUrl, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`Erreur téléchargement image générée: HTTP ${res.statusCode}`));
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

module.exports = { generateInteriorRender };
