// HTML for the storefront pages. The look comes from the Madscope site's own stylesheet plus shop.css.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = c => `$${(c / 100).toFixed(2)}`;

const header = active => `
<a class="skip" href="#main">Skip to content</a>
<div class="scrim"></div>
<header class="site-header">
  <div class="bar">
    <button class="bar__menu" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span class="burger"><i></i><i></i><i></i></span></button>
    <a href="/madscope/" class="logo" aria-label="Madscope home"><img src="/madscope/media/logo.svg" alt="Madscope" width="228" height="37" /></a>
    <nav class="bar__nav" aria-label="Main">
      <a href="/madscope/#music">Music</a>
      <a href="/madscope/bio.html">Bio</a>
      <a href="/shop"${active === 'shop' ? ' aria-current="page"' : ''}>Merch</a>
      <a href="/madscope/#contact">Booking</a>
    </nav>
    <a class="cart-link" href="/shop/cart" aria-label="Cart">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.4 12.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      <span class="cart-count" data-cart-count hidden>0</span>
    </a>
  </div>
  <nav class="menu" id="menu" aria-label="Mobile">
    <ul class="menu__links">
      <li><a href="/madscope/">Home</a></li>
      <li><a href="/madscope/#music">Music</a></li>
      <li><a href="/madscope/bio.html">Bio</a></li>
      <li><a href="/shop">Merch</a></li>
      <li><a href="/madscope/#contact">Booking</a></li>
    </ul>
    <a href="/shop/cart" class="btn btn--red">View cart</a>
  </nav>
</header>`;

const footer = `
<footer class="footer">
  <div class="wrap">
    <div class="footer__top">
      <p class="footer__mark"><img src="/madscope/media/logo.svg" alt="Madscope" width="228" height="37" loading="lazy" /></p>
      <nav class="socials" aria-label="Social">
        <a href="https://www.instagram.com/1chargeproductions/">Instagram</a>
        <a href="https://www.tiktok.com/@1chargeproductions">TikTok</a>
        <a href="https://www.youtube.com/@MADSCOPEMUSIC">YouTube</a>
      </nav>
    </div>
    <div class="footer__base">
      <span>&copy; 2026 Madscope. Managed by 1 Charge Productions.</span>
      <span>Free shipping on orders over $75.</span>
    </div>
  </div>
</footer>`;

const page = ({ title, active, body, script, desc }) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || 'Official Madscope merch: tees, hoodies, caps and prints.')}" />
<meta name="theme-color" content="#000000" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Big+Shoulders+Display:wght@700;800;900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/madscope/assets/site.css" />
<link rel="stylesheet" href="/static/shop.css" />
</head><body class="shop">
${header(active)}
<main id="main">${body}</main>
${footer}
<script src="/madscope/assets/site.js" defer></script>
<script src="/static/shop.js" defer></script>
${script ? `<script>${script}</script>` : ''}
</body></html>`;

const card = p => `
<a class="pcard" href="/shop/p/${esc(p.slug)}">
  <span class="pcard__img"><img src="${esc(p.images[0] || '')}" alt="${esc(p.name)}" width="800" height="800" loading="lazy" />${p.in_stock ? '' : '<span class="tag">Sold out</span>'}</span>
  <span class="pcard__name">${esc(p.name)}</span>
  <span class="pcard__meta">${esc(p.price)}${p.colors.length > 1 ? ` <span>${p.colors.length} colours</span>` : ''}</span>
</a>`;

const shopIndex = products => page({
  title: 'Merch | Madscope', active: 'shop',
  body: `<section class="shop-hero wrap"><h1 class="title">Merch</h1><p class="lead">Official Madscope gear. Free shipping on orders over $75.</p></section>
<section class="wrap shop-grid" aria-label="Products">${products.map(card).join('')}</section>`,
});

const productPage = p => page({
  title: `${p.name} | Madscope Merch`, active: 'shop', desc: p.description,
  body: `<section class="wrap product">
  <div class="product__media"><img id="p-img" src="${esc(p.color_images[p.colors[0]] || p.images[0] || '')}" alt="${esc(p.name)}" width="800" height="800" />
    ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((src, i) => `<button type="button" class="thumb${i ? '' : ' on'}" data-src="${esc(src)}" aria-label="Show photo ${i + 1}"><img src="${esc(src)}" alt="" width="120" height="120" /></button>`).join('')}</div>` : ''}
  </div>
  <div class="product__info">
    <a class="back" href="/shop">All merch</a>
    <h1 class="title title--md">${esc(p.name)}</h1>
    <p class="price">${esc(p.price)}</p>
    <p class="prose">${esc(p.description)}</p>
    <form id="buy" class="buy" novalidate>
      ${p.colors.length > 1 || p.colors[0] !== 'Default' ? `<fieldset><legend>Colour: <b id="color-name">${esc(p.colors[0])}</b></legend><div class="opts" id="colors">${p.colors.map((c, i) => `<label class="opt"><input type="radio" name="color" value="${esc(c)}"${i ? '' : ' checked'} /><span>${esc(c)}</span></label>`).join('')}</div></fieldset>` : ''}
      <fieldset><legend>Size</legend><div class="opts" id="sizes">${p.sizes.map(s => `<label class="opt"><input type="radio" name="size" value="${esc(s)}" /><span>${esc(s)}</span></label>`).join('')}</div></fieldset>
      <p class="stock-note" id="stock-note" aria-live="polite"></p>
      <div class="buy__row">
        <label class="qty"><span class="sr-only">Quantity</span><button type="button" data-step="-1" aria-label="One less">&minus;</button><input id="qty" type="number" min="1" max="10" value="1" inputmode="numeric" /><button type="button" data-step="1" aria-label="One more">+</button></label>
        <button class="btn btn--red" id="add" type="submit">Add to cart</button>
      </div>
      <p class="form-msg" id="buy-msg" role="status"></p>
    </form>
  </div>
</section>`,
  script: `window.PRODUCT=${JSON.stringify(p).replace(/</g, '\\u003c')};`,
});

