import React, { useRef, useState } from 'react'
import { useContent } from '../content.jsx'
import Art from './Art.jsx'

export default function Tour({ id }) {
  const { content } = useContent()
  const t = content.tour
  const [hover, setHover] = useState(-1)
  const float = useRef(null)
  const list = useRef(null)
  const move = (e) => {
    const r = list.current.getBoundingClientRect()
    float.current?.style.setProperty('transform', `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%,-50%) rotate(${(e.clientX / innerWidth - 0.5) * 8}deg)`)
  }
  const marquee = Array.from({ length: 8 }, () => t.marquee)
  return (
    <section id={id} className="tour section">
      <div className="marquee marquee--serif" aria-hidden>
        <div className="marquee-track">{[...marquee, ...marquee].map((m, i) => <span key={i}>{m}<b>✦</b></span>)}</div>
      </div>
      <div className="wrap">
        <span className="eyebrow" data-reveal>{t.eyebrow}</span>
        <h2 className="display section-title" data-reveal>{t.title} <em className="accent-em serif">{t.titleItalic}</em></h2>
        <ul className="dates" ref={list} onPointerMove={move} onPointerLeave={() => setHover(-1)}>
          {t.dates.map((d, i) => (
            <li key={i} className={`date-row status-${d.status} ${hover === i ? 'is-hover' : ''}`} onPointerEnter={() => setHover(i)} data-reveal style={{ '--d': `${i * 0.05}s` }}>
              <span className="date-day">{d.day}<small>{d.month}</small></span>
              <span className="date-city">{d.city}</span>
              <span className="date-venue">{d.venue}</span>
              <span className="date-action">
                {d.status === 'few' && <span className="tag">{t.labels.few}</span>}
                {d.status === 'soldout'
                  ? <span className="btn btn--ghost is-disabled">{t.labels.soldout}</span>
                  : <a href={d.href} className={`btn ${d.status === 'waitlist' ? 'btn--ghost' : 'btn--accent'}`}>{d.status === 'waitlist' ? t.labels.waitlist : t.labels.tickets} <i aria-hidden>↗</i></a>}
              </span>
            </li>
          ))}
          <div ref={float} className={`date-float ${hover >= 0 ? 'is-on' : ''}`} aria-hidden>
            {t.dates.map((d, i) => <Art key={i} src={d.image} className={i === hover ? 'is-current' : ''} />)}
          </div>
        </ul>
      </div>
    </section>
  )
}
