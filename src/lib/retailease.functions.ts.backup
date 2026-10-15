import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Db } from "./db.server";

async function db(): Promise<Db> {
  const mod = await import("./db.server");
  const user = await mod.getSessionUser();
  if (!user) throw new Error("Please sign in to continue");
  return mod.getShopDb(Number(user["id"]));
}

const BALANCE_SQL = `
  COALESCE((
    SELECT SUM(CASE ct.type WHEN 'debit' THEN ct.amount ELSE -ct.amount END)
    FROM credit_transactions ct WHERE ct.customer_id = c.id
  ), 0)
`;

/* ------------------------------------------------------------------ shop */

export type Shop = { name: string; owner: string; role: string; phone: string };

/** Current signed-in shop, or null when nobody is signed in. */
export const getShop = createServerFn({ method: "GET" }).handler(async (): Promise<Shop | null> => {
  const { getSessionUser } = await import("./db.server");
  const row = await getSessionUser();
  if (!row) return null;
  return {
    name: row["shop_name"] as string,
    owner: row["name"] as string,
    role: row["role"] as string,
    phone: row["phone"] as string,
  };
});

/* ------------------------------------------------------------------ auth */

const mobileSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^\d{10}$/.test(v), "Enter a valid 10-digit mobile number (digits only)");

export const NO_ACCOUNT = "NO_ACCOUNT";

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ phone: mobileSchema, password: z.string().min(1, "Enter your password") }).parse(data),
  )
  .handler(async ({ data }) => {
    const mod = await import("./db.server");
    const d = await mod.getDb();
    const row = d.prepare("SELECT id, password_hash FROM users WHERE phone = ?").get(data.phone);
    if (!row) throw new Error(NO_ACCOUNT);
    if (row["password_hash"] !== mod.hashPassword(data.password)) {
      throw new Error("Incorrect password for this mobile number");
    }
    await mod.startSession(Number(row["id"]));
    return { ok: true };
  });

export const signup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Enter your name").max(80),
        shopName: z.string().trim().min(2, "Enter your shop name").max(100),
        phone: mobileSchema,
        password: z.string().min(6, "Password must be at least 6 characters").max(100),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mod = await import("./db.server");
    const d = await mod.getDb();
    if (d.prepare("SELECT id FROM users WHERE phone = ?").get(data.phone)) {
      throw new Error("An account with this mobile number already exists. Please sign in.");
    }
    const res = d
      .prepare("INSERT INTO users (name, phone, password_hash, shop_name, role) VALUES (?, ?, ?, ?, 'Shop Owner')")
      .run(data.name, data.phone, mod.hashPassword(data.password), data.shopName);
    await mod.startSession(Number(res.lastInsertRowid));
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("./db.server");
  await endSession();
  return { ok: true };
});

/* ------------------------------------------------------------- customers */

export type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  outstanding: number;
  purchases: number;
};

export const listCustomers = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerRow[]> => {
    const d = await db();
    const rows = d
      .prepare(
        `SELECT c.id, c.name, c.phone, c.address, c.notes, c.created_at,
                ${BALANCE_SQL} AS outstanding,
                (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) AS purchases
         FROM customers c ORDER BY c.name`,
      )
      .all();
    return rows.map(mapCustomer);
  },
);

function mapCustomer(r: Record<string, unknown>): CustomerRow {
  return {
    id: Number(r["id"]),
    name: r["name"] as string,
    phone: r["phone"] as string,
    address: (r["address"] as string) ?? "",
    notes: (r["notes"] as string) ?? "",
    createdAt: r["created_at"] as string,
    outstanding: Number(r["outstanding"] ?? 0),
    purchases: Number(r["purchases"] ?? 0),
  };
}

