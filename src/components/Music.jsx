import React, { useRef } from 'react'
import { useContent } from '../content.jsx'
import { usePlayer, fmt } from '../player.jsx'
import Art from './Art.jsx'

function Tilt({ children, className = '', ...rest }) {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`
  }
  const leave = () => { ref.current.style.transform = '' }
  return <div ref={ref} className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave} {...rest}>{children}</div>
}

export default function Music({ id }) {
  const { content } = useContent()
  const m = content.music
  const pl = usePlayer()
  const k = pl.total ? pl.time / pl.total : 0
  return (
    <section id={id} className="music section">
      <div className="wrap">
        <span className="eyebrow" data-reveal>{m.eyebrow}</span>
        <div className="music-top">
          <div className="music-title" data-reveal>
            <h2 className="display"><span>{m.titleSolid}</span><span className="outline">{m.titleOutline}</span></h2>
            <p className="lead">{m.description}</p>
            <ul className="pill-links">
              {m.links.map((l, i) => <li key={i}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
          </div>
          <div className={`record ${pl.playing ? 'is-playing' : ''}`} data-reveal>
            <div className="record-vinyl" aria-hidden><span className="record-label"><Art src={m.cover.image} /></span></div>
            <Tilt className="record-sleeve" data-cursor={pl.playing ? 'Pause' : 'Play'} onClick={pl.toggle}>
              <Art src={m.cover.image} alt={`${m.cover.title} cover`} />
              <span className="sleeve-artist">{m.cover.artist}</span>
              <span className="sleeve-title">{m.cover.title}</span>
            </Tilt>
          </div>
        </div>

        <div className="music-player-row">
          <div className="player glass" data-reveal>
            <div className="player-head">
              <Art src={m.cover.image} className="player-thumb" />
              <div>
                <span className="fine upper">{pl.playing ? 'Now playing' : 'Ready to play'}</span>
                <strong className="player-title">{pl.track.title}</strong>
                <span className="fine">{m.cover.artist} · {m.cover.title}</span>
              </div>
            </div>
            <div className="player-bar" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); pl.seek((e.clientX - r.left) / r.width) }}>
              <span style={{ transform: `scaleX(${k})` }} />
            </div>
            <div className="player-times fine"><span>{fmt(pl.time)}</span><span>{pl.track.duration}</span></div>
            <div className="player-controls">
              <button onClick={pl.prev} aria-label="Previous">⏮</button>
              <button className={`play-btn play-btn--sm ${pl.playing ? 'is-playing' : ''}`} onClick={pl.toggle} aria-label={pl.playing ? 'Pause' : 'Play'}><span className="play-icon" /></button>
              <button onClick={pl.next} aria-label="Next">⏭</button>
            </div>
            <div className={`viz ${pl.playing ? 'is-playing' : ''}`} aria-hidden>
              {Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ '--h': `${20 + ((i * 37) % 70)}%`, '--d': `${(i % 7) * -0.13}s` }} />)}
            </div>
          </div>
          <ol className="tracklist" data-reveal>
            {pl.tracks.map((t, i) => (
              <li key={i} className={i === pl.index ? 'is-current' : ''}>
                <button onClick={() => pl.playTrack(i)}>
                  <span className="tl-num">{i === pl.index && pl.playing ? <span className="mini-eq"><i /><i /><i /></span> : String(i + 1).padStart(2, '0')}</span>
                  <span className="tl-title">{t.title}</span>
                  <span className="tl-dur">{t.duration}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {m.releases?.length > 0 && (
          <div className="releases">
            <h3 className="eyebrow" data-reveal>{m.releasesTitle}</h3>
            <div className="releases-grid">
              {m.releases.map((r, i) => (
                <a key={i} href={r.href} className="release" data-reveal style={{ '--d': `${i * 0.1}s` }} data-cursor="Listen">
                  <Tilt className="release-art"><Art src={r.image} alt={r.title} /></Tilt>
                  <strong>{r.title}</strong>
                  <span className="fine">{r.meta}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
