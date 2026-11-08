import { useEffect, useRef, useState } from 'react'

// Progress (0→1) of an element travelling through the viewport.
export function useScrollProgress(ref, { start = 1, end = 0 } = {}) {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      const from = vh * start, to = vh * end - r.height
      const v = (from - r.top) / (from - to)
      setP(Math.max(0, Math.min(1, v)))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [ref, start, end])
  return p
}

export function useInView(opts = { threshold: 0.3 }) {
  const ref = useRef(null)
  const [inView, set] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); io.disconnect() } }, opts)
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}

export function useCountUp(target, run, ms = 1600) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf, t0
    const step = (t) => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - k, 4))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return v
}

// Adds .is-in to any [data-reveal] element as it scrolls into view.
export function useRevealAll(dep) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) } }),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
