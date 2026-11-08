import React, { useRef, useState } from 'react'
import { useContent } from '../content.jsx'
import Art, { PRESETS } from './Art.jsx'

/*
  Content editor — open the site with ?edit at the end of the URL.
  Edits preview live and are kept as a draft in this browser.
  "Download content.json" produces the file to upload next to index.html on Hostinger.
*/

const TAB_LABELS = {
  meta: 'SEO', theme: 'Colours & type', sections: 'Sections', intro: 'Intro', brand: 'Brand & nav',
  hero: 'Hero', story: 'Story', music: 'Music', moments: 'Moments', tour: 'Tour', press: 'Press', contact: 'Contact', footer: 'Footer',
}
const LONG = ['quote', 'text', 'description', 'legal', 'consent', 'note', 'privacyNote', 'line', 'tagline', 'albumNote']
const FONT_SUGGESTIONS = ['Big Shoulders Display', 'Anton', 'Bebas Neue', 'Oswald', 'Archivo Black', 'Syne', 'Unbounded', 'Instrument Serif', 'Cormorant Garamond', 'Playfair Display', 'DM Serif Display', 'Fraunces', 'Manrope', 'Inter', 'DM Sans', 'Space Grotesk', 'Outfit']
const STATUS = ['tickets', 'few', 'soldout', 'waitlist']

const pretty = (k) => String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
const setIn = (obj, [k, ...rest], v) => {
  const copy = Array.isArray(obj) ? [...obj] : { ...obj }
  copy[k] = rest.length ? setIn(obj[k], rest, v) : v
  return copy
}
const blankLike = (v) => {
  if (Array.isArray(v)) return []
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)]))
  if (typeof v === 'number') return 0
  if (typeof v === 'boolean') return true
  if (typeof v === 'string' && v.startsWith('gen:')) return `gen:${PRESETS[Math.floor(Math.random() * PRESETS.length)]}:${Math.ceil(Math.random() * 40)}`
  return ''
}
const summary = (item, i) => {
  if (typeof item !== 'object') return String(item) || `Item ${i + 1}`
  const s = Object.values(item).find((v) => typeof v === 'string' && v && !v.startsWith('gen:') && !v.startsWith('data:') && v !== '#')
  return s ? s.replace(/\*/g, '') : `Item ${i + 1}`
}

function ImageField({ value, onChange }) {
  const file = useRef(null)
  const gen = value?.startsWith('gen:')
  const [, preset = 'tide', seed = '1'] = gen ? value.split(':') : []
  const upload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => onChange(r.result)
    r.readAsDataURL(f)
  }
  return (
    <div className="ed-image">
      <Art src={value} className="ed-thumb" />
      <div className="ed-image-ctrl">
        <input value={value?.startsWith('data:') ? '(uploaded image)' : value} onChange={(e) => onChange(e.target.value)} placeholder="assets/photo.jpg or https://…" />
        <div className="ed-row">
          <button type="button" onClick={() => file.current.click()}>Upload</button>
          <select value={gen ? preset : ''} onChange={(e) => onChange(`gen:${e.target.value}:${seed}`)}>
            <option value="" disabled>Placeholder…</option>
            {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {gen && <button type="button" title="New variation" onClick={() => onChange(`gen:${preset}:${Math.ceil(Math.random() * 99)}`)}>↻</button>}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={upload} />
        {value?.startsWith('data:') && value.length > 400000 && <small className="ed-warn">Large image. For the live site, put it in the assets folder and type its path instead.</small>}
      </div>
    </div>
  )
}

function Field({ k, value, path, set, root }) {
  const change = (v) => set(path, v)
  const label = <span className="ed-label">{pretty(k)}</span>

  if (Array.isArray(value)) return <ArrayField k={k} value={value} path={path} set={set} root={root} />
  if (value && typeof value === 'object')
    return (
      <fieldset className="ed-group"><legend>{pretty(k)}</legend>
        {Object.entries(value).map(([ck, cv]) => <Field key={ck} k={ck} value={cv} path={[...path, ck]} set={set} root={root} />)}
      </fieldset>
    )
  if (typeof value === 'boolean')
    return <label className="ed-check"><input type="checkbox" checked={value} onChange={(e) => change(e.target.checked)} />{label}</label>
  if (typeof value === 'number')
    return <label className="ed-field">{label}<input type="number" value={value} onChange={(e) => change(Number(e.target.value))} /></label>
  if (/image/i.test(k)) return <div className="ed-field">{label}<ImageField value={value} onChange={change} /></div>
  if (k === 'status')
    return <label className="ed-field">{label}<select value={value} onChange={(e) => change(e.target.value)}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
  if (k === 'id' && path[0] === 'sections') return <span className="ed-id">#{value}</span>
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value))
    return (
      <label className="ed-field ed-color">{label}
        <span className="ed-row"><input type="color" value={value.length === 4 ? '#' + [...value.slice(1)].map((c) => c + c).join('') : value} onChange={(e) => change(e.target.value)} /><input value={value} onChange={(e) => change(e.target.value)} /></span>
      </label>
    )
  if (k.startsWith('font'))
    return (
      <label className="ed-field">{label}
        <input list="ed-fonts" value={value} onChange={(e) => change(e.target.value)} />
        <small>Any Google Fonts family name.</small>
      </label>
    )
  const long = LONG.includes(k) || String(value).length > 70
  return (
    <label className="ed-field">{label}
      {long ? <textarea rows={Math.min(6, Math.ceil(String(value).length / 42) + 1)} value={value} onChange={(e) => change(e.target.value)} /> : <input value={value} onChange={(e) => change(e.target.value)} />}
    </label>
  )
}

