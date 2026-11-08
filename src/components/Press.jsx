import React from 'react'
import { useContent } from '../content.jsx'

const Row = ({ quotes, reverse }) => (
  <div className={`marquee marquee--cards ${reverse ? 'marquee--rev' : ''}`}>
    <div className="marquee-track">
      {[...quotes, ...quotes].map((q, i) => (
        <figure key={i} className="quote-card" aria-hidden={i >= quotes.length}>
          <blockquote>“{q.text}”</blockquote>
          <figcaption>{q.source}</figcaption>
        </figure>
      ))}
    </div>
  </div>
)

export default function Press({ id }) {
  const { content } = useContent()
  const p = content.press
  const half = Math.ceil(p.quotes.length / 2)
  const a = p.quotes.slice(0, half), b = p.quotes.slice(half).length ? p.quotes.slice(half) : a
  return (
    <section id={id} className="press section">
      <div className="wrap">
        <span className="eyebrow" data-reveal>{p.eyebrow}</span>
        <h2 className="display section-title" data-reveal>{p.title} <em className="accent-em serif">{p.titleItalic}</em></h2>
        {p.note && <p className="fine" data-reveal>{p.note}</p>}
      </div>
      <Row quotes={[...a, ...a]} />
      <Row quotes={[...b, ...b]} reverse />
    </section>
  )
}
