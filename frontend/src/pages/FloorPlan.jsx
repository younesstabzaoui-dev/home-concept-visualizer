import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Stage, Layer, Rect, Circle, Text, Group, Transformer, Line } from 'react-konva'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCw, Trash2, Plus, ChevronDown, Info, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import API_BASE from '../config'

const BASE_PPM = 80

const SHAPE_MAP = {
  canape: 'rect', table_basse: 'rect', table_repas: 'rect', chaise: 'circle', lit: 'rect',
}
const COLOR_MAP = {
  canape: '#8B7355', table_basse: '#D4C5B0', table_repas: '#6B5B45', chaise: '#A89070', lit: '#C4A882',
}
const CATEGORY_LABELS = {
  canape: 'Canapé', table_basse: 'Table basse', table_repas: 'Table à manger', chaise: 'Chaise', lit: 'Lit',
}

export default function FloorPlan() {
  const navigate = useNavigate()
  const [roomW, setRoomW] = useState(5)
  const [roomD, setRoomD] = useState(4)
  const [roomWInput, setRoomWInput] = useState('5')
  const [roomDInput, setRoomDInput] = useState('4')
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [products, setProducts] = useState([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 600, height: 420 })
  const [zoom, setZoom] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)

  // Pan manuel
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const isDraggingItem = useRef(false)

  const containerRef = useRef(null)
  const transformerRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    fetch(API_BASE + '/api/products').then(r => r.json()).then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        const h = mobile ? Math.min(w * 0.75, 380) : Math.min(w * 0.65, 520)
        setStageSize({ width: w, height: h })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return
    if (selectedId) {
      const node = stageRef.current.findOne(`#item-${selectedId}`)
      if (node) { transformerRef.current.nodes([node]); transformerRef.current.getLayer().batchDraw() }
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, items])

  const ppm = useMemo(() => {
    const pad = 80
    const maxW = (stageSize.width - pad) / roomW
    const maxH = (stageSize.height - pad) / roomD
    return Math.min(maxW, maxH, BASE_PPM)
  }, [stageSize, roomW, roomD])

  useEffect(() => { setZoom(1); setStagePos({ x: 0, y: 0 }) }, [roomW, roomD])

  const roomPxW = roomW * ppm
  const roomPxD = roomD * ppm
  const offsetX = Math.max(40, (stageSize.width - roomPxW) / 2)
  const offsetY = Math.max(40, (stageSize.height - roomPxD) / 2)

  const zoomIn = () => setZoom(z => Math.min(+(z * 1.3).toFixed(2), 4))
  const zoomOut = () => setZoom(z => Math.max(+(z / 1.3).toFixed(2), 0.3))
  const resetView = () => { setZoom(1); setStagePos({ x: 0, y: 0 }) }

  const handleWheel = (e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = zoom
    const pointer = stage.getPointerPosition()
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }
    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newScale = Math.max(0.3, Math.min(4, oldScale + direction * 0.12))
    setZoom(newScale)
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale })
  }

  // Pan manuel — uniquement si on clique sur le fond (pas sur un meuble)
  const handleStageMouseDown = (e) => {
    if (e.target !== e.target.getStage() && e.target.getParent()?.className !== 'Layer') return
    setSelectedId(null)
    isPanning.current = true
    const pos = e.evt.touches ? e.evt.touches[0] : e.evt
    lastPos.current = { x: pos.clientX, y: pos.clientY }
  }
  const handleStageMouseMove = (e) => {
    if (!isPanning.current || isDraggingItem.current) return
    const pos = e.evt.touches ? e.evt.touches[0] : e.evt
    const dx = pos.clientX - lastPos.current.x
    const dy = pos.clientY - lastPos.current.y
    lastPos.current = { x: pos.clientX, y: pos.clientY }
    setStagePos(p => ({ x: p.x + dx, y: p.y + dy }))
  }
  const handleStageMouseUp = () => { isPanning.current = false }

  const addProduct = (product) => {
    const shape = SHAPE_MAP[product.category] || 'rect'
    const newItem = {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      category: product.category,
      shape,
      color: COLOR_MAP[product.category] || '#8B7355',
      x: offsetX + roomPxW / 2,
      y: offsetY + roomPxD / 2,
      widthPx: (product.lengthCm / 100) * ppm,
      heightPx: (product.depthCm / 100) * ppm,
      rotation: 0,
      lengthCm: product.lengthCm,
      depthCm: product.depthCm,
    }
    setItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
    setShowCatalog(false)
  }

  const deleteSelected = () => { setItems(prev => prev.filter(i => i.id !== selectedId)); setSelectedId(null) }
  const rotateSelected = () => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, rotation: (i.rotation + 90) % 360 } : i))

  const handleDragEnd = (id, e) => {
    isDraggingItem.current = false
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: e.target.x(), y: e.target.y() } : i))
  }
  const handleTransformEnd = (id, e) => {
    const node = e.target
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: node.x(), y: node.y(), rotation: node.rotation() } : i))
  }

  const selectedItem = items.find(i => i.id === selectedId)

  const gridLines = []
  const gridStep = ppm / 2
  for (let x = offsetX; x <= offsetX + roomPxW + 0.5; x += gridStep) {
    gridLines.push(<Line key={`gx-${x}`} points={[x, offsetY, x, offsetY + roomPxD]} stroke="#E5E5E3" strokeWidth={0.5} listening={false} />)
  }
  for (let y = offsetY; y <= offsetY + roomPxD + 0.5; y += gridStep) {
    gridLines.push(<Line key={`gy-${y}`} points={[offsetX, y, offsetX + roomPxW, y]} stroke="#E5E5E3" strokeWidth={0.5} listening={false} />)
  }

  const canvasBlock = (
    <div style={styles.canvasWrap} ref={containerRef}>
      <div style={styles.canvasCard}>
        <div style={styles.zoomBar}>
          <button style={styles.zoomBtn} onClick={zoomOut} aria-label="Dézoomer"><ZoomOut size={15} /></button>
          <span style={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button style={styles.zoomBtn} onClick={zoomIn} aria-label="Zoomer"><ZoomIn size={15} /></button>
          <div style={styles.zoomDivider} />
          <button style={styles.zoomBtn} onClick={resetView} aria-label="Réinitialiser"><Maximize2 size={14} /></button>
        </div>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={zoom} scaleY={zoom}
          x={stagePos.x} y={stagePos.y}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchStart={handleStageMouseDown}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleStageMouseUp}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: isPanning.current ? 'grabbing' : 'grab', backgroundColor: '#FAFAF8' }}
        >
          <Layer>
            <Rect x={-stagePos.x / zoom - 10} y={-stagePos.y / zoom - 10}
              width={stageSize.width / zoom + 20} height={stageSize.height / zoom + 20}
              fill="#FAFAF8" listening={false} />
            {gridLines}
            <Rect x={offsetX} y={offsetY} width={roomPxW} height={roomPxD}
              fill="#FFFFFF" stroke="#0A0A0A" strokeWidth={2} cornerRadius={2} listening={false} />
            <Text x={offsetX} y={offsetY - 20} text={`${roomW} m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" listening={false} />
            <Text x={offsetX + roomPxW + 8} y={offsetY + roomPxD / 2 - 6} text={`${roomD} m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" listening={false} />

            {items.map(item => (
              <Group
                key={item.id}
                id={`item-${item.id}`}
                x={item.x} y={item.y}
                rotation={item.rotation}
                offsetX={item.shape === 'circle' ? 0 : item.widthPx / 2}
                offsetY={item.shape === 'circle' ? 0 : item.heightPx / 2}
                draggable
                onClick={() => setSelectedId(item.id)}
                onTap={() => setSelectedId(item.id)}
                onDragStart={() => { isDraggingItem.current = true; isPanning.current = false; setSelectedId(item.id) }}
                onDragEnd={e => handleDragEnd(item.id, e)}
                onTransformEnd={e => handleTransformEnd(item.id, e)}
              >
                {item.shape === 'circle' ? (
                  <Circle radius={item.widthPx / 2} fill={item.color}
                    opacity={selectedId === item.id ? 1 : 0.85}
                    stroke={selectedId === item.id ? '#0A0A0A' : 'transparent'} strokeWidth={2} />
                ) : (
                  <Rect width={item.widthPx} height={item.heightPx} fill={item.color}
                    opacity={selectedId === item.id ? 1 : 0.85}
                    stroke={selectedId === item.id ? '#0A0A0A' : 'transparent'} strokeWidth={2} cornerRadius={3} />
                )}
                <Text
                  text={`${item.lengthCm}x${item.depthCm}`}
                  fontSize={10} fill="rgba(255,255,255,0.9)" fontFamily="DM Sans, sans-serif"
                  x={item.shape === 'circle' ? -item.widthPx / 2 : 4}
                  y={item.shape === 'circle' ? -6 : item.heightPx / 2 - 7}
                  width={item.shape === 'circle' ? item.widthPx : item.widthPx - 8}
                  align="center" listening={false}
                />
              </Group>
            ))}
            <Transformer ref={transformerRef} enabledAnchors={[]} borderStroke="#0A0A0A"
              borderStrokeWidth={1.5} borderDash={[4, 3]} rotateEnabled={false} resizeEnabled={false} />
          </Layer>
        </Stage>
      </div>
      <div style={styles.canvasFooter}>
        <span style={styles.canvasFooterItem}>Toucher pour selectionner</span>
        <span style={styles.canvasFooterItem}>Glisser le fond pour naviguer</span>
        <span style={styles.canvasFooterItem}>{items.length} meuble{items.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Accueil
          </button>
          <div style={styles.brand}>
            <span style={styles.brandName}>HOME CONCEPT</span>
            <span style={styles.brandSub}>Plan de pièce 2D</span>
          </div>
          <div style={{ width: 100 }} />
        </div>
      </header>

      <div style={styles.layout}>
        {/* Canvas toujours en premier */}
        {canvasBlock}

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sideSection}>
            <p style={styles.sideLabel}>Dimensions de la pièce</p>
            <div style={styles.dimRow}>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Longueur (m)</label>
                <input
                  type="text" inputMode="decimal"
                  value={roomWInput}
                  onChange={e => {
                    setRoomWInput(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (v >= 1 && v <= 30) setRoomW(v)
                  }}
                  style={styles.input}
                />
              </div>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Largeur (m)</label>
                <input
                  type="text" inputMode="decimal"
                  value={roomDInput}
                  onChange={e => {
                    setRoomDInput(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (v >= 1 && v <= 30) setRoomD(v)
                  }}
                  style={styles.input}
                />
              </div>
            </div>
            <p style={styles.dimSurface}>Surface : <strong>{(roomW * roomD).toFixed(1)} m²</strong></p>
          </div>

          {selectedItem && (
            <div style={styles.sideSection}>
              <p style={styles.sideLabel}>Meuble sélectionné</p>
              <div style={styles.selectedInfo}>
                <span style={{ ...styles.colorDot, backgroundColor: selectedItem.color, width: 14, height: 14 }} />
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

          <div style={styles.tip}>
            <Info size={14} color="#8B7355" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={styles.tipText}>
              Touchez un meuble pour le sélectionner. Glissez-le pour le déplacer. Utilisez <strong>+/−</strong> pour zoomer.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#FAFAF8', fontFamily: 'var(--font-sans)' },
  header: { borderBottom: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: '1280px', margin: '0 auto', padding: '0 16px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6B7280', padding: '8px 0', width: 100, minHeight: 44 },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brandName: { fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: '700', letterSpacing: '0.1em', color: '#0A0A0A' },
  brandSub: { fontSize: '10px', color: '#8B7355', letterSpacing: '0.15em', textTransform: 'uppercase' },

  layout: {
    maxWidth: '1280px', margin: '0 auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // Canvas pleine largeur
  canvasWrap: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' },
  canvasCard: { borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E5E3', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative' },

  zoomBar: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '2px',
    backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
    borderRadius: '10px', padding: '4px', border: '1px solid #E5E5E3',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  zoomBtn: { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '7px', color: '#374151' },
  zoomLevel: { fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: 36, textAlign: 'center' },
  zoomDivider: { width: 1, height: 20, backgroundColor: '#E5E5E3', margin: '0 2px' },

  canvasFooter: { display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' },
  canvasFooterItem: { fontSize: '12px', color: '#9CA3AF' },

  // Sidebar pleine largeur sur mobile
  sidebar: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' },
  sideSection: { backgroundColor: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sideLabel: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 },
  dimRow: { display: 'flex', gap: '12px' },
  dimField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  dimLabel: { fontSize: '14px', color: '#374151', fontWeight: '500' },
  input: { padding: '12px', border: '1.5px solid #E5E5E3', borderRadius: '8px', fontSize: '16px', fontFamily: 'var(--font-sans)', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: 48 },
  dimSurface: { fontSize: '14px', color: '#6B7280', margin: 0 },

  selectedInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  selectedName: { fontSize: '14px', fontWeight: '600', color: '#0A0A0A', margin: 0 },
  selectedDims: { fontSize: '12px', color: '#9CA3AF', margin: 0 },
  actionRow: { display: 'flex', gap: '10px' },
  actionBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 8px', borderRadius: '8px', border: '1.5px solid #E5E5E3', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#0A0A0A', minHeight: 48 },
  actionBtnDanger: { color: '#DC2626', borderColor: '#FEE2E2' },

  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', backgroundColor: '#0A0A0A', color: '#FAFAF8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '500', width: '100%', minHeight: 52 },
  catalogList: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' },
  catalogItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '8px', border: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', cursor: 'pointer', width: '100%', minHeight: 56 },
  catalogName: { fontSize: '14px', fontWeight: '500', color: '#0A0A0A', margin: 0 },
  catalogDims: { fontSize: '12px', color: '#9CA3AF', margin: 0 },

  colorDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  legend: { display: 'flex', flexDirection: 'column', gap: '10px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  legendLabel: { fontSize: '14px', color: '#6B7280' },

  tip: { display: 'flex', gap: '10px', padding: '14px', backgroundColor: 'rgba(139,115,85,0.06)', borderRadius: '10px', border: '1px solid rgba(139,115,85,0.12)' },
  tipText: { fontSize: '13px', color: '#8B7355', lineHeight: '1.6', margin: 0 },
}
