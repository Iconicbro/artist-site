// Madscope merch store. Start with:  npm start   (then open http://localhost:3000)
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');

// Optional settings file: shop/.env (KEY=value lines)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { one, all, run, isEmpty, checkPassword, hashPassword, DATA_DIR } = require('./lib/db');
if (isEmpty()) require('./seed').seed();
const store = require('./lib/store');
const stripe = require('./lib/stripe');
const views = require('./lib/views');
const { ShopError } = store;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false }));

const SITE_DIR = path.join(__dirname, '..', 'madscope');
app.use('/madscope', express.static(SITE_DIR));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: '7d' }));
app.get('/', (req, res) => res.redirect('/madscope/'));

const baseUrl = req => process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ================= Storefront =================
app.get('/shop', (req, res) => res.send(views.shopIndex(store.listProducts())));
app.get('/shop/p/:slug', (req, res) => {
  const p = store.getProduct(req.params.slug);
  if (!p || !p.active) return res.status(404).send(views.message('Not found', "We couldn't find that product. It may have sold out or been removed."));
  res.send(views.productPage(p));
});
app.get('/shop/cart', (req, res) => res.send(views.cartPage({ stripe: stripe.enabled() })));

app.get('/shop/order/:token', (req, res) => {
  const o = store.getOrder(req.params.token);
  if (!o) return res.status(404).send(views.message('Order not found', 'Check the link in your confirmation email.'));
  res.send(views.orderPage(o));
});

// After Stripe Checkout: confirm the payment with Stripe, then mark the order paid.
app.get('/shop/success', wrap(async (req, res) => {
  const o = store.getOrder(String(req.query.order || ''));
  if (!o) return res.status(404).send(views.message('Order not found', 'Check the link in your confirmation email.'));
  if (o.status === 'pending' && o.payment === 'stripe') {
    // Always ask Stripe about the session saved on the order, never one taken from the link.
    const session = o.stripe_session ? await stripe.getSession(o.stripe_session).catch(() => null) : null;
    if (!session || session.payment_status !== 'paid' || String(session.metadata?.order_id) !== String(o.id))
      return res.send(views.message('Payment not finished', "We haven't received payment for this order yet. Your cart is still saved.", '/shop/cart', 'Back to cart'));
    store.markPaid(o.id, { sessionId: session.id });
  }
  res.send(views.orderPage(store.getOrder(o.token), { justPaid: true }));
}));

// Demo payment (only when Stripe isn't configured).
app.get('/shop/pay/:token', (req, res) => {
  const o = store.getOrder(req.params.token);
  if (!o || stripe.enabled()) return res.status(404).send(views.message('Not found', 'This payment link is not available.'));
  if (o.status !== 'pending') return res.redirect(`/shop/order/${o.token}`);
  res.send(views.demoPayPage(o));
});
app.post('/shop/pay/:token', (req, res) => {
  const o = store.getOrder(req.params.token);
  if (!o || stripe.enabled()) return res.status(404).send(views.message('Not found', 'This payment link is not available.'));
  store.markPaid(o.id);
  res.redirect(`/shop/success?order=${o.token}`);
});

// ================= Shop API =================
app.get('/api/products', (req, res) => res.json(store.listProducts({ featured: req.query.featured === '1' })));
app.post('/api/quote', (req, res) => res.json(store.quote(req.body.items, req.body.code)));
app.post('/api/checkout', wrap(async (req, res) => {
  const useStripe = stripe.enabled();
  const { order, quote } = store.createOrder({ items: req.body.items, code: req.body.code, customer: req.body.customer, payment: useStripe ? 'stripe' : 'demo' });
  if (!useStripe) return res.json({ url: `/shop/pay/${order.token}` });
  let session;
  try { session = await stripe.createCheckout({ order, quote, baseUrl: baseUrl(req) }); }
  catch (e) { run("UPDATE orders SET status='cancelled' WHERE id=?", order.id); e.status = 502; throw e; }
  run('UPDATE orders SET stripe_session=? WHERE id=?', session.id, order.id);
  res.json({ url: session.url });
}));

