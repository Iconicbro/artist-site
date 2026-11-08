import React, { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { useContent } from './content.jsx'
import { PlayerProvider } from './player.jsx'
import { useRevealAll, prefersReducedMotion } from './hooks.js'
import Intro from './components/Intro.jsx'
import Cursor from './components/Cursor.jsx'
import Nav from './components/Nav.jsx'
import SideIndex from './components/SideIndex.jsx'
import Hero from './components/Hero.jsx'
import Story from './components/Story.jsx'
import Music from './components/Music.jsx'
import Moments from './components/Moments.jsx'
import Tour from './components/Tour.jsx'
import Press from './components/Press.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'
import Editor from './components/Editor.jsx'

const SECTIONS = { hero: Hero, story: Story, music: Music, moments: Moments, tour: Tour, press: Press, contact: Contact }

const loaded = new Set(['Big Shoulders Display', 'Instrument Serif', 'Manrope'])
function loadFont(fam) {
  if (loaded.has(fam)) return
  loaded.add(fam)
  const f = 'family=' + encodeURIComponent(fam).replace(/%20/g, '+')
  const tries = [`${f}:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400`, `${f}:wght@400;500;600;700;800;900`, `${f}:ital@0;1`, f]
  const attempt = (i) => {
    if (i >= tries.length) return
    const href = `https://fonts.googleapis.com/css2?${tries[i]}&display=swap`
    fetch(href).then((r) => {
      if (!r.ok) return attempt(i + 1)
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l)
    }).catch(() => {})
  }
  attempt(0)
}

function useTheme(theme = {}, meta = {}) {
  useEffect(() => {
    const root = document.documentElement.style
    Object.entries(theme).forEach(([k, v]) => {
      if (k.startsWith('font')) root.setProperty(`--${k}`, `'${v}'`)
      else root.setProperty(`--${k}`, v)
    })
    // Load any Google Font the client types in, one <link> per family, trying richer weight sets first.
    ;[theme.fontDisplay, theme.fontSerif, theme.fontBody].filter(Boolean).forEach((fam) => loadFont(fam))
    if (meta.title) document.title = meta.title
    if (meta.description) document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  }, [JSON.stringify(theme), meta.title, meta.description])
}

export default function App() {
  const { content, editMode } = useContent()
  const [ready, setReady] = useState(!content.intro?.enabled || editMode)
  useTheme(content.theme, content.meta)
  useRevealAll([content, ready])

  useEffect(() => {
    if (prefersReducedMotion()) return
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    let raf
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')
      if (id.length < 2) { e.preventDefault(); return }
      const el = document.querySelector(id)
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: 0, duration: 1.4 }) }
    }
    document.addEventListener('click', onClick)
    window.__lenis = lenis
    return () => { cancelAnimationFrame(raf); lenis.destroy(); document.removeEventListener('click', onClick) }
  }, [])

  const visible = (content.sections || []).filter((s) => s.visible !== false && SECTIONS[s.id])

  return (
    <PlayerProvider>
      {!ready && <Intro line={content.intro?.line} onDone={() => setReady(true)} />}
      <Cursor />
      <Nav sections={visible} />
      <SideIndex sections={visible} />
      <main className={ready ? 'is-ready' : ''}>
        {visible.map((s, i) => {
          const C = SECTIONS[s.id]
          return <C key={s.id} id={s.id} index={i} />
        })}
      </main>
      <Footer sections={visible} />
      {editMode && <Editor />}
    </PlayerProvider>
  )
}
