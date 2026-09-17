import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Db } from "./db.server";

async function db(): Promise<Db> {
  const mod = await import("./db.server");
  return mod.getDb();
}

const BALANCE_SQL = `
  COALESCE((
    SELECT SUM(CASE ct.type WHEN 'debit' THEN ct.amount ELSE -ct.amount END)
    FROM credit_transactions ct WHERE ct.customer_id = c.id
  ), 0)
`;

/* ------------------------------------------------------------------ shop */

export type Shop = { name: string; owner: string; role: string };

export const getShop = createServerFn({ method: "GET" }).handler(async (): Promise<Shop> => {
  const d = await db();
  const row = d.prepare("SELECT name, shop_name, role FROM users ORDER BY id LIMIT 1").get();
  return {
    name: (row?.["shop_name"] as string) ?? "RetailEase",
    owner: (row?.["name"] as string) ?? "Shop Owner",
    role: (row?.["role"] as string) ?? "Shop Owner",
  };
});

/* ------------------------------------------------------------------ auth */

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ phone: z.string().min(1), password: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const d = await db();
    const { hashPassword } = await import("./db.server");
    const phone = data.phone.replace(/\D/g, "");
    const row = d
      .prepare("SELECT id, name, phone, shop_name, role, password_hash FROM users WHERE phone = ?")
      .get(phone);

    if (!row || row["password_hash"] !== hashPassword(data.password)) {
      throw new Error("Invalid mobile number or password");
    }
    return {
      id: Number(row["id"]),
      name: row["name"] as string,
      phone: row["phone"] as string,
      shopName: row["shop_name"] as string,
      role: row["role"] as string,
    };
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