// ================= Admin =================
const COOKIE = 'ms_admin';
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=').map(decodeURIComponent)).filter(p => p[0]));
function currentAdmin(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  return one(`SELECT a.id, a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token=? AND s.expires_at > datetime('now')`, t) || null;
}
function requireAdmin(req, res, next) {
  const a = currentAdmin(req);
  if (!a) return res.status(401).json({ error: 'Please log in again.' });
  // Changes must come from our own admin page (blocks cross-site form posts).
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'madscope-admin') return res.status(403).json({ error: 'Request blocked.' });
  req.admin = a; next();
}
const setCookie = (res, token, maxAge) => res.setHeader('Set-Cookie',
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.PUBLIC_URL?.startsWith('https') ? '; Secure' : ''}`);

app.get(['/admin', '/admin/*'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const attempts = new Map(); // simple login rate limit per IP
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip, now = Date.now(), a = (attempts.get(ip) || []).filter(t => now - t < 15 * 60e3);
  if (a.length >= 10) return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes and try again.' });
  const admin = one('SELECT * FROM admins WHERE email=?', String(req.body.email || '').trim());
  if (!admin || !checkPassword(String(req.body.password || ''), admin.pw_hash)) {
    attempts.set(ip, [...a, now]);
    return res.status(401).json({ error: 'That email and password don’t match. Check them and try again.' });
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  run("INSERT INTO sessions(token,admin_id,expires_at) VALUES(?,?,datetime('now','+14 days'))", token, admin.id);
  setCookie(res, token, 14 * 86400);
  res.json({ email: admin.email });
});
app.post('/api/admin/logout', (req, res) => {
  const t = cookies(req)[COOKIE]; if (t) run('DELETE FROM sessions WHERE token=?', t);
  setCookie(res, '', 0); res.json({ ok: true });
});
app.get('/api/admin/me', (req, res) => { const a = currentAdmin(req); a ? res.json({ email: a.email, stripe: stripe.enabled() }) : res.status(401).json({ error: 'Not logged in.' }); });

const admin = express.Router();
admin.use(requireAdmin);
admin.get('/dashboard', (req, res) => res.json(store.dashboard()));

admin.get('/orders', (req, res) => {
  const status = ['pending', 'paid', 'shipped'].includes(req.query.status) ? req.query.status : null;
  const rows = all(`SELECT * FROM orders ${status ? 'WHERE status=?' : ''} ORDER BY created_at DESC, id DESC LIMIT 300`, ...(status ? [status] : []));
  const items = all(`SELECT * FROM order_items WHERE order_id IN (${rows.map(r => r.id).join(',') || 0})`);
  res.json(rows.map(o => ({ ...o, token: undefined, items: items.filter(i => i.order_id === o.id) })));
});
admin.post('/orders/:id/ship', (req, res) => res.json(store.markShipped(Number(req.params.id))));

admin.get('/orders.xlsx', wrap(async (req, res) => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook(); wb.creator = 'Madscope Store';
  const ws = wb.addWorksheet('Orders', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Order', key: 'number', width: 11 }, { header: 'Date', key: 'date', width: 18 }, { header: 'Status', key: 'status', width: 10 },
    { header: 'Customer', key: 'name', width: 22 }, { header: 'Email', key: 'email', width: 30 }, { header: 'Items', key: 'items', width: 48 },
    { header: 'Subtotal', key: 'subtotal', width: 11 }, { header: 'Discount', key: 'discount', width: 11 }, { header: 'Code', key: 'code', width: 12 },
    { header: 'Shipping', key: 'shipping', width: 10 }, { header: 'Total', key: 'total', width: 11 },
    { header: 'Ship to', key: 'address', width: 48 }, { header: 'Shipped on', key: 'shipped', width: 18 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3262E' } };
  const orders = all("SELECT * FROM orders WHERE status IN ('paid','shipped') ORDER BY paid_at DESC");
  for (const o of orders) {
    const its = all('SELECT * FROM order_items WHERE order_id=?', o.id);
    const d = s => s ? new Date(s.replace(' ', 'T') + 'Z') : null;
    ws.addRow({
      number: o.number, date: d(o.paid_at), status: o.status, name: o.name, email: o.email,
      items: its.map(i => `${i.qty} × ${i.product_name} (${i.size}, ${i.color})`).join('; '),
      subtotal: o.subtotal_cents / 100, discount: o.discount_cents / 100, code: o.discount_code || '', shipping: o.shipping_cents / 100, total: o.total_cents / 100,
      address: [o.address1, o.address2, o.city, o.region, o.postcode, o.country].filter(Boolean).join(', '), shipped: d(o.shipped_at),
    });
  }
  for (const k of ['subtotal', 'discount', 'shipping', 'total']) ws.getColumn(k).numFmt = '$#,##0.00';
  for (const k of ['date', 'shipped']) ws.getColumn(k).numFmt = 'yyyy-mm-dd hh:mm';
  ws.autoFilter = { from: 'A1', to: 'M1' };
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="madscope-orders-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res); res.end();
}));

// Products
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(DATA_DIR, 'uploads'),
    filename: (req, f, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${(path.extname(f.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '')}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (req, f, cb) => /^image\/(jpeg|png|webp|gif|avif)$/.test(f.mimetype) ? cb(null, true) : cb(new ShopError('Photos must be JPG, PNG, WebP, GIF or AVIF images.')),
});
const list = s => [...new Set(String(s || '').split(',').map(x => x.trim()).filter(Boolean))];
const cents = v => { const n = Math.round(parseFloat(String(v).replace(/[^0-9.]/g, '')) * 100); return Number.isFinite(n) && n > 0 ? n : null; };
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';

admin.get('/products', (req, res) => res.json(store.listProducts({ includeInactive: true })));
admin.post('/products', upload.array('photos', 8), (req, res) => {
  const name = String(req.body.name || '').trim(), price = cents(req.body.price);
  if (!name) throw new ShopError('Give the product a name.');
  if (!price) throw new ShopError('Enter a price, for example 35 or 35.00.');
  const sizes = list(req.body.sizes), colors = list(req.body.colors);
  const stock = Math.max(0, Math.floor(Number(req.body.stock) || 0));
  const images = (req.files || []).map(f => `/uploads/${f.filename}`);
  if (!images.length) throw new ShopError('Add at least one photo.');
  let slug = slugify(name); for (let i = 2; one('SELECT 1 FROM products WHERE slug=?', slug); i++) slug = `${slugify(name)}-${i}`;
  const r = run('INSERT INTO products(slug,name,description,category,price_cents,images,featured) VALUES(?,?,?,?,?,?,?)',
    slug, name, String(req.body.description || '').trim(), String(req.body.category || 'Apparel').trim() || 'Apparel', price, JSON.stringify(images), req.body.featured === 'true' ? 1 : 0);
  const pid = Number(r.lastInsertRowid);
  for (const c of colors.length ? colors : ['Default']) for (const s of sizes.length ? sizes : ['One size'])
    run('INSERT INTO variants(product_id,size,color,stock) VALUES(?,?,?,?)', pid, s, c, stock);
  res.status(201).json(store.getProduct(pid));
});
admin.post('/products/:id/photos', upload.array('photos', 8), (req, res) => {
  const p = store.getProduct(Number(req.params.id)); if (!p) throw new ShopError('Product not found.', 404);
  const images = [...p.images, ...(req.files || []).map(f => `/uploads/${f.filename}`)];
  run('UPDATE products SET images=? WHERE id=?', JSON.stringify(images), p.id);
  res.json(store.getProduct(p.id));
});
admin.patch('/products/:id', (req, res) => {
  const p = store.getProduct(Number(req.params.id)); if (!p) throw new ShopError('Product not found.', 404);
  const b = req.body;
  if ('name' in b && !String(b.name).trim()) throw new ShopError('The product needs a name.');
  const price = 'price' in b ? cents(b.price) : p.price_cents; if (!price) throw new ShopError('Enter a valid price.');
  let images = p.images;
  if (Array.isArray(b.images)) { images = b.images.filter(u => p.images.includes(u)); if (!images.length) throw new ShopError('A product needs at least one photo.'); }
  run('UPDATE products SET name=?, description=?, category=?, price_cents=?, active=?, featured=?, images=? WHERE id=?',
    'name' in b ? String(b.name).trim() : p.name, 'description' in b ? String(b.description) : p.description,
    'category' in b ? String(b.category).trim() || p.category : p.category, price,
    'active' in b ? (b.active ? 1 : 0) : +p.active, 'featured' in b ? (b.featured ? 1 : 0) : +p.featured, JSON.stringify(images), p.id);
  // colour photos fall back to the first photo once custom photos are used
  if (Array.isArray(b.images)) run("UPDATE products SET color_images='{}' WHERE id=? AND images NOT LIKE '%/madscope/media/merch/%'", p.id);
  res.json(store.getProduct(p.id));
});
admin.put('/variants/:id', (req, res) => {
  const stock = Math.floor(Number(req.body.stock));
  if (!(stock >= 0 && stock <= 99999)) throw new ShopError('Stock must be a whole number, 0 or more.');
  const r = run('UPDATE variants SET stock=? WHERE id=?', stock, Number(req.params.id));
  if (!r.changes) throw new ShopError('Variant not found.', 404);
  res.json(one('SELECT * FROM variants WHERE id=?', Number(req.params.id)));
});

// Discount codes
admin.get('/discounts', (req, res) => res.json(all('SELECT * FROM discounts ORDER BY created_at DESC')));
admin.post('/discounts', (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) throw new ShopError('Codes use 3–24 letters or numbers, no spaces.');
  const kind = req.body.kind === 'amount' ? 'amount' : 'percent';
  const value = kind === 'percent' ? Math.floor(Number(req.body.value)) : cents(req.body.value);
  if (kind === 'percent' && !(value >= 1 && value <= 90)) throw new ShopError('Percent off must be between 1 and 90.');
  if (kind === 'amount' && !value) throw new ShopError('Enter the dollar amount off, for example 5.');
  if (one('SELECT 1 FROM discounts WHERE code=?', code)) throw new ShopError(`The code ${code} already exists.`);
  run('INSERT INTO discounts(code,kind,value) VALUES(?,?,?)', code, kind, value);
  res.status(201).json(one('SELECT * FROM discounts WHERE code=?', code));
});
admin.patch('/discounts/:code', (req, res) => {
  const r = run('UPDATE discounts SET active=? WHERE code=?', req.body.active ? 1 : 0, req.params.code);
  if (!r.changes) throw new ShopError('Code not found.', 404);
  res.json(one('SELECT * FROM discounts WHERE code=?', req.params.code));
});

admin.get('/emails', (req, res) => res.json(all('SELECT id,to_addr,subject,status,created_at FROM emails ORDER BY id DESC LIMIT 100')));
admin.get('/emails/:id', (req, res) => { const e = one('SELECT * FROM emails WHERE id=?', Number(req.params.id)); e ? res.type('html').send(e.html) : res.status(404).end(); });

admin.post('/password', (req, res) => {
  const a = one('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (!checkPassword(String(req.body.current || ''), a.pw_hash)) throw new ShopError('Your current password is wrong.');
  if (String(req.body.next || '').length < 10) throw new ShopError('Choose a new password of at least 10 characters.');
  run('UPDATE admins SET pw_hash=? WHERE id=?', hashPassword(String(req.body.next)), a.id);
  res.json({ ok: true });
});
app.use('/api/admin', admin);

// ================= Errors =================
app.use((err, req, res, next) => {
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  const msg = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 8 MB.' : 'Upload failed. Try fewer or smaller photos.')
    : status < 500 ? err.message : (status === 502 ? 'We couldn’t reach the payment provider. Nothing was charged. Please try again in a minute.' : 'Something went wrong on our side. Please try again.');
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: msg });
  res.status(status).send(views.message('Something went wrong', msg));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`\n  Madscope store running:  http://localhost:${PORT}`);
  console.log(`  Shop:   http://localhost:${PORT}/shop`);
  console.log(`  Admin:  http://localhost:${PORT}/admin`);
  console.log(`  Payments: ${stripe.enabled() ? 'Stripe Checkout (use a test key)' : 'demo mode (set STRIPE_SECRET_KEY in shop/.env for Stripe)'}\n`);
});
