import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { products, stockMovements } from "@/data/demo";
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
  return (
    <AppShell
      title="Inventory"
      subtitle="What is on the shelf today and what needs reordering."
      action={<StockInDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items Tracked" value="248" hint="across all categories" />
        <KpiCard label="Low Stock" value="7" hint="below reorder level" badge="Check" badgeTone="warning" />
        <KpiCard label="Critical" value="3" hint="3 units or fewer" badge="Urgent" badgeTone="danger" />
        <KpiCard label="Stock In Today" value="48" hint="units received" badgeTone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Stock Levels" description="Current quantity on hand">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Category</th>
                <th className={`${thStyle} text-right`}>On Hand</th>
                <th className={`${thStyle} text-right`}>Reorder At</th>
                <th className={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.sku} className="transition-colors hover:bg-brand-soft/50">
                  <td className={`${tdStyle} font-medium`}>{p.name}</td>
                  <td className={`${tdStyle} text-muted-foreground`}>{p.category}</td>
                  <td className={`${tdStyle} text-right font-mono`}>{p.stock}</td>
                  <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>10</td>
                  <td className={tdStyle}>
                    <StatusBadge tone={p.stock <= 3 ? "critical" : p.stock <= 10 ? "low" : "ok"}>
                      {p.stock <= 3 ? "Critical" : p.stock <= 10 ? "Low" : "Healthy"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Recent Movements" description="Stock in, out and adjustments">
          <ul className="divide-y divide-border">
            {stockMovements.map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.product}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.date} · {m.note || m.type}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`font-mono text-sm ${m.qty < 0 || m.type === "Stock Out" ? "text-danger" : "text-success"}`}
                  >
                    {m.type === "Stock Out" ? `-${m.qty}` : m.qty > 0 ? `+${m.qty}` : m.qty}
                  </div>
                  <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    {m.type}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function StockInDialog() {
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
                <option key={p.sku}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Quantity</span>
              <input
                defaultValue="24"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Date</span>
              <input
                defaultValue="14 Jan 2025"
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
