import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useContent } from './content.jsx'

// Shared player. Tracks with a "src" play real audio; tracks without one simulate playback
// so the concept still feels alive before final masters are supplied.
const Ctx = createContext(null)
const toSec = (d = '0:00') => { const [m, s] = String(d).split(':').map(Number); return (m || 0) * 60 + (s || 0) }

export function PlayerProvider({ children }) {
  const { content } = useContent()
  const tracks = content.music?.tracks || []
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const audio = useRef(null)
  const track = tracks[index] || { title: '', duration: '0:00' }
  const total = toSec(track.duration)

  useEffect(() => { setTime(0) }, [index])

  useEffect(() => {
    if (!audio.current) audio.current = new Audio()
    const a = audio.current
    if (track.src) {
      if (a.src !== new URL(track.src, location.href).href) a.src = track.src
      const onT = () => setTime(a.currentTime)
      const onEnd = () => next()
      a.addEventListener('timeupdate', onT); a.addEventListener('ended', onEnd)
      playing ? a.play().catch(() => setPlaying(false)) : a.pause()
      return () => { a.removeEventListener('timeupdate', onT); a.removeEventListener('ended', onEnd) }
    }
    a.pause()
    if (!playing) return
    const id = setInterval(() => setTime((t) => { if (t + 0.25 >= total) { next(); return 0 } return t + 0.25 }), 250)
    return () => clearInterval(id)
  }, [playing, index, track.src, total])

  const next = () => setIndex((i) => (i + 1) % Math.max(1, tracks.length))
  const prev = () => setIndex((i) => (i - 1 + tracks.length) % Math.max(1, tracks.length))
  const playTrack = (i) => { if (i === index) setPlaying((p) => !p); else { setIndex(i); setPlaying(true) } }
  const seek = (k) => { const t = k * total; setTime(t); if (track.src && audio.current) audio.current.currentTime = t }

  return (
    <Ctx.Provider value={{ tracks, index, track, playing, time, total, toggle: () => setPlaying((p) => !p), next, prev, playTrack, seek, setPlaying }}>
      {children}
    </Ctx.Provider>
  )
}
export const usePlayer = () => useContext(Ctx)
export const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
