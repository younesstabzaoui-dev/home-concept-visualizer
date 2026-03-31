import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react'
import { checkFitWarnings } from '../utils/proportionCalculator.js'
import API_BASE from '../config'

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'canape', label: 'Canapé' },
  { id: 'table_basse', label: 'Table basse' },
  { id: 'table_repas', label: 'Table à manger' },
  { id: 'chaise', label: 'Chaise' },
  { id: 'lit', label: 'Lit' },
]

const MAX_SELECTION = 4

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
  filterRow: {
    display: 'flex', gap: '8px', flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
    cursor: 'pointer', transition: 'all 200ms ease', border: '1.5px solid var(--color-gray-300)',
    backgroundColor: 'var(--color-white)', color: 'var(--color-gray-600)',
  },
  filterBtnActive: {
    backgroundColor: 'var(--color-black)', color: 'var(--color-white)',
    borderColor: 'var(--color-black)',
  },
  selectionBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', backgroundColor: 'var(--color-gray-100)',
    borderRadius: '8px', fontSize: '13px', color: 'var(--color-gray-600)',
  },
  selectionCount: { fontWeight: '600', color: 'var(--color-black)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
  },
  card: {
    position: 'relative', borderRadius: '12px', overflow: 'hidden',
    border: '2px solid var(--color-gray-200)', cursor: 'pointer',
    transition: 'all 200ms ease', backgroundColor: 'var(--color-white)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardSelected: {
    border: '2px solid var(--color-black)',
    boxShadow: 'var(--shadow-md)',
  },
  cardImg: {
    width: '100%', height: '140px', objectFit: 'cover', display: 'block',
    backgroundColor: 'var(--color-gray-100)',
  },
  cardBody: { padding: '12px' },
  cardName: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-black)',
    lineHeight: '1.3', marginBottom: '4px',
  },
  cardRef: {
    fontSize: '11px', color: 'var(--color-gray-500)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  },
  cardDims: {
    fontSize: '11px', color: 'var(--color-gray-600)',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  checkBadge: {
    position: 'absolute', top: '10px', right: '10px',
    width: '26px', height: '26px', borderRadius: '50%',
    backgroundColor: 'var(--color-black)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  warningBadge: {
    position: 'absolute', top: '10px', left: '10px',
    padding: '3px 8px', borderRadius: '10px', fontSize: '10px',
    fontWeight: '600', backgroundColor: '#FFF3CD', color: '#856404',
    border: '1px solid #FFE083',
  },
  warningBox: {
    display: 'flex', gap: '8px', padding: '12px 16px',
    backgroundColor: '#FFF9EC', border: '1px solid #FFE083', borderRadius: '8px',
    fontSize: '13px', color: '#856404',
  },
  emptyState: {
    textAlign: 'center', padding: '40px 20px',
    color: 'var(--color-gray-500)', gridColumn: '1 / -1',
  },
  loadingState: {
    textAlign: 'center', padding: '40px 20px',
    color: 'var(--color-gray-500)', gridColumn: '1 / -1',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  btnRow: { display: 'flex', gap: '12px' },
  backBtn: {
    padding: '14px 20px', backgroundColor: 'transparent',
    color: 'var(--color-black)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: '1.5px solid var(--color-gray-300)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
  },
  nextBtn: {
    flex: 1, padding: '14px 32px', backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: 'none', cursor: 'pointer',
    transition: 'opacity 200ms ease',
  },
}

export default function ProductCatalog({ roomDimensions, onComplete, onBack }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    fetch(API_BASE + '/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false) })
      .catch(() => { setLoadError('Impossible de charger le catalogue.'); setLoading(false) })
  }, [])

  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory)

  const isSelected = (id) => selected.some(p => p.id === id)

  const toggleProduct = (product) => {
    if (isSelected(product.id)) {
      setSelected(prev => prev.filter(p => p.id !== product.id))
    } else {
      if (selected.length >= MAX_SELECTION) return
      setSelected(prev => [...prev, product])
    }
  }

  const warnings = selected.flatMap(product => {
    const { warnings: w } = checkFitWarnings(product, roomDimensions)
    return w
  })

  const handleNext = () => {
    if (selected.length === 0) return
    onComplete(selected)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.stepLabel}>Etape 3 / 4</span>
        <h2 style={styles.title}>Choisissez vos meubles</h2>
        <p style={styles.subtitle}>
          Sélectionnez jusqu'à {MAX_SELECTION} meubles du catalogue Home Concept.
        </p>
      </div>

      <div style={styles.filterRow} role="tablist" aria-label="Filtres par catégorie">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            style={{
              ...styles.filterBtn,
              ...(activeCategory === cat.id ? styles.filterBtnActive : {}),
            }}
            onClick={() => setActiveCategory(cat.id)}
            role="tab"
            aria-selected={activeCategory === cat.id}
            aria-label={`Filtrer par ${cat.label}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={styles.selectionBadge}>
        <span>
          <span style={styles.selectionCount}>{selected.length}</span> / {MAX_SELECTION} meuble(s) sélectionné(s)
        </span>
        {selected.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
            {selected.map(p => p.name.split(' ')[0]).join(', ')}
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <div style={styles.warningBox} role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            {warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}

      <div style={styles.grid} role="list" aria-label="Catalogue des produits">
        {loading && (
          <div style={styles.loadingState}>
            <Loader2 size={28} color="var(--color-taupe)" className="spin" />
            <span>Chargement du catalogue...</span>
          </div>
        )}
        {loadError && (
          <div style={{ ...styles.emptyState, color: 'var(--color-error)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
            <p>{loadError}</p>
          </div>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <div style={styles.emptyState}>
            Aucun produit dans cette catégorie.
          </div>
        )}
        {!loading && filtered.map(product => {
          const sel = isSelected(product.id)
          const { tooWide, tooDeep } = checkFitWarnings(product, roomDimensions)
          const hasWarning = tooWide || tooDeep

          return (
            <div
              key={product.id}
              style={{
                ...styles.card,
                ...(sel ? styles.cardSelected : {}),
                opacity: (!sel && selected.length >= MAX_SELECTION) ? 0.5 : 1,
              }}
              onClick={() => toggleProduct(product)}
              role="listitem"
              aria-pressed={sel}
              aria-label={`${product.name} — ${product.lengthCm}cm × ${product.depthCm}cm. ${sel ? 'Sélectionné' : 'Cliquer pour sélectionner'}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleProduct(product)}
            >
              <img
                src={product.image}
                alt={product.name}
                style={styles.cardImg}
                loading="lazy"
              />
              {sel && (
                <div style={styles.checkBadge} aria-hidden="true">
                  <Check size={14} color="white" />
                </div>
              )}
              {hasWarning && !sel && (
                <span style={styles.warningBadge}>Grand</span>
              )}
              <div style={styles.cardBody}>
                <p style={styles.cardName}>{product.name}</p>
                <p style={styles.cardRef}>{product.reference}</p>
                <p style={styles.cardDims}>
                  {product.lengthCm}×{product.depthCm}×{product.heightCm} cm
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.btnRow}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Retour aux dimensions">
          <ArrowLeft size={16} />
          Retour
        </button>
        <button
          style={{
            ...styles.nextBtn,
            opacity: selected.length > 0 ? 1 : 0.4,
            cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          }}
          onClick={handleNext}
          disabled={selected.length === 0}
          aria-label="Passer au placement des meubles"
        >
          Continuer — Placer les meubles
        </button>
      </div>
    </div>
  )
}
