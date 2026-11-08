import React, { useRef } from 'react'
import { useContent } from '../content.jsx'
import { useScrollProgress } from '../hooks.js'

export default function Footer({ sections }) {
  const { content } = useContent()
  const f = content.footer
  const ref = useRef(null)
  const p = useScrollProgress(ref, { start: 1, end: 1 })
  return (
    <footer className="footer" ref={ref}>
      <div className="footer-name" aria-hidden style={{ '--p': p }}>
        {[...f.bigName].map((ch, i) => <span key={i} style={{ '--i': i }}>{ch === ' ' ? ' ' : ch}</span>)}
      </div>
      <div className="wrap footer-row">
        <a href="#hero" className="to-top" aria-label="Back to top" data-cursor="Top">↑</a>
        <nav className="footer-nav">{sections.filter((s) => s.id !== 'hero').map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}</nav>
        <nav className="footer-social">{f.socials.map((s, i) => <a key={i} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>)}</nav>
      </div>
      <p className="wrap fine footer-legal">{f.legal}</p>
    </footer>
  )
}
