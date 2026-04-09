import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Grid, useTexture } from '@react-three/drei'
import { Loader2, Plus, Trash2, RotateCw, ArrowLeft, Sofa, Settings, ChevronUp, ChevronDown, X, Thermometer, RotateCcw, Eye, Camera, Share2, FileText, Mail, Search, ExternalLink, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import API_BASE from '../config'

// Catégories de meubles
const CATEGORY_LABELS = {
  canape: 'Canapés',
  table_basse: 'Tables basses',
  table_repas: 'Tables à manger',
  chaise: 'Chaises',
  lit: 'Lits',
}

// Snap d'angle : retourne l'angle le plus proche d'un multiple de 15° dans une zone de tolérance
function snapAngle(radians, snapDeg = 15, toleranceDeg = 4) {
  const deg = (radians * 180 / Math.PI) % 360
  const nearest = Math.round(deg / snapDeg) * snapDeg
  if (Math.abs(deg - nearest) < toleranceDeg) {
    return nearest * Math.PI / 180
  }
  return radians
}

// Test de collision AABB entre 2 boxes en 2D (sol)
function boxesCollide(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024)
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isTablet
}

// Presets de parquet (couleur appliquée à la même texture base de chêne)
const PARQUET_PRESETS = {
  'chene-clair':  { name: 'Chêne clair',  tint: '#C9A572', repeat: 4 },
  'chene-fonce':  { name: 'Chêne foncé',  tint: '#7A5236', repeat: 4 },
  'noyer':        { name: 'Noyer',        tint: '#5C3A24', repeat: 4 },
  'hetre':        { name: 'Hêtre',        tint: '#D4B589', repeat: 4 },
  'gris':         { name: 'Gris vintage', tint: '#9A938A', repeat: 4 },
}

// ─── Fenêtre décorative sur un mur ───────────────────────────────────────────
function WindowDecoration({ w = 1.2, h = 0.9, isBaie = false, isSelected }) {
  const frameT = 0.05
  const frameColor = isSelected ? '#FFD700' : '#E0E0E0'
  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.06, h + 0.06]} />
        <meshStandardMaterial color="#5A7080" />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w - frameT * 2, h - frameT * 2]} />
        <meshStandardMaterial color={isBaie ? '#90C8E8' : '#A8CCE0'} transparent opacity={isBaie ? 0.45 : 0.6} metalness={0.15} roughness={0.0} />
      </mesh>
      <mesh position={[0, h / 2, 0.02]}><boxGeometry args={[w, frameT, 0.05]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[0, -h / 2, 0.02]}><boxGeometry args={[w, frameT, 0.05]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[-w / 2, 0, 0.02]}><boxGeometry args={[frameT, h, 0.05]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[w / 2, 0, 0.02]}><boxGeometry args={[frameT, h, 0.05]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[w, frameT * 0.6, 0.04]} /><meshStandardMaterial color={frameColor} /></mesh>
      {isBaie && (
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[frameT * 0.6, h, 0.04]} /><meshStandardMaterial color={frameColor} /></mesh>
      )}
    </group>
  )
}

// ─── Porte décorative sur un mur ─────────────────────────────────────────────
function DoorDecoration({ w = 0.9, h = 2.1, isSelected }) {
  const frameT = 0.06
  const frameColor = isSelected ? '#FFD700' : '#E0E0E0'
  return (
    <group>
      <mesh position={[0, h / 2, -0.02]}>
        <planeGeometry args={[w + 0.1, h + 0.08]} />
        <meshStandardMaterial color="#4A4A4A" />
      </mesh>
      <mesh position={[0, h / 2, 0.01]}>
        <planeGeometry args={[w - 0.03, h - 0.02]} />
        <meshStandardMaterial color="#C8A87A" roughness={0.85} />
      </mesh>
      <mesh position={[-w / 2 - frameT / 2, h / 2, 0.03]}><boxGeometry args={[frameT, h + frameT, 0.06]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[w / 2 + frameT / 2, h / 2, 0.03]}><boxGeometry args={[frameT, h + frameT, 0.06]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[0, h + frameT / 2, 0.03]}><boxGeometry args={[w + frameT * 2, frameT, 0.06]} /><meshStandardMaterial color={frameColor} /></mesh>
      <mesh position={[w / 2 - 0.12, h / 2, 0.07]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
        <meshStandardMaterial color="#B8922A" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

// ─── Radiateur décoratif ─────────────────────────────────────────────────────
// ─── Télé écran plat accrochée au mur ────────────────────────────────────────
function TVDecoration({ w = 1.22, h = 0.70, isSelected }) {
  const frameColor = isSelected ? '#FFD700' : '#1a1a1a'
  const bezelT = 0.015
  return (
    <group>
      {/* Dos / support (fin contre le mur) */}
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[w, h, 0.03]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Cadre / bezel */}
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[w, h, 0.01]} />
        <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Écran (gris foncé brillant) */}
      <mesh position={[0, 0, 0.041]}>
        <planeGeometry args={[w - bezelT * 2, h - bezelT * 2]} />
        <meshStandardMaterial color="#151820" roughness={0.05} metalness={0.2} />
      </mesh>
    </group>
  )
}

function RadiatorDecoration({ w = 1.0, h = 0.6, depth = 0.08, isSelected }) {
  // Radiateur acier blanc avec ailettes verticales
  const finCount = Math.max(8, Math.floor(w / 0.07))
  const finSpacing = w / finCount
  const color = isSelected ? '#FFE680' : '#F5F5F5'
  return (
    <group>
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Ailettes verticales */}
      {Array.from({ length: finCount - 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i + 1) * finSpacing, 0, depth + 0.005]}>
          <boxGeometry args={[0.008, h * 0.92, 0.005]} />
          <meshStandardMaterial color="#CCCCCC" />
        </mesh>
      ))}
      {/* Tuyaux */}
      <mesh position={[-w / 2 + 0.06, -h / 2 - 0.04, depth / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.08, 12]} />
        <meshStandardMaterial color="#CCCCCC" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[w / 2 - 0.06, -h / 2 - 0.04, depth / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.08, 12]} />
        <meshStandardMaterial color="#CCCCCC" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Wrapper d'ouverture cliquable et draggable ──────────────────────────────