function ArrayField({ k, value, path, set, root }) {
  const fixed = path[0] === 'sections'
  const [open, setOpen] = useState(null)
  const move = (i, d) => { const a = [...value]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); set(path, a) }
  const remove = (i) => set(path, value.filter((_, j) => j !== i))
  const add = () => set(path, [...value, value.length ? blankLike(value[value.length - 1]) : ''])
  const dup = (i) => { const a = [...value]; a.splice(i + 1, 0, structuredClone(value[i])); set(path, a) }
  const objects = value.length && typeof value[0] === 'object'
  return (
    <div className="ed-group ed-array">
      <div className="ed-array-head"><span className="ed-legend">{pretty(k)} <small>({value.length})</small></span></div>
      {value.map((item, i) => (
        <div key={i} className={`ed-item ${open === i ? 'is-open' : ''}`}>
          <div className="ed-item-head">
            {objects ? (
              <button type="button" className="ed-item-title" onClick={() => setOpen(open === i ? null : i)}>
                <span>{open === i ? '▾' : '▸'}</span> {fixed && item.visible === false ? <s>{summary(item, i)}</s> : summary(item, i)}
              </button>
            ) : (
              <input className="ed-item-input" value={item} onChange={(e) => set([...path, i], e.target.value)} />
            )}
            <span className="ed-item-tools">
              {fixed && <label title="Show section"><input type="checkbox" checked={item.visible !== false} onChange={(e) => set([...path, i, 'visible'], e.target.checked)} /></label>}
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} title="Move down">↓</button>
              {!fixed && <button type="button" onClick={() => dup(i)} title="Duplicate">⧉</button>}
              {!fixed && <button type="button" onClick={() => remove(i)} title="Remove">✕</button>}
            </span>
          </div>
          {objects && open === i && (
            <div className="ed-item-body">
              {Object.entries(item).map(([ck, cv]) => <Field key={ck} k={ck} value={cv} path={[...path, i, ck]} set={set} root={root} />)}
            </div>
          )}
        </div>
      ))}
      {!fixed && <button type="button" className="ed-add" onClick={add}>+ Add {pretty(k).replace(/s$/, '').toLowerCase()}</button>}
    </div>
  )
}

export default function Editor() {
  const { content, update, reset, hasDraft } = useContent()
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState('hero')
  const [armed, setArmed] = useState(false)
  const [copied, setCopied] = useState('')
  const copy = () => {
    const txt = JSON.stringify(content, null, 2)
    navigator.clipboard?.writeText(txt).then(() => setCopied('Copied')).catch(() => setCopied('manual'))
    if (!navigator.clipboard) setCopied('manual')
  }
  const importRef = useRef(null)
  const set = (path, v) => update(setIn(content, path, v))

  const download = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'content.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const importFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((t) => { try { update(JSON.parse(t)) } catch { alert('That file is not valid JSON.') } })
  }
  const jump = (key) => {
    setTab(key)
    const id = { meta: null, theme: null, brand: null, intro: null, footer: 'contact' }[key] ?? key
    const el = id && document.getElementById(id)
    if (el) (window.__lenis ? window.__lenis.scrollTo(el, { duration: 1 }) : el.scrollIntoView({ behavior: 'smooth' }))
  }

  return (
    <>
      <button className={`ed-toggle ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}>{open ? 'Close editor' : '✎ Edit content'}</button>
      <aside className={`editor ${open ? 'is-open' : ''}`} data-lenis-prevent aria-label="Content editor">
        <datalist id="ed-fonts">{FONT_SUGGESTIONS.map((f) => <option key={f} value={f} />)}</datalist>
        <header className="ed-head">
          <strong>Site content</strong>
          <span className={`ed-status ${hasDraft ? 'is-draft' : ''}`}>{hasDraft ? 'Draft · saved in this browser' : 'Showing published content'}</span>
          <div className="ed-actions">
            <button className="ed-primary" onClick={download}>Download content.json</button>
            <button onClick={() => importRef.current.click()}>Import</button>
            <button onClick={copy}>{copied === 'Copied' ? 'Copied ✓' : 'Copy JSON'}</button>
            <button className={armed ? 'ed-danger' : ''} onClick={() => { if (armed) { reset(); setArmed(false) } else { setArmed(true); setTimeout(() => setArmed(false), 3000) } }}>{armed ? 'Click again to discard draft' : 'Reset'}</button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
          </div>
          {copied === 'manual' && <textarea className="ed-json" readOnly rows="6" value={JSON.stringify(content, null, 2)} onFocus={(e) => e.target.select()} autoFocus />}
          <p className="ed-help">Wrap words in <code>*asterisks*</code> for the accent italic. To publish, upload the downloaded <code>content.json</code> next to <code>index.html</code> on the server.</p>
        </header>
        <nav className="ed-tabs">
          {Object.keys(content).map((key) => (
            <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => jump(key)}>{TAB_LABELS[key] || pretty(key)}</button>
          ))}
        </nav>
        <div className="ed-body">
          {content[tab] && typeof content[tab] === 'object' && (Array.isArray(content[tab])
            ? <ArrayField k={tab} value={content[tab]} path={[tab]} set={set} root={content} />
            : Object.entries(content[tab]).map(([k, v]) => <Field key={k} k={k} value={v} path={[tab, k]} set={set} root={content} />))}
        </div>
      </aside>
    </>
  )
}
