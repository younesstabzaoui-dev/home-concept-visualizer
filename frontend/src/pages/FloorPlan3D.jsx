import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Grid } from '@react-three/drei'
import { Loader2, Plus, Trash2, RotateCw, ArrowLeft, Sofa, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import API_BASE from '../config'

// ─── Fenêtre décorative sur un mur ───────────────────────────────────────────
function WindowDecoration({ position, rotation, w = 1.2, h = 0.9 }) {
  const frameT = 0.05
  return (
    <group position={position} rotation={rotation}>
      {/* Fond sombre (recess dans le mur) pour contraste */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.05, h + 0.05]} />
        <meshStandardMaterial color="#6A8090" />
      </mesh>
      {/* Vitre bleu-ciel */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w - frameT * 2, h - frameT * 2]} />
        <meshStandardMaterial color="#A8CCE0" transparent opacity={0.6} metalness={0.15} roughness={0.0} />
      </mesh>
      {/* Cadre haut */}
      <mesh position={[0, h / 2, 0.02]}><boxGeometry args={[w, frameT, 0.05]} /><meshStandardMaterial color="#E8E8E8" /></mesh>
      {/* Cadre bas */}
      <mesh position={[0, -h / 2, 0.02]}><boxGeometry args={[w, frameT, 0.05]} /><meshStandardMaterial color="#E8E8E8" /></mesh>
      {/* Cadre gauche */}
      <mesh position={[-w / 2, 0, 0.02]}><boxGeometry args={[frameT, h, 0.05]} /><meshStandardMaterial color="#E8E8E8" /></mesh>
      {/* Cadre droit */}
      <mesh position={[w / 2, 0, 0.02]}><boxGeometry args={[frameT, h, 0.05]} /><meshStandardMaterial color="#E8E8E8" /></mesh>
      {/* Croisillon central */}
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[w, frameT * 0.6, 0.04]} /><meshStandardMaterial color="#E8E8E8" /></mesh>
    </group>
  )
}

