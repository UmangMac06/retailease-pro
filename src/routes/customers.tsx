import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { customers, inr } from "@/data/demo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers · RetailEase" },
      { name: "description", content: "Customer directory with contact details and udhar balances." },
      { property: "og:title", content: "Customers · RetailEase" },
      {
        property: "og:description",
        content: "Customer directory with contact details and udhar balances.",
      },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [query, setQuery] = useState("");
  const rows = customers.filter((c) =>
    (c.name + c.phone + c.area).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell
      title="Customers"
      subtitle="Everyone who buys at the counter, with their running balance."
      action={<AddCustomerDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customers" value="312" hint="9 added this week" badge="Active" />
        <KpiCard
          label="With Udhar"
          value="18"
          hint="carrying a balance"
          badge="Credit"
          badgeTone="warning"
        />
        <KpiCard label="Regulars" value="74" hint="visited 4+ times this month" />
        <KpiCard label="New This Month" value="23" hint="first purchase in Jan" badgeTone="success" />
      </div>

      <SectionCard
        title="Customer Directory"
        description={`${rows.length} shown`}
        action={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, phone, area…"
            className="h-9 w-64 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Area</th>
              <th className={thStyle}>Customer Since</th>
              <th className={`${thStyle} text-right`}>Purchases</th>
              <th className={`${thStyle} text-right`}>Outstanding</th>
              <th className={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((c) => (
              <tr key={c.phone} className="transition-colors hover:bg-brand-soft/50">
                <td className={tdStyle}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                </td>
                <td className={`${tdStyle} text-muted-foreground`}>{c.area}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{c.since}</td>
                <td className={`${tdStyle} text-right font-mono`}>{c.purchases}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>
                  {c.outstanding ? inr(c.outstanding) : "—"}
                </td>
                <td className={tdStyle}>
                  <StatusBadge tone={c.outstanding ? "udhar" : "paid"}>
                    {c.outstanding ? "Has udhar" : "Clear"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No customers match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}

function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
        <UserPlus className="size-4" /> Add Customer
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Customer</DialogTitle>
          <DialogDescription>Save a regular so their udhar can be tracked.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <Field label="Full name" placeholder="e.g. Ramesh Gupta" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile number" placeholder="98765 43210" mono />
            <Field label="Area" placeholder="Gandhi Nagar" />
          </div>
          <Field label="Credit limit (optional)" placeholder="5,000" mono />
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
            Save Customer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  placeholder,
  mono,
}: {
  label: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <input
        placeholder={placeholder}
        className={`mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}
