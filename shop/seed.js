// Fills the store with demo products, discount codes, an admin login and realistic orders.
// Runs automatically the first time the server starts. `npm run seed` wipes and re-seeds.
const crypto = require('node:crypto');
const { db, run, one, tx, hashPassword, setSetting } = require('./lib/db');

const IMG = n => `/madscope/media/merch/${n}.svg`;
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const PRODUCTS = [
  { slug: 'stack-paper-tee', name: 'Stack Paper Tee', category: 'Tees', price: 3500, featured: 1,
    description: 'Heavyweight 240gsm cotton tee with the Madscope target logo across the chest. Boxy fit, built to be worn loud.',
    colors: { Black: 'tee-black', White: 'tee-white' }, sizes: SIZES,
    stock: { Black: [12, 18, 20, 9, 4], White: [8, 14, 3, 6, 0] } },
  { slug: 'madscope-logo-hoodie', name: 'Madscope Logo Hoodie', category: 'Hoodies', price: 7000, featured: 1,
    description: 'Brushed-fleece pullover hoodie with a kangaroo pocket and the Madscope wordmark. Warm enough for the late sessions.',
    colors: { Black: 'hoodie-black', Red: 'hoodie-red' }, sizes: SIZES,
    stock: { Black: [6, 10, 11, 7, 2], Red: [3, 5, 6, 4, 1] } },
  { slug: 'til-a-mawnin-long-sleeve', name: "Til a Mawnin' Long Sleeve", category: 'Tees', price: 4200, featured: 1,
    description: 'Midweight long-sleeve tee celebrating the single. Ribbed cuffs, relaxed fit.',
    colors: { Black: 'longsleeve-black', Bone: 'longsleeve-bone' }, sizes: SIZES,
    stock: { Black: [5, 9, 9, 6, 3], Bone: [4, 7, 8, 2, 2] } },
  { slug: 'scope-snapback', name: 'Scope Snapback', category: 'Accessories', price: 3000, featured: 1,
    description: 'Structured six-panel snapback with a red flat brim and embroidered Madscope logo.',
    colors: { Black: 'cap-black', White: 'cap-white' }, sizes: ['One size'],
    stock: { Black: [22], White: [4] } },
  { slug: 'rebirth-poster', name: 'Rebirth EP Poster', category: 'Prints', price: 2000, featured: 0,
    description: '18 × 24 in matte art print for the Rebirth EP. Shipped rolled in a tube.',
    colors: { Black: 'poster-rebirth' }, sizes: ['18 × 24 in'],
    stock: { Black: [30] } },
  { slug: '1-charge-tote', name: '1 Charge Tote Bag', category: 'Accessories', price: 2200, featured: 0,
    description: 'Heavy canvas tote with long handles. Fits a laptop, records and the rest.',
    colors: { Natural: 'tote-natural', Black: 'tote-black' }, sizes: ['One size'],
    stock: { Natural: [15], Black: [5] } },
];

const DISCOUNTS = [['MADSCOPE10', 'percent', 10], ['STACKPAPER', 'amount', 500], ['WELCOME15', 'percent', 15]];

const CUSTOMERS = [
  ['Shanice Williams', 'Kingston', 'St. Andrew', 'JMAKN05', 'Jamaica'],
  ['Marcus Reid', 'Brooklyn', 'NY', '11226', 'United States'],
  ['Tanisha Brown', 'Toronto', 'ON', 'M6E 2Z5', 'Canada'],
  ['Andre Campbell', 'Miami', 'FL', '33138', 'United States'],
  ['Kemar Thompson', 'London', '', 'SE15 4QL', 'United Kingdom'],
  ['Alicia Grant', 'Montego Bay', 'St. James', 'JMCJS12', 'Jamaica'],
  ['Devon Clarke', 'Fort Lauderdale', 'FL', '33311', 'United States'],
  ['Renee Johnson', 'Hartford', 'CT', '06120', 'United States'],
  ['Jerome Bailey', 'Birmingham', '', 'B19 1AA', 'United Kingdom'],
  ['Kadian Morgan', 'Ocho Rios', 'St. Ann', 'JMCAN04', 'Jamaica'],
  ['Omari Lewis', 'Atlanta', 'GA', '30310', 'United States'],
  ['Simone Edwards', 'Mississauga', 'ON', 'L5B 3C2', 'Canada'],
];