// ─── Porte décorative sur un mur ─────────────────────────────────────────────
function DoorDecoration({ position, rotation, w = 0.9, h = 2.1, isDouble = false }) {
  const frameT = 0.06
  const doorW = isDouble ? w / 2 : w
  return (
    <group position={position} rotation={rotation}>
      {/* Fond sombre pour contraste */}
      <mesh position={[0, h / 2, -0.02]}>
        <planeGeometry args={[w + 0.1, h + 0.08]} />
        <meshStandardMaterial color="#4A4A4A" />
      </mesh>
      {/* Panneau porte (bois chaud) */}
      {isDouble ? (
        <>
          <mesh position={[-doorW / 2, h / 2, 0.01]}><planeGeometry args={[doorW - 0.03, h - 0.02]} /><meshStandardMaterial color="#C8A87A" roughness={0.85} /></mesh>
          <mesh position={[doorW / 2, h / 2, 0.01]}><planeGeometry args={[doorW - 0.03, h - 0.02]} /><meshStandardMaterial color="#C8A87A" roughness={0.85} /></mesh>
        </>
      ) : (
        <mesh position={[0, h / 2, 0.01]}><planeGeometry args={[w - 0.03, h - 0.02]} /><meshStandardMaterial color="#C8A87A" roughness={0.85} /></mesh>
      )}
      {/* Montant gauche */}
      <mesh position={[-w / 2 - frameT / 2, h / 2, 0.03]}><boxGeometry args={[frameT, h + frameT, 0.06]} /><meshStandardMaterial color="#E0E0E0" /></mesh>
      {/* Montant droit */}
      <mesh position={[w / 2 + frameT / 2, h / 2, 0.03]}><boxGeometry args={[frameT, h + frameT, 0.06]} /><meshStandardMaterial color="#E0E0E0" /></mesh>
      {/* Linteau haut */}
      <mesh position={[0, h + frameT / 2, 0.03]}><boxGeometry args={[w + frameT * 2, frameT, 0.06]} /><meshStandardMaterial color="#E0E0E0" /></mesh>
      {/* Poignée */}
      <mesh position={[isDouble ? -0.08 : w / 2 - 0.12, h / 2, 0.07]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#B8922A" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

// ─── Pièce 3D ────────────────────────────────────────────────────────────────
function Room({ width, depth, wallH, floorType, floorColor, wallColor, openings }) {
  const wallT = 0.05

  const floorRoughness = floorType === 'carrelage' ? 0.15 : 0.85
  const floorMetalness = floorType === 'carrelage' ? 0.08 : 0

  return (
    <group>
      {/* Sol */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floorColor} roughness={floorRoughness} metalness={floorMetalness} />
      </mesh>

      {/* Grille carrelage (joints) ou parquet (lattes) */}
      <Grid
        position={[0, 0.001, 0]}
        args={[width, depth]}
        cellSize={floorType === 'carrelage' ? 0.6 : 0.12}
        cellThickness={floorType === 'carrelage' ? 0.8 : 0.3}
        cellColor={floorType === 'carrelage' ? '#999' : '#00000022'}
        sectionSize={floorType === 'carrelage' ? 1.2 : 2.4}
        sectionThickness={0}
        fadeDistance={30}
        infiniteGrid={false}
      />

      {/* Mur arrière */}
      <mesh receiveShadow position={[0, wallH / 2, -depth / 2]}>
        <boxGeometry args={[width, wallH, wallT]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Mur gauche */}
      <mesh receiveShadow position={[-width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      {/* Mur droit */}
      <mesh receiveShadow position={[width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* Ouvertures (fenêtres / portes) */}
      {openings.map(op => {
        const xPos = op.xOffset * (op.wall === 'back' ? width / 2 - 0.8 : depth / 2 - 0.8)

        if (op.wall === 'back') {
          const yBase = op.type === 'fenetre' ? 1.2 : 0
          const h = op.type === 'fenetre' ? 1.1 : (op.type === 'baie' ? 2.4 : 2.1)
          const w = op.type === 'baie' ? 1.6 : (op.type === 'porte-double' ? 1.6 : (op.type === 'fenetre' ? 1.2 : 0.9))
          const pos = [xPos, yBase + h / 2, -depth / 2 + 0.04]
          const rot = [0, 0, 0]
          if (op.type === 'fenetre' || op.type === 'baie') {
            return <WindowDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} />
          }
          return <DoorDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} isDouble={op.type === 'porte-double'} />
        }

        if (op.wall === 'left') {
          const yBase = op.type === 'fenetre' ? 1.2 : 0
          const h = op.type === 'fenetre' ? 1.1 : 2.1
          const w = op.type === 'fenetre' ? 1.2 : 0.9
          const pos = [-width / 2 + 0.04, yBase + h / 2, xPos]
          const rot = [0, Math.PI / 2, 0]
          if (op.type === 'fenetre') return <WindowDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} />
          return <DoorDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} />
        }

        if (op.wall === 'right') {
          const yBase = op.type === 'fenetre' ? 1.2 : 0
          const h = op.type === 'fenetre' ? 1.1 : 2.1
          const w = op.type === 'fenetre' ? 1.2 : 0.9
          const pos = [width / 2 - 0.04, yBase + h / 2, xPos]
          const rot = [0, -Math.PI / 2, 0]
          if (op.type === 'fenetre') return <WindowDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} />
          return <DoorDecoration key={op.id} position={pos} rotation={rot} w={w} h={h} />
        }
        return null
      })}
    </group>
  )
}

// ─── Meuble 3D ───────────────────────────────────────────────────────────────
function Furniture({ item, isSelected, onSelect, onMove, roomW, roomD }) {
  const { scene } = useGLTF(item.product.glbUrl)
  const cloned = React.useMemo(() => {
    const s = scene.clone(true)
    s.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    return s
  }, [scene])

  const { scale, yOffset } = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const targetW = (item.product.lengthCm || 100) / 100
    const s = targetW / (size.x || 1)
    return { scale: s, yOffset: -box.min.y * s }
  }, [cloned, item.product.lengthCm])

  const isDragging = useRef(false)
  const { gl } = useThree()

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
      onPointerDown={e => { e.stopPropagation(); isDragging.current = true; onSelect(item.id); gl.domElement.style.cursor = 'grabbing' }}
      onPointerUp={() => { isDragging.current = false; gl.domElement.style.cursor = 'auto' }}
      onPointerMove={e => {
        if (!isDragging.current) return
        e.stopPropagation()
        const x = Math.max(-roomW / 2 + 0.3, Math.min(roomW / 2 - 0.3, e.point.x))
        const z = Math.max(-roomD / 2 + 0.3, Math.min(roomD / 2 - 0.3, e.point.z))
        onMove(item.id, [x, 0, z])
      }}
    >
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color="#0A0A0A" transparent opacity={0.15} />
        </mesh>
      )}
      <primitive object={cloned} scale={scale} position={[0, yOffset, 0]} />
    </group>
  )
}