const customerInput = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "Phone number is required"),
  address: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export const createCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerInput.parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const exists = d.prepare("SELECT id FROM customers WHERE phone = ?").get(data.phone);
    if (exists) throw new Error("A customer with this phone number already exists");
    d.prepare("INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)").run(
      data.name,
      data.phone,
      data.address,
      data.notes,
    );
    return { ok: true };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerInput.extend({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const clash = d
      .prepare("SELECT id FROM customers WHERE phone = ? AND id <> ?")
      .get(data.phone, data.id);
    if (clash) throw new Error("Another customer already uses this phone number");
    d.prepare(
      `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(data.name, data.phone, data.address, data.notes, data.id);
    return { ok: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    d.prepare("DELETE FROM customers WHERE id = ?").run(data.id);
    return { ok: true };
  });

export const getCustomerDetail = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const row = d
      .prepare(
        `SELECT c.id, c.name, c.phone, c.address, c.notes, c.created_at,
                ${BALANCE_SQL} AS outstanding,
                (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) AS purchases
         FROM customers c WHERE c.id = ?`,
      )
      .get(data.id);
    if (!row) throw new Error("Customer not found");

    const ledger = d
      .prepare(
        `SELECT type, amount, note, occurred_at FROM credit_transactions
         WHERE customer_id = ? ORDER BY occurred_at DESC LIMIT 10`,
      )
      .all(data.id)
      .map((r) => ({
        type: r["type"] as "debit" | "credit",
        amount: Number(r["amount"]),
        note: (r["note"] as string) ?? "",
        occurredAt: r["occurred_at"] as string,
      }));

    return { customer: mapCustomer(row), ledger };
  });

/* -------------------------------------------------------------- products */

export type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  threshold: number;
};

function mapProduct(r: Record<string, unknown>): ProductRow {
  return {
    id: Number(r["id"]),
    sku: r["sku"] as string,
    name: r["name"] as string,
    category: r["category"] as string,
    unit: r["unit"] as string,
    cost: Number(r["cost_price"]),
    price: Number(r["selling_price"]),
    stock: Number(r["stock"]),
    threshold: Number(r["low_stock_threshold"]),
  };
}

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductRow[]> => {
    const d = await db();
    return d.prepare("SELECT * FROM products ORDER BY name").all().map(mapProduct);
  },
);

const productInput = z.object({
  sku: z.string().trim().default(""),
  name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().default("General"),
  unit: z.string().trim().default("piece"),
  cost: z.number().min(0),
  price: z.number().min(0),
  stock: z.number().min(0),
  threshold: z.number().min(0),
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productInput.parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    let sku = data.sku;
    if (!sku) {
      const max = d.prepare("SELECT COUNT(*) AS c FROM products").get();
      sku = `SKU-${1001 + Number(max?.["c"] ?? 0)}`;
    }
    if (d.prepare("SELECT id FROM products WHERE sku = ?").get(sku)) {
      throw new Error("A product with this SKU already exists");
    }
    const res = d
      .prepare(
        `INSERT INTO products (sku, name, category, unit, cost_price, selling_price, stock, low_stock_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(sku, data.name, data.category, data.unit, data.cost, data.price, data.stock, data.threshold);
    if (data.stock > 0) {
      d.prepare(
        "INSERT INTO inventory_movements (product_id, type, quantity, note) VALUES (?, 'in', ?, 'Opening stock')",
      ).run(Number(res.lastInsertRowid), data.stock);
    }
    return { ok: true };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productInput.extend({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const clash = d.prepare("SELECT id FROM products WHERE sku = ? AND id <> ?").get(data.sku, data.id);
    if (clash) throw new Error("Another product already uses this SKU");
    d.prepare(
      `UPDATE products SET sku = ?, name = ?, category = ?, unit = ?, cost_price = ?,
              selling_price = ?, stock = ?, low_stock_threshold = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      data.sku,
      data.name,
      data.category,
      data.unit,
      data.cost,
      data.price,
      data.stock,
      data.threshold,
      data.id,
    );
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    d.prepare("DELETE FROM products WHERE id = ?").run(data.id);
    return { ok: true };
  });

/* ------------------------------------------------------------- inventory */

export const listMovements = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  return d
    .prepare(
      `SELECT m.type, m.quantity, m.note, m.occurred_at, p.name AS product
       FROM inventory_movements m LEFT JOIN products p ON p.id = m.product_id
       ORDER BY m.occurred_at DESC, m.id DESC LIMIT 12`,
    )
    .all()
    .map((r) => ({
      type: r["type"] as "in" | "out" | "adjustment",
      quantity: Number(r["quantity"]),
      note: (r["note"] as string) ?? "",
      occurredAt: r["occurred_at"] as string,
      product: (r["product"] as string) ?? "Deleted product",
    }));
});

export const recordMovement = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.number(),
        type: z.enum(["in", "out", "adjustment"]),
        quantity: z.number(),
        note: z.string().trim().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const d = await db();
    const delta =
      data.type === "in" ? Math.abs(data.quantity) : data.type === "out" ? -Math.abs(data.quantity) : data.quantity;
    d.prepare(
      "INSERT INTO inventory_movements (product_id, type, quantity, note) VALUES (?, ?, ?, ?)",
    ).run(data.productId, data.type, Math.abs(data.quantity) * (delta < 0 ? -1 : 1), data.note);
    d.prepare(
      "UPDATE products SET stock = MAX(0, stock + ?), updated_at = datetime('now') WHERE id = ?",
    ).run(delta, data.productId);
    return { ok: true };
  });

/* ----------------------------------------------------------------- sales */

export const listSales = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  return d
    .prepare(
      `SELECT s.invoice_no, s.total, s.payment_method, s.status, s.sold_at,
              COALESCE(c.name, 'Walk-in customer') AS customer,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.sold_at DESC, s.id DESC`,
    )
    .all()
    .map((r) => ({
      invoice: r["invoice_no"] as string,
      total: Number(r["total"]),
      method: r["payment_method"] as string,
      status: r["status"] as string,
      soldAt: r["sold_at"] as string,
      customer: r["customer"] as string,
      items: Number(r["items"]),
    }));
});

/* ---------------------------------------------------------------- credit */

export type CreditRow = {
  id: number;
  name: string;
  phone: string;
  outstanding: number;
  lastEntry: string | null;
};

export const listCredit = createServerFn({ method: "GET" }).handler(async (): Promise<CreditRow[]> => {
  const d = await db();
  return d
    .prepare(
      `SELECT c.id, c.name, c.phone, ${BALANCE_SQL} AS outstanding,
              (SELECT MAX(ct.occurred_at) FROM credit_transactions ct WHERE ct.customer_id = c.id) AS last_entry
       FROM customers c
       WHERE ${BALANCE_SQL} > 0
       ORDER BY outstanding DESC`,
    )
    .all()
    .map((r) => ({
      id: Number(r["id"]),
      name: r["name"] as string,
      phone: r["phone"] as string,
      outstanding: Number(r["outstanding"]),
      lastEntry: (r["last_entry"] as string) ?? null,
    }));
});

/* -------------------------------------------------------------- payments */

export const listPayments = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  return d
    .prepare(
      `SELECT p.receipt_no, p.amount, p.method, p.note, p.paid_at,
              COALESCE(c.name, 'Walk-in customer') AS customer
       FROM payments p LEFT JOIN customers c ON c.id = p.customer_id
       ORDER BY p.paid_at DESC, p.id DESC`,
    )
    .all()
    .map((r) => ({
      receipt: r["receipt_no"] as string,
      amount: Number(r["amount"]),
      method: r["method"] as string,
      note: (r["note"] as string) ?? "",
      paidAt: r["paid_at"] as string,
      customer: r["customer"] as string,
    }));
});

/* ------------------------------------------------------------- dashboard */

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  const num = (sql: string) => Number(d.prepare(sql).get()?.["v"] ?? 0);

  const todaySales = num(
    "SELECT COALESCE(SUM(total), 0) AS v FROM sales WHERE date(sold_at) = date('now')",
  );
  const todayCount = num("SELECT COUNT(*) AS v FROM sales WHERE date(sold_at) = date('now')");
  const outstanding = num(
    `SELECT COALESCE(SUM(CASE type WHEN 'debit' THEN amount ELSE -amount END), 0) AS v FROM credit_transactions`,
  );
  const creditCustomers = num(
    `SELECT COUNT(*) AS v FROM (SELECT customer_id FROM credit_transactions GROUP BY customer_id
       HAVING SUM(CASE type WHEN 'debit' THEN amount ELSE -amount END) > 0)`,
  );
  const lowStockCount = num("SELECT COUNT(*) AS v FROM products WHERE stock <= low_stock_threshold");
  const totalCustomers = num("SELECT COUNT(*) AS v FROM customers");
  const totalProducts = num("SELECT COUNT(*) AS v FROM products");

  const recentSales = d
    .prepare(
      `SELECT s.invoice_no, s.total, s.status, s.sold_at,
              COALESCE(c.name, 'Walk-in customer') AS customer,
              (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.sold_at DESC, s.id DESC LIMIT 5`,
    )
    .all()
    .map((r) => ({
      invoice: r["invoice_no"] as string,
      total: Number(r["total"]),
      status: r["status"] as string,
      soldAt: r["sold_at"] as string,
      customer: r["customer"] as string,
      items: Number(r["items"]),
    }));

  const lowStock = d
    .prepare(
      `SELECT name, category, stock, low_stock_threshold FROM products
       WHERE stock <= low_stock_threshold ORDER BY stock ASC LIMIT 5`,
    )
    .all()
    .map((r) => ({
      name: r["name"] as string,
      category: r["category"] as string,
      stock: Number(r["stock"]),
      threshold: Number(r["low_stock_threshold"]),
    }));

  const credit = d
    .prepare(
      `SELECT c.name, c.phone, ${BALANCE_SQL} AS outstanding,
              (SELECT MAX(ct.occurred_at) FROM credit_transactions ct WHERE ct.customer_id = c.id) AS last_entry
       FROM customers c WHERE ${BALANCE_SQL} > 0 ORDER BY outstanding DESC LIMIT 5`,
    )
    .all()
    .map((r) => ({
      name: r["name"] as string,
      phone: r["phone"] as string,
      outstanding: Number(r["outstanding"]),
      lastEntry: (r["last_entry"] as string) ?? null,
    }));

  return {
    todaySales,
    todayCount,
    outstanding,
    creditCustomers,
    lowStockCount,
    totalCustomers,
    totalProducts,
    recentSales,
    lowStock,
    credit,
  };
});

/* --------------------------------------------------------------- reports */

export const getReports = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();

  const daily = d
    .prepare(
      `SELECT date(sold_at) AS day, COALESCE(SUM(total), 0) AS total, COUNT(*) AS bills
       FROM sales WHERE date(sold_at) >= date('now', '-6 days')
       GROUP BY date(sold_at) ORDER BY day`,
    )
    .all()
    .map((r) => ({
      day: r["day"] as string,
      total: Number(r["total"]),
      bills: Number(r["bills"]),
    }));

  const byCategory = d
    .prepare(
      `SELECT p.category AS category, COALESCE(SUM(si.amount), 0) AS total
       FROM sale_items si JOIN products p ON p.id = si.product_id
       GROUP BY p.category ORDER BY total DESC`,
    )
    .all()
    .map((r) => ({ category: r["category"] as string, total: Number(r["total"]) }));

  const totals = d
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS sales, COUNT(*) AS bills FROM sales
       WHERE date(sold_at) >= date('now', '-6 days')`,
    )
    .get();

  const collected = Number(
    d
      .prepare("SELECT COALESCE(SUM(amount), 0) AS v FROM payments WHERE date(paid_at) >= date('now', '-6 days')")
      .get()?.["v"] ?? 0,
  );

  return {
    daily,
    byCategory,
    weekSales: Number(totals?.["sales"] ?? 0),
    weekBills: Number(totals?.["bills"] ?? 0),
    collected,
  };
});

/* ---------------------------------------------------------- transactions */

async function inTransaction<T>(fn: (d: Db) => T): Promise<T> {
  const d = await db();
  d.exec("BEGIN");
  try {
    const result = fn(d);
    d.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      d.exec("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw error;
  }
}

function nextNumber(d: Db, table: string, column: string, prefix: string, start: number) {
  const c = Number(d.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()?.["c"] ?? 0);
  let n = start + c;
  while (d.prepare(`SELECT 1 AS x FROM ${table} WHERE ${column} = ?`).get(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

function balanceOf(d: Db, customerId: number) {
  return Number(
    d
      .prepare(
        `SELECT COALESCE(SUM(CASE type WHEN 'debit' THEN amount ELSE -amount END), 0) AS v
         FROM credit_transactions WHERE customer_id = ?`,
      )
      .get(customerId)?.["v"] ?? 0,
  );
}

/* ----------------------------------------------------------- create sale */

const saleInput = z.object({
  customerId: z.number().nullable().default(null),
  method: z.enum(["Cash", "UPI", "Bank"]).default("Cash"),
  mode: z.enum(["paid", "credit", "partial"]).default("paid"),
  amountPaid: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.number({ invalid_type_error: "Select a product" }).int().positive("Select a product"),
        quantity: z.number().positive("Quantity must be greater than zero"),
      }),
    )
    .min(1, "Add at least one product"),
});

export const createSale = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saleInput.parse(data))
  .handler(async ({ data }) => {
    return inTransaction((d) => {
      if (data.customerId) {
        const c = d.prepare("SELECT id FROM customers WHERE id = ?").get(data.customerId);
        if (!c) throw new Error("Selected customer no longer exists");
      }

      const priced = data.items.map((item) => {
        const p = d
          .prepare("SELECT id, name, selling_price, stock FROM products WHERE id = ?")
          .get(item.productId);
        if (!p) throw new Error("Selected product no longer exists");
        const stock = Number(p["stock"]);
        if (item.quantity > stock) {
          throw new Error(
            `Not enough stock for ${p["name"]}. Only ${stock} left, ${item.quantity} requested.`,
          );
        }
        const rate = Number(p["selling_price"]);
        return { id: Number(p["id"]), name: p["name"] as string, rate, qty: item.quantity, amount: rate * item.quantity };
      });

      const total = Math.round(priced.reduce((s, i) => s + i.amount, 0) * 100) / 100;
      let paid = data.mode === "paid" ? total : data.mode === "credit" ? 0 : data.amountPaid;
      paid = Math.round(paid * 100) / 100;
      if (paid < 0) throw new Error("Paid amount cannot be negative");
      if (paid > total) throw new Error("Paid amount cannot be more than the bill total");
      if (data.mode === "partial" && paid === 0) throw new Error("Enter the amount the customer paid");

      const credit = Math.round((total - paid) * 100) / 100;
      if (credit > 0 && !data.customerId) {
        throw new Error("Select a customer before putting a bill on udhar");
      }

      const invoice = nextNumber(d, "sales", "invoice_no", "INV-", 1001);
      const status = credit === 0 ? "paid" : paid === 0 ? "udhar" : "partial";
      const methodLabel = credit > 0 ? (paid > 0 ? `${data.method} + Udhar` : "Udhar") : data.method;

      const sale = d
        .prepare(
          `INSERT INTO sales (invoice_no, customer_id, total, payment_method, status)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(invoice, data.customerId, total, methodLabel, status);
      const saleId = Number(sale.lastInsertRowid);

      const insertItem = d.prepare(
        "INSERT INTO sale_items (sale_id, product_id, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)",
      );
      const reduceStock = d.prepare(
        "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
      );
      const movement = d.prepare(
        "INSERT INTO inventory_movements (product_id, type, quantity, note) VALUES (?, 'out', ?, ?)",
      );
      for (const i of priced) {
        insertItem.run(saleId, i.id, i.qty, i.rate, i.amount);
        reduceStock.run(i.qty, i.id);
        movement.run(i.id, -i.qty, `Sale ${invoice}`);
      }

      const negative = d.prepare("SELECT COUNT(*) AS c FROM products WHERE stock < 0").get();
      if (Number(negative?.["c"] ?? 0) > 0) throw new Error("Stock cannot go below zero");

      if (paid > 0) {
        const receipt = nextNumber(d, "payments", "receipt_no", "RCP-", 5001);
        d.prepare(
          `INSERT INTO payments (receipt_no, customer_id, amount, method, note)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(receipt, data.customerId, paid, data.method, `Sale ${invoice}`);
      }

      if (credit > 0 && data.customerId) {
        d.prepare(
          `INSERT INTO credit_transactions (customer_id, sale_id, type, amount, note)
           VALUES (?, ?, 'debit', ?, ?)`,
        ).run(data.customerId, saleId, credit, `Sale ${invoice}`);
      }

      return { invoice, total, paid, credit };
    });
  });

/* -------------------------------------------------------- record payment */

export const recordPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        customerId: z.number().int().positive("Select a customer"),
        amount: z.number().positive("Enter an amount greater than zero"),
        method: z.enum(["Cash", "UPI", "Bank"]).default("Cash"),
        note: z.string().trim().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return inTransaction((d) => {
      const customer = d.prepare("SELECT id, name FROM customers WHERE id = ?").get(data.customerId);
      if (!customer) throw new Error("Customer not found");

      const outstanding = balanceOf(d, data.customerId);
      if (outstanding <= 0) throw new Error("This customer has no outstanding udhar");
      const amount = Math.round(data.amount * 100) / 100;
      if (amount > outstanding) {
        throw new Error(`Payment cannot be more than the outstanding balance of ${outstanding}`);
      }

      const receipt = nextNumber(d, "payments", "receipt_no", "RCP-", 5001);
      d.prepare(
        "INSERT INTO payments (receipt_no, customer_id, amount, method, note) VALUES (?, ?, ?, ?, ?)",
      ).run(receipt, data.customerId, amount, data.method, data.note);
      d.prepare(
        `INSERT INTO credit_transactions (customer_id, type, amount, note)
         VALUES (?, 'credit', ?, ?)`,
      ).run(data.customerId, amount, data.note || `Payment ${receipt}`);

      return { receipt, amount, outstanding: Math.round((outstanding - amount) * 100) / 100 };
    });
  });

/* ------------------------------------------------------- credit details */

export const getCreditDetail = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const customer = d.prepare("SELECT id, name, phone FROM customers WHERE id = ?").get(data.id);
    if (!customer) throw new Error("Customer not found");

    const entries = d
      .prepare(
        `SELECT ct.type, ct.amount, ct.note, ct.occurred_at, s.invoice_no
         FROM credit_transactions ct LEFT JOIN sales s ON s.id = ct.sale_id
         WHERE ct.customer_id = ? ORDER BY ct.occurred_at DESC, ct.id DESC`,
      )
      .all(data.id)
      .map((r) => ({
        type: r["type"] as "debit" | "credit",
        amount: Number(r["amount"]),
        note: (r["note"] as string) ?? "",
        occurredAt: r["occurred_at"] as string,
        invoice: (r["invoice_no"] as string) ?? null,
      }));

    const totalCredit = entries.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0);

    return {
      id: Number(customer["id"]),
      name: customer["name"] as string,
      phone: customer["phone"] as string,
      totalCredit,
      totalPaid,
      outstanding: Math.round((totalCredit - totalPaid) * 100) / 100,
      entries,
    };
  });

