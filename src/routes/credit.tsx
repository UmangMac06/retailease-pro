import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NotebookPen } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { credits, inr } from "@/data/demo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "Udhar / Credit · RetailEase" },
      { name: "description", content: "Customer credit ledger with outstanding balances and due status." },
      { property: "og:title", content: "Udhar / Credit · RetailEase" },
      {
        property: "og:description",
        content: "Customer credit ledger with outstanding balances and due status.",
      },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  const [selected, setSelected] = useState<(typeof credits)[number] | null>(null);

  return (
    <AppShell
      title="Udhar / Credit"
      subtitle="Who owes what, and how long it has been on the book."
      action={
        <button
          onClick={() => setSelected(credits[0] ?? null)}
          className="flex h-9 items-center gap-2 rounded-lg bg-gold px-3.5 text-sm font-medium text-primary-foreground transition hover:brightness-95"
        >
          <NotebookPen className="size-4" /> Add Payment
        </button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Outstanding" value={inr(24310)} hint="18 customers" badge="Udhar" badgeTone="warning" />
        <KpiCard label="Due Today" value={inr(380)} hint="1 customer" />
        <KpiCard label="Overdue" value={inr(9650)} hint="2 customers past 7 days" badge="Overdue" badgeTone="danger" />
        <KpiCard label="Collected This Week" value={inr(6660)} hint="6 payments" badgeTone="success" />
      </div>

      <SectionCard title="Credit Ledger" description="Outstanding balances across the shop">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Last Entry</th>
              <th className={`${thStyle} text-right`}>Outstanding</th>
              <th className={thStyle}>Status</th>
              <th className={`${thStyle} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {credits.map((c) => (
              <tr key={c.phone} className="transition-colors hover:bg-brand-soft/50">
                <td className={tdStyle}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                </td>
                <td className={`${tdStyle} text-muted-foreground`}>{c.last}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(c.amount)}</td>
                <td className={tdStyle}>
                  <StatusBadge tone={c.status}>{c.label}</StatusBadge>
                </td>
                <td className={`${tdStyle} text-right`}>
                  <button
                    onClick={() => setSelected(c)}
                    className="text-xs font-medium text-brand transition-colors hover:text-brand-deep"
                  >
                    Add payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Payment</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.name} · outstanding ${inr(selected.amount)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Amount received</span>
              <div className="relative mt-1">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                  ₹
                </span>
                <input
                  defaultValue="2,000"
                  className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-7 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-foreground/80">Method</span>
                <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank</option>
                </select>
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
              <span className="text-xs font-medium text-foreground/80">Note (optional)</span>
              <input
                placeholder="Partial payment"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
          </div>
          <DialogFooter>
            <button
              onClick={() => setSelected(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => setSelected(null)}
              className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-deep"
            >
              Record Payment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