const cartPage = ({ stripe }) => page({
  title: 'Cart | Madscope Merch', active: 'shop',
  body: `<section class="wrap cart">
  <h1 class="title title--md">Your cart</h1>
  <p class="form-msg" id="cart-cancelled" hidden>Payment was cancelled. Your cart is still here.</p>
  <div id="cart-empty" class="empty" hidden><p class="lead">Your cart is empty.</p><a class="btn btn--red" href="/shop">Shop merch</a></div>
  <div class="cart__grid" id="cart-full" hidden>
    <div>
      <ul class="lines" id="lines"></ul>
      <form id="code-form" class="code" novalidate>
        <label for="code">Discount code</label>
        <div class="code__row"><input id="code" autocomplete="off" placeholder="e.g. MADSCOPE10" /><button class="btn" type="submit">Apply</button></div>
        <p class="form-msg" id="code-msg" role="status"></p>
      </form>
    </div>
    <form id="checkout" class="checkout" novalidate>
      <h2>Summary</h2>
      <dl class="totals" id="totals"></dl>
      <h2>Shipping details</h2>
      <div class="fields">
        <label class="f-full">Full name<input name="name" autocomplete="name" required /></label>
        <label class="f-full">Email (for your receipt)<input name="email" type="email" autocomplete="email" required /></label>
        <label class="f-full">Address<input name="address1" autocomplete="address-line1" required /></label>
        <label class="f-full">Apartment, suite (optional)<input name="address2" autocomplete="address-line2" /></label>
        <label>City<input name="city" autocomplete="address-level2" required /></label>
        <label>State / parish<input name="region" autocomplete="address-level1" /></label>
        <label>Postcode / ZIP<input name="postcode" autocomplete="postal-code" required /></label>
        <label>Country<input name="country" autocomplete="country-name" value="United States" required /></label>
      </div>
      <p class="form-msg form-msg--error" id="checkout-msg" role="alert"></p>
      <button class="btn btn--red btn--wide" id="pay" type="submit">${stripe ? 'Pay securely with card' : 'Continue to payment'}</button>
      <p class="fine">${stripe ? 'You’ll pay on Stripe’s secure checkout page. Test mode: use card 4242 4242 4242 4242, any future date, any CVC.' : 'Demo mode: no real payment is taken.'}</p>
    </form>
  </div>
</section>`,
});

const orderSummary = o => `
<ul class="lines lines--static">${o.items.map(i => `<li class="line"><div class="line__info"><b>${esc(i.product_name)}</b><span>${esc(i.size)} / ${esc(i.color)} &times; ${i.qty}</span></div><span class="line__price">${money(i.price_cents * i.qty)}</span></li>`).join('')}</ul>
<dl class="totals"><div><dt>Subtotal</dt><dd>${money(o.subtotal_cents)}</dd></div>
${o.discount_cents ? `<div><dt>Discount (${esc(o.discount_code)})</dt><dd>&minus;${money(o.discount_cents)}</dd></div>` : ''}
<div><dt>Shipping</dt><dd>${o.shipping_cents ? money(o.shipping_cents) : 'Free'}</dd></div>
<div class="total"><dt>Total</dt><dd>${money(o.total_cents)}</dd></div></dl>`;

const statusText = { pending: 'Waiting for payment', paid: 'Paid: being packed', shipped: 'Shipped', cancelled: 'Cancelled' };

const orderPage = (o, { justPaid } = {}) => page({
  title: `Order ${o.number} | Madscope Merch`, active: 'shop',
  body: `<section class="wrap narrow">
  <h1 class="title title--md">${justPaid ? 'Thank you!' : `Order ${esc(o.number)}`}</h1>
  ${justPaid ? `<p class="lead">Order <b>${esc(o.number)}</b> is confirmed. A receipt is on its way to ${esc(o.email)}.</p>` : ''}
  <p class="status status--${o.status}">${statusText[o.status]}</p>
  ${orderSummary(o)}
  <h2 class="h2">Shipping to</h2>
  <p>${esc(o.name)}<br>${esc(o.address1)}${o.address2 ? '<br>' + esc(o.address2) : ''}<br>${esc(o.city)}${o.region ? ', ' + esc(o.region) : ''} ${esc(o.postcode)}<br>${esc(o.country)}</p>
  <a class="btn" href="/shop">Keep shopping</a>
</section>`,
  script: justPaid ? `try{localStorage.removeItem('madscope-cart')}catch(e){}` : '',
});

const demoPayPage = o => page({
  title: 'Payment | Madscope Merch', active: 'shop',
  body: `<section class="wrap narrow">
  <h1 class="title title--md">Payment</h1>
  <p class="notice">Demo mode: Stripe isn't connected, so no real payment is taken. Add a Stripe test key to use real test checkout.</p>
  ${orderSummary(o)}
  <form method="post" action="/shop/pay/${esc(o.token)}"><button class="btn btn--red btn--wide" type="submit">Pay ${money(o.total_cents)} (demo)</button></form>
</section>`,
});

const message = (title, text, link = '/shop', label = 'Back to the shop') => page({
  title: `${title} | Madscope Merch`, active: 'shop',
  body: `<section class="wrap narrow"><h1 class="title title--md">${esc(title)}</h1><p class="lead">${esc(text)}</p><a class="btn btn--red" href="${esc(link)}">${esc(label)}</a></section>`,
});

module.exports = { shopIndex, productPage, cartPage, orderPage, demoPayPage, message, esc };
