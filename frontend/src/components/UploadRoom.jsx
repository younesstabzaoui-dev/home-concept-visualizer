import React, { useState, useRef, useCallback } from 'react'
import { Upload, Image, AlertCircle, CheckCircle2 } from 'lucide-react'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--color-taupe)',
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--color-black)',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--color-gray-500)',
    lineHeight: '1.5',
  },
  dropzone: {
    border: '2px dashed var(--color-gray-300)',
    borderRadius: '12px',
    padding: '48px 32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 250ms ease',
    backgroundColor: 'var(--color-gray-100)',
    position: 'relative',
  },
  dropzoneActive: {
    border: '2px dashed var(--color-taupe)',
    backgroundColor: '#F5F0E8',
  },
  dropzoneError: {
    border: '2px dashed var(--color-error)',
    backgroundColor: '#FDF5F5',
  },
  uploadIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    color: 'var(--color-taupe)',
  },
  dropzoneText: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--color-black)',
    marginBottom: '8px',
  },
  dropzoneSubtext: {
    fontSize: '14px',
    color: 'var(--color-gray-500)',
    marginBottom: '20px',
  },
  browseBtn: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 200ms ease',
  },
  preview: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--color-gray-200)',
    boxShadow: 'var(--shadow-md)',
  },
  previewImg: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover',
    display: 'block',
  },
  previewOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '8px',
  },
  previewBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    backdropFilter: 'blur(4px)',
  },
  changeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--color-black)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    backdropFilter: 'blur(4px)',
    transition: 'background 200ms ease',
  },
  tips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    backgroundColor: 'var(--color-gray-100)',
    borderRadius: '8px',
    borderLeft: '3px solid var(--color-beige)',
  },
  tipsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-black)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--color-gray-600)',
    lineHeight: '1.4',
  },
  tipDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-taupe)',
    marginTop: '7px',
    flexShrink: 0,
  },
  errorMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#FDF5F5',
    border: '1px solid #FADBD8',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-error)',
  },
  nextBtn: {
    padding: '14px 32px',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 200ms ease',
    width: '100%',
  },
}

export default function UploadRoom({ onComplete }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE_MB = 20

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Format non supporté. Utilisez JPG, PNG ou WEBP.'
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Fichier trop volumineux. Maximum ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  const processFile = useCallback((f) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) processFile(dropped)
  }, [processFile])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileInput = (e) => {
    const selected = e.target.files[0]
    if (selected) processFile(selected)
  }

  const handleNext = () => {
    if (!file || !preview) return
    onComplete({ file, preview })
  }

  const dropzoneStyle = {
    ...styles.dropzone,
    ...(isDragging ? styles.dropzoneActive : {}),
    ...(error ? styles.dropzoneError : {}),
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.stepLabel}>Etape 1 / 4</span>
        <h1 style={styles.title}>Votre espace</h1>
        <p style={styles.subtitle}>
          Uploadez une photo de votre pièce vide pour commencer la visualisation.
        </p>
      </div>

      {!preview ? (
        <div
          style={dropzoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt pour uploader une photo"
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            aria-label="Sélectionner une photo"
          />
          <div style={styles.uploadIcon}>
            {isDragging
              ? <Image size={48} color="var(--color-taupe)" />
              : <Upload size={48} color="var(--color-taupe)" />
            }
          </div>
          <p style={styles.dropzoneText}>
            {isDragging ? 'Relâchez pour uploader' : 'Glissez votre photo ici'}
          </p>
          <p style={styles.dropzoneSubtext}>
            JPG, PNG, WEBP — maximum 20 MB
          </p>
          <span style={styles.browseBtn}>Parcourir les fichiers</span>
        </div>
      ) : (
        <div style={styles.preview}>
          <img src={preview} alt="Aperçu de votre pièce" style={styles.previewImg} />
          <div style={styles.previewOverlay}>
            <span style={styles.previewBadge}>
              <CheckCircle2 size={13} />
              Photo chargée
            </span>
            <button
              style={styles.changeBtn}
              onClick={() => {
                setFile(null)
                setPreview(null)
                setError(null)
              }}
            >
              Changer
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorMsg} role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={styles.tips}>
        <p style={styles.tipsTitle}>Conseils pour un meilleur rendu</p>
        {[
          'Prenez la photo de face, depuis l\'entrée de la pièce',
          'Bonne luminosité naturelle, évitez les contre-jours',
          'La pièce doit être vide — sans meubles ni objets',
          'Format horizontal (paysage) recommandé',
        ].map((tip, i) => (
          <div key={i} style={styles.tipItem}>
            <div style={styles.tipDot} />
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <button
        style={{
          ...styles.nextBtn,
          opacity: preview ? 1 : 0.4,
          cursor: preview ? 'pointer' : 'not-allowed',
        }}
        onClick={handleNext}
        disabled={!preview}
        aria-label="Passer à l'étape suivante"
      >
        Continuer — Dimensions de la pièce
      </button>
    </div>
  )
}
