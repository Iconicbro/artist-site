import React, { useEffect, useRef, useState } from 'react'

// Soft follower cursor. Any element with data-cursor="Label" grows it into a labelled disc.
export default function Cursor() {
  const dot = useRef(null), ring = useRef(null)
  const [label, setLabel] = useState('')
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return
    setOn(true)
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf
    const move = (e) => {
      x = e.clientX; y = e.clientY
      const t = e.target.closest?.('[data-cursor]')
      setLabel(t ? t.getAttribute('data-cursor') : '')
      ring.current?.classList.toggle('cursor-ring--link', !!e.target.closest?.('a,button,input,textarea,select,label') && !t)
    }
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px)`
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move)
    raf = requestAnimationFrame(loop)
    document.documentElement.classList.add('has-cursor')
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); document.documentElement.classList.remove('has-cursor') }
  }, [])
  if (!on) return null
  return (
    <>
      <div ref={ring} className={`cursor-ring ${label ? 'cursor-ring--label' : ''}`}><span>{label}</span></div>
      <div ref={dot} className="cursor-dot" />
    </>
  )
}
