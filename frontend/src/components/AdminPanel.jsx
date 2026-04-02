import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, AlertCircle, Loader2, ChevronRight, Box, CheckCircle2 } from 'lucide-react'
import AdminProductForm from './AdminProductForm.jsx'
import Model3DViewer from './Model3DViewer.jsx'
import API_BASE from '../config'

const CATEGORY_LABELS = {
  canape: 'Canapé',
  table_basse: 'Table basse',
  table_repas: 'Table repas',
  chaise: 'Chaise',
  lit: 'Lit',
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '16px', flexWrap: 'wrap',
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '600',
    color: 'var(--color-black)',
  },
  subtitle: { fontSize: '14px', color: 'var(--color-gray-500)' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 20px', backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', border: 'none', cursor: 'pointer',
    flexShrink: 0, transition: 'opacity 200ms ease',
  },
  statsRow: {
    display: 'flex', gap: '16px', flexWrap: 'wrap',
  },
  statCard: {
    flex: 1, minWidth: '100px', padding: '16px', borderRadius: '12px',
    backgroundColor: 'var(--color-gray-100)', border: '1px solid var(--color-gray-200)',
    textAlign: 'center',
  },
  statNum: {
    fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: '700',
    color: 'var(--color-black)', display: 'block',
  },
  statLabel: { fontSize: '12px', color: 'var(--color-gray-500)' },
  table: {
    width: '100%', borderCollapse: 'separate', borderSpacing: 0,
    borderRadius: '12px', overflow: 'hidden',
    border: '1px solid var(--color-gray-200)',
  },
  thead: { backgroundColor: 'var(--color-gray-100)' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
    fontWeight: '600', color: 'var(--color-gray-600)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--color-gray-200)',
  },
  td: {
    padding: '12px 16px', fontSize: '14px', color: 'var(--color-black)',
    borderBottom: '1px solid var(--color-gray-100)',
    verticalAlign: 'middle',
  },
  productThumb: {
    width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover',
    border: '1px solid var(--color-gray-200)', backgroundColor: 'var(--color-gray-100)',
  },
  categoryBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '500',
    backgroundColor: 'var(--color-gray-100)', color: 'var(--color-gray-600)',
    border: '1px solid var(--color-gray-200)',
  },
  actionBtns: { display: 'flex', gap: '8px' },
  editBtn: {
    padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-gray-100)',
    border: '1px solid var(--color-gray-200)', cursor: 'pointer',
    color: 'var(--color-gray-600)', transition: 'all 150ms ease', display: 'flex',
  },
  deleteBtn: {
    padding: '6px', borderRadius: '6px', backgroundColor: '#FFF5F5',
    border: '1px solid #FADBD8', cursor: 'pointer',
    color: 'var(--color-error)', transition: 'all 150ms ease', display: 'flex',
  },
  loadingState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '12px', padding: '48px', color: 'var(--color-gray-500)',
  },
  errorState: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '16px', backgroundColor: '#FDF5F5',
    border: '1px solid #FADBD8', borderRadius: '8px',
    fontSize: '14px', color: 'var(--color-error)',
  },
  confirmModal: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '16px',
  },
  confirmBox: {
    backgroundColor: 'var(--color-white)', borderRadius: '16px',
    padding: '32px', maxWidth: '380px', width: '100%',
    boxShadow: 'var(--shadow-xl)',
  },
  confirmTitle: {
    fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '600',
    color: 'var(--color-black)', marginBottom: '8px',
  },
  confirmText: { fontSize: '14px', color: 'var(--color-gray-600)', marginBottom: '24px', lineHeight: '1.5' },
  confirmBtns: { display: 'flex', gap: '12px' },
  cancelBtn: {
    flex: 1, padding: '12px', backgroundColor: 'var(--color-gray-100)',
    color: 'var(--color-black)', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', border: '1px solid var(--color-gray-200)', cursor: 'pointer',
  },
  deleteConfirmBtn: {
    flex: 1, padding: '12px', backgroundColor: 'var(--color-error)',
    color: 'white', borderRadius: '8px', fontSize: '14px',
    fontWeight: '500', border: 'none', cursor: 'pointer',
  },
}

