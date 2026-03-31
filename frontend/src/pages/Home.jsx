import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, LayoutGrid, ArrowRight, Sofa, Ruler } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <span style={styles.brandName}>HOME CONCEPT</span>
            <span style={styles.brandSub}>Visualiseur d'intérieur</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.hero}>
          <p style={styles.heroEyebrow}>Bienvenue</p>
          <h1 style={styles.heroTitle}>Imaginez votre intérieur<br />avant d'acheter</h1>
          <p style={styles.heroSubtitle}>
            Deux outils pour visualiser vos meubles Home Concept dans votre espace réel.
          </p>
        </div>

        <div style={styles.cards}>

          {/* Card 1 — Visualiseur IA — fond noir */}
          <button style={styles.cardDark} onClick={() => navigate('/visualiser')}>
            <div style={styles.iconWrapDark}>
              <Sparkles size={26} color="#D4C5B0" />
            </div>
            <span style={styles.badgeDark}>Photoréaliste</span>
            <h2 style={styles.cardTitle}>Visualiseur IA</h2>
            <p style={styles.descDark}>
              Uploadez une photo de votre pièce vide. L'IA place vos meubles et génère un rendu photoréaliste en quelques secondes.
            </p>
            <ul style={styles.featureList}>
              <li style={styles.featureDark}><span style={styles.dotDark} />Photo de votre vraie pièce</li>
              <li style={styles.featureDark}><span style={styles.dotDark} />Rendu ultra-réaliste</li>
              <li style={styles.featureDark}><span style={styles.dotDark} />Meubles à l'échelle exacte</li>
            </ul>
            <div style={styles.idealDark}>
              <Sofa size={13} />
              Idéal pour voir le rendu final avant achat
            </div>
            <div style={styles.ctaDark}>
              Commencer <ArrowRight size={15} />
            </div>
          </button>

          {/* Card 2 — Plan 2D — fond blanc */}
          <button style={styles.cardLight} onClick={() => navigate('/plan')}>
            <div style={styles.iconWrapLight}>
              <LayoutGrid size={26} color="#8B7355" />
            </div>
            <span style={styles.badgeLight}>Interactif</span>
            <h2 style={{ ...styles.cardTitle, color: '#0A0A0A' }}>Plan de pièce 2D</h2>
            <p style={styles.descLight}>
              Dessinez votre pièce à l'échelle, placez les meubles en blocs et vérifiez instantanément si tout rentre.
            </p>
            <ul style={styles.featureList}>
              <li style={styles.featureLight}><span style={styles.dotLight} />Drag & drop en temps réel</li>
              <li style={styles.featureLight}><span style={styles.dotLight} />Rotation libre des meubles</li>
              <li style={styles.featureLight}><span style={styles.dotLight} />Vérification des espaces</li>
            </ul>
            <div style={styles.idealLight}>
              <Ruler size={13} />
              Idéal pour tester l'agencement avant de meubler
            </div>
            <div style={styles.ctaLight}>
              Commencer <ArrowRight size={15} />
            </div>
          </button>

        </div>

        <p style={styles.footerNote}>
          Vous ne savez pas par où commencer ?{' '}
          <strong style={{ color: '#0A0A0A' }}>Commencez par le Plan 2D</strong> pour vérifier les dimensions,
          puis utilisez le <strong style={{ color: '#0A0A0A' }}>Visualiseur IA</strong> pour le rendu final.
        </p>
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FAFAF8',
    fontFamily: 'var(--font-sans)',
  },
  header: {
    borderBottom: '1px solid #E5E5E3',
    backgroundColor: '#FAFAF8',
  },
  headerInner: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brandName: {
    fontFamily: 'var(--font-serif)',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#0A0A0A',
  },
  brandSub: {
    fontSize: '10px',
    color: '#8B7355',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  main: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: 'clamp(32px, 6vw, 64px) 20px clamp(48px, 8vw, 80px)',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 'clamp(36px, 5vw, 56px)',
  },
  heroEyebrow: {
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: '14px',
  },
  heroTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(28px, 5vw, 50px)',
    fontWeight: '600',
    color: '#0A0A0A',
    lineHeight: '1.15',
    marginBottom: '16px',
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 2vw, 17px)',
    color: '#6B7280',
    lineHeight: '1.65',
    maxWidth: '480px',
    margin: '0 auto',
  },

  /* Cards grid */
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '36px',
  },

  /* ---- CARTE SOMBRE (Visualiseur IA) ---- */
  cardDark: {
    backgroundColor: '#0A0A0A',
    border: 'none',
    borderRadius: '20px',
    padding: 'clamp(24px, 4vw, 36px) clamp(20px, 4vw, 32px)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    transition: 'transform 150ms ease',
  },
  iconWrapDark: {
    width: '48px', height: '48px', borderRadius: '12px',
    backgroundColor: 'rgba(212,197,176,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badgeDark: {
    display: 'inline-block', fontSize: '10px', fontWeight: '700',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: '#D4C5B0', backgroundColor: 'rgba(212,197,176,0.1)',
    padding: '3px 10px', borderRadius: '20px', width: 'fit-content',
  },
  cardTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(22px, 3vw, 26px)',
    fontWeight: '600',
    lineHeight: '1.2',
    color: '#FAFAF8',
    margin: 0,
  },
  descDark: {
    fontSize: '14px', lineHeight: '1.65',
    color: 'rgba(250,250,248,0.65)', margin: 0,
  },
  featureList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  featureDark: {
    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
    color: 'rgba(250,250,248,0.8)',
  },
  dotDark: {
    width: '5px', height: '5px', borderRadius: '50%',
    backgroundColor: '#8B7355', flexShrink: 0,
  },
  idealDark: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '12px', color: 'rgba(250,250,248,0.4)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: '14px', marginTop: '2px',
  },
  ctaDark: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: '600', color: '#FAFAF8',
  },

  /* ---- CARTE CLAIRE (Plan 2D) ---- */
  cardLight: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E5E5E3',
    borderRadius: '20px',
    padding: 'clamp(24px, 4vw, 36px) clamp(20px, 4vw, 32px)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    transition: 'transform 150ms ease',
  },
  iconWrapLight: {
    width: '48px', height: '48px', borderRadius: '12px',
    backgroundColor: 'rgba(139,115,85,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badgeLight: {
    display: 'inline-block', fontSize: '10px', fontWeight: '700',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: '#8B7355', backgroundColor: 'rgba(139,115,85,0.08)',
    padding: '3px 10px', borderRadius: '20px', width: 'fit-content',
  },
  descLight: {
    fontSize: '14px', lineHeight: '1.65',
    color: '#6B7280', margin: 0,
  },
  featureLight: {
    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
    color: '#374151',
  },
  dotLight: {
    width: '5px', height: '5px', borderRadius: '50%',
    backgroundColor: '#8B7355', flexShrink: 0,
  },
  idealLight: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '12px', color: '#9CA3AF',
    borderTop: '1px solid #F0F0EE',
    paddingTop: '14px', marginTop: '2px',
  },
  ctaLight: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: '600', color: '#0A0A0A',
  },

  footerNote: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#9CA3AF',
    lineHeight: '1.7',
  },
}
