export const shop = {
  name: "Sharma General Stores",
  owner: "Anil Verma",
  initials: "AV",
  role: "Shop Owner",
  today: "Tue, 14 Jan",
};

export const inr = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

export type Status = "paid" | "udhar" | "cod" | "ontrack" | "due" | "overdue" | "low" | "critical" | "ok";

export const recentSales = [
  { id: "INV-1042", customer: "Ramesh Gupta", time: "9:14 AM", items: 6, amount: 1240, status: "paid" as Status, method: "Cash" },
  { id: "INV-1043", customer: "Sunita Devi", time: "9:48 AM", items: 3, amount: 380, status: "udhar" as Status, method: "Udhar" },
  { id: "INV-1044", customer: "Walk-in customer", time: "10:02 AM", items: 12, amount: 2610, status: "paid" as Status, method: "UPI" },
  { id: "INV-1045", customer: "Mohd. Saleem", time: "10:31 AM", items: 4, amount: 720, status: "udhar" as Status, method: "Udhar" },
  { id: "INV-1046", customer: "Priya Nair", time: "11:05 AM", items: 2, amount: 165, status: "cod" as Status, method: "Cash" },
  { id: "INV-1047", customer: "Kavita Joshi", time: "12:20 PM", items: 8, amount: 1490, status: "paid" as Status, method: "UPI" },
  { id: "INV-1048", customer: "Harish Patel", time: "1:02 PM", items: 5, amount: 905, status: "udhar" as Status, method: "Udhar" },
  { id: "INV-1049", customer: "Walk-in customer", time: "2:15 PM", items: 1, amount: 60, status: "paid" as Status, method: "Cash" },
];

export const lowStock = [
  { name: "Aashirvaad Atta 1kg", category: "Staples", left: 3, level: "critical" as Status },
  { name: "Tata Salt 1kg", category: "Essentials", left: 5, level: "low" as Status },
  { name: "Parle-G Biscuit", category: "Snacks", left: 4, level: "low" as Status },
  { name: "Surf Excel 500g", category: "Cleaning", left: 2, level: "critical" as Status },
  { name: "Fortune Sunlite 1L", category: "Oils", left: 6, level: "low" as Status },
];

export const customers = [
  { name: "Ramesh Gupta", phone: "98765 43210", area: "Gandhi Nagar", since: "Mar 2023", purchases: 86, outstanding: 2400 },
  { name: "Sunita Devi", phone: "98123 55678", area: "Shivaji Road", since: "Jul 2023", purchases: 54, outstanding: 380 },
  { name: "Mohd. Saleem", phone: "98450 11223", area: "Station Road", since: "Jan 2022", purchases: 132, outstanding: 5750 },
  { name: "Kavita Joshi", phone: "90045 77812", area: "Gandhi Nagar", since: "Nov 2023", purchases: 41, outstanding: 1120 },
  { name: "Harish Patel", phone: "98233 90456", area: "Market Chowk", since: "Feb 2021", purchases: 198, outstanding: 3900 },
  { name: "Priya Nair", phone: "97411 22890", area: "Shivaji Road", since: "Aug 2024", purchases: 12, outstanding: 0 },
  { name: "Deepak Rawat", phone: "99880 33145", area: "Station Road", since: "May 2024", purchases: 27, outstanding: 0 },
];

