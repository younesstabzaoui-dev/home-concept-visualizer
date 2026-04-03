import React from 'react'
import { X, Download } from 'lucide-react'
import API_BASE from '../config'

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: '16px',
  },
  modal: {
    backgroundColor: 'var(--color-white)', borderRadius: '20px',
    width: '100%', maxWidth: '600px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderBottom: '1px solid var(--color-gray-200)',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '600',
    color: 'var(--color-black)',
  },
  closeBtn: {
    padding: '8px', borderRadius: '8px', border: 'none',
    backgroundColor: 'var(--color-gray-100)', cursor: 'pointer',
    display: 'flex', color: 'var(--color-black)',
  },
  viewerWrap: {
    backgroundColor: '#f5f5f0',
    position: 'relative',
  },
  hint: {
    textAlign: 'center', padding: '8px 16px',
    fontSize: '12px', color: 'var(--color-gray-500)',
    backgroundColor: 'var(--color-gray-100)',
    borderTop: '1px solid var(--color-gray-200)',
  },
}

function resolveGlbUrl(product) {
  if (!product.glbUrl) return null
  if (product.glbUrl === 'stored' || product.glbUrl.includes('/api/glb/')) {
    return API_BASE + '/api/glb/' + product.id
  }
  return product.glbUrl
}

export default function Model3DViewer({ product, onClose }) {
  if (!product?.glbUrl) return null
  const glbSrc = resolveGlbUrl(product)

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={`Vue 3D — ${product.name}`}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{product.name}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={glbSrc}
              download={`${product.name.replace(/\s+/g, '-')}.glb`}
              target="_blank"
              rel="noreferrer"
              style={{
                ...styles.closeBtn,
                textDecoration: 'none',
                fontSize: '12px', fontWeight: '500', gap: '6px',
                padding: '8px 12px',
              }}
              aria-label="Télécharger le fichier 3D"
              title="Télécharger le fichier .glb"
            >
              <Download size={15} />
              .glb
            </a>
            <button style={styles.closeBtn} onClick={onClose} aria-label="Fermer la vue 3D">
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={styles.viewerWrap}>
          {/* model-viewer est un custom element HTML chargé via CDN dans index.html */}
          {/* Il gère nativement la rotation, le zoom, et l'AR sur mobile */}
          <model-viewer
            src={glbSrc}
            alt={`Modèle 3D de ${product.name}`}
            auto-rotate
            camera-controls
            shadow-intensity="1"
            environment-image="neutral"
            style={{ width: '100%', height: '420px', backgroundColor: '#f5f5f0' }}
            ar
            ar-modes="webxr scene-viewer quick-look"
          />
        </div>

        <p style={styles.hint}>
          Glissez pour faire tourner · Pincez pour zoomer
          {' · '}
          <strong>📱 Sur mobile : bouton AR pour voir le meuble chez vous</strong>
        </p>
      </div>
    </div>
  )
}
