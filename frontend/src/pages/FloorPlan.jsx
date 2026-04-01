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
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [products, setProducts] = useState([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 600, height: 500 })
  const [zoom, setZoom] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef(null)
  const transformerRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    fetch(API_BASE + '/api/products').then(r => r.json()).then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768)
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        setStageSize({ width: w, height: Math.min(w * 0.65, 520) })
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

  // PPM auto-calculé pour que la pièce rentre toujours dans le canvas
  const ppm = useMemo(() => {
    const pad = 80
    const maxW = (stageSize.width - pad) / roomW
    const maxH = (stageSize.height - pad) / roomD
    return Math.min(maxW, maxH, BASE_PPM)
  }, [stageSize, roomW, roomD])

  // Recentrer quand la pièce change
  useEffect(() => {
    setZoom(1)
    setStagePos({ x: 0, y: 0 })
  }, [roomW, roomD])

  const roomPxW = roomW * ppm
  const roomPxD = roomD * ppm
  const offsetX = Math.max(40, (stageSize.width - roomPxW) / 2)
  const offsetY = Math.max(40, (stageSize.height - roomPxD) / 2)

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(+(z * 1.3).toFixed(2), 4))
  const zoomOut = () => setZoom(z => Math.max(+(z / 1.3).toFixed(2), 0.3))
  const resetView = () => { setZoom(1); setStagePos({ x: 0, y: 0 }) }

  // Zoom à la molette
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
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    setZoom(newScale)
    setStagePos(newPos)
  }

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
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: e.target.x(), y: e.target.y() } : i))
  }

  const handleTransformEnd = (id, e) => {
    const node = e.target
    setItems(prev => prev.map(i => i.id === id ? { ...i, x: node.x(), y: node.y(), rotation: node.rotation() } : i))
  }

  const selectedItem = items.find(i => i.id === selectedId)

  // Grille
  const gridLines = []
  const gridStep = ppm / 2
  for (let x = offsetX; x <= offsetX + roomPxW + 0.5; x += gridStep) {
    gridLines.push(<Line key={`gx-${x}`} points={[x, offsetY, x, offsetY + roomPxD]} stroke="#E5E5E3" strokeWidth={0.5} listening={false} />)
  }
  for (let y = offsetY; y <= offsetY + roomPxD + 0.5; y += gridStep) {
    gridLines.push(<Line key={`gy-${y}`} points={[offsetX, y, offsetX + roomPxW, y]} stroke="#E5E5E3" strokeWidth={0.5} listening={false} />)
  }

  return (
    <div style={styles.page}>
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
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {/* Dimensions pièce */}
          <div style={styles.sideSection}>
            <p style={styles.sideLabel}>Dimensions de la pièce</p>
            <div style={styles.dimRow}>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Longueur (m)</label>
                <input type="number" min="2" max="20" step="0.5" value={roomW}
                  onChange={e => setRoomW(parseFloat(e.target.value) || 5)} style={styles.input} />
              </div>
              <div style={styles.dimField}>
                <label style={styles.dimLabel}>Largeur (m)</label>
                <input type="number" min="2" max="20" step="0.5" value={roomD}
                  onChange={e => setRoomD(parseFloat(e.target.value) || 4)} style={styles.input} />
              </div>
            </div>
            <p style={styles.dimSurface}>Surface : <strong>{(roomW * roomD).toFixed(1)} m²</strong></p>
          </div>

          {/* Meuble sélectionné — desktop seulement */}
          {selectedItem && !isMobile && (
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
              Touchez un meuble pour le sélectionner. Glissez-le pour le déplacer. Pincez ou utilisez les boutons <strong>+/−</strong> pour zoomer.
            </p>
          </div>
        </aside>

        {/* Canvas */}
        <div style={styles.canvasWrap} ref={containerRef}>
          <div style={styles.canvasCard}>
            {/* Barre de zoom */}
            <div style={styles.zoomBar}>
              <button style={styles.zoomBtn} onClick={zoomOut} title="Dézoomer" aria-label="Dézoomer">
                <ZoomOut size={15} />
              </button>
              <span style={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
              <button style={styles.zoomBtn} onClick={zoomIn} title="Zoomer" aria-label="Zoomer">
                <ZoomIn size={15} />
              </button>
              <div style={styles.zoomDivider} />
              <button style={styles.zoomBtn} onClick={resetView} title="Vue initiale" aria-label="Réinitialiser la vue">
                <Maximize2 size={14} />
              </button>
            </div>

            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              scaleX={zoom}
              scaleY={zoom}
              x={stagePos.x}
              y={stagePos.y}
              draggable={!selectedId}
              onDragEnd={e => setStagePos({ x: e.target.x(), y: e.target.y() })}
              onWheel={handleWheel}
              style={{ display: 'block', cursor: selectedId ? 'default' : 'grab', backgroundColor: '#FAFAF8' }}
              onMouseDown={e => { if (e.target === e.target.getStage()) setSelectedId(null) }}
              onTouchStart={e => { if (e.target === e.target.getStage()) setSelectedId(null) }}
            >
              <Layer>
                {/* Fond */}
                <Rect
                  x={-stagePos.x / zoom - 10} y={-stagePos.y / zoom - 10}
                  width={stageSize.width / zoom + 20} height={stageSize.height / zoom + 20}
                  fill="#FAFAF8" listening={false}
                />

                {/* Grille */}
                {gridLines}

                {/* Pièce */}
                <Rect x={offsetX} y={offsetY} width={roomPxW} height={roomPxD}
                  fill="#FFFFFF" stroke="#0A0A0A" strokeWidth={2} cornerRadius={2} listening={false} />

                {/* Labels dimensions */}
                <Text x={offsetX} y={offsetY - 20} text={`${roomW} m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" listening={false} />
                <Text x={offsetX + roomPxW + 8} y={offsetY + roomPxD / 2 - 6} text={`${roomD} m`} fontSize={12} fill="#6B7280" fontFamily="DM Sans, sans-serif" listening={false} />

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
                    <Text
                      text={`${item.lengthCm}×${item.depthCm}`}
                      fontSize={10} fill="rgba(255,255,255,0.9)" fontFamily="DM Sans, sans-serif"
                      x={item.shape === 'circle' ? -item.widthPx / 2 : 4}
                      y={item.shape === 'circle' ? -6 : item.heightPx / 2 - 7}
                      width={item.shape === 'circle' ? item.widthPx : item.widthPx - 8}
                      align="center"
                      listening={false}
                    />
                  </Group>
                ))}

                <Transformer
                  ref={transformerRef}
                  enabledAnchors={[]}
                  borderStroke="#0A0A0A"
                  borderStrokeWidth={1.5}
                  borderDash={[4, 3]}
                  rotateEnabled={false}
                  resizeEnabled={false}
                />
              </Layer>
            </Stage>
          </div>

          {/* Footer canvas */}
          <div style={styles.canvasFooter}>
            <span style={styles.canvasFooterItem}>👆 Toucher pour sélectionner</span>
            <span style={styles.canvasFooterItem}>✋ Glisser le fond pour naviguer</span>
            <span style={styles.canvasFooterItem}>{items.length} meuble{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Toolbar flottant mobile — visible quand meuble sélectionné */}
      {selectedItem && isMobile && (
        <div style={styles.mobileToolbar}>
          <div style={styles.mobileToolbarContent}>
            <div style={styles.mobileToolbarInfo}>
              <span style={{ ...styles.colorDot, backgroundColor: selectedItem.color, width: 14, height: 14 }} />
              <div>
                <p style={styles.mobileToolbarName}>{selectedItem.name}</p>
                <p style={styles.mobileToolbarDims}>{selectedItem.lengthCm} × {selectedItem.depthCm} cm</p>
              </div>
            </div>
            <div style={styles.mobileToolbarActions}>
              <button style={styles.mobileActionBtn} onClick={rotateSelected}>
                <RotateCw size={20} />
                <span style={styles.mobileActionLabel}>Pivoter 90°</span>
              </button>
              <button style={{ ...styles.mobileActionBtn, ...styles.mobileActionBtnDanger }} onClick={deleteSelected}>
                <Trash2 size={20} />
                <span style={styles.mobileActionLabel}>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#FAFAF8', fontFamily: 'var(--font-sans)' },
  header: { borderBottom: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: '1280px', margin: '0 auto', padding: '0 16px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6B7280', padding: '8px 0', width: 100, minHeight: 44 },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brandName: { fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: '700', letterSpacing: '0.1em', color: '#0A0A0A' },
  brandSub: { fontSize: '10px', color: '#8B7355', letterSpacing: '0.15em', textTransform: 'uppercase' },

  layout: { maxWidth: '1280px', margin: '0 auto', padding: 'clamp(12px, 3vw, 24px)', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },

  sidebar: { width: '100%', maxWidth: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  sideSection: { backgroundColor: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sideLabel: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 },
  dimRow: { display: 'flex', gap: '8px' },
  dimField: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  dimLabel: { fontSize: '12px', color: '#6B7280' },
  input: { padding: '10px', border: '1.5px solid #E5E5E3', borderRadius: '8px', fontSize: '15px', fontFamily: 'var(--font-sans)', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: 44 },
  dimSurface: { fontSize: '13px', color: '#6B7280', margin: 0 },
  selectedInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  selectedName: { fontSize: '13px', fontWeight: '600', color: '#0A0A0A', margin: 0 },
  selectedDims: { fontSize: '12px', color: '#9CA3AF', margin: 0 },
  actionRow: { display: 'flex', gap: '8px' },
  actionBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 8px', borderRadius: '8px', border: '1.5px solid #E5E5E3', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0A0A0A', minHeight: 44 },
  actionBtnDanger: { color: '#DC2626', borderColor: '#FEE2E2' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', backgroundColor: '#0A0A0A', color: '#FAFAF8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', width: '100%', minHeight: 44 },
  catalogList: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' },
  catalogItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: '1px solid #E5E5E3', backgroundColor: '#FAFAF8', cursor: 'pointer', width: '100%', minHeight: 52 },
  catalogName: { fontSize: '13px', fontWeight: '500', color: '#0A0A0A', margin: 0 },
  catalogDims: { fontSize: '11px', color: '#9CA3AF', margin: 0 },
  colorDot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  legend: { display: 'flex', flexDirection: 'column', gap: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  legendLabel: { fontSize: '12px', color: '#6B7280' },
  tip: { display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'rgba(139,115,85,0.06)', borderRadius: '10px', border: '1px solid rgba(139,115,85,0.12)' },
  tipText: { fontSize: '12px', color: '#8B7355', lineHeight: '1.6', margin: 0 },

  canvasWrap: { flex: 1, minWidth: 'min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '10px' },
  canvasCard: { borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E5E3', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative' },

  // Barre de zoom
  zoomBar: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
    borderRadius: '10px', padding: '4px', border: '1px solid #E5E5E3',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  zoomBtn: {
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '7px',
    color: '#374151', transition: 'background 150ms',
  },
  zoomLevel: { fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: 36, textAlign: 'center' },
  zoomDivider: { width: 1, height: 20, backgroundColor: '#E5E5E3', margin: '0 2px' },

  canvasFooter: { display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' },
  canvasFooterItem: { fontSize: '12px', color: '#9CA3AF' },

  // Toolbar mobile flottant
  mobileToolbar: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E5E3',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  mobileToolbarContent: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', gap: '12px',
  },
  mobileToolbarInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  mobileToolbarName: { fontSize: '14px', fontWeight: '600', color: '#0A0A0A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  mobileToolbarDims: { fontSize: '12px', color: '#9CA3AF', margin: 0 },
  mobileToolbarActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  mobileActionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #E5E5E3',
    backgroundColor: '#FAFAF8', cursor: 'pointer', color: '#0A0A0A', minWidth: 72, minHeight: 60,
    justifyContent: 'center',
  },
  mobileActionBtnDanger: { color: '#DC2626', borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  mobileActionLabel: { fontSize: '11px', fontWeight: '500' },
}