/* ----------------------------------------------------- credit + payments */

export const getCreditOverview = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  const rows = d
    .prepare(
      `SELECT c.id, c.name, c.phone,
              COALESCE((SELECT SUM(amount) FROM credit_transactions ct WHERE ct.customer_id = c.id AND ct.type='debit'), 0) AS total_credit,
              COALESCE((SELECT SUM(amount) FROM credit_transactions ct WHERE ct.customer_id = c.id AND ct.type='credit'), 0) AS total_paid,
              (SELECT MAX(ct.occurred_at) FROM credit_transactions ct WHERE ct.customer_id = c.id) AS last_entry
       FROM customers c ORDER BY c.name`,
    )
    .all()
    .map((r) => {
      const totalCredit = Number(r["total_credit"]);
      const totalPaid = Number(r["total_paid"]);
      return {
        id: Number(r["id"]),
        name: r["name"] as string,
        phone: r["phone"] as string,
        totalCredit,
        totalPaid,
        outstanding: Math.round((totalCredit - totalPaid) * 100) / 100,
        lastEntry: (r["last_entry"] as string) ?? null,
      };
    });

  const withBalance = rows.filter((r) => r.outstanding > 0.001);
  const collectedWeek = Number(
    d
      .prepare("SELECT COALESCE(SUM(amount), 0) AS v FROM payments WHERE date(paid_at) >= date('now', '-6 days')")
      .get()?.["v"] ?? 0,
  );

  return {
    rows: withBalance,
    all: rows,
    totalOutstanding: withBalance.reduce((s, r) => s + r.outstanding, 0),
    customersWithUdhar: withBalance.length,
    totalCredit: rows.reduce((s, r) => s + r.totalCredit, 0),
    totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
    collectedWeek,
  };
});

