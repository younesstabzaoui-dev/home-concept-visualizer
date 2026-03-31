import React, { useEffect, useState } from 'react'

const MESSAGES = [
  'Analyse de votre espace en cours...',
  'Calcul des proportions des meubles...',
  'Placement des meubles à l\'échelle...',
  'Application des textures et matières...',
  'Harmonisation de l\'éclairage...',
  'Rendu photoréaliste en cours...',
  'Finalisation des détails...',
  'Votre intérieur est presque prêt...',
]

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '400px', gap: '32px',
    padding: '48px 24px', textAlign: 'center',
  },
  logoArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
  },
  brand: {
    fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '600',
    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-black)',
  },
  tagline: { fontSize: '12px', color: 'var(--color-gray-400)', letterSpacing: '0.1em' },
  spinnerArea: {
    position: 'relative', width: '72px', height: '72px',
  },
  spinnerOuter: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: '2px solid var(--color-gray-200)',
    borderTopColor: 'var(--color-black)',
    animation: 'spin 1.2s linear infinite',
  },
  spinnerInner: {
    position: 'absolute', inset: '12px', borderRadius: '50%',
    border: '1.5px solid var(--color-gray-200)',
    borderTopColor: 'var(--color-taupe)',
    animation: 'spin 0.8s linear infinite reverse',
  },
  textArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  mainText: {
    fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '600',
    color: 'var(--color-black)', maxWidth: '320px', lineHeight: '1.3',
  },
  statusText: {
    fontSize: '14px', color: 'var(--color-gray-500)',
    minHeight: '20px', transition: 'opacity 400ms ease',
  },
  timerText: {
    fontSize: '13px', color: 'var(--color-taupe)',
    fontWeight: '500',
  },
  progressBar: {
    width: '240px', height: '2px', backgroundColor: 'var(--color-gray-200)',
    borderRadius: '1px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: 'var(--color-black)',
    borderRadius: '1px', transition: 'width 1s ease',
  },
  note: {
    fontSize: '12px', color: 'var(--color-gray-400)',
    maxWidth: '280px', lineHeight: '1.5',
  },
}

// Inject keyframes via style tag
const injectStyles = () => {
  if (document.getElementById('loading-keyframes')) return
  const style = document.createElement('style')
  style.id = 'loading-keyframes'
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

export default function LoadingState({ estimatedSeconds = 30 }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    injectStyles()
  }, [])

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(prev => (prev + 1) % MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const progress = Math.min((elapsed / estimatedSeconds) * 100, 95)
  const remaining = Math.max(estimatedSeconds - elapsed, 0)

  return (
    <div style={styles.container} role="status" aria-live="polite" aria-label="Génération en cours">
      <div style={styles.logoArea}>
        <span style={styles.brand}>Home Concept</span>
        <span style={styles.tagline}>Interior Visualizer</span>
      </div>

      <div style={styles.spinnerArea} aria-hidden="true">
        <div style={styles.spinnerOuter} />
        <div style={styles.spinnerInner} />
      </div>

      <div style={styles.textArea}>
        <h2 style={styles.mainText}>
          Votre intérieur est en cours de création
        </h2>
        <p style={{ ...styles.statusText, opacity: visible ? 1 : 0 }}>
          {MESSAGES[msgIndex]}
        </p>
        <p style={styles.timerText}>
          {remaining > 0
            ? `Encore environ ${remaining} seconde${remaining > 1 ? 's' : ''}...`
            : 'Finalisation en cours...'
          }
        </p>
      </div>

      <div style={styles.progressBar} aria-hidden="true">
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <p style={styles.note}>
        La génération prend environ {estimatedSeconds} secondes.
        Ne fermez pas cette page.
      </p>
    </div>
  )
}
