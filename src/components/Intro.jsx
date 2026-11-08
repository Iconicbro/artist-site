import React, { useEffect, useState } from 'react'
import { Rich } from '../rich.jsx'

export default function Intro({ line, onDone }) {
  const [n, setN] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    let raf, t0
    const step = (t) => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / 1800)
      setN(Math.round(100 * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
      else { setOut(true); setTimeout(onDone, 900) }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className={`intro ${out ? 'intro--out' : ''}`} aria-hidden="true">
      <p className="intro-line"><Rich text={line} /></p>
      <span className="intro-count">{String(n).padStart(2, '0')}</span>
      <span className="intro-bar" style={{ transform: `scaleX(${n / 100})` }} />
    </div>
  )
}
