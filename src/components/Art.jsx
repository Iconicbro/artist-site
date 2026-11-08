import React, { useId, useMemo } from 'react'

/*
  <Art src="..."/> renders either a real image (any URL / path / data URI)
  or a generated placeholder scene when src looks like "gen:<preset>:<seed>".
  Presets: tide, dusk, window, moon, neon, haze, lights, crowd, studio
*/
export const PRESETS = ['tide', 'dusk', 'window', 'moon', 'neon', 'haze', 'lights', 'crowd', 'studio']

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const W = 400, H = 500

function scene(preset, r, id) {
  const g = (n) => `${id}-${n}`
  const rand = (a, b) => a + r() * (b - a)
  const defs = []
  const els = []

  const sky = (stops) => {
    defs.push(
      <linearGradient key="sky" id={g('sky')} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
      </linearGradient>
    )
    els.push(<rect key="bg" width={W} height={H} fill={`url(#${g('sky')})`} />)
  }
  const glow = (key, cx, cy, rad, color, op = 1) => {
    defs.push(
      <radialGradient key={key} id={g(key)}>
        <stop offset="0" stopColor={color} stopOpacity={op} />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    )
    els.push(<circle key={'c' + key} cx={cx} cy={cy} r={rad} fill={`url(#${g(key)})`} />)
  }
  const fogBands = (n, color, y0, y1, op = 0.25) => {
    for (let i = 0; i < n; i++)
      els.push(
        <ellipse key={'fog' + i} className="art-drift" style={{ animationDelay: `${-rand(0, 20)}s` }}
          cx={rand(0, W)} cy={rand(y0, y1)} rx={rand(140, 260)} ry={rand(14, 40)}
          fill={color} opacity={rand(op * 0.4, op)} filter={`url(#${g('blur')})`} />
      )
  }
  defs.push(
    <filter key="blur" id={g('blur')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>,
    <filter key="soft" id={g('soft')} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
  )

  switch (preset) {
    case 'tide': {
      const hz = rand(250, 300)
      sky([[0, '#0b0b14'], [0.45, '#1d1a2a'], [0.6, '#3a2c3a'], [1, '#0a0a10']])
      glow('moon', rand(120, 290), hz - rand(70, 140), 120, '#f2c27a', 0.55)
      const mx = rand(140, 260)
      els.push(<circle key="moondisc" cx={mx} cy={hz - 95} r={rand(18, 30)} fill="#f6dcae" opacity=".9" filter={`url(#${g('soft')})`} />)
      els.push(<rect key="sea" y={hz} width={W} height={H - hz} fill="#0c0c13" />)
      for (let i = 0; i < 26; i++) {
        const y = hz + 6 + i * i * 0.35 + rand(0, 4)
        els.push(<rect key={'s' + i} x={mx - rand(10, 30 + i * 4)} y={y} width={rand(20, 60 + i * 6)} height={rand(1, 2.5)} fill="#f2c27a" opacity={rand(0.15, 0.6) * (1 - i / 30)} rx="1" />)
      }
      fogBands(6, '#b9a9b8', hz - 60, hz + 40, 0.22)
      break
    }
    case 'dusk': {
      sky([[0, '#2b1d33'], [0.45, '#b4533a'], [0.62, '#eaa04a'], [1, '#2a1a20']])
      const sx = rand(130, 270)
      glow('sun', sx, 300, 170, '#ffd38a', 0.7)
      els.push(<circle key="sun" cx={sx} cy={300} r={rand(48, 64)} fill="#ffe2b0" opacity=".95" />)
      ;[0, 1, 2].forEach((k) => {
        const base = 330 + k * 45
        let d = `M0 ${base}`
        for (let x = 0; x <= W; x += 40) d += ` Q ${x + 20} ${base - rand(10, 40)} ${x + 40} ${base - rand(-5, 15)}`
        d += ` V ${H} H 0 Z`
        els.push(<path key={'h' + k} d={d} fill={['#5a2a33', '#3a1c27', '#1b1016'][k]} />)
      })
      fogBands(4, '#ffd9a8', 280, 360, 0.25)
      break
    }
    case 'window': {
      sky([[0, '#121017'], [1, '#1e1a22']])
      const x = rand(80, 140), y = rand(70, 110), w = rand(170, 220), h = rand(240, 290)
      glow('win', x + w / 2, y + h / 2, 260, '#e9a23b', 0.35)
      defs.push(<linearGradient key="wl" id={g('wl')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6c987" /><stop offset="1" stopColor="#b5552f" /></linearGradient>)
      els.push(<rect key="w" x={x} y={y} width={w} height={h} fill={`url(#${g('wl')})`} opacity=".85" />)
      els.push(<rect key="f1" x={x + w / 2 - 3} y={y} width="6" height={h} fill="#141118" />)
      els.push(<rect key="f2" x={x} y={y + h * 0.45} width={w} height="6" fill="#141118" />)
      for (let i = 0; i < 40; i++) els.push(<rect key={'r' + i} x={x + rand(0, w)} y={y + rand(0, h)} width="1.2" height={rand(8, 22)} fill="#fff" opacity={rand(0.15, 0.45)} />)
      els.push(<path key="plant" d={`M${x + 30} ${y + h} q 10 -60 -20 -90 M${x + 30} ${y + h} q 20 -50 40 -70`} stroke="#141118" strokeWidth="5" fill="none" />)
      els.push(<rect key="sill" x={x - 20} y={y + h} width={w + 40} height="14" fill="#0d0b10" />)
      break
    }
    case 'moon': {
      sky([[0, '#1a1823'], [1, '#0d0c12']])
      const cx = rand(150, 250), cy = rand(190, 260), rr = rand(90, 120)
      glow('halo', cx, cy, rr * 2.2, '#e8d9c0', 0.25)
      defs.push(<radialGradient key="md" id={g('md')} cx="40%" cy="35%"><stop offset="0" stopColor="#f3ead9" /><stop offset="1" stopColor="#b6a58c" /></radialGradient>)
      els.push(<circle key="moon" cx={cx} cy={cy} r={rr} fill={`url(#${g('md')})`} />)
      for (let i = 0; i < 7; i++) els.push(<circle key={'cr' + i} cx={cx + rand(-rr * 0.6, rr * 0.6)} cy={cy + rand(-rr * 0.6, rr * 0.6)} r={rand(6, 22)} fill="#9c8b73" opacity={rand(0.15, 0.35)} />)
      els.push(<circle key="shade" cx={cx + rr * 0.45} cy={cy - rr * 0.1} r={rr} fill="#15131c" opacity=".55" />)
      fogBands(5, '#cfc3b3', 300, 470, 0.18)
      break
    }
    case 'neon': {
      sky([[0, '#0c0b14'], [1, '#1a0f1c']])
      const cols = ['#e9a23b', '#d1456f', '#3fb6b2', '#f06a3a', '#9a6cf0']
      for (let i = 0; i < 26; i++) {
        const c = cols[Math.floor(r() * cols.length)]
        els.push(<circle key={'b' + i} cx={rand(-20, W + 20)} cy={rand(-20, H + 20)} r={rand(14, 60)} fill={c} opacity={rand(0.15, 0.55)} filter={`url(#${g('soft')})`} />)
      }
      for (let i = 0; i < 30; i++) els.push(<rect key={'rn' + i} x={rand(0, W)} y={rand(0, H)} width="1" height={rand(10, 30)} fill="#fff" opacity={rand(0.08, 0.3)} transform={`rotate(12 ${W / 2} ${H / 2})`} />)
      break
    }
    case 'haze': {
      sky([[0, '#14121a'], [1, '#2a2430']])
      const n = Math.floor(rand(2, 4))
      for (let i = 0; i < n; i++) {
        const x = rand(40, W - 40)
        defs.push(<linearGradient key={'bm' + i} id={g('bm' + i)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3c27c" stopOpacity=".7" /><stop offset="1" stopColor="#f3c27c" stopOpacity="0" /></linearGradient>)
        els.push(<polygon key={'beam' + i} points={`${x - 6},0 ${x + 6},0 ${x + rand(60, 140)},${H} ${x - rand(60, 140)},${H}`} fill={`url(#${g('bm' + i)})`} opacity={rand(0.35, 0.7)} filter={`url(#${g('soft')})`} />)
      }
      fogBands(9, '#cbb9b4', 120, H, 0.3)
      els.push(<path key="mic" d={`M${W / 2} ${H} V ${H - 150}`} stroke="#0e0d12" strokeWidth="5" />)
      els.push(<rect key="mich" x={W / 2 - 9} y={H - 178} width="18" height="32" rx="9" fill="#0e0d12" />)
      break
    }
    case 'lights': {
      sky([[0, '#0d0c12'], [0.6, '#1c1622'], [1, '#2b1d1d']])
      const n = Math.floor(rand(4, 7))
      for (let i = 0; i < n; i++) {
        const x = (W / (n + 1)) * (i + 1)
        glow('l' + i, x, 60, 70, '#ffd9a0', 0.8)
        els.push(<rect key={'lb' + i} x={x - 14} y={52} width="28" height="12" rx="4" fill="#fff4dd" />)
        defs.push(<linearGradient key={'lg' + i} id={g('lg' + i)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd9a0" stopOpacity=".55" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></linearGradient>)
        els.push(<polygon key={'lp' + i} points={`${x - 10},64 ${x + 10},64 ${x + 60 + rand(-30, 30)},${H} ${x - 60 + rand(-30, 30)},${H}`} fill={`url(#${g('lg' + i)})`} filter={`url(#${g('soft')})`} />)
      }
      fogBands(5, '#e2b98c', 280, H, 0.22)
      let d = `M0 ${H}`
      for (let x = 0; x <= W; x += 18) d += ` L ${x} ${H - rand(30, 70)} L ${x + 9} ${H - rand(50, 90)}`
      els.push(<path key="crowd" d={d + ` L ${W} ${H} Z`} fill="#09080c" />)
      break
    }
    case 'crowd': {
      sky([[0, '#140f16'], [0.55, '#5c2a2a'], [1, '#0b0a0e']])
      glow('stage', W / 2, 220, 240, '#ff9a4a', 0.6)
      for (let i = 0; i < 18; i++) {
        const x = rand(0, W), y = H - rand(60, 130)
        els.push(<path key={'arm' + i} d={`M${x} ${H} L ${x + rand(-25, 25)} ${y}`} stroke="#08070a" strokeWidth={rand(6, 10)} strokeLinecap="round" />)
        els.push(<circle key={'hd' + i} cx={x + rand(-25, 25)} cy={y - 6} r={rand(5, 8)} fill="#08070a" />)
      }
      let d = `M0 ${H}`
      for (let x = 0; x <= W; x += 22) d += ` Q ${x + 11} ${H - rand(70, 110)} ${x + 22} ${H - rand(50, 80)}`
      els.push(<path key="heads" d={d + ` L ${W} ${H} Z`} fill="#08070a" />)
      fogBands(4, '#ffb070', 160, 300, 0.2)
      break
    }
    case 'studio':
    default: {
      sky([[0, '#1a1418'], [1, '#2d1f1f']])
      glow('lamp', rand(60, 140), rand(120, 180), 200, '#f0a24a', 0.55)
      glow('screen', rand(240, 330), 260, 120, '#6ec1c4', 0.25)
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 6; i++) {
          const on = r() > 0.4
          els.push(<rect key={`k${row}-${i}`} x={40 + i * 55} y={300 + row * 42} width="44" height="30" rx="3" fill={on ? '#3a2a2a' : '#231a1d'} />)
          if (on) els.push(<circle key={`d${row}-${i}`} cx={50 + i * 55 + rand(0, 24)} cy={308 + row * 42} r="2.2" fill={r() > 0.5 ? '#e9a23b' : '#d1456f'} />)
        }
      ;[0, 1, 2].forEach((k) => {
        const x = 230 + k * 50
        els.push(<g key={'gt' + k} opacity=".85"><rect x={x} y={70} width="6" height="120" fill="#120d10" /><ellipse cx={x + 3} cy={205} rx="22" ry="30" fill="#120d10" /></g>)
      })
      els.push(<rect key="desk" y="430" width={W} height="70" fill="#0f0b0d" />)
      break
    }
  }

  return { defs, els }
}

export default function Art({ src = '', alt = '', className = '', style }) {
  const rid = useId().replace(/:/g, '')
  const gen = typeof src === 'string' && src.startsWith('gen:')
  const svg = useMemo(() => {
    if (!gen) return null
    const [, preset = 'tide', seed = '1'] = src.split(':')
    return scene(preset, rng(parseInt(seed, 10) || 1), rid)
  }, [src, gen, rid])

  if (!gen) {
    return (
      <div className={`art ${className}`} style={style}>
        {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="art-empty" />}
      </div>
    )
  }
  return (
    <div className={`art ${className}`} style={style} role="img" aria-label={alt || 'Placeholder artwork'}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>{svg.defs}</defs>
        {svg.els}
      </svg>
      <span className="art-grain" />
    </div>
  )
}
