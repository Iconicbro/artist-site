# Testing (Playwright; Chromium is preinstalled — never `playwright install`)

## Every site change
- Screens at 1440×900 and 390×844 (`deviceScaleFactor` 1 for your own checks, 2 for images you send).
- Assert: no `pageerror`, `document.documentElement.scrollWidth - innerWidth === 0`, reveal elements got `.in`.
- For swapped/animated content (music releases, contact card): record bounding boxes of title, vinyl, counter for each state and require identical positions.
- Find overflow culprits: elements whose `getBoundingClientRect().right > innerWidth + 1`.
- Contact-sheet many screenshots with Pillow to review in one image.

## Shopper journey (store)
Home Merch cards link to products → product page: sold-out size disabled, "Choose a size first", colour swaps image, add with qty → second product → cart: bad code error, good code applied, totals/free shipping → empty checkout validation → fill details → pay → confirmation page, cart badge cleared. Then verify in SQLite: order paid, stock decremented exactly, discount `uses` +1, confirmation email in outbox. Check mobile overflow on shop/product/cart.

## Owner journey (admin)
Wrong password message → login → stats + ready-to-ship + low stock → Mark as shipped (toast, list shrinks, shipped email) → Excel download (open with exceljs, count rows, check header/first row) → Orders filters → add product: no-photo error, then `setInputFiles` a canvas-generated PNG + fields → appears in admin and at `/shop/p/<slug>` → inline stock edit → discount code validation, add, turn off (then rejected at checkout) → emails list → mobile overflow → API without login = 401, mutation without admin header = 403.

## Stripe
- Session creation can be verified fully (amounts, coupon, shipping) by opening the Checkout URL.
- The card form lives in the iframe `iframe[src*="elements-inner-habanero"]`; click `.p-PaymentAccordionButtonText` "Card", fields `input[name=number|expiry|cvc]`.
- After "Pay", Stripe shows hCaptcha to automated browsers: **stop there, don't bypass**. Test the post-payment path in demo mode (same code), test unpaid/fake-session handling via the success URL, and ask the client to run one manual 4242 purchase.
- Hosts needed for a browser to load Checkout: checkout.stripe.com, js.stripe.com, m.stripe.network, m.stripe.com, r.stripe.com, q.stripe.com, b.stripecdn.com, merchant-ui-api.stripe.com (api.stripe.com comes with the saved credential). Launch Chromium with `proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' }` and `ignoreHTTPSErrors` in the context.

## Reset after testing
`npm run seed` so the client gets clean demo data; uploads in `data/uploads` are gitignored.
