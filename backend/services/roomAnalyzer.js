/**
 * Room & Product Vision Analyzer
 * ================================
 * Utilise Gemini Vision (gemini-2.5-flash) pour analyser :
 * 1. La photo de la pièce → couleurs, matières, lumière, style architectural
 * 2. Chaque image produit → couleur exacte, tissu, texture, finition, silhouette
 *
 * Ces descriptions sont ensuite injectées dans le prompt de génération
 * pour éviter que Gemini invente les couleurs ou change l'aspect des meubles.
 */

const https = require('https');

const VISION_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'generativelanguage.googleapis.com';

/**
 * Analyse la photo de la pièce vide et retourne une description précise
 * @param {string} roomImageBase64
 * @param {string} roomImageMime
 * @returns {Promise<string>} description structurée de la pièce
 */
async function analyzeRoom(roomImageBase64, roomImageMime = 'image/jpeg') {
  const prompt = `You are an expert interior designer and photographer. Analyze this empty room photo and describe it with extreme precision. Return ONLY a structured description in English, no commentary.

Format your response exactly like this:
WALLS: [exact color description with undertones, e.g. "warm off-white with light grey undertones, matte finish"]
FLOOR: [material and color, e.g. "light natural oak herringbone parquet" or "large format white matte tiles"]
CEILING: [color and height estimate, e.g. "white, approximately 2.6m high"]
NATURAL_LIGHT: [direction and quality, e.g. "strong natural light entering from large window on the left, casting soft shadows toward the right, warm afternoon tone"]
ARCHITECTURAL_STYLE: [e.g. "modern minimalist", "Haussmann classic", "industrial loft", "Scandinavian contemporary"]
EXISTING_PALETTE: [2-4 dominant colors present in the room, e.g. "warm white, natural oak, light grey"]
MOOD: [e.g. "bright and airy", "cozy and warm", "cool and minimal"]
SPECIAL_FEATURES: [any notable architectural elements, e.g. "exposed concrete beam", "large bay window", "built-in alcove" or "none"]`;

  return await callGeminiVision(roomImageBase64, roomImageMime, prompt);
}

/**
 * Analyse une image produit et retourne une description ultra-précise du meuble
 * @param {string} productImageBase64
 * @param {string} productImageMime
 * @param {Object} productMeta - { name, lengthCm, depthCm, heightCm, description }
 * @returns {Promise<string>} description visuelle complète du produit
 */
async function analyzeProduct(productImageBase64, productImageMime = 'image/jpeg', productMeta = {}) {
  const metaContext = productMeta.description
    ? `Known product info: ${productMeta.name}, ${productMeta.description}.`
    : `Product: ${productMeta.name || 'furniture item'}.`;

  const prompt = `You are an expert furniture photographer and interior stylist. ${metaContext}

Analyze this furniture product image with extreme precision. This description will be used to generate a photorealistic interior render — accuracy is critical to preserve the exact appearance.

Return ONLY a structured description in English, no commentary.

Format exactly like this:
PRIMARY_COLOR: [exact color name with nuance, e.g. "sage green", "warm ivory", "charcoal grey", "cognac brown" — be very specific, never use vague terms like "beige" alone]
COLOR_UNDERTONE: [e.g. "slightly warm yellow undertone", "cool blue-grey undertone", "neutral"]
FABRIC_MATERIAL: [exact material, e.g. "chunky bouclé knit fabric", "full-grain smooth leather", "brushed linen-cotton blend", "velvet with light sheen", "solid oak wood"]
TEXTURE: [tactile description, e.g. "coarse looped texture", "smooth and supple", "slightly ribbed", "fine grain"]
LEGS_BASE: [describe legs or base, e.g. "tapered solid oak legs, natural finish", "matte black powder-coated steel hairpin legs", "integrated plinth base in matching fabric", "brushed brass cylindrical legs"]
SILHOUETTE: [overall shape, e.g. "low-profile with wide track arms and deep seat", "slim and tall with straight lines", "curved organic form", "rectangular clean-lined"]
DOMINANT_VISUAL: [most striking visual characteristic, e.g. "the chunky green bouclé texture dominates the entire surface", "the contrast between dark leather and light wood legs"]
STYLE: [design style, e.g. "contemporary Scandinavian", "mid-century modern", "minimalist French", "transitional"]`;

  return await callGeminiVision(productImageBase64, productImageMime, prompt);
}

/**
 * Appelle Gemini Vision avec une image et un prompt texte
 * @returns {Promise<string>} réponse texte de Gemini
 */
async function callGeminiVision(imageBase64, imageMime, textPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non défini.');

  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: imageMime, data: imageBase64 } },
        { text: textPrompt },
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
    },
  };

  const path = `/v1beta/models/${VISION_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify(payload);

  const response = await makeHttpsRequest(GEMINI_BASE_URL, path, body);
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Vision API: aucune réponse texte reçue.');
  return text.trim();
}

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
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Vision API erreur ${res.statusCode}: ${parsed.error?.message || data}`));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Impossible de parser la réponse Vision: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', err => reject(new Error(`Erreur réseau Vision: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

module.exports = { analyzeRoom, analyzeProduct };
