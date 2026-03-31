import React, { useState } from 'react'
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import API_BASE from '../config'

const CATEGORIES = [
  { value: 'canape', label: 'Canapé' },
  { value: 'table_basse', label: 'Table basse' },
  { value: 'table_repas', label: 'Table à manger' },
  { value: 'chaise', label: 'Chaise' },
  { value: 'lit', label: 'Lit' },
]

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px' },
  backBtn: {
    padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-gray-100)',
    border: '1px solid var(--color-gray-200)', cursor: 'pointer', display: 'flex',
    color: 'var(--color-black)',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '600',
    color: 'var(--color-black)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  section: {
    padding: '24px', border: '1px solid var(--color-gray-200)', borderRadius: '12px',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  sectionTitle: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-600)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    paddingBottom: '12px', borderBottom: '1px solid var(--color-gray-100)',
  },
  fieldsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fieldFull: { gridColumn: '1 / -1' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-black)',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  required: { color: 'var(--color-error)', fontSize: '14px' },
  input: {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid var(--color-gray-300)', borderRadius: '8px',
    fontSize: '15px', color: 'var(--color-black)',
    backgroundColor: 'var(--color-white)', outline: 'none',
    transition: 'border-color 200ms ease', fontFamily: 'var(--font-sans)',
  },
  inputError: { borderColor: 'var(--color-error)' },
  select: {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid var(--color-gray-300)', borderRadius: '8px',
    fontSize: '15px', color: 'var(--color-black)',
    backgroundColor: 'var(--color-white)', outline: 'none',
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
  },
  textarea: {
    width: '100%', padding: '11px 14px', minHeight: '80px',
    border: '1.5px solid var(--color-gray-300)', borderRadius: '8px',
    fontSize: '15px', color: 'var(--color-black)',
    backgroundColor: 'var(--color-white)', outline: 'none',
    resize: 'vertical', fontFamily: 'var(--font-sans)',
  },
  errorText: { fontSize: '12px', color: 'var(--color-error)' },
  hint: { fontSize: '12px', color: 'var(--color-gray-500)' },
  imagePreview: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px',
  },
  imgThumb: {
    width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover',
    border: '1px solid var(--color-gray-200)',
  },
  imgInfo: { flex: 1, fontSize: '13px', color: 'var(--color-gray-600)' },
  globalError: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px 16px', backgroundColor: '#FDF5F5',
    border: '1px solid #FADBD8', borderRadius: '8px',
    fontSize: '14px', color: 'var(--color-error)',
  },
  successMsg: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px 16px', backgroundColor: '#E8F5E9',
    border: '1px solid #C8E6C9', borderRadius: '8px',
    fontSize: '14px', color: 'var(--color-success)',
  },
  actions: { display: 'flex', gap: '12px' },
  cancelBtn: {
    padding: '14px 24px', backgroundColor: 'var(--color-gray-100)',
    color: 'var(--color-black)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: '1px solid var(--color-gray-200)', cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: '14px 24px', backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)', borderRadius: '8px', fontSize: '15px',
    fontWeight: '500', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'opacity 200ms ease',
  },
}

