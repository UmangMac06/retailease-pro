import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listProducts, listMovements } from "@/lib/retailease-db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · RetailEase" },
      { name: "description", content: "Stock levels, reorder alerts and recent stock movements." },
      { property: "og:title", content: "Inventory · RetailEase" },
      {
        property: "og:description",
        content: "Stock levels, reorder alerts and recent stock movements.",
      },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: () => listMovements(),
  });

  if (productsLoading || movementsLoading || !products || !movements) return null;

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  const critical = products.filter((p) => p.stock <= 3);

  return (
    <AppShell
      title="Inventory"
      subtitle="What is on the shelf today and what needs reordering."
      action={<StockInDialog products={products} />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items Tracked" value={products.length.toString()} hint="across all categories" />
        <KpiCard label="Low Stock" value={lowStock.length.toString()} hint="below reorder level" badge="Check" badgeTone="warning" />
        <KpiCard label="Critical" value={critical.length.toString()} hint="3 units or fewer" badge="Urgent" badgeTone="danger" />
        <KpiCard label="Recent Movements" value={movements.length.toString()} hint="last 12 entries" badgeTone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Stock Levels" description="Current quantity on hand">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Category</th>
                <th className={`${thStyle} text-right`}>On Hand</th>
                <th className={`${thStyle} text-right`}>Threshold</th>
                <th className={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.sku} className="transition-colors hover:bg-brand-soft/50">
                  <td className={`${tdStyle} font-medium`}>{p.name}</td>
                  <td className={`${tdStyle} text-muted-foreground`}>{p.category}</td>
                  <td className={`${tdStyle} text-right font-mono`}>{p.stock}</td>
                  <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>{p.lowStockThreshold}</td>
                  <td className={tdStyle}>
                    <StatusBadge tone={p.stock <= 3 ? "critical" : p.stock <= p.lowStockThreshold ? "low" : "ok"}>
                      {p.stock <= 3 ? "Critical" : p.stock <= p.lowStockThreshold ? "Low" : "Healthy"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Recent Movements" description="Stock in, out and adjustments">
          <ul className="divide-y divide-border">
            {movements.map((m, i) => {
              const product = products.find(p => p.id === m.productId);
              return (
                <li key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{product?.name || "Unknown Product"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(m.occurredAt).toLocaleDateString()} · {m.note || m.type}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`font-mono text-sm ${m.quantity < 0 || m.type === "out" ? "text-danger" : "text-success"}`}
                    >
                      {m.type === "out" ? `${m.quantity}` : m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </div>
                    <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {m.type}
                    </div>
                  </div>
                </li>
              );
            })}
            {movements.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No stock movements recorded.
              </li>
            )}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function StockInDialog({ products }: { products: Array<{ id: number; name: string; sku: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
        <ArrowDownToLine className="size-4" /> Record Stock In
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Record Stock In</DialogTitle>
          <DialogDescription>Add received goods to the shelf count.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Product</span>
            <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              {products.map((p) => (
                <option key={p.sku} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Quantity</span>
              <input
                type="number"
                defaultValue="24"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Supplier note</span>
            <input
              placeholder="Agarwal Traders"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </label>
        </div>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-deep"
          >
            Save Entry
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
