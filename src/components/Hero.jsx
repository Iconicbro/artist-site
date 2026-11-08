import React, { useRef } from 'react'
import { useContent } from '../content.jsx'
import { usePlayer } from '../player.jsx'
import { useScrollProgress } from '../hooks.js'
import { Rich } from '../rich.jsx'
import Art from './Art.jsx'

const Letters = ({ word, delay = 0 }) => (
  <span className="hero-word" aria-hidden="true">
    {[...word].map((ch, i) => (
      <span key={i} className="hero-letter" style={{ '--d': `${delay + i * 0.07}s` }}>{ch === ' ' ? ' ' : ch}</span>
    ))}
  </span>
)

export default function Hero({ id }) {
  const { content } = useContent()
  const h = content.hero
  const { playing, toggle } = usePlayer()
  const ref = useRef(null)
  const p = useScrollProgress(ref, { start: 0, end: 0 })
  const glow = useRef(null)
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    glow.current?.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    glow.current?.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  return (
    <section id={id} ref={ref} className="hero" onPointerMove={onMove}>
      <div ref={glow} className="hero-glow" />
      <div className="hero-fog"><span /><span /><span /></div>
      <h1 className="sr-only">{h.firstWord} {h.secondWord}</h1>

      <div className="hero-stage" style={{ '--p': p }}>
        <div className="hero-line hero-line--1"><Letters word={h.firstWord} delay={0.15} /></div>
        <div className="hero-arch" data-cursor={h.playLabel ? 'Play' : ''} onClick={toggle}>
          <Art src={h.image} alt="" />
          <span className={`hero-arch-eq ${playing ? 'is-playing' : ''}`} aria-hidden><i /><i /><i /><i /><i /></span>
        </div>
        <p className="hero-tagline"><Rich text={h.tagline} /></p>
        <div className="hero-line hero-line--2"><Letters word={h.secondWord} delay={0.4} /></div>
      </div>

      <div className="hero-bottom">
        <div className="hero-meta">
          <span className="eyebrow">{h.eyebrow}</span>
          <span className="hero-note"><Rich text={h.albumNote} /></span>
        </div>
        <a href="#story" className="hero-scroll" aria-label="Scroll to story"><span>Scroll</span><i /></a>
        <div className="hero-actions">
          <button className={`play-btn ${playing ? 'is-playing' : ''}`} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            <span className="play-icon" />
          </button>
          <span className="hero-play-label">{h.playLabel}</span>
          {h.primaryCta?.label && <a className="btn btn--accent" href={h.primaryCta.href}>{h.primaryCta.label} <i aria-hidden>↗</i></a>}
        </div>
      </div>
    </section>
  )
}
