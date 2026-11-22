// Shop rules: products, prices, discounts, orders, stock.
const crypto = require('node:crypto');
const { one, all, run, tx, setting } = require('./db');
const email = require('./email');

const SHIPPING_CENTS = () => +setting('shipping_cents', 600);
const FREE_SHIPPING_OVER = () => +setting('free_shipping_over_cents', 7500);
const LOW_STOCK = () => +setting('low_stock_threshold', 5);

const money = c => `$${(c / 100).toFixed(2)}`;
const parse = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

function productRow(p) {
  if (!p) return null;
  const variants = all('SELECT id,size,color,stock FROM variants WHERE product_id=? ORDER BY id', p.id);
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description, category: p.category,
    price_cents: p.price_cents, price: money(p.price_cents),
    images: parse(p.images, []), color_images: parse(p.color_images, {}),
    featured: !!p.featured, active: !!p.active,
    sizes: [...new Set(variants.map(v => v.size))],
    colors: [...new Set(variants.map(v => v.color))],
    variants, in_stock: variants.some(v => v.stock > 0),
    stock_total: variants.reduce((n, v) => n + v.stock, 0),
  };
}
const listProducts = ({ includeInactive = false, featured = false } = {}) =>
  all(`SELECT * FROM products WHERE ${includeInactive ? '1' : 'active=1'} ${featured ? 'AND featured=1' : ''} ORDER BY featured DESC, id`).map(productRow);
const getProduct = slugOrId => productRow(one('SELECT * FROM products WHERE slug=? OR id=?', String(slugOrId), Number(slugOrId) || -1));

// ---------- discounts ----------
function findDiscount(code) {
  if (!code) return null;
  const d = one('SELECT * FROM discounts WHERE code=? AND active=1', String(code).trim());
  return d || null;
}
const discountFor = (d, subtotal) => !d ? 0 : Math.min(subtotal, d.kind === 'percent' ? Math.round(subtotal * d.value / 100) : d.value);

// ---------- quote: validate a cart and price it ----------
class ShopError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

function quote(items, code) {
  if (!Array.isArray(items) || !items.length) throw new ShopError('Your cart is empty.');
  const lines = items.map(({ variantId, qty }) => {
    qty = Math.floor(Number(qty));
    if (!(qty >= 1 && qty <= 20)) throw new ShopError('Quantities must be between 1 and 20.');
    const v = one(`SELECT v.*, p.name, p.price_cents, p.active, p.slug, p.images, p.color_images
                   FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?`, Number(variantId));
    if (!v || !v.active) throw new ShopError('One of the items in your cart is no longer available. Remove it and try again.');
    if (v.stock < qty) throw new ShopError(v.stock === 0
      ? `${v.name} (${v.size}, ${v.color}) just sold out. Remove it to continue.`
      : `Only ${v.stock} left of ${v.name} (${v.size}, ${v.color}). Lower the quantity to continue.`);
    const img = parse(v.color_images, {})[v.color] || parse(v.images, [])[0] || '';
    return { variantId: v.id, slug: v.slug, name: v.name, size: v.size, color: v.color, qty, price_cents: v.price_cents, line_cents: v.price_cents * qty, image: img, stock: v.stock };
  });
  const subtotal = lines.reduce((n, l) => n + l.line_cents, 0);
  let d = null, discount = 0, codeError = null;
  if (code) { d = findDiscount(code); if (!d) codeError = `"${String(code).trim()}" isn't a valid discount code.`; else discount = discountFor(d, subtotal); }
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= FREE_SHIPPING_OVER() ? 0 : SHIPPING_CENTS();
  return {
    lines, subtotal_cents: subtotal, discount_cents: discount, discount_code: d ? d.code : null, code_error: codeError,
    discount_label: d ? (d.kind === 'percent' ? `${d.value}% off` : `${money(d.value)} off`) : null,
    shipping_cents: shipping, total_cents: afterDiscount + shipping,
    free_shipping_over_cents: FREE_SHIPPING_OVER(),
  };
}

// ---------- orders ----------
const nextNumber = () => {
  const r = one("SELECT number FROM orders ORDER BY id DESC LIMIT 1");
  const n = r ? parseInt(r.number.replace(/\D/g, ''), 10) + 1 : 1001;
  return `MS-${n}`;
};
const required = ['name', 'email', 'address1', 'city', 'postcode', 'country'];

