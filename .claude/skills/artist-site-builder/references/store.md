# Merch store build (`shop/`)

Reference implementation: `Iconicbro/artist-site` → `shop/`. Copy it, then rebrand (logo, colours via the site stylesheet, products, seed customers, admin email, footer copy).

## Stack & layout
- Node ≥ 22.5, `express@4`, `multer` (photo upload), `exceljs` (xlsx), `nodemailer` (optional SMTP). DB: built-in `node:sqlite` (`DatabaseSync`) → no native builds. Run with `node --no-warnings` to hide the experimental notice.
- `server.js` (routes), `lib/db.js` (schema + helpers + scrypt passwords), `lib/store.js` (products, quote, orders, markPaid/markShipped, dashboard), `lib/stripe.js` (fetch-based Checkout client), `lib/email.js` (outbox + SMTP), `lib/views.js` (storefront HTML reusing the site header/footer + `site.css`), `seed.js`, `public/` (shop.css/js, admin.html/css/js), `data/` (gitignored: db + uploads), `.env.example`, `README.md` (owner's 5-step guide).
- The server serves the site folder at `/<client>/` and redirects `/` there; shop at `/shop`, admin at `/admin`, API under `/api`.
- `.env` loader built in (no dotenv dependency). `.gitignore`: `node_modules/`, `data/`, `.env`.

## Data model
products(slug, name, description, category, price_cents, images JSON, color_images JSON, featured, active) · variants(product_id, size, color, stock, unique per combo) · discounts(code NOCASE, kind percent|amount, value, active, uses) · orders(number MS-1001…, token secret, status pending|paid|shipped|cancelled, customer + address, subtotal/discount/shipping/total cents, payment stripe|demo, stripe_session, paid_at, shipped_at) · order_items(snapshot of name/size/colour/price) · admins · sessions · emails (outbox) · settings (shipping 600, free over 7500, low stock 5).

## Rules
- Prices in integer cents; quote recomputed server-side from DB (never trust client prices). Clear messages for sold out / too many / bad code.
- Stock is taken in `markPaid` (transaction, idempotent, `MAX(stock-qty,0)`), discount `uses++` there too, then confirmation email.
- Shipping flat, free over a threshold (after discount).

## Stripe (test mode)
- Ask for the key with `request_credential` host `api.stripe.com` (proxy injects it). Run the server with `STRIPE_SECRET_KEY=proxy-injected NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` in the sandbox (Node's fetch ignores HTTPS_PROXY otherwise → `ENOTFOUND`).
- Create Checkout Session via form-encoded POST: `line_items[i][price_data]…`, `shipping_options[0][shipping_rate_data]`, discount as a one-off coupon (`amount_off`, `duration=once`) → `discounts[0][coupon]`, `metadata[order_id]`, `customer_email`, `success_url=/shop/success?order=<token>&session_id={CHECKOUT_SESSION_ID}`, `cancel_url=/shop/cart?cancelled=1`.
- On success: fetch the session **saved on the order** (never the one in the URL), require `payment_status=paid` and matching `metadata.order_id`, then `markPaid`. Unpaid/fake → "Payment not finished".
- If session creation fails, mark the order `cancelled` and return a friendly 502 ("Nothing was charged").
- No key → demo payment page (same `markPaid` path). Optional future: webhook endpoint for robustness.

## Admin
- scrypt hashes, 32-byte session token in an HttpOnly SameSite=Lax cookie (Secure when PUBLIC_URL is https), 14-day expiry, login rate limit (10 / 15 min / IP).
- All mutating admin API calls require header `X-Requested-With: <app>-admin` (cheap CSRF block) + session.
- Tabs: Today (sales today, orders today, waiting to ship, 7-day sales, ready-to-ship list with Mark as shipped, low-stock list), Orders (filters, expandable details), Products (drag-and-drop photos, sizes/colours comma lists, starting stock per variant, For sale / On home page toggles, inline price + stock edits), Discount codes (add, on/off, uses), Emails (outbox list + iframe preview), Account (change password).
- Excel: one row per paid order, money/date number formats, header styled, frozen + autofilter.
- Default demo login printed on seed; tell the owner to change it.

## Seed data
6 products with colourways mapped to SVG placeholders, some low/zero stock (to show warnings and sold-out sizes), 3 discount codes, ~23 orders across 14 days (some today, some pending, mostly shipped), deterministic RNG so the demo is stable. `npm run seed` resets.

## Owner guide (README) — 5 steps
1 Start (`npm install`, `npm start`, URLs) · 2 Log in (demo credentials, change password) · 3 Add/manage products · 4 Daily routine (Today, Mark as shipped, low stock, Excel, codes, emails) · 5 Payments/emails/going live (`.env` Stripe test key + 4242 card, SMTP_URL, host on Render/Railway, PUBLIC_URL, live key only when ready, `shop-url` meta for a separately hosted site).
