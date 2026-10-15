/**
 * Local SQLite database for RetailEase.
 *
 * Uses Node's built-in `node:sqlite` driver, so there is no cloud service and
 * no native dependency to install. The database file lives at
 * `data/retailease.db` inside the project folder.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { SEED } from "./seed-data";

type Row = Record<string, unknown>;

export type Db = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => { lastInsertRowid: number | bigint; changes: number | bigint };
    get: (...args: unknown[]) => Row | undefined;
    all: (...args: unknown[]) => Row[];
  };
};

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Shop Owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'piece',
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  status TEXT NOT NULL DEFAULT 'paid',
  sold_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity REAL NOT NULL DEFAULT 1,
  rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('debit','credit')),
  amount REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  note TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in','out','adjustment')),
  quantity REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(`retailease:${password}`).digest("hex");
}

const SESSION_SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SESSION_COOKIE = "re_session";

/**
 * Each shop owner gets their own data file. The demo owner (user #1) uses the
 * main seeded database; every new account starts with an empty shop file
 * (data/shop-<id>.db) so owners never see each other's records.
 */
const shopDbs = new Map<number, Db>();
export async function getShopDb(userId: number): Promise<Db> {
  if (userId === 1) return getDb();
  const cached = shopDbs.get(userId);
  if (cached) return cached;
  const { DatabaseSync } = (await import("node:sqlite")) as unknown as {
    DatabaseSync: new (p: string) => Db;
  };
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, `shop-${userId}.db`));
  db.exec(SCHEMA);
  shopDbs.set(userId, db);
  return db;
}

/** Returns the signed-in user (from the session cookie) or null. */
export async function getSessionUser(): Promise<Row | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const db = await getDb();
  return (
    db
      .prepare(
        `SELECT u.id, u.name, u.phone, u.shop_name, u.role FROM sessions s
         JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      )
      .get(token) ?? null
  );
}

export async function startSession(userId: number) {
  const { setCookie } = await import("@tanstack/react-start/server");
  const token = crypto.randomBytes(24).toString("hex");
  (await getDb()).prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(SESSION_COOKIE);
  if (token) (await getDb()).prepare("DELETE FROM sessions WHERE token = ?").run(token);
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

let dbPromise: Promise<Db> | undefined;

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openDb().catch((error) => {
      dbPromise = undefined;
      throw error;
    });
  }
  return dbPromise;
}

async function openDb(): Promise<Db> {
  const { DatabaseSync } = (await import("node:sqlite")) as unknown as {
    DatabaseSync: new (p: string) => Db;
  };
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "retailease.db"));
  db.exec(SCHEMA);
  db.exec(SESSION_SCHEMA);
  seedIfEmpty(db);
  return db;
}

/** Demo/seed data is applied only once, when the database is still empty. */
function seedIfEmpty(db: Db) {
  const userCount = Number(
    (db.prepare("SELECT COUNT(*) AS c FROM users").get()?.["c"] as number) ?? 0,
  );
  if (userCount > 0) return;

  db.prepare(
    "INSERT INTO users (name, phone, password_hash, shop_name, role) VALUES (?, ?, ?, ?, ?)",
  ).run(
    SEED.owner.name,
    SEED.owner.phone,
    hashPassword(SEED.owner.password),
    SEED.owner.shopName,
    "Shop Owner",
  );

  const insertCustomer = db.prepare(
    "INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)",
  );
  for (const c of SEED.customers) {
    insertCustomer.run(c.name, c.phone, c.address, c.notes);
  }

  const insertProduct = db.prepare(
    `INSERT INTO products (sku, name, category, unit, cost_price, selling_price, stock, low_stock_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of SEED.products) {
    insertProduct.run(p.sku, p.name, p.category, p.unit, p.cost, p.price, p.stock, p.threshold);
  }

  const insertSale = db.prepare(
    `INSERT INTO sales (invoice_no, customer_id, total, payment_method, status, sold_at)
     VALUES (?, (SELECT id FROM customers WHERE phone = ?), ?, ?, ?, ?)`,
  );
  const insertSaleItem = db.prepare(
    `INSERT INTO sale_items (sale_id, product_id, quantity, rate, amount)
     VALUES (?, (SELECT id FROM products WHERE sku = ?), ?, ?, ?)`,
  );
  for (const s of SEED.sales) {
    const res = insertSale.run(
      s.invoice,
      s.customerPhone,
      s.total,
      s.method,
      s.status,
      s.soldAt,
    );
    const saleId = Number(res.lastInsertRowid);
    for (const item of s.items) {
      insertSaleItem.run(saleId, item.sku, item.qty, item.rate, item.qty * item.rate);
    }
  }

  const insertCredit = db.prepare(
    `INSERT INTO credit_transactions (customer_id, type, amount, note, occurred_at)
     VALUES ((SELECT id FROM customers WHERE phone = ?), ?, ?, ?, ?)`,
  );
  for (const t of SEED.creditTransactions) {
    insertCredit.run(t.customerPhone, t.type, t.amount, t.note, t.occurredAt);
  }

  const insertPayment = db.prepare(
    `INSERT INTO payments (receipt_no, customer_id, amount, method, note, paid_at)
     VALUES (?, (SELECT id FROM customers WHERE phone = ?), ?, ?, ?, ?)`,
  );
  for (const p of SEED.payments) {
    insertPayment.run(p.receipt, p.customerPhone, p.amount, p.method, p.note, p.paidAt);
  }

  const insertMovement = db.prepare(
    `INSERT INTO inventory_movements (product_id, type, quantity, note, occurred_at)
     VALUES ((SELECT id FROM products WHERE sku = ?), ?, ?, ?, ?)`,
  );
  for (const m of SEED.movements) {
    insertMovement.run(m.sku, m.type, m.quantity, m.note, m.occurredAt);
  }
}
