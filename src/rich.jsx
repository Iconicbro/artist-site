import React from 'react'
// Tiny formatter: *words* become accented italics. Keeps editing simple for clients.
export function Rich({ text = '', as: Tag = React.Fragment, className }) {
  const parts = String(text).split(/(\*[^*]+\*)/g).filter(Boolean)
  const nodes = parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*') ? <em key={i} className="accent-em">{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>
  )
  return Tag === React.Fragment ? <>{nodes}</> : <Tag className={className}>{nodes}</Tag>
}
// Split into words (keeping emphasis) for word-by-word reveals
export function richWords(text = '') {
  const out = []
  String(text).split(/(\*[^*]+\*)/g).filter(Boolean).forEach((p) => {
    const em = p.startsWith('*') && p.endsWith('*')
    const body = em ? p.slice(1, -1) : p
    // keep trailing whitespace on each token so punctuation after an emphasis stays attached
    ;(body.match(/\s*\S+\s*/g) || []).forEach((w) => out.push({ w, em }))
  })
  return out
}
