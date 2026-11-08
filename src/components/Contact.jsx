import React, { useState } from 'react'
import { useContent } from '../content.jsx'

// No database: the form posts to an optional third-party endpoint (e.g. Formspree)
// set in content.json → contact.formEndpoint, otherwise it opens the visitor's email app.
export default function Contact({ id }) {
  const { content } = useContent()
  const c = content.contact
  const [state, setState] = useState('idle')
  const submit = async (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    if (c.formEndpoint) {
      setState('sending')
      try {
        const r = await fetch(c.formEndpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        setState(r.ok ? 'sent' : 'error')
        if (r.ok) e.target.reset()
      } catch { setState('error') }
      return
    }
    const body = `Name: ${data.name}\nEmail: ${data.email}\nOrganisation: ${data.org || '-'}\nTopic: ${data.topic}\n\n${data.message}`
    location.href = `mailto:${c.formEmail}?subject=${encodeURIComponent(`[${data.topic}] Enquiry from ${data.name}`)}&body=${encodeURIComponent(body)}`
    setState('sent')
  }
  return (
    <section id={id} className="contact section">
      <div className="contact-bg" aria-hidden />
      <div className="wrap">
        <span className="eyebrow" data-reveal>{c.eyebrow}</span>
        <h2 className="display contact-title" data-reveal>
          {c.titleLines.map((l, i) => <span key={i}>{l}</span>)}
          <em className="accent-em serif">{c.titleItalic}</em>
        </h2>
        <div className="contact-grid">
          <div className="contact-list" data-reveal>
            {c.contacts.map((x, i) => (
              <div key={i}><span className="eyebrow">{x.label}</span><a href={`mailto:${x.value}`}>{x.value}</a></div>
            ))}
            <p className="fine">{c.note}</p>
          </div>
          <form className="contact-form glass" onSubmit={submit} data-reveal>
            <label><span>Your name</span><input name="name" required autoComplete="name" /></label>
            <label><span>Email address</span><input name="email" type="email" required autoComplete="email" /></label>
            <label className="span-2"><span>Organisation (optional)</span><input name="org" /></label>
            <fieldset className="span-2 topics">
              <legend>What's it about?</legend>
              {c.topics.map((t, i) => (
                <label key={t} className="chip"><input type="radio" name="topic" value={t} defaultChecked={i === 0} /><span>{t}</span></label>
              ))}
            </fieldset>
            <label className="span-2"><span>Message</span><textarea name="message" rows="4" required /></label>
            <label className="span-2 consent"><input type="checkbox" required /><span>{c.consent}</span></label>
            <div className="span-2 form-foot">
              <button className="btn btn--accent" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : c.submitLabel} <i aria-hidden>↗</i></button>
              <span className="fine" aria-live="polite">{state === 'sent' ? 'Thank you — we’ll be in touch.' : state === 'error' ? 'Something went wrong. Please email us directly.' : c.privacyNote}</span>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
