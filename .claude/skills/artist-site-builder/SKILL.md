---
name: artist-site-builder
description: Playbook for building a music artist's website from a client's sketches, then optionally a working merch store (cart, sizes/colours, stock, discount codes, Stripe test checkout, order emails, owner admin, SQLite). Use when a client asks for an artist/band/musician website, an EPK or bio page, a music release page with streaming links, booking/contact page, or "turn the site into a real shop" / merch store, or when they share wireframe sketches of such a site. Covers intake, design, media prep (video, audio previews, covers), review via shared preview + comment threads, GitHub Pages publishing, the store build, end-to-end testing and the owner's guide.
---

# Artist site + merch store playbook

A proven end-to-end process (first used for the Madscope dancehall site, repo `Iconicbro/artist-site`: `madscope/` = site, `shop/` = store; reuse that code as the starting template when it's reachable).
Work in this order. Each phase ends with something the client can see.

## Phase 1 · Intake (one round of questions, then build)

1. **Read the sketch out loud**: list every section top to bottom in plain words (header, hero, sections, annotations like "parallax", "on scroll show…"). Confirm understanding before building.
2. **Ask only what changes the build**, in one message (offer defaults so they can just say "go"):
   - Desktop, mobile or both? (Build both: desktop row → mobile stack.)
   - Hero: video, illustration or photo? Layered art for motion?
   - Music: links out (Spotify/Apple/YouTube) or on-site audio previews?
   - Contact: form or a **contact directory** (pick a reason → shows the right person, copyable email, tips)? Directory = no backend, preferred.
   - Reference sites for any part ("make the header like X").
3. If a reference URL is blocked by the sandbox network, propose adding just that host to the environment (see `references/environment.md`), then screenshot it with Playwright and describe the pattern you'll borrow (layout, behaviour), never copying branding.
4. When the client sends real content (bio text, booking info, covers, video, audio, logo SVG), replace placeholders immediately and say what you assumed (e.g. which release is "newest").

## Phase 2 · Build the site (static, one folder per client)

Load the `frontend-design` skill first and follow it: brief → token plan (4–6 colours, 1–2 typefaces, layout ASCII) → review against generic defaults → build.

- **Structure**: `<client>/index.html`, `<client>/bio.html`, `<client>/assets/site.css` + `site.js` (shared), `<client>/media/…`. Never overwrite another project in the repo; new client = new folder.
- **Sections that worked** (see `references/site-patterns.md` for code-level notes): floating header bar (open nav on desktop, hamburger + drop panel on mobile only), video hero that plays N times then holds, New Release (cover + platform rows), About teaser → full Bio page (video header, facts list, story, timeline, catalogue, coming soon, CTA band), pinned-scroll Music section with a vinyl record poking out of the sleeve and spinning, Merch section, Contact directory, footer with logo.
- **Motion**: slide/clip-wipe reveals, not fades, unless the client wants fades. Respect `prefers-reduced-motion`.
- **Copy**: client's words first; plain sentence case; no `01/02` numbering unless it's a real sequence; no `·`-joined meta; no arrows in button text.
- **Media prep**: run the commands in `references/media.md` (video re-encode + poster, cover crop by alpha, 30 s previews picked by loudness with fades, background track with fades, logo SVG in header/menu/hero/footer).

## Phase 3 · Review loop with the client

- Publish a **multi-file Artifact** (page + `files` map for assets) as the shared preview; update the same URL each round. Tell them it's private until shared.
- Client comments arrive as artifact comment threads: make the change, republish, reply in the thread (one short line in chat). Don't resolve threads yourself.
- Every round: Playwright screenshots at 1440×900 and 390×844, check `scrollWidth - innerWidth == 0`, no page errors, and **measure positions** for anything that animates/swaps (see layout-shift notes).
- Keep GitHub in sync: commit per change on the working branch, push.

## Phase 4 · Go public (GitHub Pages)

- Pages serves `main` only. Site URL = `https://<owner>.github.io/<repo>/<client-folder>/` (lowercase, case-sensitive).
- Open a PR from the working branch, merge only when the user says "merge it" (each merge needs its own ask), then check the `pages build and deployment` run. After merging, fast-forward the working branch to `main`.
- A Pages 404 saying "the site configured at this address does not contain the requested file" = Pages is on, the files just aren't on `main` yet.

## Phase 5 · Merch store (when asked to "make it a real shop")

Follow `references/store.md`. Summary:
- Static hosting can't run a store: build `shop/` as a small Node server (Express + Node's built-in `node:sqlite`, one DB file, auto-seeds, `npm start`). It also serves the site folder, so one command runs everything.
- Features: products × sizes × colours with stock, cart (localStorage) + server-side quote, discount codes, Stripe Checkout (test) verified server-side, demo-payment fallback, emails saved to an outbox (+SMTP optional), owner admin (login, today, orders, mark shipped → email, low stock, Excel export, drag-in photos, codes, emails viewer, password change), realistic seed data.
- Vector placeholder product art (SVG mockups in brand colours) until real product photos exist.
- Home-page Merch section reads `/api/products?featured=1` when served by the store; on static hosting it falls back to placeholders and a "Store opening soon" button (or `<meta name="shop-url">` when the store is hosted elsewhere).
- Ask for the Stripe **test** key with `request_credential` (never in chat); run tests; write the owner a 5-step guide (`shop/README.md`).

## Phase 6 · Test like a shopper and an owner, fix, report

Scripts and expectations in `references/testing.md`. Report honestly: what passed, what couldn't be automated (Stripe's hCaptcha after "Pay" — don't try to bypass it; test the post-payment path in demo mode and ask the client to do one real 4242 test purchase), environment changes you made, and what's still placeholder.

## Known pitfalls (all hit for real — check these before shipping)

See `references/pitfalls.md`. The big ones: `[hidden]` overridden by a `display:` rule; IntersectionObserver never firing on fully clip-path-hidden elements; `<img width height>` + `aspect-ratio` needs `height:auto`; descendant selectors leaking into nested elements (`.pill span`); sticky/pinned sections shifting when content length changes; condensed uppercase fonts turning "30s" into "305".
