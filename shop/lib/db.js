// SQLite database (Node's built-in driver). Everything lives in data/shop.db.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
const DB_FILE = process.env.SHOP_DB || path.join(DATA_DIR, 'shop.db');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Apparel',
  price_cents INTEGER NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',          -- JSON array of image URLs
  color_images TEXT NOT NULL DEFAULT '{}',    -- JSON map colour -> image URL
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL DEFAULT 'One size',
  color TEXT NOT NULL DEFAULT 'Default',
  stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, size, color)
);
CREATE TABLE IF NOT EXISTS discounts (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('percent','amount')),
  value INTEGER NOT NULL,                     -- percent (e.g. 10) or cents
  active INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,                 -- secret used in the customer's links
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','cancelled')),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  address1 TEXT NOT NULL, address2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL, region TEXT NOT NULL DEFAULT '', postcode TEXT NOT NULL, country TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  discount_code TEXT, discount_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  payment TEXT NOT NULL DEFAULT 'stripe',     -- 'stripe' or 'demo'
  stripe_session TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT, shipped_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL,
  qty INTEGER NOT NULL, price_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL COLLATE NOCASE, pw_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY, to_addr TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// ---------- helpers ----------
const one = (sql, ...a) => db.prepare(sql).get(...a);
const all = (sql, ...a) => db.prepare(sql).all(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);
const tx = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

const setting = (key, fallback) => { const r = one('SELECT value FROM settings WHERE key=?', key); return r ? r.value : fallback; };
const setSetting = (key, value) => run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value));

// Passwords: scrypt with a random salt.
const hashPassword = pw => { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`; };
const checkPassword = (pw, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'), b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const isEmpty = () => one('SELECT COUNT(*) n FROM products').n === 0;

module.exports = { db, one, all, run, tx, setting, setSetting, hashPassword, checkPassword, isEmpty, DATA_DIR, DB_FILE };
