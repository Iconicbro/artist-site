import React, { useEffect, useState } from 'react'
import { useContent } from '../content.jsx'

export default function Nav({ sections }) {
  const { content } = useContent()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 40)
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  const links = sections.filter((s) => s.id !== 'hero')
  const cta = content.brand?.navCta
  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <a href="#hero" className="nav-logo">{content.brand?.logoText}</a>
      <nav className="nav-links" aria-label="Sections">
        {links.map((s) => <a key={s.id} href={`#${s.id}`} onClick={() => setOpen(false)}><span>{s.label}</span><span aria-hidden>{s.label}</span></a>)}
      </nav>
      {cta?.label && <a href={cta.href} className="btn btn--accent nav-cta">{cta.label} <i aria-hidden>↗</i></a>}
      <button className="nav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><span /><span /></button>
    </header>
  )
}
