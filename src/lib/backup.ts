/**
 * JSON export/import functionality for IndexedDB backups.
 */

import {
  getAll,
  clear,
  add,
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

export interface BackupData {
  version: string;
  exportedAt: string;
  users: User[];
  sessions: Session[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  creditTransactions: CreditTransaction[];
  payments: Payment[];
  inventoryMovements: InventoryMovement[];
}

/**
 * Export all IndexedDB data to a JSON object.
 */
export async function exportBackup(): Promise<BackupData> {
  const [
    users,
    sessions,
    customers,
    products,
    sales,
    saleItems,
    creditTransactions,
    payments,
    inventoryMovements,
  ] = await Promise.all([
    getAll<User>(STORES.USERS),
    getAll<Session>(STORES.SESSIONS),
    getAll<Customer>(STORES.CUSTOMERS),
    getAll<Product>(STORES.PRODUCTS),
    getAll<Sale>(STORES.SALES),
    getAll<SaleItem>(STORES.SALE_ITEMS),
    getAll<CreditTransaction>(STORES.CREDIT_TRANSACTIONS),
    getAll<Payment>(STORES.PAYMENTS),
    getAll<InventoryMovement>(STORES.INVENTORY_MOVEMENTS),
  ]);

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    users,
    sessions,
    customers,
    products,
    sales,
    saleItems,
    creditTransactions,
    payments,
    inventoryMovements,
  };
}

/**
 * Validate backup data structure.
 */
function validateBackup(data: unknown): data is BackupData {
  if (typeof data !== "object" || data === null) return false;
  const backup = data as Record<string, unknown>;
  return (
    typeof backup["version"] === "string" &&
    typeof backup["exportedAt"] === "string" &&
    Array.isArray(backup["users"]) &&
    Array.isArray(backup["customers"]) &&
    Array.isArray(backup["products"]) &&
    Array.isArray(backup["sales"]) &&
    Array.isArray(backup["saleItems"]) &&
    Array.isArray(backup["creditTransactions"]) &&
    Array.isArray(backup["payments"]) &&
    Array.isArray(backup["inventoryMovements"])
  );
}

/**
 * Import backup data from a JSON object.
 * This will REPLACE all existing data.
 */
export async function importBackup(data: unknown): Promise<{ success: boolean; message: string }> {
  if (!validateBackup(data)) {
    return { success: false, message: "Invalid backup file format" };
  }

  try {
    // Clear all existing data
    await Promise.all([
      clear(STORES.USERS),
      clear(STORES.SESSIONS),
      clear(STORES.CUSTOMERS),
      clear(STORES.PRODUCTS),
      clear(STORES.SALES),
      clear(STORES.SALE_ITEMS),
      clear(STORES.CREDIT_TRANSACTIONS),
      clear(STORES.PAYMENTS),
      clear(STORES.INVENTORY_MOVEMENTS),
    ]);

    // Import data in the correct order (respecting foreign key relationships)
    // Users first
    for (const user of data.users) {
      await add(STORES.USERS, user);
    }

    // Sessions
    for (const session of data.sessions) {
      await add(STORES.SESSIONS, session);
    }

    // Customers
    for (const customer of data.customers) {
      await add(STORES.CUSTOMERS, customer);
    }

    // Products
    for (const product of data.products) {
      await add(STORES.PRODUCTS, product);
    }

    // Sales
    for (const sale of data.sales) {
      await add(STORES.SALES, sale);
    }

    // Sale items
    for (const item of data.saleItems) {
      await add(STORES.SALE_ITEMS, item);
    }

    // Credit transactions
    for (const ct of data.creditTransactions) {
      await add(STORES.CREDIT_TRANSACTIONS, ct);
    }

    // Payments
    for (const payment of data.payments) {
      await add(STORES.PAYMENTS, payment);
    }

    // Inventory movements
    for (const movement of data.inventoryMovements) {
      await add(STORES.INVENTORY_MOVEMENTS, movement);
    }

    return { success: true, message: "Backup imported successfully" };
  } catch (error) {
    return { success: false, message: `Failed to import backup: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Download backup as a JSON file.
 */
export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retailease-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a JSON file and parse it.
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (validateBackup(data)) {
          resolve(data);
        } else {
          reject(new Error("Invalid backup file format"));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