function OpeningWrapper({ op, position, rotation, dims, isSelected, onSelect, onDrag, dragEnabled, setOrbitEnabled }) {
  const isDragging = useRef(false)
  const { gl } = useThree()

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSelect(op.id)
        if (!dragEnabled) return
        isDragging.current = true
        setOrbitEnabled(false)
        gl.domElement.style.cursor = 'grabbing'
      }}
      onPointerUp={() => {
        isDragging.current = false
        setOrbitEnabled(true)
        gl.domElement.style.cursor = 'auto'
      }}
      onPointerMove={(e) => {
        if (!isDragging.current) return
        e.stopPropagation()
        onDrag(op.id, e.point)
      }}
    >
      {op.type === 'fenetre' && <WindowDecoration w={dims.w} h={dims.h} isBaie={false} isSelected={isSelected} />}
      {op.type === 'baie' && <WindowDecoration w={dims.w} h={dims.h} isBaie={true} isSelected={isSelected} />}
      {op.type === 'porte' && <DoorDecoration w={dims.w} h={dims.h} isSelected={isSelected} />}
      {op.type === 'tv' && <TVDecoration w={dims.w} h={dims.h} isSelected={isSelected} />}
      {op.type.startsWith('radiateur') && <RadiatorDecoration w={dims.w} h={dims.h} isSelected={isSelected} />}
    </group>
  )
}

// Dimensions standards par type d'ouverture
const OPENING_DIMS = {
  fenetre:        { w: 1.2, h: 1.1, yCenter: 1.75, yBase: false },
  baie:           { w: 1.8, h: 2.2, yCenter: 1.1,  yBase: false },
  porte:          { w: 0.9, h: 2.1, yCenter: null, yBase: true },
  'radiateur-petit':  { w: 0.6, h: 0.5, yCenter: 0.35, yBase: false },
  'radiateur-moyen':  { w: 1.0, h: 0.6, yCenter: 0.35, yBase: false },
  'radiateur-grand':  { w: 1.5, h: 0.6, yCenter: 0.35, yBase: false },
  'radiateur-vertical': { w: 0.5, h: 1.8, yCenter: 1.0, yBase: false },
  tv:             { w: 1.22, h: 0.70, yCenter: 1.20, yBase: false },
}

function getOpeningDims(type) {
  if (type.startsWith('radiateur')) return { ...OPENING_DIMS[type], type: 'radiateur' }
  return { ...OPENING_DIMS[type], type }
}

// ─── Plinthes en bas des murs ────────────────────────────────────────────────
function Skirtings({ width, depth }) {
  const h = 0.08
  const t = 0.015
  const color = '#FFFFFF'
  return (
    <group position={[0, h / 2 + 0.001, 0]}>
      <mesh position={[0, 0, -depth / 2 + t / 2 + 0.025]}>
        <boxGeometry args={[width, h, t]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[-width / 2 + t / 2 + 0.025, 0, 0]}>
        <boxGeometry args={[t, h, depth]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[width / 2 - t / 2 - 0.025, 0, 0]}>
        <boxGeometry args={[t, h, depth]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}

// ─── Sol avec texture parquet (Polyhaven 2K) ─────────────────────────────────
function ParquetFloor({ width, depth, preset, color }) {
  const textures = useTexture({
    map: '/textures/parquet-diff.jpg',
    normalMap: '/textures/parquet-nor.jpg',
    roughnessMap: '/textures/parquet-rough.jpg',
  })

  // Configurer les textures (répétition pour parquet réaliste)
  useMemo(() => {
    Object.values(textures).forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 16
      // Rotation 90° pour orienter les lattes horizontalement
      t.center.set(0.5, 0.5)
      t.rotation = Math.PI / 2
      t.repeat.set(Math.max(2, width / 2), Math.max(2, depth / 2))
    })
  }, [textures, width, depth])

  const tint = color || PARQUET_PRESETS[preset]?.tint || '#C9A572'

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        roughnessMap={textures.roughnessMap}
        color={tint}
        roughness={0.85}
        metalness={0}
        normalScale={[0.6, 0.6]}
      />
    </mesh>
  )
}

