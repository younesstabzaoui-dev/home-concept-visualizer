import React, { useState } from 'react'
import { ArrowLeft, Ruler, AlertCircle, Info } from 'lucide-react'

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
  fieldsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  fieldFull: { gridColumn: '1 / -1' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-black)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  labelOptional: {
    fontSize: '11px', fontWeight: '400', color: 'var(--color-gray-500)',
    textTransform: 'none', marginLeft: '6px',
  },
  inputWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', padding: '12px 48px 12px 16px',
    border: '1.5px solid var(--color-gray-300)',
    borderRadius: '8px', fontSize: '16px',
    color: 'var(--color-black)', backgroundColor: 'var(--color-white)',
    outline: 'none', transition: 'border-color 200ms ease',
    appearance: 'textfield',
  },
  inputUnit: {
    position: 'absolute', right: '14px',
    fontSize: '14px', fontWeight: '500', color: 'var(--color-gray-500)',
    pointerEvents: 'none',
  },
  hint: { fontSize: '12px', color: 'var(--color-gray-500)', lineHeight: '1.4' },
  errorText: { fontSize: '12px', color: 'var(--color-error)' },
  preview: {
    padding: '20px', backgroundColor: 'var(--color-gray-100)',
    borderRadius: '12px', border: '1px solid var(--color-gray-200)',
  },
  previewTitle: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-600)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px',
  },
  roomViz: {
    position: 'relative', backgroundColor: '#E8E3D8',
    border: '2px solid var(--color-taupe)', borderRadius: '8px',
    margin: '0 auto', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all 300ms ease',
  },
  roomVizText: {
    fontFamily: 'var(--font-serif)', fontSize: '14px',
    color: 'var(--color-taupe)', fontWeight: '500',
  },
  roomMeta: {
    marginTop: '12px', display: 'flex', gap: '16px',
    justifyContent: 'center', flexWrap: 'wrap',
  },
  roomMetaItem: {
    fontSize: '13px', color: 'var(--color-gray-600)',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  infoBox: {
    display: 'flex', gap: '10px', padding: '14px 16px',
    backgroundColor: '#F5F0E8', borderRadius: '8px',
    border: '1px solid var(--color-beige)',
  },
  infoText: { fontSize: '13px', color: 'var(--color-taupe)', lineHeight: '1.5' },
  btnRow: { display: 'flex', gap: '12px' },
  backBtn: {
    padding: '14px 20px', backgroundColor: 'transparent',
    color: 'var(--color-black)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: '1.5px solid var(--color-gray-300)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'border-color 200ms ease',
  },
  nextBtn: {
    flex: 1, padding: '14px 32px', backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: 'none', cursor: 'pointer',
    transition: 'opacity 200ms ease',
  },
}

const MIN_DIM = 2
const MAX_DIM = 15

