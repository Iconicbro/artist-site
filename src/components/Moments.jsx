import React, { useState } from 'react'
import { useContent } from '../content.jsx'
import Art from './Art.jsx'

export default function Moments({ id }) {
  const { content } = useContent()
  const m = content.moments
  const [active, setActive] = useState(m.items.length - 1)
  return (
    <section id={id} className="moments section">
      <div className="wrap">
        <span className="eyebrow" data-reveal>{m.eyebrow}</span>
        <h2 className="display section-title" data-reveal>{m.title} <em className="accent-em serif">{m.titleItalic}</em></h2>
      </div>
      <div className="wrap accordion" data-reveal>
        {m.items.map((it, i) => (
          <button
            key={i}
            className={`acc-item ${i === active ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            data-cursor={i === active ? '' : 'Open'}
            aria-expanded={i === active}
          >
            <Art src={it.image} alt={it.caption} />
            <span className="acc-shade" />
            <span className="acc-vert">{it.caption} · {it.place}<em>{it.year}</em></span>
            <span className="acc-cap"><strong>{it.caption} · {it.place}</strong><em>{it.year}</em></span>
          </button>
        ))}
      </div>
    </section>
  )
}