export default function AdminProductForm({ product, adminPassword, onSave, onCancel }) {
  const isEditing = Boolean(product)

  const [form, setForm] = useState({
    name: product?.name || '',
    reference: product?.reference || '',
    category: product?.category || 'canape',
    image: product?.image || '',
    lengthCm: product?.lengthCm?.toString() || '',
    depthCm: product?.depthCm?.toString() || '',
    heightCm: product?.heightCm?.toString() || '',
    description: product?.description || '',
  })

  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nom requis'
    if (!form.reference.trim()) errs.reference = 'Référence requise'
    if (!form.category) errs.category = 'Catégorie requise'
    if (!form.lengthCm || isNaN(Number(form.lengthCm)) || Number(form.lengthCm) <= 0)
      errs.lengthCm = 'Longueur invalide'
    if (!form.depthCm || isNaN(Number(form.depthCm)) || Number(form.depthCm) <= 0)
      errs.depthCm = 'Profondeur invalide'
    if (!form.heightCm || isNaN(Number(form.heightCm)) || Number(form.heightCm) <= 0)
      errs.heightCm = 'Hauteur invalide'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setGlobalError(null)

    const payload = {
      name: form.name.trim(),
      reference: form.reference.trim(),
      category: form.category,
      image: form.image.trim(),
      lengthCm: Number(form.lengthCm),
      depthCm: Number(form.depthCm),
      heightCm: Number(form.heightCm),
      description: form.description.trim(),
    }

    try {
      const url = isEditing ? API_BASE + `/api/products/${product.id}` : API_BASE + '/api/products'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur serveur')
      }

      setSuccess(true)
      setTimeout(() => onSave(), 1200)
    } catch (err) {
      setGlobalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ id, label, required, error, hint, children }) => (
    <div style={styles.fieldGroup}>
      <label htmlFor={id} style={styles.label}>
        {label}
        {required && <span style={styles.required} aria-label="requis">*</span>}
      </label>
      {children}
      {error && <span style={styles.errorText} role="alert">{error}</span>}
      {hint && !error && <span style={styles.hint}>{hint}</span>}
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel} aria-label="Retour au catalogue">
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>
          {isEditing ? `Modifier : ${product.name}` : 'Ajouter un produit'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Informations générales</p>
          <div style={styles.fieldsGrid}>
            <Field id="name" label="Nom du produit" required error={errors.name}>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="ex: Canapé Athena 3 places"
                style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                aria-required="true"
              />
            </Field>

            <Field id="reference" label="Référence" required error={errors.reference}>
              <input
                id="reference"
                type="text"
                value={form.reference}
                onChange={(e) => update('reference', e.target.value.toUpperCase())}
                placeholder="ex: HC-CAN-001"
                style={{ ...styles.input, ...(errors.reference ? styles.inputError : {}), fontFamily: 'monospace' }}
                aria-required="true"
              />
            </Field>

            <div style={{ ...styles.fieldGroup, ...styles.fieldFull }}>
              <label htmlFor="category" style={styles.label}>
                Catégorie
                <span style={styles.required} aria-label="requis">*</span>
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                style={styles.select}
                aria-required="true"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.fieldGroup, ...styles.fieldFull }}>
              <label htmlFor="description" style={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="ex: Canapé 3 places, tissu bouclette beige, pieds chêne naturel"
                style={styles.textarea}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Image produit</p>
          <Field
            id="image"
            label="URL de l'image"
            hint="URL vers une image JPG/PNG du produit sur fond blanc ou neutre"
          >
            <input
              id="image"
              type="url"
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="https://exemple.com/image-produit.jpg"
              style={styles.input}
            />
          </Field>
          {form.image && (
            <div style={styles.imagePreview}>
              <img
                src={form.image}
                alt="Aperçu"
                style={styles.imgThumb}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <span style={styles.imgInfo}>Aperçu de l'image produit</span>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <p style={styles.sectionTitle}>Dimensions</p>
          <div style={styles.fieldsGrid}>
            <Field
              id="lengthCm"
              label="Longueur"
              required
              error={errors.lengthCm}
              hint="Axe le plus long du meuble"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="lengthCm"
                  type="number"
                  min="1"
                  max="1000"
                  value={form.lengthCm}
                  onChange={(e) => update('lengthCm', e.target.value)}
                  placeholder="280"
                  style={{ ...styles.input, paddingRight: '44px', ...(errors.lengthCm ? styles.inputError : {}) }}
                  aria-required="true"
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '13px', color: 'var(--color-gray-500)', pointerEvents: 'none' }}>cm</span>
              </div>
            </Field>

            <Field
              id="depthCm"
              label="Profondeur"
              required
              error={errors.depthCm}
              hint="Du dossier au bord avant"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="depthCm"
                  type="number"
                  min="1"
                  max="500"
                  value={form.depthCm}
                  onChange={(e) => update('depthCm', e.target.value)}
                  placeholder="95"
                  style={{ ...styles.input, paddingRight: '44px', ...(errors.depthCm ? styles.inputError : {}) }}
                  aria-required="true"
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '13px', color: 'var(--color-gray-500)', pointerEvents: 'none' }}>cm</span>
              </div>
            </Field>

            <Field
              id="heightCm"
              label="Hauteur"
              required
              error={errors.heightCm}
              hint="Du sol au point le plus haut"
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="heightCm"
                  type="number"
                  min="1"
                  max="400"
                  value={form.heightCm}
                  onChange={(e) => update('heightCm', e.target.value)}
                  placeholder="82"
                  style={{ ...styles.input, paddingRight: '44px', ...(errors.heightCm ? styles.inputError : {}) }}
                  aria-required="true"
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '13px', color: 'var(--color-gray-500)', pointerEvents: 'none' }}>cm</span>
              </div>
            </Field>
          </div>
        </div>

        {globalError && (
          <div style={styles.globalError} role="alert">
            <AlertCircle size={16} />
            {globalError}
          </div>
        )}

        {success && (
          <div style={styles.successMsg} role="status">
            <CheckCircle2 size={16} />
            {isEditing ? 'Produit mis à jour avec succès.' : 'Produit ajouté avec succès.'}
          </div>
        )}

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={onCancel}
            disabled={saving}
          >
            Annuler
          </button>
          <button
            type="submit"
            style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            aria-label={isEditing ? 'Sauvegarder les modifications' : 'Ajouter le produit'}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Sauvegarder les modifications' : 'Ajouter le produit'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