/* ------------------------------------------------- full customer profile */

export const getCustomerProfile = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const d = await db();
    const row = d
      .prepare(
        `SELECT c.id, c.name, c.phone, c.address, c.notes, c.created_at,
                ${BALANCE_SQL} AS outstanding,
                (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) AS purchases
         FROM customers c WHERE c.id = ?`,
      )
      .get(data.id);
    if (!row) throw new Error("Customer not found");

    const sales = d
      .prepare(
        `SELECT s.invoice_no, s.total, s.status, s.payment_method, s.sold_at,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items
         FROM sales s WHERE s.customer_id = ? ORDER BY s.sold_at DESC, s.id DESC LIMIT 10`,
      )
      .all(data.id)
      .map((r) => ({
        invoice: r["invoice_no"] as string,
        total: Number(r["total"]),
        status: r["status"] as string,
        method: r["payment_method"] as string,
        soldAt: r["sold_at"] as string,
        items: Number(r["items"]),
      }));

    const payments = d
      .prepare(
        `SELECT receipt_no, amount, method, note, paid_at FROM payments
         WHERE customer_id = ? ORDER BY paid_at DESC, id DESC LIMIT 10`,
      )
      .all(data.id)
      .map((r) => ({
        receipt: r["receipt_no"] as string,
        amount: Number(r["amount"]),
        method: r["method"] as string,
        note: (r["note"] as string) ?? "",
        paidAt: r["paid_at"] as string,
      }));

    const credit = d
      .prepare(
        `SELECT ct.type, ct.amount, ct.note, ct.occurred_at, s.invoice_no
         FROM credit_transactions ct LEFT JOIN sales s ON s.id = ct.sale_id
         WHERE ct.customer_id = ? ORDER BY ct.occurred_at DESC, ct.id DESC LIMIT 10`,
      )
      .all(data.id)
      .map((r) => ({
        type: r["type"] as "debit" | "credit",
        amount: Number(r["amount"]),
        note: (r["note"] as string) ?? "",
        occurredAt: r["occurred_at"] as string,
        invoice: (r["invoice_no"] as string) ?? null,
      }));

    return { customer: mapCustomer(row), sales, payments, credit };
  });

