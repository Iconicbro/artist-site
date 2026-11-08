import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import defaults from '../public/content.json'

/*
  Content loading order:
  1. Built-in defaults (bundled, so the site always renders)
  2. ./content.json next to index.html (swap this file on the server to update the live site — no rebuild)
  3. Unsaved edits from the in-browser editor (?edit), kept in this browser only
*/
const DRAFT_KEY = 'site-content-draft-v1'
const Ctx = createContext(null)

const readDraft = () => {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
const writeDraft = (c) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(c)) } catch {} }
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {} }

export function ContentProvider({ children }) {
  const editMode = useMemo(() => new URLSearchParams(location.search).has('edit') || location.hash === '#edit', [])
  const [published, setPublished] = useState(defaults)
  const [content, setContent] = useState(() => (editMode && readDraft()) || defaults)
  const [hasDraft, setHasDraft] = useState(() => editMode && !!readDraft())

  useEffect(() => {
    fetch('./content.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json) return
        setPublished(json)
        if (!(editMode && readDraft())) setContent(json)
      })
      .catch(() => {})
  }, [editMode])

  const update = (next) => {
    setContent(next)
    if (editMode) { writeDraft(next); setHasDraft(true) }
  }
  const reset = () => { clearDraft(); setHasDraft(false); setContent(published) }

  return (
    <Ctx.Provider value={{ content, update, reset, editMode, hasDraft }}>
      {children}
    </Ctx.Provider>
  )
}

export const useContent = () => useContext(Ctx)
