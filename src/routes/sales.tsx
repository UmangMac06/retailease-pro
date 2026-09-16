import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { customers, inr, products, recentSales } from "@/data/demo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales · RetailEase" },
      { name: "description", content: "Daily bills, payment method and amounts for the counter." },
      { property: "og:title", content: "Sales · RetailEase" },
      { property: "og:description", content: "Daily bills, payment method and amounts." },
    ],
  }),
  component: SalesPage,
});

const filters = ["All", "Paid", "Udhar"] as const;

function SalesPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const rows = recentSales.filter((s) =>
    filter === "All" ? true : filter === "Paid" ? s.status !== "udhar" : s.status === "udhar",
  );

  return (
    <AppShell
      title="Sales"
      subtitle="Every bill made at the counter today."
      action={<NewSaleDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Sales" value={inr(18420)} hint="42 bills" badge="+12%" badgeTone="success" />
        <KpiCard label="Cash & UPI" value={inr(14315)} hint="settled at counter" />
        <KpiCard label="On Udhar" value={inr(4105)} hint="added to credit ledger" badge="Udhar" badgeTone="warning" />
        <KpiCard label="Average Bill" value={inr(439)} hint="per transaction" />
      </div>

      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-full px-3.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-brand text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <SectionCard title="Bill Register" description={`${rows.length} bills`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Bill No.</th>
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Time</th>
              <th className={`${thStyle} text-right`}>Items</th>
              <th className={thStyle}>Method</th>
              <th className={`${thStyle} text-right`}>Amount</th>
              <th className={`${thStyle} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-mono text-[12px] text-muted-foreground`}>{s.id}</td>
                <td className={`${tdStyle} font-medium`}>{s.customer}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{s.time}</td>
                <td className={`${tdStyle} text-right font-mono`}>{s.items}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{s.method}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(s.amount)}</td>
                <td className={`${tdStyle} text-right`}>
                  <StatusBadge tone={s.status}>
                    {s.status === "udhar" ? "Udhar" : "Paid"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}

function NewSaleDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
        <Plus className="size-4" /> New Sale
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">New Sale</DialogTitle>
          <DialogDescription>Record a counter bill in the day book.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Customer</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                <option>Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.phone}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Payment method</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                <option>Cash</option>
                <option>UPI</option>
                <option>Udhar (credit)</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-[1fr_88px_88px] gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Item</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                {products.map((p) => (
                  <option key={p.sku}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Qty</span>
              <input
                defaultValue="2"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Rate</span>
              <input
                defaultValue="58"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
            <span className="text-xs font-medium text-brand-deep">Bill total</span>
            <span className="font-mono text-lg font-semibold text-brand-deep">{inr(116)}</span>
          </div>
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
            Save Bill
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
