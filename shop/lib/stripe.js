// Minimal Stripe Checkout client (no SDK). Uses STRIPE_SECRET_KEY; use a test key (sk_test_...).
const KEY = () => process.env.STRIPE_SECRET_KEY || '';
const enabled = () => !!KEY();

// Stripe wants form-encoded, bracketed keys: line_items[0][price_data][currency]=usd
function form(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out); else out.append(key, String(v));
  }
  return out;
}
async function call(method, path, body) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? form(body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) { const e = new Error(json.error?.message || `Stripe error ${res.status}`); e.status = 502; throw e; }
  return json;
}

async function createCheckout({ order, quote, baseUrl }) {
  const body = {
    mode: 'payment',
    customer_email: order.email,
    client_reference_id: order.number,
    metadata: { order_id: order.id, order_number: order.number },
    success_url: `${baseUrl}/shop/success?order=${order.token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/shop/cart?cancelled=1`,
    line_items: Object.fromEntries(quote.lines.map((l, i) => [i, {
      quantity: l.qty,
      price_data: { currency: 'usd', unit_amount: l.price_cents, product_data: { name: `${l.name} (${l.size}, ${l.color})` } },
    }])),
    shipping_options: { 0: { shipping_rate_data: { type: 'fixed_amount', display_name: quote.shipping_cents ? 'Standard shipping' : 'Free shipping', fixed_amount: { amount: quote.shipping_cents, currency: 'usd' } } } },
  };
  if (quote.discount_cents > 0) {
    const coupon = await call('POST', 'coupons', { amount_off: quote.discount_cents, currency: 'usd', duration: 'once', name: `Code ${quote.discount_code}` });
    body.discounts = { 0: { coupon: coupon.id } };
  }
  return call('POST', 'checkout/sessions', body);
}
const getSession = id => call('GET', `checkout/sessions/${encodeURIComponent(id)}`);

module.exports = { enabled, createCheckout, getSession };
