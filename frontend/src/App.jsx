import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientApp from './pages/ClientApp.jsx'
import FloorPlan from './pages/FloorPlan.jsx'
import Admin from './pages/Admin.jsx'

const FloorPlan3D = lazy(() => import('./pages/FloorPlan3D.jsx'))

export default function App() {
  return (
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
  )
}
