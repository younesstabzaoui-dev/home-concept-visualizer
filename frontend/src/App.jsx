import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientApp from './pages/ClientApp.jsx'
import FloorPlan from './pages/FloorPlan.jsx'
import Admin from './pages/Admin.jsx'

const FloorPlan3D = lazy(() => import('./pages/FloorPlan3D.jsx'))

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', backgroundColor: '#FAFAF8', padding: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', color: '#0A0A0A', marginBottom: '12px' }}>Une erreur est survenue</h1>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>Quelque chose s'est mal passé. Veuillez rafraîchir la page.</p>
          <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', backgroundColor: '#0A0A0A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Retour à l'accueil
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/visualiser" element={<ClientApp />} />
          <Route path="/plan" element={<FloorPlan />} />
          <Route path="/plan-3d" element={
            <Suspense fallback={<div style={{ background: '#0A0A0A', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement 3D...</div>}>
              <FloorPlan3D />
            </Suspense>
          } />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