// ─── Pièce 3D ────────────────────────────────────────────────────────────────
function Room({ width, depth, wallH, floorType, floorPreset, floorColor, wallColor, openings, selectedOpeningId, onSelectOpening, onDragOpening, setOrbitEnabled, showSkirtings = true }) {
  const wallT = 0.05

  return (
    <group>
      {/* Sol */}
      {floorType === 'parquet' ? (
        <Suspense fallback={
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={floorColor} roughness={0.85} />
          </mesh>
        }>
          <ParquetFloor width={width} depth={depth} preset={floorPreset} color={floorColor} />
        </Suspense>
      ) : (
        <>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial color={floorColor} roughness={0.15} metalness={0.08} />
          </mesh>
          <Grid
            position={[0, 0.001, 0]}
            args={[width, depth]}
            cellSize={0.6} cellThickness={0.8} cellColor="#999"
            sectionSize={1.2} sectionThickness={0}
            fadeDistance={30} infiniteGrid={false}
          />
        </>
      )}

      {/* Murs */}
      <mesh receiveShadow position={[0, wallH / 2, -depth / 2]}>
        <boxGeometry args={[width, wallH, wallT]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[-width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[width / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* Plinthes */}
      {showSkirtings && <Skirtings width={width} depth={depth} />}

      {/* Ouvertures */}
      {openings.map(op => {
        const d = getOpeningDims(op.type)
        const wallLen = (op.wall === 'back' || op.wall === 'front') ? width : depth
        const xPos = op.xOffset * (wallLen / 2 - d.w / 2 - 0.1)
        const wallOffset = 0.04
        // Pour la porte (yBase=true), wrapper à y=0 → DoorDecoration positionne le panneau à h/2
        const yPos = d.yBase ? 0 : d.yCenter

        let pos, rot
        if (op.wall === 'back') {
          pos = [xPos, yPos, -depth / 2 + wallOffset]
          rot = [0, 0, 0]
        } else if (op.wall === 'left') {
          pos = [-width / 2 + wallOffset, yPos, xPos]
          rot = [0, Math.PI / 2, 0]
        } else {
          pos = [width / 2 - wallOffset, yPos, xPos]
          rot = [0, -Math.PI / 2, 0]
        }

        return (
          <OpeningWrapper
            key={op.id}
            op={op}
            position={pos}
            rotation={rot}
            dims={d}
            isSelected={selectedOpeningId === op.id}
            onSelect={onSelectOpening}
            onDrag={onDragOpening}
            dragEnabled={true}
            setOrbitEnabled={setOrbitEnabled}
          />
        )
      })}
    </group>
  )
}

// ─── Meuble 3D ───────────────────────────────────────────────────────────────
function resolveGlbUrl(product) {
  if (!product.glbUrl) return null
  // Si marqueur 'stored' → construire l'URL depuis API_BASE
  if (product.glbUrl === 'stored' || product.glbUrl.includes('/api/glb/')) {
    return API_BASE + '/api/glb/' + product.id
  }
  // URL absolue (legacy fal.ai) → utiliser telle quelle
  return product.glbUrl
}

// ─── Mesh primitif : canapé d'angle (bloc simple) ───────────────────────────
// Encombrement : 3m × 1.77m, assise 45cm, dossier 75cm
// handedness: 'right' = méridienne à droite (vue de face), 'left' = à gauche
function AngleSofaMesh({ handedness = 'right' }) {
  const color = '#9A8A78'
  const sign = handedness === 'right' ? 1 : -1
  // Partie principale : 3m × 0.90m, collée au fond (Z < 0)
  // Recentrage : centre d'encombrement total (3 × 1.77) à l'origine
  // Z total va de -0.885 (fond) à +0.885 (avant)
  // Partie principale occupe Z de -0.885 à -0.885+0.90 = +0.015 → centre Z = -0.435
  // Méridienne occupe Z de +0.015 à +0.015+0.87 = +0.885 → centre Z = +0.45
  return (
    <group>
      {/* Assise partie principale */}
      <mesh castShadow receiveShadow position={[0, 0.225, -0.435]}>
        <boxGeometry args={[3, 0.45, 0.90]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Dossier partie principale (hauteur totale 0.75 = dos haut) */}
      <mesh castShadow receiveShadow position={[0, 0.60, -0.845]}>
        <boxGeometry args={[3, 0.30, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Assise méridienne (sans dossier, comme une chaise longue) */}
      {/* Largeur 1.15m, collée au bord droit/gauche : centre X = 1.5 - 1.15/2 = 0.925 */}
      <mesh castShadow receiveShadow position={[sign * 0.925, 0.225, 0.45]}>
        <boxGeometry args={[1.15, 0.45, 0.87]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  )
}

// ─── Furniture primitive (sans GLB) ──────────────────────────────────────────
function PrimitiveFurniture({ item, isSelected, onSelect, onMove, roomW, roomD, setOrbitEnabled, hasCollision = false }) {
  const halfW = (item.product.lengthCm || 100) / 200
  const halfD = (item.product.depthCm || 60) / 200

  const isDragging = useRef(false)
  const { gl } = useThree()

  const clampPosition = useCallback((px, pz) => {
    const cos = Math.abs(Math.cos(item.rotation))
    const sin = Math.abs(Math.sin(item.rotation))
    const effectiveHalfW = halfW * cos + halfD * sin
    const effectiveHalfD = halfW * sin + halfD * cos
    let x = Math.max(-roomW / 2 + effectiveHalfW, Math.min(roomW / 2 - effectiveHalfW, px))
    let z = Math.max(-roomD / 2 + effectiveHalfD, Math.min(roomD / 2 - effectiveHalfD, pz))
    const snapDist = 0.3
    if (Math.abs(x - (-roomW / 2 + effectiveHalfW)) < snapDist) x = -roomW / 2 + effectiveHalfW
    if (Math.abs(x - (roomW / 2 - effectiveHalfW)) < snapDist) x = roomW / 2 - effectiveHalfW
    if (Math.abs(z - (-roomD / 2 + effectiveHalfD)) < snapDist) z = -roomD / 2 + effectiveHalfD
    if (Math.abs(z - (roomD / 2 - effectiveHalfD)) < snapDist) z = roomD / 2 - effectiveHalfD
    return [x, 0, z]
  }, [item.rotation, halfW, halfD, roomW, roomD])

  const handedness = item.product.primitiveType === 'angle-sofa-left' ? 'left' : 'right'

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
      onPointerDown={e => {
        e.stopPropagation()
        e.target.setPointerCapture?.(e.pointerId)
        isDragging.current = true
        onSelect(item.id)
        setOrbitEnabled(false)
        gl.domElement.style.cursor = 'grabbing'
      }}
      onPointerUp={e => {
        e.target.releasePointerCapture?.(e.pointerId)
        isDragging.current = false
        setOrbitEnabled(true)
        gl.domElement.style.cursor = 'auto'
      }}
      onPointerCancel={() => {
        isDragging.current = false
        setOrbitEnabled(true)
        gl.domElement.style.cursor = 'auto'
      }}
      onPointerMove={e => {
        if (!isDragging.current) return
        e.stopPropagation()
        const pos = clampPosition(e.point.x, e.point.z)
        onMove(item.id, pos)
      }}
    >
      {(isSelected || hasCollision) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
          <ringGeometry args={[Math.max(halfW, halfD) * 0.95, Math.max(halfW, halfD) * 1.05, 48]} />
          <meshBasicMaterial color={hasCollision ? '#FF4444' : '#FFD700'} transparent opacity={0.9} />
        </mesh>
      )}
      {/* Hit box transparente pour capter les clics sur tout le footprint (inclut le "trou" du L) */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[halfW * 2, 0.85, halfD * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <AngleSofaMesh handedness={handedness} />
    </group>
  )
}

function Furniture({ item, isSelected, onSelect, onMove, roomW, roomD, setOrbitEnabled, hasCollision = false }) {
  const glbSrc = resolveGlbUrl(item.product)
  const { scene } = useGLTF(glbSrc)
  const cloned = React.useMemo(() => {
    const s = scene.clone(true)
    s.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true }
    })
    return s
  }, [scene])

  const { scale, yOffset, halfW, halfD } = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const targetW = (item.product.lengthCm || 100) / 100
    const s = targetW / (size.x || 1)
    const realW = (item.product.lengthCm || 100) / 100
    const realD = (item.product.depthCm || 60) / 100
    return { scale: s, yOffset: -box.min.y * s, halfW: realW / 2, halfD: realD / 2 }
  }, [cloned, item.product.lengthCm, item.product.depthCm])

  const isDragging = useRef(false)
  const { gl } = useThree()

  // Position clampée + snap au mur (à 30cm)
  const clampPosition = useCallback((px, pz) => {
    const cos = Math.abs(Math.cos(item.rotation))
    const sin = Math.abs(Math.sin(item.rotation))
    const effectiveHalfW = halfW * cos + halfD * sin
    const effectiveHalfD = halfW * sin + halfD * cos
    let x = Math.max(-roomW / 2 + effectiveHalfW, Math.min(roomW / 2 - effectiveHalfW, px))
    let z = Math.max(-roomD / 2 + effectiveHalfD, Math.min(roomD / 2 - effectiveHalfD, pz))
    // Snap au mur (zone de 30cm)
    const snapDist = 0.3
    if (Math.abs(x - (-roomW / 2 + effectiveHalfW)) < snapDist) x = -roomW / 2 + effectiveHalfW
    if (Math.abs(x - (roomW / 2 - effectiveHalfW)) < snapDist) x = roomW / 2 - effectiveHalfW
    if (Math.abs(z - (-roomD / 2 + effectiveHalfD)) < snapDist) z = -roomD / 2 + effectiveHalfD
    if (Math.abs(z - (roomD / 2 - effectiveHalfD)) < snapDist) z = roomD / 2 - effectiveHalfD
    return [x, 0, z]
  }, [item.rotation, halfW, halfD, roomW, roomD])

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
      onPointerDown={e => {
        e.stopPropagation()
        e.target.setPointerCapture?.(e.pointerId)
        isDragging.current = true
        onSelect(item.id)
        setOrbitEnabled(false)
        gl.domElement.style.cursor = 'grabbing'
      }}
      onPointerUp={e => {
        e.target.releasePointerCapture?.(e.pointerId)
        isDragging.current = false
        setOrbitEnabled(true)
        gl.domElement.style.cursor = 'auto'
      }}
      onPointerCancel={() => {
        isDragging.current = false
        setOrbitEnabled(true)
        gl.domElement.style.cursor = 'auto'
      }}
      onPointerMove={e => {
        if (!isDragging.current) return
        e.stopPropagation()
        const pos = clampPosition(e.point.x, e.point.z)
        onMove(item.id, pos)
      }}
    >
      {(isSelected || hasCollision) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
          <ringGeometry args={[Math.max(halfW, halfD) * 0.95, Math.max(halfW, halfD) * 1.05, 32]} />
          <meshBasicMaterial color={hasCollision ? '#FF4444' : '#FFD700'} transparent opacity={0.9} />
        </mesh>
      )}
      {/* Hit box transparente pour capter les clics même dans les zones vides du GLB */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[halfW * 2 + 0.1, 1.2, halfD * 2 + 0.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
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

// Composant qui gère la caméra (top view ou perspective)
function CameraController({ topView, roomW, roomD }) {
  const { camera } = useThree()
  useEffect(() => {
    if (topView) {
      camera.position.set(0, Math.max(roomW, roomD) * 1.5, 0.01)
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.set(0, 5, 8)
      camera.lookAt(0, 0, 0)
    }
  }, [topView, camera, roomW, roomD])
  return null
}

// ─── Scène complète ──────────────────────────────────────────────────────────
function Scene({ roomW, roomD, wallH, placedItems, selectedId, onSelectItem, onMoveItem, onPlaceItem, placing, floorType, floorPreset, floorColor, wallColor, openings, selectedOpeningId, onSelectOpening, onDragOpening, topView, collidingIds }) {
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  const handleFloorClick = (e) => {
    if (placing) {
      e.stopPropagation()
      const x = Math.max(-roomW / 2 + 0.3, Math.min(roomW / 2 - 0.3, e.point.x))
      const z = Math.max(-roomD / 2 + 0.3, Math.min(roomD / 2 - 0.3, e.point.z))
      onPlaceItem([x, 0, z])
    } else {
      onSelectItem(null)
      onSelectOpening(null)
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
      <CameraController topView={topView} roomW={roomW} roomD={roomD} />
      <Room
        width={roomW} depth={roomD} wallH={wallH}
        floorType={floorType} floorPreset={floorPreset} floorColor={floorColor} wallColor={wallColor}
        openings={openings}
        selectedOpeningId={selectedOpeningId}
        onSelectOpening={onSelectOpening}
        onDragOpening={onDragOpening}
        setOrbitEnabled={setOrbitEnabled}
        showSkirtings={!topView}
      />
      <FloorPlane onFloorClick={handleFloorClick} roomW={roomW} roomD={roomD} />
      <Suspense fallback={null}>
        {placedItems.map(item => {
          const commonProps = {
            item, isSelected: item.id === selectedId,
            onSelect: onSelectItem, onMove: onMoveItem,
            roomW, roomD, setOrbitEnabled,
            hasCollision: collidingIds?.has(item.id),
          }
          return item.product.isPrimitive
            ? <PrimitiveFurniture key={item.id} {...commonProps} />
            : <Furniture key={item.id} {...commonProps} />
        })}
      </Suspense>
      <OrbitControls
        enabled={orbitEnabled}
        enablePan={false}
        maxPolarAngle={topView ? 0.01 : Math.PI / 2 - 0.05}
        minPolarAngle={topView ? 0 : 0}
        minDistance={2}
        maxDistance={Math.max(roomW, roomD) * 2.5}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────
const OPENING_TYPES = [
  { type: 'fenetre', label: 'Fenêtre', desc: '120×110' },
  { type: 'baie', label: 'Baie vitrée', desc: '180×220' },
  { type: 'porte', label: 'Porte', desc: '90×210' },
  { type: 'radiateur-petit', label: 'Radiateur S', desc: '60×50' },
  { type: 'radiateur-moyen', label: 'Radiateur M', desc: '100×60' },
  { type: 'radiateur-grand', label: 'Radiateur L', desc: '150×60' },
  { type: 'radiateur-vertical', label: 'Radiateur vert.', desc: '50×180' },
  { type: 'tv', label: 'Télé écran plat', desc: '55" · 122×70' },
]
const WALLS = [
  { id: 'back', label: 'Mur arrière' },
  { id: 'left', label: 'Mur gauche' },
  { id: 'right', label: 'Mur droit' },
]

function getOpeningLabel(type) {
  return OPENING_TYPES.find(t => t.type === type)?.label || type
}

// ─── Panneau flottant de rotation ────────────────────────────────────────────
function RotationPanel({ rotation, onChange, onRotateBy, isMobile }) {
  const degrees = Math.round(((rotation * 180 / Math.PI) % 360 + 360) % 360)
  return (
    <div style={{
      position: 'absolute',
      bottom: isMobile ? '90px' : '24px',
      left: '50%', transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0,0,0,0.85)',
      color: '#fff', padding: '12px 16px', borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 15, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)',
      maxWidth: '92vw',
    }}>
      <RotateCw size={16} color="#FFD700" />
      <button onClick={() => onRotateBy(-15)} style={btnRound}>-15°</button>
      <button onClick={() => onRotateBy(-1)} style={btnRound}>-1°</button>
      <input
        type="range"
        min={0} max={359} step={1}
        value={degrees}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: isMobile ? '100px' : '180px', accentColor: '#FFD700' }}
      />
      <input
        type="number"
        min={0} max={359}
        value={degrees}
        onChange={e => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n)) onChange(n)
        }}
        style={{
          width: '52px', padding: '4px 6px',
          backgroundColor: '#1a1a1a', border: '1px solid #444',
          borderRadius: '6px', color: '#fff', fontSize: '13px', textAlign: 'center',
        }}
      />
      <span style={{ color: '#888', fontSize: '12px' }}>°</span>
      <button onClick={() => onRotateBy(1)} style={btnRound}>+1°</button>
      <button onClick={() => onRotateBy(15)} style={btnRound}>+15°</button>
    </div>
  )
}

