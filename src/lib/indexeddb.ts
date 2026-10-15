/**
 * IndexedDB storage layer for RetailEase.
 * 
 * This replaces the server-side SQLite database with browser-based IndexedDB.
 * All data is stored locally in the user's browser.
 */

const DB_NAME = "RetailEaseDB";
const DB_VERSION = 1;

// Object store names
export const STORES = {
  USERS: "users",
  SESSIONS: "sessions",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  SALES: "sales",
  SALE_ITEMS: "sale_items",
  CREDIT_TRANSACTIONS: "credit_transactions",
  PAYMENTS: "payments",
  INVENTORY_MOVEMENTS: "inventory_movements",
} as const;

// Type definitions
export type User = {
  id: number;
  name: string;
  phone: string;
  passwordHash: string;
  shopName: string;
  role: string;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: number;
  createdAt: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
};

export type Sale = {
  id: number;
  invoiceNo: string;
  customerId: number | null;
  total: number;
  paymentMethod: string;
  status: string;
  soldAt: string;
  createdAt: string;
};

export type SaleItem = {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  rate: number;
  amount: number;
  createdAt: string;
};

export type CreditTransaction = {
  id: number;
  customerId: number;
  saleId: number | null;
  type: "debit" | "credit";
  amount: number;
  note: string;
  occurredAt: string;
  createdAt: string;
};

export type Payment = {
  id: number;
  receiptNo: string;
  customerId: number | null;
  amount: number;
  method: string;
  note: string;
  paidAt: string;
  createdAt: string;
};

export type InventoryMovement = {
  id: number;
  productId: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  note: string;
  occurredAt: string;
  createdAt: string;
};

let db: IDBDatabase | null = null;

/**
 * Open the IndexedDB database and create schema if needed.
 */
export async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB database"));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create users store
      if (!database.objectStoreNames.contains(STORES.USERS)) {
        const userStore = database.createObjectStore(STORES.USERS, { keyPath: "id", autoIncrement: true });
        userStore.createIndex("phone", "phone", { unique: true });
      }

      // Create sessions store
      if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = database.createObjectStore(STORES.SESSIONS, { keyPath: "token" });
        sessionStore.createIndex("userId", "userId", { unique: false });
      }

      // Create customers store
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: "id", autoIncrement: true });
        customerStore.createIndex("phone", "phone", { unique: true });
      }

      // Create products store
      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: "id", autoIncrement: true });
        productStore.createIndex("sku", "sku", { unique: true });
      }

      // Create sales store
      if (!database.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = database.createObjectStore(STORES.SALES, { keyPath: "id", autoIncrement: true });
        salesStore.createIndex("invoiceNo", "invoiceNo", { unique: true });
        salesStore.createIndex("customerId", "customerId", { unique: false });
      }

      // Create sale_items store
      if (!database.objectStoreNames.contains(STORES.SALE_ITEMS)) {
        const saleItemsStore = database.createObjectStore(STORES.SALE_ITEMS, { keyPath: "id", autoIncrement: true });
        saleItemsStore.createIndex("saleId", "saleId", { unique: false });
        saleItemsStore.createIndex("productId", "productId", { unique: false });
      }

      // Create credit_transactions store
      if (!database.objectStoreNames.contains(STORES.CREDIT_TRANSACTIONS)) {
        const creditStore = database.createObjectStore(STORES.CREDIT_TRANSACTIONS, { keyPath: "id", autoIncrement: true });
        creditStore.createIndex("customerId", "customerId", { unique: false });
        creditStore.createIndex("saleId", "saleId", { unique: false });
      }

      // Create payments store
      if (!database.objectStoreNames.contains(STORES.PAYMENTS)) {
        const paymentsStore = database.createObjectStore(STORES.PAYMENTS, { keyPath: "id", autoIncrement: true });
        paymentsStore.createIndex("receiptNo", "receiptNo", { unique: true });
        paymentsStore.createIndex("customerId", "customerId", { unique: false });
      }

      // Create inventory_movements store
      if (!database.objectStoreNames.contains(STORES.INVENTORY_MOVEMENTS)) {
        const movementsStore = database.createObjectStore(STORES.INVENTORY_MOVEMENTS, { keyPath: "id", autoIncrement: true });
        movementsStore.createIndex("productId", "productId", { unique: false });
      }
    };
  });
}

/**
 * Generic function to perform a transaction on IndexedDB.
 */
async function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const database = await openDB();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      // Transaction completed successfully
    };
    transaction.onerror = () => {
      reject(new Error(`Transaction failed on store ${storeName}`));
    };

    try {
      const result = callback(store);
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else {
        result.then(resolve).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add a record to a store.
 */
export async function add<T>(storeName: string, data: Omit<T, "id">): Promise<number> {
  return transaction(storeName, "readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.add(data as T);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Get a record by key from a store.
 */
export async function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return transaction(storeName, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Get all records from a store.
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
  return transaction(storeName, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Update a record in a store.
 */
export async function update<T>(storeName: string, data: T): Promise<void> {
  return transaction(storeName, "readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Delete a record from a store.
 */
export async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  return transaction(storeName, "readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Get records by index from a store.
 */
export async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const database = await openDB();
  const transaction = database.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const index = store.index(indexName);

  return new Promise((resolve, reject) => {
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all records from a store.
 */
export async function clear(storeName: string): Promise<void> {
  return transaction(storeName, "readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Check if IndexedDB is available.
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
