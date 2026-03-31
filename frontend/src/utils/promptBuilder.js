/**
 * promptBuilder.js
 * ================
 * Génère le prompt texte envoyé à l'API Nano Banana.
 * Les proportions sont calculées mathématiquement pour garantir
 * que les meubles respectent l'échelle réelle de la pièce.
 */

import { calcWidthRatio, calcDepthRatio } from './proportionCalculator.js'

/**
 * Traduit les ratios en description de position naturelle pour le prompt
 * @param {number} widthRatio - % de la largeur
 * @param {number} depthRatio - % de la profondeur
 * @returns {string}
 */
function formatSizeDescription(widthRatio, depthRatio) {
  let sizeDesc = ''

  if (widthRatio <= 20) sizeDesc = 'compact'
  else if (widthRatio <= 40) sizeDesc = 'medium-sized'
  else if (widthRatio <= 60) sizeDesc = 'large'
  else sizeDesc = 'very large'

  return `${sizeDesc} (${widthRatio}% of room width, ${depthRatio}% of room depth)`
}

/**
 * Construit le prompt complet pour Nano Banana
 *
 * @param {Object} room - { widthM: number, depthM: number, heightM?: number }
 * @param {Array} products - [{ product: ProductObject, position: string }]
 * @returns {string} prompt formaté
 */
export function buildPrompt(room, products) {
  const { widthM, depthM, heightM } = room

  // Description de la pièce
  const roomDesc = [
    `Room dimensions: ${widthM}m wide by ${depthM}m deep`,
    heightM ? `with ${heightM}m ceiling height` : null,
  ].filter(Boolean).join(', ')

  // Description de chaque meuble avec proportions calculées
  const productsDesc = products.map(({ product, position }) => {
    const widthRatio = calcWidthRatio(product.lengthCm, widthM)
    const depthRatio = calcDepthRatio(product.depthCm, depthM)
    const sizeDesc = formatSizeDescription(widthRatio, depthRatio)

    return `- ${product.name} (actual size: ${product.lengthCm}cm x ${product.depthCm}cm x ${product.heightCm}cm): ` +
           `place it ${position}, ${sizeDesc}. ` +
           `The piece must occupy exactly ${widthRatio}% of room width and ${depthRatio}% of room depth.`
  }).join('\n')

  return `Photorealistic interior design render. Ultra realistic, 8K quality, professional photography.
${roomDesc}.

CRITICAL: Keep the original room exactly as is — same walls, same floor material, same paint color, same lighting, same windows, same doors. Do not modify the room structure in any way.

Place the following furniture pieces with mathematically precise proportions relative to the room size:
${productsDesc}

Style requirements:
- Premium French home decor, modern and elegant
- Clean lines, neutral palette (beige, black, white, natural oak)
- Lighting: natural and coherent with the original room photo
- Photorealistic materials and shadows

The furniture must visually match the reference product images provided. Maintain consistent perspective and lighting with the original room photo.`.trim()
}

/**
 * Génère un aperçu lisible du prompt (pour affichage debug)
 * @param {Object} room
 * @param {Array} products
 * @returns {string}
 */
export function buildPromptPreview(room, products) {
  return products.map(({ product, position }) => {
    const widthRatio = calcWidthRatio(product.lengthCm, room.widthM)
    const depthRatio = calcDepthRatio(product.depthCm, room.depthM)
    return `${product.name}: ${position} (${widthRatio}% largeur, ${depthRatio}% profondeur)`
  }).join(' | ')
}