export default function RoomDimensions({ onComplete, onBack }) {
  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')
  const [height, setHeight] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    const w = parseFloat(width)
    const d = parseFloat(depth)
    const h = height ? parseFloat(height) : null

    if (!width || isNaN(w)) errs.width = 'Entrez la largeur'
    else if (w < MIN_DIM || w > MAX_DIM) errs.width = `Entre ${MIN_DIM}m et ${MAX_DIM}m`

    if (!depth || isNaN(d)) errs.depth = 'Entrez la longueur'
    else if (d < MIN_DIM || d > MAX_DIM) errs.depth = `Entre ${MIN_DIM}m et ${MAX_DIM}m`

    if (height && (isNaN(h) || h < 2 || h > 5)) errs.height = 'Entre 2m et 5m'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (!validate()) return
    onComplete({
      widthM: parseFloat(width),
      depthM: parseFloat(depth),
      heightM: height ? parseFloat(height) : null,
    })
  }

  const isValid = width && depth &&
    parseFloat(width) >= MIN_DIM && parseFloat(width) <= MAX_DIM &&
    parseFloat(depth) >= MIN_DIM && parseFloat(depth) <= MAX_DIM

  // Visualisation proportionnelle
  const maxVizSize = 200
  const wNum = parseFloat(width) || 0
  const dNum = parseFloat(depth) || 0
  const maxDim = Math.max(wNum, dNum, 1)
  const vizW = wNum ? Math.max(80, (wNum / maxDim) * maxVizSize) : 120
  const vizH = dNum ? Math.max(60, (dNum / maxDim) * maxVizSize) : 80
  const surface = wNum && dNum ? (wNum * dNum).toFixed(1) : null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.stepLabel}>Etape 2 / 4</span>
        <h2 style={styles.title}>Dimensions de la pièce</h2>
        <p style={styles.subtitle}>
          Ces mesures permettent de placer les meubles à l'échelle réelle dans le rendu.
        </p>
      </div>

      <div style={styles.fieldsGrid}>
        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="room-width">
            Largeur
          </label>
          <div style={styles.inputWrapper}>
            <input
              id="room-width"
              type="number"
              min="2"
              max="15"
              step="0.1"
              value={width}
              onChange={(e) => { setWidth(e.target.value); setErrors(p => ({ ...p, width: null })) }}
              placeholder="ex: 4.5"
              style={{
                ...styles.input,
                borderColor: errors.width ? 'var(--color-error)' : 'var(--color-gray-300)',
              }}
              aria-label="Largeur de la pièce en mètres"
              aria-describedby="width-hint"
            />
            <span style={styles.inputUnit}>m</span>
          </div>
          {errors.width
            ? <span style={styles.errorText}>{errors.width}</span>
            : <span id="width-hint" style={styles.hint}>Mur gauche → mur droit</span>
          }
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="room-depth">
            Longueur
          </label>
          <div style={styles.inputWrapper}>
            <input
              id="room-depth"
              type="number"
              min="2"
              max="15"
              step="0.1"
              value={depth}
              onChange={(e) => { setDepth(e.target.value); setErrors(p => ({ ...p, depth: null })) }}
              placeholder="ex: 6"
              style={{
                ...styles.input,
                borderColor: errors.depth ? 'var(--color-error)' : 'var(--color-gray-300)',
              }}
              aria-label="Longueur de la pièce en mètres"
              aria-describedby="depth-hint"
            />
            <span style={styles.inputUnit}>m</span>
          </div>
          {errors.depth
            ? <span style={styles.errorText}>{errors.depth}</span>
            : <span id="depth-hint" style={styles.hint}>Entrée → mur du fond</span>
          }
        </div>

        <div style={{ ...styles.fieldGroup, ...styles.fieldFull }}>
          <label style={styles.label} htmlFor="room-height">
            Hauteur sous plafond
            <span style={styles.labelOptional}>(facultatif)</span>
          </label>
          <div style={styles.inputWrapper}>
            <input
              id="room-height"
              type="number"
              min="2"
              max="5"
              step="0.05"
              value={height}
              onChange={(e) => { setHeight(e.target.value); setErrors(p => ({ ...p, height: null })) }}
              placeholder="ex: 2.5"
              style={{
                ...styles.input,
                borderColor: errors.height ? 'var(--color-error)' : 'var(--color-gray-300)',
              }}
              aria-label="Hauteur sous plafond en mètres (optionnel)"
            />
            <span style={styles.inputUnit}>m</span>
          </div>
          {errors.height
            ? <span style={styles.errorText}>{errors.height}</span>
            : <span style={styles.hint}>Améliore la précision des meubles hauts</span>
          }
        </div>
      </div>

      {(wNum > 0 || dNum > 0) && (
        <div style={styles.preview}>
          <p style={styles.previewTitle}>Aperçu des proportions</p>
          <div
            style={{
              ...styles.roomViz,
              width: `${vizW}px`,
              height: `${vizH}px`,
            }}
          >
            <span style={styles.roomVizText}>
              {wNum > 0 && dNum > 0 ? `${wNum}m × ${dNum}m` : ''}
            </span>
          </div>
          {surface && (
            <div style={styles.roomMeta}>
              <span style={styles.roomMetaItem}>
                <Ruler size={13} />
                Surface : {surface} m²
              </span>
              {height && (
                <span style={styles.roomMetaItem}>
                  Volume : {(parseFloat(surface) * parseFloat(height)).toFixed(1)} m³
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div style={styles.infoBox}>
        <Info size={16} color="var(--color-taupe)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={styles.infoText}>
          Ces dimensions sont utilisées pour calculer les proportions exactes de chaque meuble.
          Un canapé de 280cm dans une pièce de 5m occupera 56% de la largeur — c'est ce ratio
          qui est injecté dans la génération du rendu.
        </p>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Retour à l'étape précédente">
          <ArrowLeft size={16} />
          Retour
        </button>
        <button
          style={{
            ...styles.nextBtn,
            opacity: isValid ? 1 : 0.4,
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
          onClick={handleNext}
          disabled={!isValid}
          aria-label="Passer à la sélection des meubles"
        >
          Continuer — Choisir les meubles
        </button>
      </div>
    </div>
  )
}