const btnRound = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', borderRadius: '6px',
  padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
  fontWeight: '500',
}

// ─── Pseudo-produits : blocs primitifs disponibles sans GLB ─────────────────
const ANGLE_SOFA_SVG_RIGHT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="12" width="40" height="14" rx="2" fill="#9A8A78"/><rect x="30" y="24" width="14" height="16" rx="2" fill="#9A8A78"/></svg>`
)}`
const ANGLE_SOFA_SVG_LEFT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="4" y="12" width="40" height="14" rx="2" fill="#9A8A78"/><rect x="4" y="24" width="14" height="16" rx="2" fill="#9A8A78"/></svg>`
)}`

const PSEUDO_PRODUCTS = [
  {
    id: 'pseudo-angle-sofa-right',
    name: "Canapé d'angle 3m (angle droit)",
    category: 'canape',
    lengthCm: 300,
    depthCm: 177,
    heightCm: 75,
    isPrimitive: true,
    primitiveType: 'angle-sofa-right',
    image: ANGLE_SOFA_SVG_RIGHT,
  },
  {
    id: 'pseudo-angle-sofa-left',
    name: "Canapé d'angle 3m (angle gauche)",
    category: 'canape',
    lengthCm: 300,
    depthCm: 177,
    heightCm: 75,
    isPrimitive: true,
    primitiveType: 'angle-sofa-left',
    image: ANGLE_SOFA_SVG_LEFT,
  },
]

