/**
 * Browser-side functions for RetailEase using IndexedDB.
 * 
 * This replaces the server-side SQLite functions with IndexedDB operations.
 * All data is stored locally in the browser.
 */

import { z } from "zod";
import {
  openDB,
  add,
  get,
  getAll,
  update,
  remove,
  getByIndex,
  clear,
  STORES,
  type User,
  type Session,
  type Customer,
  type Product,
  type Sale,
  type SaleItem,
  type CreditTransaction,
  type Payment,
  type InventoryMovement,
} from "./indexeddb";
import { seedIfEmpty } from "./seed-client";

const SESSION_KEY = "re_session";

/**
 * Simple SHA-256 password hashing using Web Crypto API.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`retailease:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get current session from localStorage.
 */
export async function getSession(): Promise<User | null> {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  const db = await openDB();
  const session = await get<Session>(STORES.SESSIONS, token);
  if (!session) return null;

  const user = await get<User>(STORES.USERS, session.userId);
  return user || null;
}

/**
 * Start a new session.
 */
async function startSession(userId: number): Promise<void> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  
  const session: Session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
  };

  await add(STORES.SESSIONS, session);
  localStorage.setItem(SESSION_KEY, token);
}

/**
 * End the current session.
 */
export async function endSession(): Promise<void> {
  const token = localStorage.getItem(SESSION_KEY);
  if (token) {
    await remove(STORES.SESSIONS, token);
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Ensure a user is signed in.
 */
async function requireAuth(): Promise<User> {
  const user = await getSession();
  if (!user) throw new Error("Please sign in to continue");
  return user;
}

/* ------------------------------------------------------------------ shop */

export type Shop = { name: string; owner: string; role: string; phone: string };

export async function getShop(): Promise<Shop | null> {
  const user = await getSession();
  if (!user) return null;
  return {
    name: user.shopName,
    owner: user.name,
    role: user.role,
    phone: user.phone,
  };
}

/* ------------------------------------------------------------------ auth */

const mobileSchema = z
  .string()
  .transform((v: string) => v.replace(/[\s-]/g, ""))
  .refine((v: string) => /^\d{10}$/.test(v), "Enter a valid 10-digit mobile number (digits only)");

export const NO_ACCOUNT = "NO_ACCOUNT";

export async function login(data: { phone: string; password: string }): Promise<{ ok: boolean }> {
  // Seed database if empty (creates demo user)
  await seedIfEmpty();
  
  const phone = mobileSchema.parse(data.phone);
  const users = await getByIndex<User>(STORES.USERS, "phone", phone);
  const user = users[0];

  if (!user) throw new Error(NO_ACCOUNT);

  const passwordHash = await hashPassword(data.password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Incorrect password for this mobile number");
  }

  await startSession(user.id);
  return { ok: true };
}

export async function signup(data: {
  name: string;
  shopName: string;
  phone: string;
  password: string;
}): Promise<{ ok: boolean }> {
  // Seed database if empty
  await seedIfEmpty();
  
  const phone = mobileSchema.parse(data.phone);
  const existing = await getByIndex<User>(STORES.USERS, "phone", phone);
  if (existing.length > 0) {
    throw new Error("An account with this mobile number already exists. Please sign in.");
  }

  const passwordHash = await hashPassword(data.password);
  const userId = await add<User>(STORES.USERS, {
    name: data.name,
    phone: data.phone,
    passwordHash,
    shopName: data.shopName,
    role: "Shop Owner",
    createdAt: new Date().toISOString(),
  });

  await startSession(userId);
  return { ok: true };
}

export async function logout(): Promise<{ ok: boolean }> {
  await endSession();
  return { ok: true };
}

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

function mapCustomer(c: Customer, outstanding: number = 0, purchases: number = 0): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    createdAt: c.createdAt,
    outstanding,
    purchases,
  };
}

