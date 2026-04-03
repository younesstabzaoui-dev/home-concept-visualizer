import React, { useState } from 'react'
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider'
import { RefreshCw, Download, Share2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', flexDirection: 'column', gap: '8px' },
  successBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', backgroundColor: '#E8F5E9', borderRadius: '20px',
    fontSize: '13px', fontWeight: '500', color: 'var(--color-success)',
    border: '1px solid #C8E6C9', width: 'fit-content',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: '600',
    color: 'var(--color-black)', lineHeight: '1.2',
  },
  subtitle: { fontSize: '15px', color: 'var(--color-gray-500)', lineHeight: '1.5' },
  sliderContainer: {
    borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-xl)', position: 'relative',
  },
  sliderHint: {
    position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 18px', backgroundColor: 'rgba(10, 10, 10, 0.75)',
    backdropFilter: 'blur(8px)', borderRadius: '20px',
    fontSize: '13px', color: 'white', fontWeight: '500', zIndex: 10,
    pointerEvents: 'none',
  },
  labels: {
    display: 'flex', justifyContent: 'space-between',
    padding: '0 4px',
  },
  label: {
    fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  actionsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  actionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '8px', padding: '16px', borderRadius: '12px',
    cursor: 'pointer', transition: 'all 200ms ease',
    fontSize: '13px', fontWeight: '500', border: 'none',
  },
  actionBtnPrimary: {
    backgroundColor: 'var(--color-black)', color: 'var(--color-white)',
  },
  actionBtnSecondary: {
    backgroundColor: 'var(--color-gray-100)', color: 'var(--color-black)',
    border: '1px solid var(--color-gray-200)',
  },
  actionBtnDisabled: {
    backgroundColor: 'var(--color-gray-100)', color: 'var(--color-gray-400)',
    border: '1px solid var(--color-gray-200)', cursor: 'not-allowed',
  },
  actionIcon: { width: '24px', height: '24px' },
  v2Badge: {
    fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--color-beige)',
    borderRadius: '4px', color: 'var(--color-taupe)', fontWeight: '600',
  },
  summaryBox: {
    padding: '20px', border: '1px solid var(--color-gray-200)',
    borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  summaryTitle: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-black)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  productsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  productItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '13px', color: 'var(--color-gray-600)',
  },
  productThumb: {
    width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover',
    border: '1px solid var(--color-gray-200)', backgroundColor: 'var(--color-gray-100)',
    flexShrink: 0,
  },
  productItemText: { flex: 1 },
  productItemName: { fontWeight: '500', color: 'var(--color-black)' },
  productItemPos: { fontSize: '12px', color: 'var(--color-gray-500)' },
  resetBtn: {
    width: '100%', padding: '16px', backgroundColor: 'transparent',
    color: 'var(--color-black)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: '1.5px solid var(--color-black)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'all 200ms ease',
  },
}

export default function RenderResult({ originalImage, generatedImage, selectedProducts, onReset }) {
  const [showHint, setShowHint] = useState(true)
  const [aspectRatio, setAspectRatio] = useState(null)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `home-concept-rendu-${Date.now()}.jpg`
    link.click()
  }

  // Détecte le ratio de l'image originale dès qu'elle est chargée
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight)
    }
  }

  // Style du slider : respecte le ratio natif de l'image, plafonné à 90vh
  const sliderStyle = aspectRatio
    ? { width: '100%', aspectRatio: `${aspectRatio}`, maxHeight: '90vh' }
    : { width: '100%', maxHeight: '500px' }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.successBadge}>
          <CheckCircle2 size={14} />
          Rendu généré avec succès
        </span>
        <h2 style={styles.title}>Votre intérieur Home Concept</h2>
        <p style={styles.subtitle}>
          Glissez le curseur pour comparer avant et après.
        </p>
      </div>

      {/* Image cachée pour détecter le ratio avant l'affichage du slider */}
      {!aspectRatio && (
        <img
          src={originalImage}
          alt=""
          aria-hidden="true"
          onLoad={handleImageLoad}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      <div style={styles.sliderContainer}>
        <ReactCompareSlider
          itemOne={
            <ReactCompareSliderImage
              src={originalImage}
              alt="Pièce vide — avant"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          }
          itemTwo={
            <ReactCompareSliderImage
              src={generatedImage}
              alt="Pièce meublée — après rendu Home Concept"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          }
          style={sliderStyle}
          onlyHandleDraggable={false}
          onPositionChange={() => setShowHint(false)}
        />
        {showHint && (
          <div style={styles.sliderHint} aria-hidden="true">
            <ChevronLeft size={14} />
            Glissez pour comparer
            <ChevronRight size={14} />
          </div>
        )}
      </div>

      <div style={styles.labels} aria-hidden="true">
        <span style={styles.label}>Avant</span>
        <span style={styles.label}>Après</span>
      </div>

      <div style={styles.actionsGrid}>
        <button
          style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
          onClick={onReset}
          aria-label="Nouvelle visualisation"
        >
          <RefreshCw size={20} />
          Nouvelle
        </button>
        <button
          style={{ ...styles.actionBtn, ...styles.actionBtnSecondary }}
          onClick={handleDownload}
          aria-label="Télécharger le rendu"
        >
          <Download size={20} />
          <span>Télécharger</span>
        </button>
        <button
          style={{ ...styles.actionBtn, ...styles.actionBtnDisabled }}
          disabled
          aria-label="Partager — disponible en version 2"
          title="Disponible en V2"
        >
          <Share2 size={20} />
          <span>Partager</span>
          <span style={styles.v2Badge}>V2</span>
        </button>
      </div>

      {selectedProducts && selectedProducts.length > 0 && (
        <div style={styles.summaryBox}>
          <p style={styles.summaryTitle}>Meubles dans ce rendu</p>
          <div style={styles.productsList}>
            {selectedProducts.map(({ product, position }) => (
              <div key={product.id} style={styles.productItem}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={styles.productThumb}
                  loading="lazy"
                />
                <div style={styles.productItemText}>
                  <p style={styles.productItemName}>{product.name}</p>
                  <p style={styles.productItemPos}>{position}</p>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                  {product.reference}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        style={styles.resetBtn}
        onClick={onReset}
        aria-label="Recommencer une nouvelle visualisation"
      >
        <RefreshCw size={16} />
        Nouvelle visualisation
      </button>
    </div>
  )
}
