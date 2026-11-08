import React, { useRef } from 'react'
import { useContent } from '../content.jsx'
import { useScrollProgress, useInView, useCountUp } from '../hooks.js'
import { Rich, richWords } from '../rich.jsx'
import Art from './Art.jsx'

function Stat({ value, suffix, label, run, i }) {
  const v = useCountUp(Number(value) || 0, run, 1400 + i * 200)
  return (
    <div className="stat">
      <span className="stat-num">{v}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Story({ id }) {
  const { content } = useContent()
  const s = content.story
  const quoteRef = useRef(null)
  const imgRef = useRef(null)
  const p = useScrollProgress(quoteRef, { start: 0.9, end: 0.35 })
  const ip = useScrollProgress(imgRef, { start: 1, end: 0 })
  const [statsRef, statsIn] = useInView({ threshold: 0.4 })
  const words = richWords(s.quote)
  return (
    <section id={id} className="story section">
      <div className="wrap story-grid">
        <figure className="story-figure" ref={imgRef} data-cursor="View" data-reveal>
          <div className="story-img" style={{ transform: `translateY(${(ip - 0.5) * -60}px) scale(1.12)` }}>
            <Art src={s.image} alt={s.imageCaption} />
          </div>
          {s.imageCaption && <figcaption>{s.imageCaption}</figcaption>}
        </figure>
        <div className="story-copy">
          <span className="eyebrow" data-reveal>{s.eyebrow}</span>
          <p className="story-quote" ref={quoteRef}>
            {words.map((w, i) => {
              const k = Math.max(0, Math.min(1, p * words.length * 1.15 - i))
              return <span key={i} className={w.em ? 'accent-em' : ''} style={{ opacity: 0.16 + k * 0.84 }}>{w.w}</span>
            })}
          </p>
          <div className="stats" ref={statsRef}>
            {s.stats.map((st, i) => <Stat key={i} {...st} run={statsIn} i={i} />)}
          </div>
          {s.statsNote && <p className="fine">{s.statsNote}</p>}
        </div>
      </div>
      <ol className="wrap timeline">
        {s.timeline.map((t, i) => (
          <li key={i} data-reveal style={{ '--d': `${i * 0.08}s` }}>
            <span className="timeline-year">{t.year}</span>
            <span className="timeline-line" />
            <p><Rich text={t.text} /></p>
          </li>
        ))}
      </ol>
    </section>
  )
}
