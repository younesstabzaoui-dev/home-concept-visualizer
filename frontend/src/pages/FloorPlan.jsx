import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Stage, Layer, Rect, Circle, Ellipse, Text, Group, Transformer, Line } from 'react-konva'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCw, Trash2, Plus, ChevronDown, Move, Info } from 'lucide-react'
import API_BASE from '../config'

// Pixels par mètre (échelle de rendu)
const PPM = 80

// Formes par catégorie
const SHAPE_MAP = {
  canape: 'rect',
  table_basse: 'rect',
  table_repas: 'rect',
  chaise: 'circle',
  lit: 'rect',
}

// Couleurs par catégorie
const COLOR_MAP = {
  canape: '#8B7355',
  table_basse: '#D4C5B0',
  table_repas: '#6B5B45',
  chaise: '#A89070',
  lit: '#C4A882',
}

const CATEGORY_LABELS = {
  canape: 'Canapé',
  table_basse: 'Table basse',
  table_repas: 'Table à manger',
  chaise: 'Chaise',
  lit: 'Lit',
}

export default function FloorPlan() {
  const navigate = useNavigate()
  const [roomW, setRoomW] = useState(5)
  const [roomD, setRoomD] = useState(4)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [products, setProducts] = useState([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 600, height: 500 })
  const containerRef = useRef(null)
  const transformerRef = useRef(null)
  const stageRef = useRef(null)

  // Charger le catalogue
  useEffect(() => {
    fetch(API_BASE + '/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {})
  }, [])

  // Adapter la taille du canvas au conteneur
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        setStageSize({ width: w, height: Math.min(w * 0.65, 520) })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Attacher le transformer à l'élément sélectionné
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return
    if (selectedId) {
      const node = stageRef.current.findOne(`#item-${selectedId}`)
      if (node) {
        transformerRef.current.nodes([node])
        transformerRef.current.getLayer().batchDraw()
      }
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, items])

  // Calcul de l'offset pour centrer la pièce dans le canvas
  const roomPxW = roomW * PPM
  const roomPxD = roomD * PPM
  const offsetX = Math.max(20, (stageSize.width - roomPxW) / 2)
  const offsetY = Math.max(20, (stageSize.height - roomPxD) / 2)

  const addProduct = (product) => {
    const shape = SHAPE_MAP[product.category] || 'rect'
    const newItem = {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      category: product.category,
      shape,
      color: COLOR_MAP[product.category] || '#8B7355',
      // Position initiale : centre de la pièce
      x: offsetX + roomPxW / 2,
      y: offsetY + roomPxD / 2,
      // Dimensions en pixels
      widthPx: (product.lengthCm / 100) * PPM,
      heightPx: (product.depthCm / 100) * PPM,
      rotation: 0,
      lengthCm: product.lengthCm,
      depthCm: product.depthCm,
    }
    setItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
    setShowCatalog(false)
  }

  const deleteSelected = () => {
    setItems(prev => prev.filter(i => i.id !== selectedId))
    setSelectedId(null)
  }

  const rotateSelected = () => {
    setItems(prev => prev.map(i =>
      i.id === selectedId ? { ...i, rotation: (i.rotation + 90) % 360 } : i
    ))
  }

  const handleDragEnd = (id, e) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, x: e.target.x(), y: e.target.y() } : i
    ))
  }

  const handleTransformEnd = (id, e) => {
    const node = e.target
    setItems(prev => prev.map(i =>
      i.id === id ? {
        ...i,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      } : i
    ))
  }

  const selectedItem = items.find(i => i.id === selectedId)

  // Grille de fond (quadrillage)
  const gridLines = []
  const gridStep = PPM / 2 // 0.5m par carreau
  for (let x = offsetX; x <= offsetX + roomPxW; x += gridStep) {
    gridLines.push(<Line key={`gx-${x}`} points={[x, offsetY, x, offsetY + roomPxD]} stroke="#E5E5E3" strokeWidth={0.5} />)
  }
  for (let y = offsetY; y <= offsetY + roomPxD; y += gridStep) {
    gridLines.push(<Line key={`gy-${y}`} points={[offsetX, y, offsetX + roomPxW, y]} stroke="#E5E5E3" strokeWidth={0.5} />)
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
            Accueil
          </button>
          <div style={styles.brand}>
            <span style={styles.brandName}>HOME CONCEPT</span>
            <span style={styles.brandSub}>Plan de pièce 2D</span>
          </div>
          <div style={{ width: 100 }} />
        </div>
      </header>

      <div style={styles.layout}>
        {/* Panneau gauche — contrôles */}
        <aside style={styles.sidebar}>

          {/* Dimensions pièce */}
          <div style={styles.sideSection}>
            <p style={styles.sideLabel}>Dimensions de la pièce</p>
            <div style={styles.dimRow}>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Longueur (m)</label>
                <input
                  type="number" min="2" max="20" step="0.5"
                  value={roomW}
                  onChange={e => setRoomW(parseFloat(e.target.value) || 5)}
                  style={styles.input}
                />
              </div>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Largeur (m)</label>
                <input
                  type="number" min="2" max="20" step="0.5"
                  value={roomD}
                  onChange={e => setRoomD(parseFloat(e.target.value) || 4)}
                  style={styles.input}
                />
              </div>
            </div>
            <p style={styles.dimSurface}>
              Surface : <strong>{(roomW * roomD).toFixed(1)} m²</strong>
            </p>
          </div>

          {/* Actions meuble sélectionné */}
          {selectedItem && (
            <div style={styles.sideSection}>
              <p style={styles.sideLabel}>Meuble sélectionné</p>
              <div style={styles.selectedInfo}>
                <span style={{ ...styles.colorDot, backgroundColor: selectedItem.color }} />
                <div>
                  <p style={styles.selectedName}>{selectedItem.name}</p>
                  <p style={styles.selectedDims}>{selectedItem.lengthCm} × {selectedItem.depthCm} cm</p>
                </div>
              </div>
              <div style={styles.actionRow}>
                <button style={styles.actionBtn} onClick={rotateSelected}>
                  <RotateCw size={16} /> Pivoter 90°
                </button>
                <button style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} onClick={deleteSelected}>
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>
          )}

          {/* Ajouter un meuble */}
          <div style={styles.sideSection}>
            <button style={styles.addBtn} onClick={() => setShowCatalog(!showCatalog)}>
              <Plus size={16} />
              Ajouter un meuble
              <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showCatalog ? 'rotate(180deg)' : 'none', transition: '200ms' }} />
            </button>

            {showCatalog && (
              <div style={styles.catalogList}>
                {products.map(p => (
                  <button key={p.id} style={styles.catalogItem} onClick={() => addProduct(p)}>
                    <span style={{ ...styles.colorDot, backgroundColor: COLOR_MAP[p.category] || '#8B7355' }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={styles.catalogName}>{p.name}</p>
                      <p style={styles.catalogDims}>{p.lengthCm} × {p.depthCm} cm</p>
                    </div>
                    <Plus size={14} color="#9CA3AF" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Légende */}
          <div style={styles.sideSection}>
            <p style={styles.sideLabel}>Légende</p>
            <div style={styles.legend}>
              {Object.entries(COLOR_MAP).map(([cat, color]) => (
                <div key={cat} style={styles.legendItem}>
                  <span style={{ ...styles.colorDot, backgroundColor: color }} />
                  <span style={styles.legendLabel}>{CATEGORY_LABELS[cat]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div style={styles.tip}>
            <Info size={14} color="#8B7355" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={styles.tipText}>
              Cliquez sur un meuble pour le sélectionner, puis déplacez-le librement. Utilisez Pivoter pour changer son orientation.
            </p>
          </div>
        </aside>

        {/* Canvas */}
        <div style={styles.canvasWrap} ref={containerRef}>
          <div style={styles.canvasCard}>
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              style={{ borderRadius: '12px', cursor: 'default' }}
              onMouseDown={e => { if (e.target === e.target.getStage()) setSelectedId(null) }}
              onTouchStart={e => { if (e.target === e.target.getStage()) setSelectedId(null) }}
            >
              <Layer>
                {/* Fond */}
                <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#FAFAF8" />

                {/* Grille */}
                {gridLines}

                {/* Pièce */}
                <Rect
                  x={offsetX} y={offsetY}
                  width={roomPxW} height={roomPxD}
                  fill="#FFFFFF"
                  stroke="#0A0A0A"
                  strokeWidth={2}
                  cornerRadius={2}
                />

                {/* Dimensions pièce */}
                <Text x={offsetX} y={offsetY - 18} text={`${roomW}m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" />
                <Text x={offsetX + roomPxW + 6} y={offsetY} text={`${roomD}m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" />

                {/* Meubles */}
                {items.map(item => (
                  <Group
                    key={item.id}
                    id={`item-${item.id}`}
                    x={item.x}
                    y={item.y}
                    rotation={item.rotation}
                    offsetX={item.shape === 'circle' ? 0 : item.widthPx / 2}
                    offsetY={item.shape === 'circle' ? 0 : item.heightPx / 2}
                    draggable
                    onClick={() => setSelectedId(item.id)}
                    onTap={() => setSelectedId(item.id)}
                    onDragEnd={e => handleDragEnd(item.id, e)}
                    onTransformEnd={e => handleTransformEnd(item.id, e)}
                  >
                    {item.shape === 'circle' ? (
                      <Circle
                        radius={item.widthPx / 2}
                        fill={item.color}
                        opacity={selectedId === item.id ? 1 : 0.85}
                        stroke={selectedId === item.id ? '#0A0A0A' : 'transparent'}
                        strokeWidth={2}
                      />
                    ) : (
                      <Rect
                        width={item.widthPx}
                        height={item.heightPx}
                        fill={item.color}
                        opacity={selectedId === item.id ? 1 : 0.85}
                        stroke={selectedId === item.id ? '#0A0A0A' : 'transparent'}
                        strokeWidth={2}
                        cornerRadius={3}
                      />
                    )}
                    {/* Label dimensions */}
                    <Text
                      text={`${item.lengthCm}×${item.depthCm}`}
                      fontSize={10}
                      fill="rgba(255,255,255,0.9)"
                      fontFamily="DM Sans, sans-serif"
                      x={item.shape === 'circle' ? -item.widthPx / 2 : 4}
                      y={item.shape === 'circle' ? -6 : item.heightPx / 2 - 7}
                      width={item.shape === 'circle' ? item.widthPx : item.widthPx - 8}
                      align="center"
                    />
                  </Group>
                ))}

                {/* Transformer pour la sélection */}
                <Transformer
                  ref={transformerRef}
                  enabledAnchors={[]}
                  borderStroke="#0A0A0A"
                  borderStrokeWidth={1.5}
                  borderDash={[4, 3]}
                  rotateEnabled={true}
                  resizeEnabled={false}
                />
              </Layer>
            </Stage>
          </div>

          {/* Infos sous le canvas */}
          <div style={styles.canvasFooter}>
            <span style={styles.canvasFooterItem}>
              <Move size={13} /> Glisser pour déplacer
            </span>
            <span style={styles.canvasFooterItem}>
              ● Cliquer pour sélectionner
            </span>
            <span style={styles.canvasFooterItem}>
              {items.length} meuble{items.length > 1 ? 's' : ''} placé{items.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#FAFAF8', fontFamily: 'var(--font-sans)' },
  header: { borderBottom: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6B7280', padding: '8px 0', width: 100 },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brandName: { fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '700', letterSpacing: '0.1em', color: '#0A0A0A' },
  brandSub: { fontSize: '10px', color: '#8B7355', letterSpacing: '0.15em', textTransform: 'uppercase' },
  layout: { maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px, 3vw, 24px)', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
  sidebar: { width: '100%', maxWidth: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' },
  sideSection: { backgroundColor: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sideLabel: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 },
  dimRow: { display: 'flex', gap: '10px' },
  dimField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  dimLabel: { fontSize: '12px', color: '#6B7280' },
  input: { padding: '8px 10px', border: '1.5px solid #E5E5E3', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  dimSurface: { fontSize: '13px', color: '#6B7280', margin: 0 },
  selectedInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  selectedName: { fontSize: '13px', fontWeight: '600', color: '#0A0A0A', margin: 0 },
  selectedDims: { fontSize: '12px', color: '#9CA3AF', margin: 0 },
  actionRow: { display: 'flex', gap: '8px' },
  actionBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '8px', border: '1.5px solid #E5E5E3', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0A0A0A' },
  actionBtnDanger: { color: '#DC2626', borderColor: '#FEE2E2' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#0A0A0A', color: '#FAFAF8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', width: '100%' },
  catalogList: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' },
  catalogItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', cursor: 'pointer', width: '100%' },
  catalogName: { fontSize: '13px', fontWeight: '500', color: '#0A0A0A', margin: 0 },
  catalogDims: { fontSize: '11px', color: '#9CA3AF', margin: 0 },
  colorDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  legend: { display: 'flex', flexDirection: 'column', gap: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  legendLabel: { fontSize: '12px', color: '#6B7280' },
  tip: { display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'rgba(139,115,85,0.06)', borderRadius: '10px', border: '1px solid rgba(139,115,85,0.12)' },
  tipText: { fontSize: '12px', color: '#8B7355', lineHeight: '1.6', margin: 0 },
  canvasWrap: { flex: 1, minWidth: 'min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '12px' },
  canvasCard: { borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E5E3', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  canvasFooter: { display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' },
  canvasFooterItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' },
}
