/**
 * Google Gemini Image Generation Service
 * =======================================
 * Utilise gemini-2.5-flash-image pour générer un rendu d'intérieur
 * à partir d'une photo de pièce + images produits labelisées.
 */

const https = require('https');

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_BASE_URL = 'generativelanguage.googleapis.com';

/**
 * Génère un rendu d'intérieur via l'API Gemini.
 *
 * @param {Object} params
 * @param {string} params.prompt - Prompt texte décrivant le rendu souhaité
 * @param {string} params.roomImageBase64 - Image de la pièce vide en base64
 * @param {string} params.roomImageMime - MIME type de l'image pièce (ex: image/jpeg)
 * @param {Array<{data: string, mime: string, name: string}>} params.productImages - Images produits avec noms
 * @returns {Promise<{imageBase64: string, mimeType: string}>}
 */
async function generateInteriorRender({ prompt, roomImageBase64, roomImageMime = 'image/jpeg', productImages = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non défini dans les variables d\'environnement.');
  }

  // Construction des parts avec labels explicites pour chaque image
  const parts = [];

  // 1. Photo de la pièce avec label
  parts.push({ text: 'THIS IS THE ROOM PHOTO — keep this room exactly as-is:' });
  parts.push({
    inlineData: {
      mimeType: roomImageMime,
      data: roomImageBase64,
    }
  });

  // 2. Images produits avec label individuel (max 4)
  const productsToSend = productImages.slice(0, 4);
  for (const img of productsToSend) {
    parts.push({ text: `THIS IS THE REFERENCE IMAGE FOR "${img.name}" — reproduce this furniture exactly:` });
    parts.push({
      inlineData: {
        mimeType: img.mime || 'image/jpeg',
        data: img.data,
      }
    });
  }

  // 3. Instruction principale
  parts.push({ text: prompt });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 0.5,
    },
  };

  const path = `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify(payload);

  const response = await makeHttpsRequest(GEMINI_BASE_URL, path, body);

  // Parser la réponse Gemini
  const candidates = response.candidates || [];
  if (!candidates.length) {
    throw new Error('Gemini n\'a retourné aucun candidat. Vérifier le prompt et les images.');
  }

  const parts_out = candidates[0]?.content?.parts || [];
  const imagePart = parts_out.find(p => p.inlineData && p.inlineData.data);

  if (!imagePart) {
    // Gemini peut retourner un message texte si la génération échoue (ex: contenu refusé)
    const textPart = parts_out.find(p => p.text);
    const reason = textPart?.text || 'Aucune image générée.';
    throw new Error(`Gemini n'a pas généré d'image: ${reason}`);
  }

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/jpeg',
  };
}

/**
 * Effectue une requête HTTPS POST vers l'API Gemini
 */
function makeHttpsRequest(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const errMsg = parsed.error?.message || data;
            reject(new Error(`Gemini API erreur ${res.statusCode}: ${errMsg}`));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Impossible de parser la réponse Gemini: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Erreur réseau Gemini: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { generateInteriorRender };
