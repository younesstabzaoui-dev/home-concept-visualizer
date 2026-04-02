import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react'
import AdminPanel from '../components/AdminPanel.jsx'
import API_BASE from '../config'

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
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    backgroundColor: 'var(--color-gray-100)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--color-gray-600)',
    border: '1px solid var(--color-gray-200)',
  },
  // Login form
  loginContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  loginCard: {
    width: '100%',
    maxWidth: '380px',
    padding: '40px',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '20px',
    backgroundColor: 'var(--color-white)',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  loginHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
  },
  lockIcon: {
    width: '52px',
    height: '52px',
    backgroundColor: 'var(--color-black)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--color-black)',
  },
  loginSubtitle: {
    fontSize: '14px',
    color: 'var(--color-gray-500)',
    lineHeight: '1.5',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-black)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '13px 48px 13px 16px',
    border: '1.5px solid var(--color-gray-300)',
    borderRadius: '8px',
    fontSize: '16px',
    color: 'var(--color-black)',
    backgroundColor: 'var(--color-white)',
    outline: 'none',
    transition: 'border-color 200ms ease',
    fontFamily: 'var(--font-sans)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-gray-500)',
    padding: '4px',
    display: 'flex',
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
  loginBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-white)',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 200ms ease',
  },
  // Authenticated view
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    width: '100%',
  },
  logoutBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: 'var(--color-gray-600)',
    borderRadius: '6px',
    border: '1px solid var(--color-gray-300)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 150ms ease',
  },
}

export default function Admin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!password.trim()) return
    setChecking(true)
    setError(null)

    try {
      const res = await fetch(API_BASE + '/api/admin/verify', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      })

      if (res.status === 401) {
        setError('Mot de passe incorrect.')
      } else if (res.ok) {
        setAdminPassword(password)
        setAuthenticated(true)
      } else {
        setError('Erreur serveur. Réessayez.')
      }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.')
    } finally {
      setChecking(false)
    }
  }

  if (!authenticated) {
    return (
      <div style={styles.page}>
        <header style={styles.topBar}>
          <div style={styles.topBarInner}>
            <span style={{ ...styles.brand, cursor: 'pointer' }} onClick={() => navigate('/')}>Home Concept</span>
            <span style={styles.adminBadge}>
              <ShieldCheck size={13} />
              Administration
            </span>
          </div>
        </header>

        <div style={styles.loginContainer}>
          <div style={styles.loginCard}>
            <div style={styles.loginHeader}>
              <div style={styles.lockIcon}>
                <Lock size={24} color="white" />
              </div>
              <h1 style={styles.loginTitle}>Accès administration</h1>
              <p style={styles.loginSubtitle}>
                Entrez le mot de passe admin pour accéder au catalogue produits.
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.fieldGroup}>
                <label htmlFor="admin-password" style={styles.label}>
                  Mot de passe
                </label>
                <div style={styles.inputWrapper}>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    placeholder="Mot de passe admin"
                    style={{
                      ...styles.input,
                      borderColor: error ? 'var(--color-error)' : 'var(--color-gray-300)',
                    }}
                    aria-label="Mot de passe administrateur"
                    aria-required="true"
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={styles.errorMsg} role="alert">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                style={{
                  ...styles.loginBtn,
                  opacity: (checking || !password.trim()) ? 0.5 : 1,
                  cursor: (checking || !password.trim()) ? 'not-allowed' : 'pointer',
                }}
                disabled={checking || !password.trim()}
              >
                {checking ? 'Vérification...' : 'Accéder au catalogue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <span style={{ ...styles.brand, cursor: 'pointer' }} onClick={() => navigate('/')}>Home Concept</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={styles.adminBadge}>
              <ShieldCheck size={13} />
              Administration
            </span>
            <button
              style={styles.logoutBtn}
              onClick={() => {
                setAuthenticated(false)
                setPassword('')
                setAdminPassword('')
              }}
              aria-label="Se déconnecter de l'administration"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <AdminPanel adminPassword={adminPassword} />
      </main>
    </div>
  )
}
