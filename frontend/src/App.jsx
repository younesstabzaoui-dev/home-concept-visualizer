import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientApp from './pages/ClientApp.jsx'
import FloorPlan from './pages/FloorPlan.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visualiser" element={<ClientApp />} />
        <Route path="/plan" element={<FloorPlan />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