/* --------------------------------------------------------- page summaries */

export const getInventorySummary = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  const num = (sql: string) => Number(d.prepare(sql).get()?.["v"] ?? 0);
  return {
    tracked: num("SELECT COUNT(*) AS v FROM products"),
    low: num("SELECT COUNT(*) AS v FROM products WHERE stock <= low_stock_threshold AND stock > 0"),
    out: num("SELECT COUNT(*) AS v FROM products WHERE stock <= 0"),
    inToday: num(
      "SELECT COALESCE(SUM(quantity), 0) AS v FROM inventory_movements WHERE type = 'in' AND date(occurred_at) = date('now')",
    ),
    stockValue: num("SELECT COALESCE(SUM(stock * cost_price), 0) AS v FROM products"),
  };
});

export const getPaymentSummary = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  const num = (sql: string) => Number(d.prepare(sql).get()?.["v"] ?? 0);
  return {
    today: num("SELECT COALESCE(SUM(amount), 0) AS v FROM payments WHERE date(paid_at) = date('now')"),
    todayCount: num("SELECT COUNT(*) AS v FROM payments WHERE date(paid_at) = date('now')"),
    week: num("SELECT COALESCE(SUM(amount), 0) AS v FROM payments WHERE date(paid_at) >= date('now', '-6 days')"),
    weekCount: num("SELECT COUNT(*) AS v FROM payments WHERE date(paid_at) >= date('now', '-6 days')"),
    cashShare: num(
      `SELECT CASE WHEN SUM(amount) > 0 THEN ROUND(100.0 * SUM(CASE WHEN method = 'Cash' THEN amount ELSE 0 END) / SUM(amount)) ELSE 0 END AS v FROM payments`,
    ),
    outstanding: num(
      "SELECT COALESCE(SUM(CASE type WHEN 'debit' THEN amount ELSE -amount END), 0) AS v FROM credit_transactions",
    ),
  };
});

export const getSalesSummary = createServerFn({ method: "GET" }).handler(async () => {
  const d = await db();
  const num = (sql: string) => Number(d.prepare(sql).get()?.["v"] ?? 0);
  const today = num("SELECT COALESCE(SUM(total), 0) AS v FROM sales WHERE date(sold_at) = date('now')");
  const bills = num("SELECT COUNT(*) AS v FROM sales WHERE date(sold_at) = date('now')");
  return {
    today,
    bills,
    settled: num(
      "SELECT COALESCE(SUM(total), 0) AS v FROM sales WHERE date(sold_at) = date('now') AND status = 'paid'",
    ),
    onUdhar: num(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM credit_transactions WHERE type='debit' AND date(occurred_at) = date('now')`,
    ),
    average: bills > 0 ? Math.round(today / bills) : 0,
  };
});
