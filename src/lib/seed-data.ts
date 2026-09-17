/**
 * Seed / demo data.
 *
 * This is ONLY used once, to populate an empty database so the app is not
 * blank during a demo. It is never read by the UI — every page reads from
 * SQLite through the server functions.
 */

const day = (offset: number, time = "10:00:00") => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.toISOString().slice(0, 10)} ${time}`;
};

export const SEED = {
  owner: {
    name: "Anil Verma",
    phone: "9876543210",
    password: "retailease",
    shopName: "Sharma General Stores",
  },

  customers: [
    { name: "Ramesh Gupta", phone: "9876543211", address: "Gandhi Nagar, Lane 4", notes: "Buys monthly ration" },
    { name: "Sunita Devi", phone: "9812355678", address: "Shivaji Road", notes: "" },
    { name: "Mohd. Saleem", phone: "9845011223", address: "Station Road, Near Masjid", notes: "Settles every fortnight" },
    { name: "Kavita Joshi", phone: "9004577812", address: "Gandhi Nagar, Block B", notes: "" },
    { name: "Harish Patel", phone: "9823390456", address: "Market Chowk", notes: "Runs a tea stall" },
    { name: "Priya Nair", phone: "9741122890", address: "Shivaji Road, Flat 12", notes: "Always pays cash" },
  ],

  products: [
    { sku: "SKU-1001", name: "Aashirvaad Atta 1kg", category: "Staples", unit: "packet", cost: 52, price: 58, stock: 3, threshold: 10 },
    { sku: "SKU-1002", name: "Tata Salt 1kg", category: "Essentials", unit: "packet", cost: 22, price: 26, stock: 5, threshold: 10 },
    { sku: "SKU-1003", name: "Fortune Sunlite 1L", category: "Oils", unit: "bottle", cost: 128, price: 142, stock: 6, threshold: 8 },
    { sku: "SKU-1004", name: "Parle-G Biscuit", category: "Snacks", unit: "packet", cost: 8, price: 10, stock: 4, threshold: 12 },
    { sku: "SKU-1005", name: "Amul Milk 500ml", category: "Dairy", unit: "pouch", cost: 26, price: 29, stock: 34, threshold: 15 },
    { sku: "SKU-1006", name: "Toor Dal 1kg", category: "Pulses", unit: "packet", cost: 132, price: 148, stock: 22, threshold: 8 },
    { sku: "SKU-1007", name: "Surf Excel 500g", category: "Cleaning", unit: "packet", cost: 96, price: 110, stock: 2, threshold: 6 },
    { sku: "SKU-1008", name: "Red Label Tea 250g", category: "Beverages", unit: "packet", cost: 118, price: 135, stock: 18, threshold: 6 },
    { sku: "SKU-1009", name: "Basmati Rice 5kg", category: "Staples", unit: "bag", cost: 480, price: 545, stock: 11, threshold: 5 },
    { sku: "SKU-1010", name: "Colgate Strong 200g", category: "Personal Care", unit: "tube", cost: 88, price: 99, stock: 26, threshold: 8 },
  ],

  sales: [
    {
      invoice: "INV-1042", customerPhone: "9876543211", total: 1240, method: "Cash", status: "paid", soldAt: day(0, "09:14:00"),
      items: [
        { sku: "SKU-1009", qty: 2, rate: 545 },
        { sku: "SKU-1002", qty: 5, rate: 26 },
      ],
    },
    {
      invoice: "INV-1043", customerPhone: "9812355678", total: 380, method: "Udhar", status: "udhar", soldAt: day(0, "09:48:00"),
      items: [{ sku: "SKU-1006", qty: 2, rate: 148 }],
    },
    {
      invoice: "INV-1044", customerPhone: "9741122890", total: 610, method: "UPI", status: "paid", soldAt: day(1, "10:02:00"),
      items: [{ sku: "SKU-1003", qty: 4, rate: 142 }],
    },
    {
      invoice: "INV-1045", customerPhone: "9845011223", total: 720, method: "Udhar", status: "udhar", soldAt: day(1, "10:31:00"),
      items: [{ sku: "SKU-1008", qty: 4, rate: 135 }],
    },
    {
      invoice: "INV-1046", customerPhone: "9004577812", total: 1490, method: "UPI", status: "paid", soldAt: day(2, "12:20:00"),
      items: [{ sku: "SKU-1009", qty: 2, rate: 545 }],
    },
    {
      invoice: "INV-1047", customerPhone: "9823390456", total: 905, method: "Udhar", status: "udhar", soldAt: day(3, "13:02:00"),
      items: [{ sku: "SKU-1010", qty: 6, rate: 99 }],
    },
    {
      invoice: "INV-1048", customerPhone: "9876543211", total: 1160, method: "Cash", status: "paid", soldAt: day(4, "11:05:00"),
      items: [{ sku: "SKU-1005", qty: 40, rate: 29 }],
    },
    {
      invoice: "INV-1049", customerPhone: "9741122890", total: 296, method: "Cash", status: "paid", soldAt: day(5, "14:15:00"),
      items: [{ sku: "SKU-1004", qty: 10, rate: 10 }],
    },
  ],

  creditTransactions: [
    { customerPhone: "9876543211", type: "debit" as const, amount: 3400, note: "Monthly ration on udhar", occurredAt: day(9) },
    { customerPhone: "9876543211", type: "credit" as const, amount: 1000, note: "Partial payment", occurredAt: day(2) },
    { customerPhone: "9812355678", type: "debit" as const, amount: 380, note: "Dal and atta", occurredAt: day(0) },
    { customerPhone: "9845011223", type: "debit" as const, amount: 7750, note: "Festival stock", occurredAt: day(12) },
    { customerPhone: "9845011223", type: "credit" as const, amount: 2000, note: "Cheque cleared", occurredAt: day(2) },
    { customerPhone: "9004577812", type: "debit" as const, amount: 1620, note: "Weekly groceries", occurredAt: day(4) },
    { customerPhone: "9004577812", type: "credit" as const, amount: 500, note: "", occurredAt: day(3) },
    { customerPhone: "9823390456", type: "debit" as const, amount: 6400, note: "Tea stall supplies", occurredAt: day(6) },
    { customerPhone: "9823390456", type: "credit" as const, amount: 2500, note: "Weekly settlement", occurredAt: day(1) },
  ],

  payments: [
    { receipt: "PAY-313", customerPhone: "9812355678", amount: 300, method: "Cash", note: "", paidAt: day(4) },
    { receipt: "PAY-314", customerPhone: "9004577812", amount: 500, method: "UPI", note: "", paidAt: day(3) },
    { receipt: "PAY-315", customerPhone: "9845011223", amount: 2000, method: "Bank", note: "Cheque cleared", paidAt: day(2) },
    { receipt: "PAY-316", customerPhone: "9876543211", amount: 1000, method: "Cash", note: "Partial payment", paidAt: day(2) },
    { receipt: "PAY-317", customerPhone: "9823390456", amount: 2500, method: "UPI", note: "Weekly settlement", paidAt: day(1) },
  ],

  movements: [
    { sku: "SKU-1005", type: "in" as const, quantity: 48, note: "Morning delivery", occurredAt: day(0) },
    { sku: "SKU-1004", type: "out" as const, quantity: 12, note: "Counter sales", occurredAt: day(0) },
    { sku: "SKU-1009", type: "in" as const, quantity: 10, note: "Supplier: Agarwal Traders", occurredAt: day(1) },
    { sku: "SKU-1007", type: "out" as const, quantity: 6, note: "Counter sales", occurredAt: day(1) },
    { sku: "SKU-1006", type: "in" as const, quantity: 25, note: "Supplier: Shree Dal Mills", occurredAt: day(2) },
    { sku: "SKU-1002", type: "adjustment" as const, quantity: -2, note: "Damaged packets", occurredAt: day(2) },
  ],
};