function createOrder({ items, code, customer, payment }) {
  const q = quote(items, code);
  if (q.code_error) throw new ShopError(q.code_error);
  const c = customer || {};
  for (const k of required) if (!String(c[k] || '').trim()) throw new ShopError('Fill in your name, email and full shipping address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email).trim())) throw new ShopError('Enter a valid email address so we can send your receipt.');
  return tx(() => {
    const token = crypto.randomBytes(16).toString('hex');
    const number = nextNumber();
    const r = run(`INSERT INTO orders(number,token,email,name,address1,address2,city,region,postcode,country,
                   subtotal_cents,discount_code,discount_cents,shipping_cents,total_cents,payment)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      number, token, String(c.email).trim(), String(c.name).trim(), String(c.address1).trim(), String(c.address2 || '').trim(),
      String(c.city).trim(), String(c.region || '').trim(), String(c.postcode).trim(), String(c.country).trim(),
      q.subtotal_cents, q.discount_code, q.discount_cents, q.shipping_cents, q.total_cents, payment);
    const orderId = Number(r.lastInsertRowid);
    for (const l of q.lines) run('INSERT INTO order_items(order_id,variant_id,product_name,size,color,qty,price_cents) VALUES(?,?,?,?,?,?,?)',
      orderId, l.variantId, l.name, l.size, l.color, l.qty, l.price_cents);
    return { order: getOrder(orderId), quote: q };
  });
}

function getOrder(idOrToken) {
  const o = typeof idOrToken === 'number' ? one('SELECT * FROM orders WHERE id=?', idOrToken) : one('SELECT * FROM orders WHERE token=?', String(idOrToken));
  if (!o) return null;
  o.items = all('SELECT * FROM order_items WHERE order_id=? ORDER BY id', o.id);
  return o;
}

// Payment confirmed: take stock, count the discount use, email the customer. Safe to call twice.
function markPaid(orderId, { sessionId, when } = {}) {
  const done = tx(() => {
    const o = one('SELECT * FROM orders WHERE id=?', orderId);
    if (!o || o.status !== 'pending') return false;
    run(`UPDATE orders SET status='paid', paid_at=COALESCE(?, datetime('now')), stripe_session=COALESCE(?, stripe_session) WHERE id=?`, when || null, sessionId || null, orderId);
    for (const it of all('SELECT variant_id, qty FROM order_items WHERE order_id=?', orderId))
      if (it.variant_id) run('UPDATE variants SET stock = MAX(stock - ?, 0) WHERE id=?', it.qty, it.variant_id);
    if (o.discount_code) run('UPDATE discounts SET uses = uses + 1 WHERE code=?', o.discount_code);
    return true;
  });
  if (done && !when) email.orderConfirmation(getOrder(orderId));
  return done;
}

function markShipped(orderId) {
  const o = one('SELECT * FROM orders WHERE id=?', orderId);
  if (!o) throw new ShopError('Order not found.', 404);
  if (o.status !== 'paid') throw new ShopError(o.status === 'shipped' ? 'This order is already marked as shipped.' : 'Only paid orders can be marked as shipped.');
  run("UPDATE orders SET status='shipped', shipped_at=datetime('now') WHERE id=?", orderId);
  email.orderShipped(getOrder(orderId));
  return getOrder(orderId);
}

function lowStock() {
  return all(`SELECT v.id, v.size, v.color, v.stock, p.name, p.slug FROM variants v JOIN products p ON p.id=v.product_id
              WHERE p.active=1 AND v.stock <= ? ORDER BY v.stock, p.name`, LOW_STOCK());
}

function dashboard() {
  const today = one(`SELECT COUNT(*) orders, COALESCE(SUM(total_cents),0) sales FROM orders
                     WHERE status IN ('paid','shipped') AND date(paid_at,'localtime') = date('now','localtime')`);
  const week = one(`SELECT COUNT(*) orders, COALESCE(SUM(total_cents),0) sales FROM orders
                    WHERE status IN ('paid','shipped') AND date(paid_at,'localtime') >= date('now','localtime','-6 days')`);
  const toShip = one("SELECT COUNT(*) n FROM orders WHERE status='paid'").n;
  return { today, week, to_ship: toShip, low_stock: lowStock(), low_stock_threshold: LOW_STOCK() };
}

module.exports = { listProducts, getProduct, quote, createOrder, getOrder, markPaid, markShipped, lowStock, dashboard, findDiscount, money, ShopError, LOW_STOCK };