export async function listCustomers(): Promise<CustomerRow[]> {
  await requireAuth();
  const customers = await getAll<Customer>(STORES.CUSTOMERS);
  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const sales = await getAll<Sale>(STORES.SALES);

  return customers.map((c) => {
    const customerCredits = creditTransactions.filter((ct) => ct.customerId === c.id);
    const outstanding = customerCredits.reduce(
      (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
      0
    );
    const purchases = sales.filter((s) => s.customerId === c.id).length;
    return mapCustomer(c, outstanding, purchases);
  });
}

const customerInput = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "Phone number is required"),
  address: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export async function createCustomer(data: {
  name: string;
  phone: string;
  address: string;
  notes: string;
}): Promise<{ ok: boolean }> {
  await requireAuth();
  const existing = await getByIndex<Customer>(STORES.CUSTOMERS, "phone", data.phone);
  if (existing.length > 0) throw new Error("A customer with this phone number already exists");

  await add<Customer>(STORES.CUSTOMERS, {
    name: data.name,
    phone: data.phone,
    address: data.address,
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

export async function updateCustomer(data: {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
}): Promise<{ ok: boolean }> {
  await requireAuth();
  const clash = await getByIndex<Customer>(STORES.CUSTOMERS, "phone", data.phone);
  const otherWithPhone = clash.find((c) => c.id !== data.id);
  if (otherWithPhone) throw new Error("Another customer already uses this phone number");

  const existing = await get<Customer>(STORES.CUSTOMERS, data.id);
  if (!existing) throw new Error("Customer not found");
  await update<Customer>(STORES.CUSTOMERS, {
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    notes: data.notes,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

export async function deleteCustomer(data: { id: number }): Promise<{ ok: boolean }> {
  await requireAuth();
  await remove(STORES.CUSTOMERS, data.id);
  return { ok: true };
}

export async function getCustomerDetail(data: { id: number }): Promise<{
  customer: CustomerRow;
  ledger: Array<{ type: "debit" | "credit"; amount: number; note: string; occurredAt: string }>;
}> {
  await requireAuth();
  const customer = await get<Customer>(STORES.CUSTOMERS, data.id);
  if (!customer) throw new Error("Customer not found");

  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const ledger = creditTransactions
    .filter((ct) => ct.customerId === data.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10)
    .map((ct) => ({
      type: ct.type,
      amount: ct.amount,
      note: ct.note,
      occurredAt: ct.occurredAt,
    }));

  const allCredits = creditTransactions.filter((ct) => ct.customerId === data.id);
  const outstanding = allCredits.reduce(
    (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
    0
  );
  const sales = await getAll<Sale>(STORES.SALES);
  const purchases = sales.filter((s) => s.customerId === data.id).length;

  return { customer: mapCustomer(customer, outstanding, purchases), ledger };
}

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

function mapProduct(p: Product): ProductRow {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    unit: p.unit,
    cost: p.costPrice,
    price: p.sellingPrice,
    stock: p.stock,
    threshold: p.lowStockThreshold,
  };
}

export async function listProducts(): Promise<ProductRow[]> {
  await requireAuth();
  const products = await getAll<Product>(STORES.PRODUCTS);
  return products.map(mapProduct);
}

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

export async function createProduct(data: {
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  threshold: number;
}): Promise<{ ok: boolean }> {
  await requireAuth();
  let sku = data.sku;
  if (!sku) {
    const products = await getAll<Product>(STORES.PRODUCTS);
    sku = `SKU-${1001 + products.length}`;
  }

  const existing = await getByIndex<Product>(STORES.PRODUCTS, "sku", sku);
  if (existing.length > 0) throw new Error("A product with this SKU already exists");

  const productId = await add<Product>(STORES.PRODUCTS, {
    sku,
    name: data.name,
    category: data.category,
    unit: data.unit,
    costPrice: data.cost,
    sellingPrice: data.price,
    stock: data.stock,
    lowStockThreshold: data.threshold,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (data.stock > 0) {
    await add<InventoryMovement>(STORES.INVENTORY_MOVEMENTS, {
      productId,
      type: "in",
      quantity: data.stock,
      note: "Opening stock",
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return { ok: true };
}

export async function updateProduct(data: {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  threshold: number;
}): Promise<{ ok: boolean }> {
  await requireAuth();
  const clash = await getByIndex<Product>(STORES.PRODUCTS, "sku", data.sku);
  const otherWithSku = clash.find((p) => p.id !== data.id);
  if (otherWithSku) throw new Error("Another product already uses this SKU");

  const existing = await get<Product>(STORES.PRODUCTS, data.id);
  if (!existing) throw new Error("Product not found");
  await update<Product>(STORES.PRODUCTS, {
    id: data.id,
    sku: data.sku,
    name: data.name,
    category: data.category,
    unit: data.unit,
    costPrice: data.cost,
    sellingPrice: data.price,
    stock: data.stock,
    lowStockThreshold: data.threshold,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

export async function deleteProduct(data: { id: number }): Promise<{ ok: boolean }> {
  await requireAuth();
  await remove(STORES.PRODUCTS, data.id);
  return { ok: true };
}

/* ------------------------------------------------------------- inventory */

export async function listMovements(): Promise<
  Array<{ type: "in" | "out" | "adjustment"; quantity: number; note: string; occurredAt: string; product: string }>
> {
  await requireAuth();
  const movements = await getAll<InventoryMovement>(STORES.INVENTORY_MOVEMENTS);
  const products = await getAll<Product>(STORES.PRODUCTS);

  return movements
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 12)
    .map((m) => {
      const product = products.find((p) => p.id === m.productId);
      return {
        type: m.type,
        quantity: m.quantity,
        note: m.note,
        occurredAt: m.occurredAt,
        product: product?.name || "Deleted product",
      };
    });
}

export async function recordMovement(data: {
  productId: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  note: string;
}): Promise<{ ok: boolean }> {
  await requireAuth();
  const delta =
    data.type === "in" ? Math.abs(data.quantity) : data.type === "out" ? -Math.abs(data.quantity) : data.quantity;

  await add<InventoryMovement>(STORES.INVENTORY_MOVEMENTS, {
    productId: data.productId,
    type: data.type,
    quantity: Math.abs(data.quantity) * (delta < 0 ? -1 : 1),
    note: data.note,
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const product = await get<Product>(STORES.PRODUCTS, data.productId);
  if (product) {
    await update<Product>(STORES.PRODUCTS, {
      ...product,
      stock: Math.max(0, product.stock + delta),
      updatedAt: new Date().toISOString(),
    });
  }

  return { ok: true };
}

/* ----------------------------------------------------------------- sales */

export async function listSales(): Promise<
  Array<{ invoice: string; total: number; method: string; status: string; soldAt: string; customer: string; items: number }>
> {
  await requireAuth();
  const sales = await getAll<Sale>(STORES.SALES);
  const customers = await getAll<Customer>(STORES.CUSTOMERS);
  const saleItems = await getAll<SaleItem>(STORES.SALE_ITEMS);

  return sales
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .map((s) => {
      const customer = customers.find((c) => c.id === s.customerId);
      const items = saleItems.filter((si) => si.saleId === s.id).length;
      return {
        invoice: s.invoiceNo,
        total: s.total,
        method: s.paymentMethod,
        status: s.status,
        soldAt: s.soldAt,
        customer: customer?.name || "Walk-in customer",
        items,
      };
    });
}

/* ---------------------------------------------------------------- credit */

export type CreditRow = {
  id: number;
  name: string;
  phone: string;
  outstanding: number;
  lastEntry: string | null;
};

export async function listCredit(): Promise<CreditRow[]> {
  await requireAuth();
  const customers = await getAll<Customer>(STORES.CUSTOMERS);
  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);

  const result: CreditRow[] = [];
  for (const customer of customers) {
    const customerCredits = creditTransactions.filter((ct) => ct.customerId === customer.id);
    const outstanding = customerCredits.reduce(
      (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
      0
    );

    if (outstanding > 0.001) {
      const lastEntry = customerCredits.length > 0
        ? customerCredits.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0]?.occurredAt || null
        : null;

      result.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        outstanding,
        lastEntry,
      });
    }
  }

  return result.sort((a, b) => b.outstanding - a.outstanding);
}

/* -------------------------------------------------------------- payments */

export async function listPayments(): Promise<
  Array<{ receipt: string; amount: number; method: string; note: string; paidAt: string; customer: string }>
> {
  await requireAuth();
  const payments = await getAll<Payment>(STORES.PAYMENTS);
  const customers = await getAll<Customer>(STORES.CUSTOMERS);

  return payments
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .map((p) => {
      const customer = customers.find((c) => c.id === p.customerId);
      return {
        receipt: p.receiptNo,
        amount: p.amount,
        method: p.method,
        note: p.note,
        paidAt: p.paidAt,
        customer: customer?.name || "Walk-in customer",
      };
    });
}

/* ------------------------------------------------------------- dashboard */

export async function getDashboard(): Promise<{
  todaySales: number;
  todayCount: number;
  outstanding: number;
  creditCustomers: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
  recentSales: Array<{ invoice: string; total: number; status: string; soldAt: string; customer: string; items: number }>;
  lowStock: Array<{ name: string; category: string; stock: number; threshold: number }>;
  credit: Array<{ name: string; phone: string; outstanding: number; lastEntry: string | null }>;
}> {
  await requireAuth();
  const sales = await getAll<Sale>(STORES.SALES);
  const customers = await getAll<Customer>(STORES.CUSTOMERS);
  const products = await getAll<Product>(STORES.PRODUCTS);
  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const saleItems = await getAll<SaleItem>(STORES.SALE_ITEMS);

  const today = new Date().toISOString().slice(0, 10);
  const todaySalesList = sales.filter((s) => s.soldAt.startsWith(today));
  const todaySales = todaySalesList.reduce((sum, s) => sum + s.total, 0);
  const todayCount = todaySalesList.length;

  const outstanding = creditTransactions.reduce(
    (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
    0
  );

  const customersWithCredit = new Set(creditTransactions.map((ct) => ct.customerId));
  const creditCustomers = customersWithCredit.size;

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  const lowStockCount = lowStock.length;

  const totalCustomers = customers.length;
  const totalProducts = products.length;

  const recentSales = sales
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .slice(0, 5)
    .map((s) => {
      const customer = customers.find((c) => c.id === s.customerId);
      const items = saleItems.filter((si) => si.saleId === s.id).length;
      return {
        invoice: s.invoiceNo,
        total: s.total,
        status: s.status,
        soldAt: s.soldAt,
        customer: customer?.name || "Walk-in customer",
        items,
      };
    });

  const lowStockList = lowStock
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      category: p.category,
      stock: p.stock,
      threshold: p.lowStockThreshold,
    }));

  const creditList = await listCredit();
  const credit = creditList.slice(0, 5).map((c) => ({
    name: c.name,
    phone: c.phone,
    outstanding: c.outstanding,
    lastEntry: c.lastEntry,
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
    lowStock: lowStockList,
    credit,
  };
}

/* --------------------------------------------------------------- reports */

export async function getReports(): Promise<{
  daily: Array<{ day: string; total: number; bills: number }>;
  byCategory: Array<{ category: string; total: number }>;
  weekSales: number;
  weekBills: number;
  collected: number;
}> {
  await requireAuth();
  const sales = await getAll<Sale>(STORES.SALES);
  const saleItems = await getAll<SaleItem>(STORES.SALE_ITEMS);
  const products = await getAll<Product>(STORES.PRODUCTS);
  const payments = await getAll<Payment>(STORES.PAYMENTS);

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const sixDaysAgoStr = sixDaysAgo.toISOString().slice(0, 10);

  const recentSales = sales.filter((s) => s.soldAt >= sixDaysAgoStr);
  const dailyMap = new Map<string, { total: number; bills: number }>();

  for (const sale of recentSales) {
    const day = sale.soldAt.slice(0, 10);
    const existing = dailyMap.get(day) || { total: 0, bills: 0 };
    dailyMap.set(day, { total: existing.total + sale.total, bills: existing.bills + 1 });
  }

  const daily = Array.from(dailyMap.entries())
    .map(([day, data]) => ({ day, total: data.total, bills: data.bills }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const categoryMap = new Map<string, number>();
  for (const item of saleItems) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      const existing = categoryMap.get(product.category) || 0;
      categoryMap.set(product.category, existing + item.amount);
    }
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const weekSales = recentSales.reduce((sum, s) => sum + s.total, 0);
  const weekBills = recentSales.length;

  const recentPayments = payments.filter((p) => p.paidAt >= sixDaysAgoStr);
  const collected = recentPayments.reduce((sum, p) => sum + p.amount, 0);

  return { daily, byCategory, weekSales, weekBills, collected };
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

export async function createSale(data: {
  customerId: number | null;
  method: "Cash" | "UPI" | "Bank";
  mode: "paid" | "credit" | "partial";
  amountPaid: number;
  items: Array<{ productId: number; quantity: number }>;
}): Promise<{ invoice: string; total: number; paid: number; credit: number }> {
  await requireAuth();

  if (data.customerId) {
    const customer = await get<Customer>(STORES.CUSTOMERS, data.customerId);
    if (!customer) throw new Error("Selected customer no longer exists");
  }

  const products = await getAll<Product>(STORES.PRODUCTS);
  const priced = data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error("Selected product no longer exists");
    if (item.quantity > product.stock) {
      throw new Error(`Not enough stock for ${product.name}. Only ${product.stock} left, ${item.quantity} requested.`);
    }
    const rate = product.sellingPrice;
    return { id: product.id, name: product.name, rate, qty: item.quantity, amount: rate * item.quantity };
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

  const sales = await getAll<Sale>(STORES.SALES);
  let invoiceNum = 1001 + sales.length;
  while (sales.some((s) => s.invoiceNo === `INV-${invoiceNum}`)) invoiceNum += 1;
  const invoice = `INV-${invoiceNum}`;

  const status = credit === 0 ? "paid" : paid === 0 ? "udhar" : "partial";
  const methodLabel = credit > 0 ? (paid > 0 ? `${data.method} + Udhar` : "Udhar") : data.method;

  const saleId = await add<Sale>(STORES.SALES, {
    invoiceNo: invoice,
    customerId: data.customerId,
    total,
    paymentMethod: methodLabel,
    status,
    soldAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  for (const i of priced) {
    await add<SaleItem>(STORES.SALE_ITEMS, {
      saleId,
      productId: i.id,
      quantity: i.qty,
      rate: i.rate,
      amount: i.amount,
      createdAt: new Date().toISOString(),
    });

    const product = await get<Product>(STORES.PRODUCTS, i.id);
    if (product) {
      await update<Product>(STORES.PRODUCTS, {
        ...product,
        stock: Math.max(0, product.stock - i.qty),
        updatedAt: new Date().toISOString(),
      });
    }

    await add<InventoryMovement>(STORES.INVENTORY_MOVEMENTS, {
      productId: i.id,
      type: "out",
      quantity: -i.qty,
      note: `Sale ${invoice}`,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (paid > 0) {
    const payments = await getAll<Payment>(STORES.PAYMENTS);
    let receiptNum = 5001 + payments.length;
    while (payments.some((p) => p.receiptNo === `RCP-${receiptNum}`)) receiptNum += 1;
    const receipt = `RCP-${receiptNum}`;

    await add<Payment>(STORES.PAYMENTS, {
      receiptNo: receipt,
      customerId: data.customerId,
      amount: paid,
      method: data.method,
      note: `Sale ${invoice}`,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (credit > 0 && data.customerId) {
    await add<CreditTransaction>(STORES.CREDIT_TRANSACTIONS, {
      customerId: data.customerId,
      saleId,
      type: "debit",
      amount: credit,
      note: `Sale ${invoice}`,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  return { invoice, total, paid, credit };
}

/* -------------------------------------------------------- record payment */

export async function recordPayment(data: {
  customerId: number;
  amount: number;
  method: "Cash" | "UPI" | "Bank";
  note: string;
}): Promise<{ receipt: string; amount: number; outstanding: number }> {
  await requireAuth();
  const customer = await get<Customer>(STORES.CUSTOMERS, data.customerId);
  if (!customer) throw new Error("Customer not found");

  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const customerCredits = creditTransactions.filter((ct) => ct.customerId === data.customerId);
  const outstanding = customerCredits.reduce(
    (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
    0
  );

  if (outstanding <= 0) throw new Error("This customer has no outstanding udhar");
  const amount = Math.round(data.amount * 100) / 100;
  if (amount > outstanding) {
    throw new Error(`Payment cannot be more than the outstanding balance of ${outstanding}`);
  }

  const payments = await getAll<Payment>(STORES.PAYMENTS);
  let receiptNum = 5001 + payments.length;
  while (payments.some((p) => p.receiptNo === `RCP-${receiptNum}`)) receiptNum += 1;
  const receipt = `RCP-${receiptNum}`;

  await add<Payment>(STORES.PAYMENTS, {
    receiptNo: receipt,
    customerId: data.customerId,
    amount,
    method: data.method,
    note: data.note,
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  await add<CreditTransaction>(STORES.CREDIT_TRANSACTIONS, {
    customerId: data.customerId,
    saleId: null,
    type: "credit",
    amount,
    note: data.note || `Payment ${receipt}`,
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return { receipt, amount, outstanding: Math.round((outstanding - amount) * 100) / 100 };
}

/* ------------------------------------------------------- credit details */

export async function getCreditDetail(data: { id: number }): Promise<{
  id: number;
  name: string;
  phone: string;
  totalCredit: number;
  totalPaid: number;
  outstanding: number;
  entries: Array<{ type: "debit" | "credit"; amount: number; note: string; occurredAt: string; invoice: string | null }>;
}> {
  await requireAuth();
  const customer = await get<Customer>(STORES.CUSTOMERS, data.id);
  if (!customer) throw new Error("Customer not found");

  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const sales = await getAll<Sale>(STORES.SALES);

  const entries = creditTransactions
    .filter((ct) => ct.customerId === data.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .map((ct) => {
      const sale = sales.find((s) => s.id === ct.saleId);
      return {
        type: ct.type,
        amount: ct.amount,
        note: ct.note,
        occurredAt: ct.occurredAt,
        invoice: sale?.invoiceNo || null,
      };
    });

  const totalCredit = entries.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0);
  const totalPaid = entries.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0);

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    totalCredit,
    totalPaid,
    outstanding: Math.round((totalCredit - totalPaid) * 100) / 100,
    entries,
  };
}

/* ----------------------------------------------------- credit + payments */

export async function getCreditOverview(): Promise<{
  rows: Array<{ id: number; name: string; phone: string; totalCredit: number; totalPaid: number; outstanding: number; lastEntry: string | null }>;
  all: Array<{ id: number; name: string; phone: string; totalCredit: number; totalPaid: number; outstanding: number; lastEntry: string | null }>;
  totalOutstanding: number;
  customersWithUdhar: number;
  totalCredit: number;
  totalPaid: number;
  collectedWeek: number;
}> {
  await requireAuth();
  const customers = await getAll<Customer>(STORES.CUSTOMERS);
  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);
  const payments = await getAll<Payment>(STORES.PAYMENTS);

  const rows = customers.map((c) => {
    const customerCredits = creditTransactions.filter((ct) => ct.customerId === c.id);
    const totalCredit = customerCredits.filter((ct) => ct.type === "debit").reduce((s, ct) => s + ct.amount, 0);
    const totalPaid = customerCredits.filter((ct) => ct.type === "credit").reduce((s, ct) => s + ct.amount, 0);
    const lastEntry = customerCredits.length > 0
      ? customerCredits.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0]?.occurredAt || null
      : null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalCredit,
      totalPaid,
      outstanding: Math.round((totalCredit - totalPaid) * 100) / 100,
      lastEntry,
    };
  });

  const withBalance = rows.filter((r) => r.outstanding > 0.001);

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const sixDaysAgoStr = sixDaysAgo.toISOString().slice(0, 10);

  const collectedWeek = payments
    .filter((p) => p.paidAt >= sixDaysAgoStr)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    rows: withBalance,
    all: rows,
    totalOutstanding: withBalance.reduce((s, r) => s + r.outstanding, 0),
    customersWithUdhar: withBalance.length,
    totalCredit: rows.reduce((s, r) => s + r.totalCredit, 0),
    totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
    collectedWeek,
  };
}

/* ------------------------------------------------- full customer profile */

export async function getCustomerProfile(data: { id: number }): Promise<{
  customer: CustomerRow;
  sales: Array<{ invoice: string; total: number; status: string; method: string; soldAt: string; items: number }>;
  payments: Array<{ receipt: string; amount: number; method: string; note: string; paidAt: string }>;
  credit: Array<{ type: "debit" | "credit"; amount: number; note: string; occurredAt: string; invoice: string | null }>;
}> {
  await requireAuth();
  const customer = await get<Customer>(STORES.CUSTOMERS, data.id);
  if (!customer) throw new Error("Customer not found");

  const sales = await getAll<Sale>(STORES.SALES);
  const saleItems = await getAll<SaleItem>(STORES.SALE_ITEMS);
  const payments = await getAll<Payment>(STORES.PAYMENTS);
  const creditTransactions = await getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS);

  const customerSales = sales
    .filter((s) => s.customerId === data.id)
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
    .slice(0, 10)
    .map((s) => {
      const items = saleItems.filter((si) => si.saleId === s.id).length;
      return {
        invoice: s.invoiceNo,
        total: s.total,
        status: s.status,
        method: s.paymentMethod,
        soldAt: s.soldAt,
        items,
      };
    });

  const customerPayments = payments
    .filter((p) => p.customerId === data.id)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 10)
    .map((p) => ({
      receipt: p.receiptNo,
      amount: p.amount,
      method: p.method,
      note: p.note,
      paidAt: p.paidAt,
    }));

  const customerCredit = creditTransactions
    .filter((ct) => ct.customerId === data.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10)
    .map((ct) => {
      const sale = sales.find((s) => s.id === ct.saleId);
      return {
        type: ct.type,
        amount: ct.amount,
        note: ct.note,
        occurredAt: ct.occurredAt,
        invoice: sale?.invoiceNo || null,
      };
    });

  const customerCredits = creditTransactions.filter((ct) => ct.customerId === data.id);
  const outstanding = customerCredits.reduce(
    (sum, ct) => sum + (ct.type === "debit" ? ct.amount : -ct.amount),
    0
  );
  const purchases = customerSales.length;

  return {
    customer: mapCustomer(customer, outstanding, purchases),
    sales: customerSales,
    payments: customerPayments,
    credit: customerCredit,
  };
}

/* --------------------------------------------------------- page summaries */

export async function getInventorySummary(): Promise<{
  tracked: number;
  low: number;
  out: number;
}> {
  await requireAuth();
  const products = await getAll<Product>(STORES.PRODUCTS);

  const tracked = products.length;
  const low = products.filter((p) => p.stock <= p.lowStockThreshold && p.stock > 0).length;
  const out = products.filter((p) => p.stock <= 0).length;

  return { tracked, low, out };
}