export const products = [
  { sku: "SKU-1001", name: "Aashirvaad Atta 1kg", category: "Staples", unit: "packet", cost: 52, price: 58, stock: 3 },
  { sku: "SKU-1002", name: "Tata Salt 1kg", category: "Essentials", unit: "packet", cost: 22, price: 26, stock: 5 },
  { sku: "SKU-1003", name: "Fortune Sunlite 1L", category: "Oils", unit: "bottle", cost: 128, price: 142, stock: 6 },
  { sku: "SKU-1004", name: "Parle-G Biscuit", category: "Snacks", unit: "packet", cost: 8, price: 10, stock: 4 },
  { sku: "SKU-1005", name: "Amul Milk 500ml", category: "Dairy", unit: "pouch", cost: 26, price: 29, stock: 34 },
  { sku: "SKU-1006", name: "Toor Dal 1kg", category: "Pulses", unit: "packet", cost: 132, price: 148, stock: 22 },
  { sku: "SKU-1007", name: "Surf Excel 500g", category: "Cleaning", unit: "packet", cost: 96, price: 110, stock: 2 },
  { sku: "SKU-1008", name: "Red Label Tea 250g", category: "Beverages", unit: "packet", cost: 118, price: 135, stock: 18 },
  { sku: "SKU-1009", name: "Basmati Rice 5kg", category: "Staples", unit: "bag", cost: 480, price: 545, stock: 11 },
  { sku: "SKU-1010", name: "Colgate Strong 200g", category: "Personal Care", unit: "tube", cost: 88, price: 99, stock: 26 },
];

export const stockMovements = [
  { date: "14 Jan", product: "Amul Milk 500ml", type: "Stock In", qty: 48, note: "Morning delivery" },
  { date: "14 Jan", product: "Parle-G Biscuit", type: "Stock Out", qty: 12, note: "Counter sales" },
  { date: "13 Jan", product: "Basmati Rice 5kg", type: "Stock In", qty: 10, note: "Supplier: Agarwal Traders" },
  { date: "13 Jan", product: "Surf Excel 500g", type: "Stock Out", qty: 6, note: "Counter sales" },
  { date: "12 Jan", product: "Toor Dal 1kg", type: "Stock In", qty: 25, note: "Supplier: Shree Dal Mills" },
  { date: "12 Jan", product: "Tata Salt 1kg", type: "Adjustment", qty: -2, note: "Damaged packets" },
];

export const credits = [
  { name: "Ramesh Gupta", phone: "98765 43210", last: "12 Jan", amount: 2400, status: "ontrack" as Status, label: "On track" },
  { name: "Sunita Devi", phone: "98123 55678", last: "14 Jan", amount: 380, status: "due" as Status, label: "Due today" },
  { name: "Mohd. Saleem", phone: "98450 11223", last: "2 Jan", amount: 5750, status: "overdue" as Status, label: "Overdue" },
  { name: "Kavita Joshi", phone: "90045 77812", last: "10 Jan", amount: 1120, status: "due" as Status, label: "Due in 3d" },
  { name: "Harish Patel", phone: "98233 90456", last: "8 Jan", amount: 3900, status: "overdue" as Status, label: "Overdue" },
  { name: "Lata Kulkarni", phone: "93450 88123", last: "11 Jan", amount: 640, status: "ontrack" as Status, label: "On track" },
];

export const payments = [
  { id: "PAY-318", date: "14 Jan", customer: "Ramesh Gupta", method: "Cash", amount: 1000, note: "Partial payment" },
  { id: "PAY-317", date: "13 Jan", customer: "Harish Patel", method: "UPI", amount: 2500, note: "Weekly settlement" },
  { id: "PAY-316", date: "13 Jan", customer: "Lata Kulkarni", method: "Cash", amount: 360, note: "" },
  { id: "PAY-315", date: "12 Jan", customer: "Mohd. Saleem", method: "Bank", amount: 2000, note: "Cheque cleared" },
  { id: "PAY-314", date: "11 Jan", customer: "Kavita Joshi", method: "UPI", amount: 500, note: "" },
  { id: "PAY-313", date: "10 Jan", customer: "Sunita Devi", method: "Cash", amount: 300, note: "" },
];

export const weeklySales = [
  { day: "Mon", sales: 12400 },
  { day: "Tue", sales: 15200 },
  { day: "Wed", sales: 11800 },
  { day: "Thu", sales: 16900 },
  { day: "Fri", sales: 19400 },
  { day: "Sat", sales: 23100 },
  { day: "Sun", sales: 18420 },
];

export const categorySales = [
  { category: "Staples", value: 42800 },
  { category: "Dairy", value: 21400 },
  { category: "Snacks", value: 16300 },
  { category: "Cleaning", value: 11200 },
  { category: "Beverages", value: 9800 },
];