export default function AdminPanel({ adminPassword }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [generating3d, setGenerating3d] = useState(null) // product.id en cours
  const [viewing3D, setViewing3D] = useState(null)
  const [toast3d, setToast3d] = useState(null) // nom du produit en cours

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': adminPassword,
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch(API_BASE + '/api/products')
      const data = await res.json()
      setProducts(data)
      setError(null)
    } catch {
      setError('Impossible de charger les produits.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  const handleFormSave = async () => {
    handleFormClose()
    await loadProducts()
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(API_BASE + `/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error()
      setDeleteTarget(null)
      await loadProducts()
    } catch {
      setError('Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  const handleGenerate3D = async (product) => {
    if (!product.image) {
      setError(`${product.name} n'a pas d'image — ajoutez une image d'abord.`)
      return
    }
    setGenerating3d(product.id)
    setToast3d(product.name)
    try {
      // 1. Appel TRELLIS pour générer le GLB
      const genRes = await fetch(API_BASE + '/api/generate-3d', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl: product.image, productId: product.id }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || 'Erreur génération 3D')

      // 2. Sauvegarde l'URL du GLB dans la fiche produit
      const saveRes = await fetch(API_BASE + `/api/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ glbUrl: genData.glbUrl }),
      })
      if (!saveRes.ok) throw new Error('Erreur sauvegarde GLB')

      await loadProducts()
    } catch (err) {
      setError('Erreur 3D : ' + err.message)
    } finally {
      setGenerating3d(null)
      setToast3d(null)
    }
  }

  // Stats par catégorie
  const stats = Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
    label,
    count: products.filter(p => p.category === id).length,
  }))

  if (showForm) {
    return (
      <AdminProductForm
        product={editingProduct}
        adminPassword={adminPassword}
        onSave={handleFormSave}
        onCancel={handleFormClose}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Catalogue produits</h2>
          <p style={styles.subtitle}>{products.length} produit(s) au total</p>
        </div>
        <button
          style={styles.addBtn}
          onClick={() => { setEditingProduct(null); setShowForm(true) }}
          aria-label="Ajouter un nouveau produit"
        >
          <Plus size={16} />
          Ajouter un produit
        </button>
      </div>

      {!loading && products.length > 0 && (
        <div style={styles.statsRow} aria-label="Statistiques par catégorie">
          {stats.filter(s => s.count > 0).map(stat => (
            <div key={stat.label} style={styles.statCard}>
              <span style={styles.statNum}>{stat.count}</span>
              <span style={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={styles.errorState} role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.loadingState} aria-live="polite">
          <Loader2 size={28} color="var(--color-taupe)" />
          <span>Chargement...</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table} aria-label="Liste des produits">
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Photo</th>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Référence</th>
                <th style={styles.th}>Catégorie</th>
                <th style={styles.th}>Dimensions (cm)</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: 'var(--color-gray-500)', padding: '32px' }}>
                    Aucun produit. Cliquez sur "Ajouter un produit" pour commencer.
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id}>
                    <td style={styles.td}>
                      <img
                        src={product.image || 'https://via.placeholder.com/48'}
                        alt={product.name}
                        style={styles.productThumb}
                        loading="lazy"
                      />
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500' }}>{product.name}</span>
                      {product.description && (
                        <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                          {product.description.substring(0, 60)}
                          {product.description.length > 60 ? '...' : ''}
                        </p>
                      )}
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-gray-600)' }}>
                      {product.reference}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.categoryBadge}>
                        {CATEGORY_LABELS[product.category] || product.category}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '13px' }}>
                      {product.lengthCm} × {product.depthCm} × {product.heightCm}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button
                          style={{
                            ...styles.editBtn,
                            backgroundColor: product.glbUrl ? '#E8F5E9' : 'var(--color-gray-100)',
                            borderColor: product.glbUrl ? '#C8E6C9' : 'var(--color-gray-200)',
                            color: product.glbUrl ? '#2E7D32' : 'var(--color-gray-600)',
                            opacity: generating3d === product.id ? 0.6 : 1,
                            cursor: generating3d === product.id ? 'wait' : 'pointer',
                            minWidth: '28px',
                          }}
                          onClick={() => product.glbUrl ? setViewing3D(product) : handleGenerate3D(product)}
                          disabled={generating3d === product.id}
                          aria-label={product.glbUrl ? `Voir ${product.name} en 3D` : `Générer 3D pour ${product.name}`}
                          title={product.glbUrl ? 'Voir en 3D' : 'Générer 3D (~30s, $0.02)'}
                        >
                          {generating3d === product.id
                            ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                            : product.glbUrl
                              ? <CheckCircle2 size={15} />
                              : <Box size={15} />
                          }
                        </button>
                        <button
                          style={styles.editBtn}
                          onClick={() => handleEdit(product)}
                          aria-label={`Modifier ${product.name}`}
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Supprimer ${product.name}`}
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {toast3d && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#0A0A0A', color: 'white', borderRadius: '12px',
          padding: '14px 24px', fontSize: '14px', fontWeight: '500',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 3000,
        }}>
          <Loader2 size={18} className="spin" />
          Génération 3D de <strong style={{ marginLeft: '4px' }}>{toast3d}</strong>… (~30s)
        </div>
      )}

      {viewing3D && <Model3DViewer product={viewing3D} onClose={() => setViewing3D(null)} />}

      {deleteTarget && (
        <div
          style={styles.confirmModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div style={styles.confirmBox}>
            <h3 id="confirm-title" style={styles.confirmTitle}>
              Supprimer ce produit ?
            </h3>
            <p style={styles.confirmText}>
              <strong>{deleteTarget.name}</strong> ({deleteTarget.reference}) sera définitivement supprimé du catalogue. Cette action est irréversible.
            </p>
            <div style={styles.confirmBtns}>
              <button
                style={styles.cancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                style={styles.deleteConfirmBtn}
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
