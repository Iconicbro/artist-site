# Site patterns (code-level notes)

## Design tokens that worked (dark artist site)
- `--ink:#000` (true black, matches black video backdrops), `--surface:#110f0e`, `--surface-2:#1c1917`, `--line:rgba(247,243,238,.14)`, `--red:#e3262e` (titles + the one accent), `--white:#f7f3ee` (body copy), `--muted:#a8a098`.
- Type: heavy condensed display for titles (Big Shoulders Display 800/900, uppercase), a distinct grotesque for body (Archivo 400–600). Pick per client from the subject's vernacular (e.g. dancehall sound-system flyers).
- Brief wins over "avoid defaults": if the client asks for dark + red titles + white body, do exactly that.

## Header (floating bar)
- Fixed, centred bar `width:min(760px, 100% - 32px)`, 64px tall, semi-transparent (`rgba(0,0,0,.22)` + `backdrop-filter: blur(6px)`) over the hero; darken (`.scrolled`) after ~60% of the viewport is scrolled.
- Desktop: logo left, open nav links centre, round red play button right. Mobile (≤900px): hamburger left (morphs to ×, bar shrinks to a square), logo centre, play right; a drop panel below with big links, Listen/Follow columns, CTA. Make the panel `inert` when closed; close on link click, scrim click, Esc, and when resizing to desktop.
- Use the client's logo SVG in header, mobile menu, hero and footer (`<img alt="Client name">`).

## Hero video
- `<video muted playsinline autoplay preload=auto poster=… data-loops="6">` without `loop`; JS counts `ended` events and restarts until N, then holds the last frame. Reduced motion → no autoplay, poster only.
- Shade gradients for text legibility; mobile `object-position` toward the subject.

## Music section (pinned scroll + vinyl)
- Section height `count * 85vh + 100vh`; inner stage `position:sticky; top:0; height:100svh`. Scroll progress → active release index.
- Vinyl: record behind the sleeve, `transform: translateX(30%)` pokes out; disc spins (`repeating-radial-gradient` grooves + conic sheen); centre label shows the cover.
- On swap: record slides back in, **new cover wipes in over the old one** (append a new `<img>` with `clip-path: inset(0 0 0 100%)` → `inset(0)`, then remove the old) so the sleeve is never empty (an empty sleeve showed a grey box).
- **Prevent shift**: `.music__stage > .wrap{width:100%}` (a `margin:auto` flex child shrinks to content), tabular numerals for "1 of 3", `min-height` on the meta line (2 lines) and on the platform block (room for preview + 3 links).
- Per-release data in JS: title, meta, cover, links `[name, icon, url]`, optional `preview` mp3. Render pill icons + link rows per release; red preview button first in the icon column with a "Preview" label row.

## Audio
- Header button = background music: full track, `audio.loop = true`, JS volume fade in (1.6 s) on play and out (0.9 s) on stop; the file itself has afade in/out baked in for loop boundaries. iOS ignores `volume` (fades won't apply there; acceptable).
- One sound at a time: starting a preview fades out background music; starting background music stops the preview; switching releases stops the preview.

## Contact directory (no backend)
- `role="radiogroup"` buttons (arrow keys move), card shows topic, contact name/role, email + Copy button (clipboard API with textarea fallback), WhatsApp `https://wa.me/<digits>`, Instagram, a per-topic tip, and "Email …" button with a prefilled `mailto:?subject=`.

## Bio page
- Video header (short hero), sticky facts `<dl>` (real name, from, sound, debut, team), story prose, timeline `<ol>` (remember `list-style:none` on `ol`), catalogue chips (link releases that have pages), coming-soon chips, red CTA band → booking.
- Optional photo gallery + `<dialog>` lightbox (max-height 600px). Clients may remove it — keep it easy to delete.

## Reveals
- `.slide` = `clip-path: inset(0 0 100% 0)` + translateY; `.slide-x` = horizontal wipe. Trigger with a scroll/rAF position check (`top < innerHeight - 30`), **not** IntersectionObserver (it reports fully clipped elements as never intersecting).

## Merch section on the home page
- Four cards (image, name, price, colours) + "Shop all merch". JS: `fetch('/api/products?featured=1')` → live cards linking to `/shop/p/<slug>`; on failure use `<meta name="shop-url">` if set, else disable links and show "Store opening soon".
