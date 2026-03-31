/**
 * proportionCalculator.js
 * =======================
 * Calcule les ratios de proportion meuble/pièce pour le prompt Nano Banana.
 * Ces ratios garantissent que les meubles sont représentés à l'échelle réelle.
 *
 * Exemple :
 *   Pièce 5m × 4m, canapé 280cm × 95cm
 *   ratioWidth = 280 / 500 = 0.56 → 56% de la largeur
 *   ratioDepth = 95 / 400 = 0.24 → 24% de la profondeur
 */

/**
 * Calcule le ratio largeur (longueur du meuble / largeur pièce)
 * @param {number} productLengthCm - Longueur du meuble en cm
 * @param {number} roomWidthM - Largeur de la pièce en mètres
 * @returns {number} Ratio en pourcentage (0–100)
 */
export function calcWidthRatio(productLengthCm, roomWidthM) {
  if (!roomWidthM || roomWidthM <= 0) return 0
  return Math.round((productLengthCm / (roomWidthM * 100)) * 100)
}

/**
 * Calcule le ratio profondeur (profondeur du meuble / profondeur pièce)
 * @param {number} productDepthCm - Profondeur du meuble en cm
 * @param {number} roomDepthM - Profondeur de la pièce en mètres
 * @returns {number} Ratio en pourcentage (0–100)
 */
export function calcDepthRatio(productDepthCm, roomDepthM) {
  if (!roomDepthM || roomDepthM <= 0) return 0
  return Math.round((productDepthCm / (roomDepthM * 100)) * 100)
}

/**
 * Calcule le ratio hauteur (hauteur du meuble / hauteur sous plafond)
 * @param {number} productHeightCm - Hauteur du meuble en cm
 * @param {number} roomHeightM - Hauteur sous plafond en mètres
 * @returns {number} Ratio en pourcentage (0–100)
 */
export function calcHeightRatio(productHeightCm, roomHeightM) {
  if (!roomHeightM || roomHeightM <= 0) return 0
  return Math.round((productHeightCm / (roomHeightM * 100)) * 100)
}

/**
 * Calcule tous les ratios pour un produit dans une pièce donnée
 * @param {Object} product - { lengthCm, depthCm, heightCm, name }
 * @param {Object} room - { widthM, depthM, heightM? }
 * @returns {Object} { widthRatio, depthRatio, heightRatio, summary }
 */
export function calculateProportions(product, room) {
  const widthRatio = calcWidthRatio(product.lengthCm, room.widthM)
  const depthRatio = calcDepthRatio(product.depthCm, room.depthM)
  const heightRatio = room.heightM
    ? calcHeightRatio(product.heightCm, room.heightM)
    : null

  const summary = `${product.name} occupe ${widthRatio}% de la largeur et ${depthRatio}% de la profondeur`

  return { widthRatio, depthRatio, heightRatio, summary }
}

/**
 * Vérifie si un meuble est trop grand pour la pièce (>90%)
 * @param {Object} product
 * @param {Object} room
 * @returns {{ tooWide: boolean, tooDeep: boolean, warnings: string[] }}
 */
export function checkFitWarnings(product, room) {
  const { widthRatio, depthRatio } = calculateProportions(product, room)
  const warnings = []

  if (widthRatio > 90) {
    warnings.push(`${product.name} est très large pour cette pièce (${widthRatio}% de la largeur)`)
  }
  if (depthRatio > 90) {
    warnings.push(`${product.name} est très profond pour cette pièce (${depthRatio}% de la profondeur)`)
  }
  if (widthRatio > 100) {
    warnings.push(`${product.name} dépasse la largeur de la pièce — vérifiez les dimensions`)
  }

  return {
    tooWide: widthRatio > 90,
    tooDeep: depthRatio > 90,
    warnings,
  }
}