const STORAGE_KEY = 'home-concept-3d-composition-v1'

function loadSavedComposition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function FloorPlan3D() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Charger l'état sauvegardé au démarrage
  const saved = useMemo(() => loadSavedComposition(), [])

  const [roomW, setRoomW] = useState(saved?.roomW ?? 5)
  const [roomD, setRoomD] = useState(saved?.roomD ?? 4)
  const [wallH, setWallH] = useState(saved?.wallH ?? 2.5)
  const [roomWInput, setRoomWInput] = useState(String(saved?.roomW ?? 5))
  const [roomDInput, setRoomDInput] = useState(String(saved?.roomD ?? 4))
  const [wallHInput, setWallHInput] = useState(String(saved?.wallH ?? 2.5))
  const [placedItems, setPlacedItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOpeningId, setSelectedOpeningId] = useState(null)
  const [placing, setPlacing] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('meubles')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Personnalisation (chargée du localStorage si dispo)
  const [floorType, setFloorType] = useState(saved?.floorType ?? 'parquet')
  const [floorPreset, setFloorPreset] = useState(saved?.floorPreset ?? 'chene-clair')
  const [floorColor, setFloorColor] = useState(saved?.floorColor ?? '#E0E0E0')
  const [wallColor, setWallColor] = useState(saved?.wallColor ?? '#F5F3F0')
  const [openings, setOpenings] = useState(saved?.openings ?? [])
  const [openingWall, setOpeningWall] = useState('back')

  // Vue / UX
  const [topView, setTopView] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [shareToast, setShareToast] = useState(null)
  const canvasRef = useRef(null)

  // Mémorise les meubles sauvegardés (sans le glbUrl/scene) pour les restaurer après chargement des produits
  const savedItemsRef = useRef(saved?.placedItems ?? [])

  // Détection collisions entre meubles
  const collidingIds = useMemo(() => {
    const colliding = new Set()
    const boxes = placedItems.map(item => {
      const w = (item.product.lengthCm || 100) / 100
      const d = (item.product.depthCm || 60) / 100
      const cos = Math.abs(Math.cos(item.rotation))
      const sin = Math.abs(Math.sin(item.rotation))
      return {
        id: item.id,
        x: item.position[0],
        z: item.position[2],
        w: w * cos + d * sin,
        d: w * sin + d * cos,
      }
    })
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (boxesCollide(boxes[i], boxes[j])) {
          colliding.add(boxes[i].id)
          colliding.add(boxes[j].id)
        }
      }
    }
    return colliding
  }, [placedItems])

  // Surface au sol
  const surfaceM2 = (roomW * roomD).toFixed(1)

  // Prix total des meubles placés
  const totalPrice = useMemo(() => {
    return placedItems.reduce((sum, i) => sum + (Number(i.product.price) || 0), 0)
  }, [placedItems])

  useEffect(() => {
    fetch(API_BASE + '/api/products')
      .then(r => r.json())
      .then(data => {
        const validProducts = [...PSEUDO_PRODUCTS, ...data.filter(p => p.glbUrl)]
        setProducts(validProducts)
        setLoadingProducts(false)
        // Restaurer les meubles sauvegardés en récupérant les produits actuels
        if (savedItemsRef.current.length > 0) {
          const restored = savedItemsRef.current
            .map(saved => {
              const product = validProducts.find(p => p.id === saved.productId)
              if (!product) return null
              return {
                id: saved.id,
                product,
                position: saved.position,
                rotation: saved.rotation,
              }
            })
            .filter(Boolean)
          setPlacedItems(restored)
        }
      })
      .catch(() => {
        // Même en cas d'échec du fetch, on garde les pseudo-produits dispo
        setProducts(PSEUDO_PRODUCTS)
        setLoadingProducts(false)
      })
  }, [])

  // Sauvegarde automatique dans localStorage à chaque changement
  useEffect(() => {
    // Ne pas sauvegarder pendant le chargement initial
    if (loadingProducts) return
    try {
      const composition = {
        roomW, roomD, wallH,
        floorType, floorPreset, floorColor, wallColor,
        openings,
        // Sauvegarder uniquement les références produits (pas les objets complets)
        placedItems: placedItems.map(i => ({
          id: i.id,
          productId: i.product.id,
          position: i.position,
          rotation: i.rotation,
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(composition))
    } catch {}
  }, [roomW, roomD, wallH, floorType, floorPreset, floorColor, wallColor, openings, placedItems, loadingProducts])

  const handlePlaceItem = (position) => {
    if (!placing) return
    const newItem = { id: Date.now(), product: placing, position, rotation: 0 }
    setPlacedItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
    setPlacing(null)
    if (isMobile) setDrawerOpen(false)
  }

  // Rotation : valeur en degrés (0-360) avec snap à 15°
  const handleRotateBy = (deltaDegrees) => {
    if (!selectedId) return
    setPlacedItems(prev => prev.map(i => i.id === selectedId
      ? { ...i, rotation: snapAngle(i.rotation + (deltaDegrees * Math.PI / 180)) }
      : i
    ))
  }

  const handleSetRotation = (degrees) => {
    if (!selectedId) return
    setPlacedItems(prev => prev.map(i => i.id === selectedId
      ? { ...i, rotation: snapAngle(degrees * Math.PI / 180) }
      : i
    ))
  }

  const handleDelete = () => {
    setPlacedItems(prev => prev.filter(i => i.id !== selectedId))
    setSelectedId(null)
  }

  const addOpening = (type) => {
    const newId = Date.now()
    setOpenings(prev => [...prev, {
      id: newId, type, wall: openingWall, xOffset: 0,
    }])
    setSelectedOpeningId(newId)
  }

  const removeOpening = (id) => {
    setOpenings(prev => prev.filter(o => o.id !== id))
    if (selectedOpeningId === id) setSelectedOpeningId(null)
  }
  const moveOpening = (id, xOffset) => setOpenings(prev => prev.map(o => o.id === id ? { ...o, xOffset } : o))
  const deleteOpening = (id) => removeOpening(id)

  // Drag d'une ouverture en 3D : détecte automatiquement le mur le plus proche
  const handleDragOpening = useCallback((id, point) => {
    setOpenings(prev => prev.map(op => {
      if (op.id !== id) return op

      // Distances aux 3 murs (back, left, right)
      const distBack = Math.abs(point.z - (-roomD / 2))
      const distLeft = Math.abs(point.x - (-roomW / 2))
      const distRight = Math.abs(point.x - (roomW / 2))

      let newWall = op.wall
      let newOffset = op.xOffset

      const minDist = Math.min(distBack, distLeft, distRight)

      if (minDist === distBack) {
        newWall = 'back'
        const wallLen = roomW
        newOffset = Math.max(-1, Math.min(1, point.x / (wallLen / 2 - 0.5)))
      } else if (minDist === distLeft) {
        newWall = 'left'
        const wallLen = roomD
        newOffset = Math.max(-1, Math.min(1, point.z / (wallLen / 2 - 0.5)))
      } else {
        newWall = 'right'
        const wallLen = roomD
        newOffset = Math.max(-1, Math.min(1, point.z / (wallLen / 2 - 0.5)))
      }

      return { ...op, wall: newWall, xOffset: newOffset }
    }))
  }, [roomW, roomD])

  const selectedItem = placedItems.find(i => i.id === selectedId)
  const selectedOpening = openings.find(o => o.id === selectedOpeningId)

  const inputStyle = {
    width: '52px', padding: '4px 8px', backgroundColor: '#1a1a1a',
    border: '1px solid #333', borderRadius: '6px', color: '#fff',
    fontSize: '13px', textAlign: 'center',
  }

  const tabStyle = (active) => ({
    flex: 1, padding: isMobile ? '8px' : '10px', fontSize: '12px', fontWeight: '600',
    border: 'none', cursor: 'pointer', transition: 'all 150ms',
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#0A0A0A' : '#666',
    borderRadius: '6px',
  })

  // Produits filtrés par recherche et catégorie
  const filteredProducts = useMemo(() => {
    let list = products
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q))
    } else if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory)
    }
    return list
  }, [products, searchQuery, activeCategory])

  // ─── Contenu partagé sidebar/drawer ───────────────────────────────────────
  const sidebarContent = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {sidebarTab === 'meubles' && (
        <>
          {/* Barre de recherche */}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#555" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px 7px 28px',
                backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '7px',
                color: '#ddd', fontSize: '12px', boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
          {/* Filtre catégories */}
          {!searchQuery && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[['all', 'Tous'], ...Object.entries(CATEGORY_LABELS)].map(([key, label]) => (
                <button key={key} onClick={() => setActiveCategory(key)} style={{
                  padding: '3px 9px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                  border: `1px solid ${activeCategory === key ? '#aaa' : '#333'}`,
                  backgroundColor: activeCategory === key ? '#2a2a2a' : '#1a1a1a',
                  color: activeCategory === key ? '#fff' : '#666',
                }}>{label}</button>
              ))}
            </div>
          )}
          {loadingProducts ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px' }}>
              <Loader2 size={20} color="#666" className="spin" />
            </div>
          ) : products.length === 0 ? (
            <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', paddingTop: '24px', lineHeight: '1.8' }}>
              Aucun meuble avec modèle 3D.{'\n'}Générez des GLB dans l'admin.
            </p>
          ) : isMobile ? (
            /* Mobile: grille horizontale scrollable */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {filteredProducts.map(product => {
                const isPlacing = placing?.id === product.id
                return (
                  <button key={product.id}
                    onClick={() => { isPlacing ? setPlacing(null) : setPlacing(product); if (!isPlacing) setDrawerOpen(false) }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '10px 6px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: isPlacing ? '#1a2a1a' : '#1a1a1a',
                      border: `1px solid ${isPlacing ? '#2a5a2a' : '#2a2a2a'}`,
                      textAlign: 'center',
                    }}>
                    <img src={product.image} alt={product.name}
                      style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                    <p style={{ color: '#ddd', fontSize: '11px', fontWeight: '500', lineHeight: '1.2' }}>{product.name}</p>
                  </button>
                )
              })}
            </div>
          ) : (
            filteredProducts.map(product => {
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

      {sidebarTab === 'piece' && (
        <>
          {/* Sol */}
          <div>
            <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Sol</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[['parquet', 'Parquet'], ['carrelage', 'Carrelage']].map(([val, label]) => (
                <button key={val} onClick={() => setFloorType(val)} style={{
                  flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
                  cursor: 'pointer', border: `1.5px solid ${floorType === val ? '#aaa' : '#333'}`,
                  backgroundColor: floorType === val ? '#2a2a2a' : '#1a1a1a',
                  color: floorType === val ? '#fff' : '#666',
                }}>{label}</button>
              ))}
            </div>

            {/* Sélecteur de presets parquet */}
            {floorType === 'parquet' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {Object.entries(PARQUET_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => { setFloorPreset(key); setFloorColor(preset.tint) }}
                      title={preset.name}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: `2px solid ${floorPreset === key ? '#FFD700' : 'transparent'}`,
                        backgroundColor: preset.tint,
                        backgroundImage: `linear-gradient(90deg, transparent 48%, rgba(0,0,0,0.15) 50%, transparent 52%), linear-gradient(0deg, transparent 48%, rgba(0,0,0,0.15) 50%, transparent 52%)`,
                        backgroundSize: '6px 6px',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#888', fontSize: '12px' }}>
                  Teinte personnalisée
                  <input type="color" value={floorColor} onChange={e => { setFloorColor(e.target.value); setFloorPreset(null) }}
                    style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
                </label>
              </>
            )}

            {floorType === 'carrelage' && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#888', fontSize: '12px' }}>
                Couleur
                <input type="color" value={floorColor} onChange={e => setFloorColor(e.target.value)}
                  style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
              </label>
            )}
          </div>

          <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
            <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Murs</p>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#888', fontSize: '12px' }}>
              Couleur des murs
              <input type="color" value={wallColor} onChange={e => setWallColor(e.target.value)}
                style={{ width: '36px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
            </label>
          </div>

          {/* Dimensions (mobile only - intégré dans tab Pièce) */}
          {isMobile && (
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
              <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Dimensions</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['L', roomWInput, setRoomWInput, setRoomW, 2, 15], ['P', roomDInput, setRoomDInput, setRoomD, 2, 15], ['H', wallHInput, setWallHInput, setWallH, 2, 4]].map(([label, inputVal, setInput, setNum, min, max]) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#aaa', fontSize: '12px', flex: 1 }}>
                    {label}
                    <input
                      type="text" inputMode="decimal"
                      value={inputVal}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '' || raw === '.' || /^\d*\.?\d*$/.test(raw)) {
                          setInput(raw)
                          const n = parseFloat(raw)
                          if (!isNaN(n) && n >= min && n <= max) setNum(n)
                        }
                      }}
                      onBlur={e => {
                        const n = parseFloat(e.target.value)
                        const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n))
                        setNum(clamped)
                        setInput(String(clamped))
                      }}
                      style={{ ...inputStyle, width: '100%', flex: 1 }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Ouvertures */}
          <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
            <p style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Ouvertures</p>

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
  )

  // ─── MOBILE LAYOUT ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: '#D8D4CE', overflow: 'hidden', position: 'relative' }}>

        {/* Header mobile compact */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', backgroundColor: '#111', borderBottom: '1px solid #222', flexShrink: 0,
        }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: '1px solid #333', color: '#aaa',
            padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
            fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <ArrowLeft size={14} />
          </button>
          <span style={{ color: '#fff', fontFamily: 'serif', fontSize: '16px', fontWeight: '600' }}>Plan 3D</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setTopView(v => !v)} title={topView ? 'Vue 3D' : 'Vue de dessus'} style={{
              background: topView ? '#2a3a4a' : 'none', border: `1px solid ${topView ? '#4a8aa8' : '#333'}`, color: topView ? '#7ac8e8' : '#aaa',
              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Layers size={15} />
            </button>
            <button onClick={() => setDrawerOpen(!drawerOpen)} style={{
              background: drawerOpen ? '#333' : 'none', border: '1px solid #333', color: '#aaa',
              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Sofa size={16} />
            </button>
          </div>
        </div>

        {/* Canvas 3D plein écran */}
        <div style={{ flex: 1, position: 'relative', cursor: placing ? 'crosshair' : 'auto' }}>
          {placing && (
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff', padding: '8px 14px',
              borderRadius: '8px', fontSize: '12px', zIndex: 10,
              maxWidth: '85%', textAlign: 'center',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ pointerEvents: 'none' }}>Touchez pour placer <strong>{placing.name}</strong></span>
              <button onClick={() => setPlacing(null)} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bouton suppression flottant (mobile) */}
          {(selectedItem || selectedOpening) && (
            <div style={{
              position: 'absolute', top: '60px', right: '12px',
              zIndex: 10,
            }}>
              <button onClick={() => selectedOpening ? deleteOpening(selectedOpeningId) : handleDelete()} style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'rgba(80,10,10,0.9)', border: '1px solid #5a1a1a',
                color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {/* Slider rotation flottant (mobile) */}
          {selectedItem && !drawerOpen && (
            <RotationPanel
              rotation={selectedItem.rotation}
              onChange={handleSetRotation}
              onRotateBy={handleRotateBy}
              isMobile={true}
            />
          )}

          <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }} style={{ backgroundColor: '#D8D4CE' }}>
            <Scene
              roomW={roomW} roomD={roomD} wallH={wallH}
              placedItems={placedItems} selectedId={selectedId}
              onSelectItem={setSelectedId} onMoveItem={(id, pos) => setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, position: pos } : i))}
              onPlaceItem={handlePlaceItem} placing={placing}
              floorType={floorType} floorPreset={floorPreset} floorColor={floorColor} wallColor={wallColor}
              openings={openings}
              selectedOpeningId={selectedOpeningId}
              onSelectOpening={setSelectedOpeningId}
              onDragOpening={handleDragOpening}
              topView={topView}
              collidingIds={collidingIds}
            />
          </Canvas>
        </div>

        {/* Bottom drawer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: drawerOpen ? '50%' : '0px',
          backgroundColor: '#111', borderTop: drawerOpen ? '1px solid #333' : 'none',
          transition: 'height 300ms ease',
          overflow: 'hidden', zIndex: 20,
          display: 'flex', flexDirection: 'column',
          borderRadius: '16px 16px 0 0',
        }}>
          {/* Handle bar */}
          <div
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{ padding: '8px', display: 'flex', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#444' }} />
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 8px 8px', display: 'flex', gap: '4px', backgroundColor: '#111', flexShrink: 0 }}>
            <button style={tabStyle(sidebarTab === 'meubles')} onClick={() => setSidebarTab('meubles')}>Meubles</button>
            <button style={tabStyle(sidebarTab === 'piece')} onClick={() => setSidebarTab('piece')}>Pièce</button>
          </div>

          {sidebarContent}
        </div>
      </div>
    )
  }

  // ─── DESKTOP LAYOUT (inchangé) ────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#D8D4CE' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', backgroundColor: '#111', borderBottom: '1px solid #222', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: '1px solid #333', color: '#aaa',
            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <ArrowLeft size={14} /> Accueil
          </button>
          <span style={{ color: '#fff', fontFamily: 'serif', fontSize: '18px', fontWeight: '600' }}>Plan 3D</span>
        </div>

        {/* Dimensions + surface */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>Pièce :</span>
          {[['L', roomWInput, setRoomWInput, setRoomW, 2, 15], ['P', roomDInput, setRoomDInput, setRoomD, 2, 15], ['H', wallHInput, setWallHInput, setWallH, 2, 4]].map(([label, inputVal, setInput, setNum, min, max]) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa', fontSize: '13px' }}>
              {label}
              <input
                type="text" inputMode="decimal"
                value={inputVal}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '' || raw === '.' || /^\d*\.?\d*$/.test(raw)) {
                    setInput(raw)
                    const n = parseFloat(raw)
                    if (!isNaN(n) && n >= min && n <= max) setNum(n)
                  }
                }}
                onBlur={e => {
                  const n = parseFloat(e.target.value)
                  const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n))
                  setNum(clamped)
                  setInput(String(clamped))
                }}
                style={inputStyle}
              />
              <span style={{ color: '#666' }}>m</span>
            </label>
          ))}
          <span style={{ color: '#555', fontSize: '12px', marginLeft: '4px' }}>= {surfaceM2} m²</span>
        </div>

        {/* Actions sélection */}
        {selectedItem && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#888', fontSize: '12px' }}>
              {selectedItem.product.name} · {selectedItem.product.lengthCm}×{selectedItem.product.depthCm} cm
              {selectedItem.product.price ? <span style={{ color: '#aaa', marginLeft: '6px' }}>{Number(selectedItem.product.price).toLocaleString('fr-FR')} €</span> : null}
            </span>
            {selectedItem.product.link && (
              <a href={selectedItem.product.link} target="_blank" rel="noreferrer" style={{ background: 'none', border: '1px solid #333', color: '#7ac8e8', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                <ExternalLink size={12} /> Fiche
              </a>
            )}
            <button onClick={handleDelete} style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#ff6b6b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
        {selectedOpening && !selectedItem && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => deleteOpening(selectedOpeningId)} style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#ff6b6b', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> Supprimer ouverture
            </button>
          </div>
        )}

        {/* TopView + Reset */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={() => setTopView(v => !v)} title={topView ? 'Vue 3D' : 'Vue de dessus'} style={{
            background: topView ? '#1a2a3a' : 'none', border: `1px solid ${topView ? '#4a8aa8' : '#333'}`, color: topView ? '#7ac8e8' : '#666',
            padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <Layers size={14} /> {topView ? '3D' : '2D top'}
          </button>
          {placedItems.length > 0 && (
            <button onClick={() => { setPlacedItems([]); setSelectedId(null) }} style={{
              background: 'none', border: '1px solid #333', color: '#888',
              padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <X size={13} /> Vider
            </button>
          )}
        </div>
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
          {selectedItem && (
            <RotationPanel
              rotation={selectedItem.rotation}
              onChange={handleSetRotation}
              onRotateBy={handleRotateBy}
              isMobile={false}
            />
          )}
          <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }} style={{ backgroundColor: '#D8D4CE' }}>
            <Scene
              roomW={roomW} roomD={roomD} wallH={wallH}
              placedItems={placedItems} selectedId={selectedId}
              onSelectItem={setSelectedId} onMoveItem={(id, pos) => setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, position: pos } : i))}
              onPlaceItem={handlePlaceItem} placing={placing}
              floorType={floorType} floorPreset={floorPreset} floorColor={floorColor} wallColor={wallColor}
              openings={openings}
              selectedOpeningId={selectedOpeningId}
              onSelectOpening={setSelectedOpeningId}
              onDragOpening={handleDragOpening}
              topView={topView}
              collidingIds={collidingIds}
            />
          </Canvas>
        </div>

        {/* Sidebar desktop */}
        <div style={{ width: '240px', backgroundColor: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #222', display: 'flex', gap: '4px', backgroundColor: '#1a1a1a' }}>
            <button style={tabStyle(sidebarTab === 'meubles')} onClick={() => setSidebarTab('meubles')}>Meubles</button>
            <button style={tabStyle(sidebarTab === 'piece')} onClick={() => setSidebarTab('piece')}>Pièce</button>
          </div>
          {sidebarContent}
          {placedItems.length > 0 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #222', flexShrink: 0 }}>
              <p style={{ color: '#555', fontSize: '11px', marginBottom: '4px' }}>{placedItems.length} meuble(s) · {surfaceM2} m²</p>
              {totalPrice > 0 && (
                <p style={{ color: '#aaa', fontSize: '13px', fontWeight: '600' }}>
                  Total : {totalPrice.toLocaleString('fr-FR')} €
                </p>
              )}
              <button onClick={() => { setPlacedItems([]); setSelectedId(null) }} style={{
                marginTop: '6px', width: '100%', padding: '6px', borderRadius: '6px',
                background: 'none', border: '1px solid #333', color: '#666',
                fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              }}>
                <X size={11} /> Vider la composition
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
