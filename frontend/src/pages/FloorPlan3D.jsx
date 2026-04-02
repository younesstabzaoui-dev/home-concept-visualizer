import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Grid } from '@react-three/drei'
import { Loader2, Plus, Trash2, RotateCw, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import API_BASE from '../config'

// ─── Pièce 3D (sol + 3 murs, 1 ouvert côté caméra) ───────────────────────────
function Room({ width, depth }) {
  const wallH = 2.8
  const wallT = 0.05
  return (
    <group>
      {/* Sol */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#E8E4DC" roughness={0.8} />
      </mesh>
      {/* Grille sur le sol */}
      <Grid
        position={[0, 0.001, 0]}
        args={[width, depth]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#C8C4BC"
        sectionSize={5}
        sectionThickness={0}
        fadeDistance={30}
        infiniteGrid={false}
      />
      {/* Mur arrière */}
      <mesh receiveShadow position={[0, wallH / 2, -depth / 2]}>
        <boxGeometry args={[width, wallH, wallT]} />
        <meshStandardMaterial color="#F5F3F0" roughness={0.9} />
      </mesh>
      {/* Mur gauche */}
      <mesh receiveShadow position={[-width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color="#EDEBE8" roughness={0.9} />
      </mesh>
      {/* Mur droit */}
      <mesh receiveShadow position={[width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color="#EDEBE8" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ─── Meuble 3D (charge le GLB) ───────────────────────────────────────────────
function Furniture({ item, isSelected, onSelect, onMove, roomW, roomD }) {
  const { scene } = useGLTF(item.product.glbUrl)
  const cloned = React.useMemo(() => {
    const s = scene.clone(true)
    // Activer les ombres sur tous les meshes
    s.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return s
  }, [scene])

  // Auto-scale : ajuste la taille au dimensions réelles du meuble
  const scale = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const targetW = (item.product.lengthCm || 100) / 100
    return targetW / (size.x || 1)
  }, [cloned, item.product.lengthCm])

  const isDragging = useRef(false)
  const { camera, gl } = useThree()

  const handlePointerDown = (e) => {
    e.stopPropagation()
    isDragging.current = true
    onSelect(item.id)
    gl.domElement.style.cursor = 'grabbing'
  }

  const handlePointerUp = () => {
    isDragging.current = false
    gl.domElement.style.cursor = 'auto'
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return
    e.stopPropagation()
    const halfW = roomW / 2 - 0.3
    const halfD = roomD / 2 - 0.3
    const x = Math.max(-halfW, Math.min(halfW, e.point.x))
    const z = Math.max(-halfD, Math.min(halfD, e.point.z))
    onMove(item.id, [x, 0, z])
  }

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {/* Halo de sélection */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color="#0A0A0A" transparent opacity={0.15} />
        </mesh>
      )}
      <primitive object={cloned} scale={scale} />
    </group>
  )
}

// ─── Plan invisible pour capturer les clics de placement ─────────────────────
function FloorPlane({ onFloorClick, roomW, roomD }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      onClick={onFloorClick}
    >
      <planeGeometry args={[roomW, roomD]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ─── Scène complète ──────────────────────────────────────────────────────────
function Scene({ roomW, roomD, placedItems, selectedId, onSelectItem, onMoveItem, onPlaceItem, placing }) {
  const handleFloorClick = (e) => {
    if (placing) {
      e.stopPropagation()
      const halfW = roomW / 2 - 0.3
      const halfD = roomD / 2 - 0.3
      const x = Math.max(-halfW, Math.min(halfW, e.point.x))
      const z = Math.max(-halfD, Math.min(halfD, e.point.z))
      onPlaceItem([x, 0, z])
    } else {
      onSelectItem(null)
    }
  }

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[5, 8, 5]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Environment preset="apartment" />
      <Room width={roomW} depth={roomD} />
      <FloorPlane onFloorClick={handleFloorClick} roomW={roomW} roomD={roomD} />
      <Suspense fallback={null}>
        {placedItems.map(item => (
          <Furniture
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            onSelect={onSelectItem}
            onMove={onMoveItem}
            roomW={roomW}
            roomD={roomD}
          />
        ))}
      </Suspense>
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={Math.max(roomW, roomD) * 1.8}
      />
    </>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function FloorPlan3D() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [roomW, setRoomW] = useState(5)
  const [roomD, setRoomD] = useState(4)
  const [placedItems, setPlacedItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [placing, setPlacing] = useState(null) // produit en attente de placement

  useEffect(() => {
    fetch(API_BASE + '/api/products')
      .then(r => r.json())
      .then(data => {
        setProducts(data.filter(p => p.glbUrl))
        setLoadingProducts(false)
      })
      .catch(() => setLoadingProducts(false))
  }, [])

  const startPlacing = (product) => {
    setPlacing(product)
    setSelectedId(null)
  }

  const handlePlaceItem = (position) => {
    if (!placing) return
    const newItem = {
      id: Date.now(),
      product: placing,
      position,
      rotation: 0,
    }
    setPlacedItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
    setPlacing(null)
  }

  const handleMoveItem = (id, position) => {
    setPlacedItems(prev => prev.map(item => item.id === id ? { ...item, position } : item))
  }

  const handleRotate = () => {
    if (!selectedId) return
    setPlacedItems(prev => prev.map(item =>
      item.id === selectedId ? { ...item, rotation: item.rotation + Math.PI / 4 } : item
    ))
  }

  const handleDelete = () => {
    setPlacedItems(prev => prev.filter(item => item.id !== selectedId))
    setSelectedId(null)
  }

  const selectedItem = placedItems.find(i => i.id === selectedId)

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0A0A0A' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', backgroundColor: '#111', borderBottom: '1px solid #222',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/plan')}
            style={{
              background: 'none', border: '1px solid #333', color: '#aaa',
              padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <ArrowLeft size={14} /> Vue 2D
          </button>
          <span style={{ color: '#fff', fontFamily: 'serif', fontSize: '18px', fontWeight: '600' }}>
            Plan 3D
          </span>
        </div>

        {/* Dimensions pièce */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>Pièce :</span>
          {[['L', roomW, setRoomW], ['P', roomD, setRoomD]].map(([label, val, setter]) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa', fontSize: '13px' }}>
              {label}
              <input
                type="number"
                min={2} max={15} step={0.5}
                value={val}
                onChange={e => setter(Math.max(2, Math.min(15, Number(e.target.value) || 2)))}
                style={{
                  width: '52px', padding: '4px 8px', backgroundColor: '#1a1a1a',
                  border: '1px solid #333', borderRadius: '6px', color: '#fff',
                  fontSize: '13px', textAlign: 'center',
                }}
              />
              <span style={{ color: '#666' }}>m</span>
            </label>
          ))}
        </div>

        {/* Actions sur sélection */}
        {selectedItem && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRotate}
              style={{
                background: '#1a1a1a', border: '1px solid #333', color: '#ddd',
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <RotateCw size={14} /> Rotation
            </button>
            <button
              onClick={handleDelete}
              style={{
                background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#ff6b6b',
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Corps : Canvas 3D + Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas 3D */}
        <div style={{ flex: 1, position: 'relative', cursor: placing ? 'crosshair' : 'auto' }}>
          {placing && (
            <div style={{
              position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', padding: '8px 16px',
              borderRadius: '8px', fontSize: '13px', zIndex: 10, pointerEvents: 'none',
            }}>
              Cliquez dans la pièce pour placer <strong>{placing.name}</strong>
            </div>
          )}
          <Canvas
            shadows
            camera={{ position: [0, 5, 8], fov: 50 }}
            style={{ backgroundColor: '#1a1a1a' }}
          >
            <Scene
              roomW={roomW}
              roomD={roomD}
              placedItems={placedItems}
              selectedId={selectedId}
              onSelectItem={setSelectedId}
              onMoveItem={handleMoveItem}
              onPlaceItem={handlePlaceItem}
              placing={placing}
            />
          </Canvas>
        </div>

        {/* Sidebar catalogue */}
        <div style={{
          width: '220px', backgroundColor: '#111', borderLeft: '1px solid #222',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #222' }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>Meubles</p>
            <p style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>Cliquez pour placer</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingProducts ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px' }}>
                <Loader2 size={20} color="#666" className="spin" />
              </div>
            ) : products.length === 0 ? (
              <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', paddingTop: '24px', lineHeight: '1.5' }}>
                Aucun meuble avec modèle 3D.{'\n'}Générez des GLB dans l'admin.
              </p>
            ) : (
              products.map(product => {
                const isPlacing = placing?.id === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => isPlacing ? setPlacing(null) : startPlacing(product)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: isPlacing ? '#1a2a1a' : '#1a1a1a',
                      border: `1px solid ${isPlacing ? '#2a5a2a' : '#2a2a2a'}`,
                      textAlign: 'left', transition: 'all 150ms',
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ color: '#ddd', fontSize: '12px', fontWeight: '500', lineHeight: '1.3' }}>
                        {product.name}
                      </p>
                      <p style={{ color: '#555', fontSize: '10px', marginTop: '2px' }}>
                        {product.lengthCm}×{product.depthCm} cm
                      </p>
                    </div>
                    {isPlacing
                      ? <span style={{ color: '#4a9a4a', fontSize: '10px', marginLeft: 'auto' }}>✓</span>
                      : <Plus size={12} color="#555" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                    }
                  </button>
                )
              })
            )}
          </div>

          {placedItems.length > 0 && (
            <div style={{ padding: '12px', borderTop: '1px solid #222' }}>
              <p style={{ color: '#555', fontSize: '11px', textAlign: 'center' }}>
                {placedItems.length} meuble(s) placé(s)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