// ─── Plan invisible pour placement ───────────────────────────────────────────
function FloorPlane({ onFloorClick, roomW, roomD }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} onClick={onFloorClick}>
      <planeGeometry args={[roomW, roomD]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ─── Scène complète ──────────────────────────────────────────────────────────
function Scene({ roomW, roomD, wallH, placedItems, selectedId, onSelectItem, onMoveItem, onPlaceItem, placing, floorType, floorColor, wallColor, openings }) {
  const handleFloorClick = (e) => {
    if (placing) {
      e.stopPropagation()
      const x = Math.max(-roomW / 2 + 0.3, Math.min(roomW / 2 - 0.3, e.point.x))
      const z = Math.max(-roomD / 2 + 0.3, Math.min(roomD / 2 - 0.3, e.point.z))
      onPlaceItem([x, 0, z])
    } else {
      onSelectItem(null)
    }
  }

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight castShadow position={[5, 8, 5]} intensity={1.2}
        shadow-mapSize={[2048, 2048]} shadow-camera-far={30}
        shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <Environment preset="apartment" />
      <Room width={roomW} depth={roomD} wallH={wallH} floorType={floorType} floorColor={floorColor} wallColor={wallColor} openings={openings} />
      <FloorPlane onFloorClick={handleFloorClick} roomW={roomW} roomD={roomD} />
      <Suspense fallback={null}>
        {placedItems.map(item => (
          <Furniture key={item.id} item={item} isSelected={item.id === selectedId}
            onSelect={onSelectItem} onMove={onMoveItem} roomW={roomW} roomD={roomD} />
        ))}
      </Suspense>
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={2} maxDistance={Math.max(roomW, roomD) * 1.8} />
    </>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────
const OPENING_TYPES = [
  { type: 'fenetre', label: 'Fenêtre', desc: '120×110 cm' },
  { type: 'baie', label: 'Baie vitrée', desc: '160×240 cm' },
  { type: 'porte', label: 'Porte', desc: '90×210 cm' },
  { type: 'porte-double', label: 'Double porte', desc: '160×210 cm' },
]
const WALLS = [
  { id: 'back', label: 'Mur arrière' },
  { id: 'left', label: 'Mur gauche' },
  { id: 'right', label: 'Mur droit' },
]

export default function FloorPlan3D() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [roomW, setRoomW] = useState(5)
  const [roomD, setRoomD] = useState(4)
  const [placedItems, setPlacedItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [placing, setPlacing] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('meubles')
  const [wallH, setWallH] = useState(2.5)

  // Personnalisation
  const [floorType, setFloorType] = useState('parquet')
  const [floorColor, setFloorColor] = useState('#C4A265')
  const [wallColor, setWallColor] = useState('#F5F3F0')
  const [openings, setOpenings] = useState([])
  const [openingWall, setOpeningWall] = useState('back')

  useEffect(() => {
    fetch(API_BASE + '/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data.filter(p => p.glbUrl)); setLoadingProducts(false) })
      .catch(() => setLoadingProducts(false))
  }, [])

  const handlePlaceItem = (position) => {
    if (!placing) return
    const newItem = { id: Date.now(), product: placing, position, rotation: 0 }
    setPlacedItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
    setPlacing(null)
  }

  const handleRotate = () => {
    if (!selectedId) return
    setPlacedItems(prev => prev.map(i => i.id === selectedId ? { ...i, rotation: i.rotation + Math.PI / 4 } : i))
  }

  const handleDelete = () => {
    setPlacedItems(prev => prev.filter(i => i.id !== selectedId))
    setSelectedId(null)
  }

  const addOpening = (type) => {
    setOpenings(prev => [...prev, {
      id: Date.now(), type, wall: openingWall, xOffset: 0,
    }])
  }

  const removeOpening = (id) => setOpenings(prev => prev.filter(o => o.id !== id))
  const moveOpening = (id, xOffset) => setOpenings(prev => prev.map(o => o.id === id ? { ...o, xOffset } : o))

  const selectedItem = placedItems.find(i => i.id === selectedId)

  const inputStyle = {
    width: '52px', padding: '4px 8px', backgroundColor: '#1a1a1a',
    border: '1px solid #333', borderRadius: '6px', color: '#fff',
    fontSize: '13px', textAlign: 'center',
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', fontSize: '12px', fontWeight: '600',
    border: 'none', cursor: 'pointer', transition: 'all 150ms',
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#0A0A0A' : '#666',
    borderRadius: '6px',
  })

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#D8D4CE' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', backgroundColor: '#111', borderBottom: '1px solid #222', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/plan')} style={{
            background: 'none', border: '1px solid #333', color: '#aaa',
            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <ArrowLeft size={14} /> Vue 2D
          </button>
          <span style={{ color: '#fff', fontFamily: 'serif', fontSize: '18px', fontWeight: '600' }}>Plan 3D</span>
        </div>

        {/* Dimensions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>Pièce :</span>
          {[['L', roomW, setRoomW], ['P', roomD, setRoomD], ['H', wallH, setWallH]].map(([label, val, setter]) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa', fontSize: '13px' }}>
              {label}
              <input type="number" min={2} max={15} step={0.5} value={val}
                onChange={e => setter(Math.max(label === 'H' ? 2 : 2, Math.min(label === 'H' ? 4 : 15, Number(e.target.value) || 2)))}
                step={label === 'H' ? 0.1 : 0.5}
                style={inputStyle}
              />
              <span style={{ color: '#666' }}>m</span>
            </label>
          ))}
        </div>

        {/* Actions sélection */}
        {selectedItem && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleRotate} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#ddd', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCw size={14} /> Rotation
            </button>
            <button onClick={handleDelete} style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#ff6b6b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Corps */}
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
          <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }} style={{ backgroundColor: '#D8D4CE' }}>
            <Scene
              roomW={roomW} roomD={roomD} wallH={wallH}
              placedItems={placedItems} selectedId={selectedId}
              onSelectItem={setSelectedId} onMoveItem={(id, pos) => setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, position: pos } : i))}
              onPlaceItem={handlePlaceItem} placing={placing}
              floorType={floorType} floorColor={floorColor} wallColor={wallColor}
              openings={openings}
            />
          </Canvas>
        </div>

        {/* Sidebar */}
        <div style={{ width: '240px', backgroundColor: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Tabs */}
          <div style={{ padding: '8px', borderBottom: '1px solid #222', display: 'flex', gap: '4px', backgroundColor: '#1a1a1a' }}>
            <button style={tabStyle(sidebarTab === 'meubles')} onClick={() => setSidebarTab('meubles')}>
              Meubles
            </button>
            <button style={tabStyle(sidebarTab === 'piece')} onClick={() => setSidebarTab('piece')}>
              Pièce
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* ─── Tab Meubles ─────────────────────── */}
            {sidebarTab === 'meubles' && (
              <>
                <p style={{ color: '#666', fontSize: '11px' }}>Cliquez pour placer dans la pièce</p>
                {loadingProducts ? (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px' }}>
                    <Loader2 size={20} color="#666" className="spin" />
                  </div>
                ) : products.length === 0 ? (
                  <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', paddingTop: '24px', lineHeight: '1.8' }}>
                    Aucun meuble avec modèle 3D.{'\n'}Générez des GLB dans l'admin.
                  </p>
                ) : (
                  products.map(product => {
                    const isPlacing = placing?.id === product.id
                    return (
                      <button key={product.id}
                        onClick={() => isPlacing ? setPlacing(null) : setPlacing(product)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px', borderRadius: '8px', cursor: 'pointer',
                          backgroundColor: isPlacing ? '#1a2a1a' : '#1a1a1a',
                          border: `1px solid ${isPlacing ? '#2a5a2a' : '#2a2a2a'}`,
                          textAlign: 'left',
                        }}>
                        <img src={product.image} alt={product.name}
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                        <div>
                          <p style={{ color: '#ddd', fontSize: '12px', fontWeight: '500', lineHeight: '1.3' }}>{product.name}</p>
                          <p style={{ color: '#555', fontSize: '10px', marginTop: '2px' }}>{product.lengthCm}×{product.depthCm} cm</p>
                        </div>
                        {isPlacing
                          ? <span style={{ color: '#4a9a4a', fontSize: '10px', marginLeft: 'auto' }}>✓</span>
                          : <Plus size={12} color="#555" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                      </button>
                    )
                  })
                )}
              </>
            )}

            {/* ─── Tab Pièce ───────────────────────── */}
            {sidebarTab === 'piece' && (
              <>
                {/* Sol */}
                <div>
                  <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Sol</p>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[['parquet', 'Parquet'], ['carrelage', 'Carrelage']].map(([val, label]) => (
                      <button key={val} onClick={() => {
                        setFloorType(val)
                        if (val === 'parquet' && floorColor === '#E0E0E0') setFloorColor('#C4A265')
                        if (val === 'carrelage' && floorColor === '#C4A265') setFloorColor('#E0E0E0')
                      }} style={{
                        flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
                        cursor: 'pointer', border: `1.5px solid ${floorType === val ? '#aaa' : '#333'}`,
                        backgroundColor: floorType === val ? '#2a2a2a' : '#1a1a1a',
                        color: floorType === val ? '#fff' : '#666',
                      }}>{label}</button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#888', fontSize: '12px' }}>
                    Couleur du sol
                    <input type="color" value={floorColor} onChange={e => setFloorColor(e.target.value)}
                      style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
                  </label>
                </div>

                <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
                  <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Murs</p>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#888', fontSize: '12px' }}>
                    Couleur des murs
                    <input type="color" value={wallColor} onChange={e => setWallColor(e.target.value)}
                      style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
                  </label>
                </div>

                {/* Ouvertures */}
                <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
                  <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Ouvertures</p>

                  {/* Choix du mur */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {WALLS.map(w => (
                      <button key={w.id} onClick={() => setOpeningWall(w.id)} style={{
                        flex: 1, padding: '5px 4px', borderRadius: '5px', fontSize: '10px', fontWeight: '500',
                        cursor: 'pointer', border: `1.5px solid ${openingWall === w.id ? '#aaa' : '#333'}`,
                        backgroundColor: openingWall === w.id ? '#2a2a2a' : '#1a1a1a',
                        color: openingWall === w.id ? '#fff' : '#666',
                      }}>{w.label.replace('Mur ', '')}</button>
                    ))}
                  </div>

                  {/* Boutons ajouter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {OPENING_TYPES.map(op => (
                      <button key={op.type} onClick={() => addOpening(op.type)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ddd',
                        fontSize: '12px',
                      }}>
                        <span>{op.label}</span>
                        <span style={{ color: '#555', fontSize: '10px' }}>{op.desc} <Plus size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>
                      </button>
                    ))}
                  </div>

                  {/* Liste des ouvertures placées */}
                  {openings.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={{ color: '#555', fontSize: '10px', marginBottom: '2px' }}>Placées :</p>
                      {openings.map(op => (
                        <div key={op.id} style={{ padding: '8px 10px', backgroundColor: '#1a1a1a', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#bbb', fontSize: '11px' }}>
                              {OPENING_TYPES.find(t => t.type === op.type)?.label} · {WALLS.find(w => w.id === op.wall)?.label.replace('Mur ', '')}
                            </span>
                            <button onClick={() => removeOpening(op.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {/* Slider position sur le mur */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>◀</span>
                            <input
                              type="range"
                              min={-1} max={1} step={0.05}
                              value={op.xOffset}
                              onChange={e => moveOpening(op.id, Number(e.target.value))}
                              style={{ flex: 1, accentColor: '#aaa', height: '4px', cursor: 'pointer' }}
                            />
                            <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>▶</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {placedItems.length > 0 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #222', flexShrink: 0 }}>
              <p style={{ color: '#555', fontSize: '11px', textAlign: 'center' }}>{placedItems.length} meuble(s) placé(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
