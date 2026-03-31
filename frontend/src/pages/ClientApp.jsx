import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_BASE from '../config'
import UploadRoom from '../components/UploadRoom.jsx'
import RoomDimensions from '../components/RoomDimensions.jsx'
import ProductCatalog from '../components/ProductCatalog.jsx'
import PositionPrompt from '../components/PositionPrompt.jsx'
import LoadingState from '../components/LoadingState.jsx'
import RenderResult from '../components/RenderResult.jsx'

const STEPS = ['Photo', 'Dimensions', 'Meubles', 'Placement']

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-white)',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    borderBottom: '1px solid var(--color-gray-200)',
    backgroundColor: 'var(--color-white)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  topBarInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'var(--font-serif)',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-black)',
  },
  brandSub: {
    fontSize: '11px',
    color: 'var(--color-taupe)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    fontWeight: '400',
    display: 'block',
    marginTop: '-2px',
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-gray-300)',
    transition: 'all 200ms ease',
  },
  stepDotActive: {
    backgroundColor: 'var(--color-black)',
    width: '24px',
    borderRadius: '4px',
  },
  stepDotDone: {
    backgroundColor: 'var(--color-taupe)',
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 24px)',
    width: '100%',
    boxSizing: 'border-box',
  },
  // Layout desktop 2 colonnes
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '32px',
  },
  layoutWithPreview: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 420px) 1fr',
    gap: '48px',
    alignItems: 'start',
  },
  previewPanel: {
    position: 'sticky',
    top: '96px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  previewImg: {
    width: '100%',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-md)',
  },
  previewImgEl: {
    width: '100%',
    maxHeight: '320px',
    objectFit: 'cover',
    display: 'block',
  },
  previewCaption: {
    padding: '12px 16px',
    backgroundColor: 'var(--color-gray-100)',
    borderRadius: '8px',
  },
  previewCaptionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-gray-600)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  previewCaptionText: {
    fontSize: '13px',
    color: 'var(--color-black)',
  },
  footer: {
    borderTop: '1px solid var(--color-gray-200)',
    padding: '16px 24px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--color-gray-400)',
  },
}

// Responsive breakpoint
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 768

export default function ClientApp() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0-3 = flow, 4 = loading, 5 = result
  const [roomData, setRoomData] = useState(null)      // { file, preview }
  const [dimensions, setDimensions] = useState(null)  // { widthM, depthM, heightM }
  const [products, setProducts] = useState([])         // selected products array
  const [generationResult, setGenerationResult] = useState(null) // { generatedImage }
  const [generationError, setGenerationError] = useState(null)
  const [desktop, setDesktop] = useState(isDesktop())

  // Responsive listener
  React.useEffect(() => {
    const handler = () => setDesktop(isDesktop())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleGenerate = async (productsWithPositions) => {
    setStep(4) // loading
    setGenerationError(null)

    try {
      const formData = new FormData()
      formData.append('roomImage', roomData.file)
      formData.append('roomDimensions', JSON.stringify(dimensions))
      formData.append('selectedProducts', JSON.stringify(productsWithPositions))

      const res = await fetch(API_BASE + '/api/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      setGenerationResult({
        generatedImage: data.generatedImage,
        productsWithPositions,
      })
      setStep(5)
    } catch (err) {
      setGenerationError(err.message)
      setStep(3) // retour au step placement avec erreur
    }
  }

  const handleReset = () => {
    setStep(0)
    setRoomData(null)
    setDimensions(null)
    setProducts([])
    setGenerationResult(null)
    setGenerationError(null)
  }

  // Affichage du step courant
  const showPreviewPanel = desktop && step >= 1 && step <= 3 && roomData?.preview

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
            >
              ← Accueil
            </button>
            <div>
              <span style={styles.brand}>Home Concept</span>
              <span style={styles.brandSub}>Visualiseur IA</span>
            </div>
          </div>

          {step < 4 && (
            <nav style={styles.stepIndicator} aria-label="Progression">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  style={{
                    ...styles.stepDot,
                    ...(i === step ? styles.stepDotActive : {}),
                    ...(i < step ? styles.stepDotDone : {}),
                  }}
                  title={s}
                  aria-label={`Etape ${i + 1} : ${s}${i === step ? ' (actuelle)' : i < step ? ' (terminée)' : ''}`}
                />
              ))}
            </nav>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <div style={showPreviewPanel ? styles.layoutWithPreview : styles.layout}>
          {showPreviewPanel && (
            <aside style={styles.previewPanel} aria-label="Aperçu de votre pièce">
              <div style={styles.previewImg}>
                <img
                  src={roomData.preview}
                  alt="Votre pièce"
                  style={styles.previewImgEl}
                />
              </div>
              {dimensions && (
                <div style={styles.previewCaption}>
                  <p style={styles.previewCaptionTitle}>Dimensions saisies</p>
                  <p style={styles.previewCaptionText}>
                    {dimensions.widthM}m × {dimensions.depthM}m
                    {dimensions.heightM ? ` × ${dimensions.heightM}m` : ''}
                    {' — '}
                    {(dimensions.widthM * dimensions.depthM).toFixed(1)} m²
                  </p>
                </div>
              )}
              {products.length > 0 && (
                <div style={styles.previewCaption}>
                  <p style={styles.previewCaptionTitle}>Meubles sélectionnés</p>
                  {products.map(p => (
                    <p key={p.id} style={{ ...styles.previewCaptionText, fontSize: '12px', marginTop: '3px' }}>
                      {p.name}
                    </p>
                  ))}
                </div>
              )}
            </aside>
          )}

          <div>
            {step === 0 && (
              <UploadRoom
                onComplete={(data) => {
                  setRoomData(data)
                  setStep(1)
                }}
              />
            )}

            {step === 1 && (
              <RoomDimensions
                onComplete={(data) => {
                  setDimensions(data)
                  setStep(2)
                }}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <ProductCatalog
                roomDimensions={dimensions}
                onComplete={(selected) => {
                  setProducts(selected)
                  setStep(3)
                }}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <>
                {generationError && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '14px 16px', marginBottom: '20px',
                      backgroundColor: '#FDF5F5', border: '1px solid #FADBD8',
                      borderRadius: '8px', fontSize: '14px', color: 'var(--color-error)',
                    }}
                    role="alert"
                  >
                    <span>{generationError}</span>
                    <button
                      style={{
                        marginLeft: 'auto', padding: '6px 14px', fontSize: '13px',
                        backgroundColor: 'var(--color-error)', color: 'white',
                        borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500',
                      }}
                      onClick={() => setGenerationError(null)}
                    >
                      OK
                    </button>
                  </div>
                )}
                <PositionPrompt
                  selectedProducts={products}
                  roomDimensions={dimensions}
                  onGenerate={handleGenerate}
                  onBack={() => setStep(2)}
                />
              </>
            )}

            {step === 4 && (
              <LoadingState estimatedSeconds={30} />
            )}

            {step === 5 && generationResult && (
              <RenderResult
                originalImage={roomData.preview}
                generatedImage={generationResult.generatedImage}
                selectedProducts={generationResult.productsWithPositions}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        Home Concept — Juvignac, Montpellier — homeconcept-france.fr
      </footer>
    </div>
  )
}
