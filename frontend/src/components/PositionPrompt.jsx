import React, { useState } from 'react'
import { ArrowLeft, MapPin, Lightbulb } from 'lucide-react'
import { buildPromptPreview } from '../utils/promptBuilder.js'

const PLACEMENT_SUGGESTIONS = [
  'Contre le mur de gauche, sous la fenêtre',
  'Au centre de la pièce, face au mur du fond',
  'Contre le mur du fond, centré',
  'Contre le mur de droite, à côté de la porte',
  'Dans le coin gauche, en angle',
  'Face à l\'entrée, au milieu de la pièce',
]

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', flexDirection: 'column', gap: '8px' },
  stepLabel: {
    fontSize: '12px', fontWeight: '500', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--color-taupe)',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: '600',
    color: 'var(--color-black)', lineHeight: '1.2',
  },
  subtitle: { fontSize: '15px', color: 'var(--color-gray-500)', lineHeight: '1.5' },
  productFields: { display: 'flex', flexDirection: 'column', gap: '20px' },
  productField: {
    padding: '20px', border: '1px solid var(--color-gray-200)',
    borderRadius: '12px', backgroundColor: 'var(--color-white)',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  productHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  productThumb: {
    width: '52px', height: '52px', borderRadius: '8px',
    objectFit: 'cover', border: '1px solid var(--color-gray-200)',
    backgroundColor: 'var(--color-gray-100)',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: '15px', fontWeight: '600', color: 'var(--color-black)',
    marginBottom: '2px',
  },
  productDims: { fontSize: '12px', color: 'var(--color-gray-500)' },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: '8px' },
  inputLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-600)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  input: {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid var(--color-gray-300)', borderRadius: '8px',
    fontSize: '15px', color: 'var(--color-black)',
    backgroundColor: 'var(--color-white)', outline: 'none',
    transition: 'border-color 200ms ease', resize: 'none',
    fontFamily: 'var(--font-sans)',
  },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  suggestionBtn: {
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
    border: '1px solid var(--color-gray-300)', backgroundColor: 'var(--color-gray-100)',
    color: 'var(--color-gray-600)', cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  previewBox: {
    padding: '16px', backgroundColor: 'var(--color-gray-100)',
    borderRadius: '8px', borderLeft: '3px solid var(--color-taupe)',
  },
  previewTitle: {
    fontSize: '11px', fontWeight: '600', color: 'var(--color-taupe)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
  },
  previewText: {
    fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: '1.6',
    fontStyle: 'italic',
  },
  tipBox: {
    display: 'flex', gap: '10px', padding: '14px 16px',
    backgroundColor: '#F5F0E8', borderRadius: '8px', border: '1px solid var(--color-beige)',
  },
  tipText: { fontSize: '13px', color: 'var(--color-taupe)', lineHeight: '1.5' },
  btnRow: { display: 'flex', gap: '12px' },
  backBtn: {
    padding: '14px 20px', backgroundColor: 'transparent', color: 'var(--color-black)',
    borderRadius: '8px', fontSize: '15px', fontWeight: '500',
    border: '1.5px solid var(--color-gray-300)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  generateBtn: {
    flex: 1, padding: '16px 32px', backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)', borderRadius: '8px', fontSize: '16px',
    fontWeight: '600', border: 'none', cursor: 'pointer',
    transition: 'opacity 200ms ease', letterSpacing: '0.02em',
  },
}

export default function PositionPrompt({ selectedProducts, roomDimensions, onGenerate, onBack }) {
  const [positions, setPositions] = useState(
    Object.fromEntries(selectedProducts.map(p => [p.id, '']))
  )
  const [focusedId, setFocusedId] = useState(null)

  const updatePosition = (id, value) => {
    setPositions(prev => ({ ...prev, [id]: value }))
  }

  const allFilled = selectedProducts.every(p => positions[p.id]?.trim().length > 0)

  const handleGenerate = () => {
    if (!allFilled) return
    const productsWithPositions = selectedProducts.map(p => ({
      product: p,
      position: positions[p.id].trim(),
    }))
    onGenerate(productsWithPositions)
  }

  const promptPreview = allFilled
    ? buildPromptPreview(
        roomDimensions,
        selectedProducts.map(p => ({ product: p, position: positions[p.id] }))
      )
    : null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.stepLabel}>Etape 4 / 4</span>
        <h2 style={styles.title}>Placement des meubles</h2>
        <p style={styles.subtitle}>
          Indiquez où vous souhaitez placer chaque meuble dans votre pièce.
        </p>
      </div>

      <div style={styles.tipBox}>
        <Lightbulb size={16} color="var(--color-taupe)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={styles.tipText}>
          Soyez précis : "contre le mur gauche, face à la fenêtre" donnera un meilleur résultat que "à gauche".
          Pensez à mentionner l'orientation par rapport aux fenêtres et aux murs.
        </p>
      </div>

      <div style={styles.productFields}>
        {selectedProducts.map((product) => (
          <div key={product.id} style={styles.productField}>
            <div style={styles.productHeader}>
              <img
                src={product.image}
                alt={product.name}
                style={styles.productThumb}
              />
              <div style={styles.productInfo}>
                <p style={styles.productName}>{product.name}</p>
                <p style={styles.productDims}>
                  {product.lengthCm}cm × {product.depthCm}cm × {product.heightCm}cm
                </p>
              </div>
            </div>

            <div style={styles.inputWrapper}>
              <label
                htmlFor={`position-${product.id}`}
                style={styles.inputLabel}
              >
                <MapPin size={12} />
                Où placer ce meuble ?
              </label>
              <textarea
                id={`position-${product.id}`}
                value={positions[product.id]}
                onChange={(e) => updatePosition(product.id, e.target.value)}
                onFocus={() => setFocusedId(product.id)}
                onBlur={() => setFocusedId(null)}
                placeholder="ex: Contre le mur gauche, face à la fenêtre"
                rows={2}
                style={{
                  ...styles.input,
                  borderColor: focusedId === product.id
                    ? 'var(--color-black)'
                    : positions[product.id]?.trim()
                      ? 'var(--color-taupe)'
                      : 'var(--color-gray-300)',
                }}
                aria-label={`Position du ${product.name}`}
                aria-required="true"
              />
            </div>

            {focusedId === product.id && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                  Suggestions :
                </p>
                <div style={styles.suggestions}>
                  {PLACEMENT_SUGGESTIONS.map(sug => (
                    <button
                      key={sug}
                      style={styles.suggestionBtn}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        updatePosition(product.id, sug)
                      }}
                      aria-label={`Suggestion de placement : ${sug}`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {promptPreview && (
        <div style={styles.previewBox}>
          <p style={styles.previewTitle}>Aperçu du placement avec proportions</p>
          <p style={styles.previewText}>{promptPreview}</p>
        </div>
      )}

      <div style={styles.btnRow}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Retour au catalogue">
          <ArrowLeft size={16} />
          Retour
        </button>
        <button
          style={{
            ...styles.generateBtn,
            opacity: allFilled ? 1 : 0.4,
            cursor: allFilled ? 'pointer' : 'not-allowed',
          }}
          onClick={handleGenerate}
          disabled={!allFilled}
          aria-label="Lancer la génération du rendu"
        >
          Visualiser mon intérieur
        </button>
      </div>
    </div>
  )
}
