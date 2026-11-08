import React, { useEffect, useState } from 'react'

export default function SideIndex({ sections }) {
  const [active, setActive] = useState(sections[0]?.id)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    sections.forEach((s) => { const el = document.getElementById(s.id); el && io.observe(el) })
    return () => io.disconnect()
  }, [sections.map((s) => s.id).join()])
  return (
    <ol className="side-index" aria-label="Page progress">
      {sections.map((s, i) => (
        <li key={s.id} className={active === s.id ? 'is-active' : ''}>
          <a href={`#${s.id}`} aria-label={s.label}><span className="side-num">{String(i + 1).padStart(2, '0')}</span><span className="side-tick" /><span className="side-label">{s.label}</span></a>
        </li>
      ))}
    </ol>
  )
}