function seed({ reset = false } = {}) {
  tx(() => {
    if (reset) db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM variants; DELETE FROM products; DELETE FROM discounts; DELETE FROM sessions; DELETE FROM admins; DELETE FROM emails; DELETE FROM settings;');

    // settings
    setSetting('shipping_cents', 600);
    setSetting('free_shipping_over_cents', 7500);
    setSetting('low_stock_threshold', 5);

    // products + variants
    const variantIds = [];
    for (const p of PRODUCTS) {
      const colorImages = Object.fromEntries(Object.entries(p.colors).map(([c, f]) => [c, IMG(f)]));
      const r = run('INSERT INTO products(slug,name,description,category,price_cents,images,color_images,featured) VALUES(?,?,?,?,?,?,?,?)',
        p.slug, p.name, p.description, p.category, p.price, JSON.stringify(Object.values(colorImages)), JSON.stringify(colorImages), p.featured);
      const pid = Number(r.lastInsertRowid);
      for (const color of Object.keys(p.colors)) p.sizes.forEach((size, i) => {
        const v = run('INSERT INTO variants(product_id,size,color,stock) VALUES(?,?,?,?)', pid, size, color, p.stock[color][i]);
        variantIds.push({ id: Number(v.lastInsertRowid), name: p.name, size, color, price: p.price });
      });
    }

    for (const [code, kind, value] of DISCOUNTS) run('INSERT INTO discounts(code,kind,value) VALUES(?,?,?)', code, kind, value);

    // admin login
    const adminEmail = process.env.ADMIN_EMAIL || 'owner@madscope.shop';
    const adminPw = process.env.ADMIN_PASSWORD || 'stackpaper2026';
    run('INSERT INTO admins(email,pw_hash) VALUES(?,?)', adminEmail, hashPassword(adminPw));

    // demo orders across the last 14 days (a few today). Deterministic so the demo looks the same each time.
    let seedN = 7; const rnd = () => (seedN = (seedN * 9301 + 49297) % 233280) / 233280;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const pad = n => String(n).padStart(2, '0');
    const at = (daysAgo, h, m) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`; };
    const plan = [ // [daysAgo, status]
      [13,'shipped'],[12,'shipped'],[12,'shipped'],[11,'shipped'],[10,'shipped'],[9,'shipped'],[9,'shipped'],[8,'shipped'],
      [7,'shipped'],[6,'shipped'],[5,'shipped'],[5,'shipped'],[4,'shipped'],[3,'paid'],[3,'shipped'],[2,'paid'],[2,'paid'],
      [1,'paid'],[1,'pending'],[0,'paid'],[0,'paid'],[0,'paid'],[0,'pending'],
    ];
    plan.forEach(([days, status], i) => {
      const c = CUSTOMERS[i % CUSTOMERS.length];
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({ v: pick(variantIds), qty: rnd() < .8 ? 1 : 2 }));
      const subtotal = lines.reduce((n, l) => n + l.v.price * l.qty, 0);
      const code = rnd() < .25 ? pick(DISCOUNTS) : null;
      const discount = code ? (code[1] === 'percent' ? Math.round(subtotal * code[2] / 100) : code[2]) : 0;
      const shipping = subtotal - discount >= 7500 ? 0 : 600;
      const hour = days === 0 ? Math.min(new Date().getHours(), 8 + i % 3) : 9 + Math.floor(rnd() * 12);
      const created = at(days, hour, Math.floor(rnd() * 59));
      const r = run(`INSERT INTO orders(number,token,status,email,name,address1,city,region,postcode,country,subtotal_cents,discount_code,discount_cents,shipping_cents,total_cents,payment,created_at,paid_at,shipped_at)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        `MS-${1001 + i}`, crypto.randomBytes(16).toString('hex'), status,
        c[0].toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com', c[0], `${10 + i * 7} ${pick(['Hope Road', 'Main Street', 'Church Lane', 'Ocean Drive', 'King Street'])}`,
        c[1], c[2], c[3], c[4], subtotal, code ? code[0] : null, discount, shipping, subtotal - discount + shipping, 'demo',
        created, status === 'pending' ? null : created, status === 'shipped' ? at(Math.max(days - 1, 0), 15, 30) : null);
      const oid = Number(r.lastInsertRowid);
      for (const l of lines) run('INSERT INTO order_items(order_id,variant_id,product_name,size,color,qty,price_cents) VALUES(?,?,?,?,?,?,?)', oid, l.v.id, l.v.name, l.v.size, l.v.color, l.qty, l.v.price);
      if (code && status !== 'pending') run('UPDATE discounts SET uses=uses+1 WHERE code=?', code[0]);
    });
    console.log(`Seeded ${PRODUCTS.length} products, ${variantIds.length} variants, ${plan.length} demo orders. Admin: ${adminEmail} / ${adminPw}`);
  });
}

module.exports = { seed };
if (require.main === module) seed({ reset: process.argv.includes('--reset') || one('SELECT COUNT(*) n FROM products').n > 0 });
