# Juno Hale — one-page site (concept)

React + Vite. No database. All content lives in **content.json**.

## Publish on Hostinger
1. `npm install && npm run build` (or use the ready-made `juno-hale-hostinger.zip`).
2. hPanel → Websites → File Manager → `public_html`.
3. Upload the zip, extract it there so `index.html`, `content.json` and the `assets/` folder sit directly in `public_html`.
4. Enable SSL in hPanel (Security → SSL). Done — no Node server needed.

## Swapping content (client)
- Open the live site with `?edit` (e.g. `https://yourdomain.com/?edit`) or `#edit`.
- Change text, images, colours, fonts, tracks, tour dates, quotes, section order/visibility. Changes preview live and are saved as a draft in that browser only.
- Click **Download content.json** (or Copy JSON) and send it over / upload it to `public_html`, replacing the old file. The site updates instantly — no rebuild.
- Images: upload real photos into `public_html/assets/` and type the path (e.g. `assets/hero.jpg`). Placeholder art uses `gen:<preset>:<seed>` (presets: tide, dusk, window, moon, neon, haze, lights, crowd, studio).
- Audio: give a track a `src` (e.g. `assets/audio/last-tram-home.mp3`) to play real audio; without it the player simulates playback.
- Accent italics: wrap words in `*asterisks*`.
- Tour status: `tickets`, `few`, `soldout`, `waitlist`.

## Contact form
No backend required. Set `contact.formEndpoint` to a Formspree/Basin endpoint to receive enquiries by email; left empty, the form opens the visitor's mail app addressed to `contact.formEmail`.

## Dev
`npm run dev` · `npm run build` → `dist/` · `npm run build:single` → one self-contained HTML for review links.
