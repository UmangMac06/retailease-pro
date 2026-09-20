import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, shortDate, shortTime } from "@/lib/format";
import {
  createSale,
  getSalesSummary,
  listCustomers,
  listProducts,
  listSales,
} from "@/lib/retailease.functions";
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
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => listSales() });
  const summary = useQuery({ queryKey: ["sales-summary"], queryFn: () => getSalesSummary() });

  const rows = (sales.data ?? []).filter((s) =>
    filter === "All" ? true : filter === "Paid" ? s.status === "paid" : s.status !== "paid",
  );

  return (
    <AppShell title="Sales" subtitle="Every bill made at the counter." action={<NewSaleDialog />}>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's Sales"
          value={inr(summary.data?.today ?? 0)}
          hint={`${summary.data?.bills ?? 0} bills`}
          badge="Today"
          badgeTone="success"
        />
        <KpiCard label="Fully Paid" value={inr(summary.data?.settled ?? 0)} hint="settled at counter" />
        <KpiCard
          label="On Udhar"
          value={inr(summary.data?.onUdhar ?? 0)}
          hint="added to credit ledger"
          badge="Udhar"
          badgeTone="warning"
        />
        <KpiCard label="Average Bill" value={inr(summary.data?.average ?? 0)} hint="per transaction" />
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
              <th className={thStyle}>Date</th>
              <th className={`${thStyle} text-right`}>Items</th>
              <th className={thStyle}>Method</th>
              <th className={`${thStyle} text-right`}>Amount</th>
              <th className={`${thStyle} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.invoice} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-mono text-[12px] text-muted-foreground`}>{s.invoice}</td>
                <td className={`${tdStyle} font-medium`}>{s.customer}</td>
                <td className={`${tdStyle} text-muted-foreground`}>
                  {shortDate(s.soldAt)} {shortTime(s.soldAt)}
                </td>
                <td className={`${tdStyle} text-right font-mono`}>{s.items}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{s.method}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(s.total)}</td>
                <td className={`${tdStyle} text-right`}>
                  <StatusBadge tone={s.status === "paid" ? "paid" : s.status === "partial" ? "due" : "udhar"}>
                    {s.status === "paid" ? "Paid" : s.status === "partial" ? "Part paid" : "Udhar"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}

type Line = { productId: number | ""; quantity: string };

function NewSaleDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [method, setMethod] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [mode, setMode] = useState<"paid" | "credit" | "partial">("paid");
  const [amountPaid, setAmountPaid] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  const products = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const productList = products.data ?? [];

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const p = productList.find((x) => x.id === line.productId);
        const qty = Number(line.quantity);
        if (!p || !Number.isFinite(qty) || qty <= 0) return sum;
        return sum + p.price * qty;
      }, 0),
    [lines, productList],
  );

  const reset = () => {
    setCustomerId("");
    setMethod("Cash");
    setMode("paid");
    setAmountPaid("");
    setLines([{ productId: "", quantity: "1" }]);
    setError(null);
  };

  const save = useMutation({
    mutationFn: (payload: Parameters<typeof createSale>[0]["data"]) => createSale({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries();
      setOpen(false);
      reset();
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    setError(null);
    const items: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      if (line.productId === "") {
        setError("Select a product for every line");
        return;
      }
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError("Quantity must be greater than zero");
        return;
      }
      const p = productList.find((x) => x.id === line.productId);
      if (p && qty > p.stock) {
        setError(`Not enough stock for ${p.name}. Only ${p.stock} left.`);
        return;
      }
      items.push({ productId: line.productId, quantity: qty });
    }
    if (items.length === 0) {
      setError("Add at least one product");
      return;
    }
    if (mode !== "paid" && customerId === "") {
      setError("Select a customer for a credit or partly paid bill");
      return;
    }
    const paid = mode === "partial" ? Number(amountPaid) : 0;
    if (mode === "partial" && (!Number.isFinite(paid) || paid <= 0 || paid >= total)) {
      setError("Enter a paid amount between zero and the bill total");
      return;
    }

    save.mutate({
      customerId: customerId === "" ? null : customerId,
      method,
      mode,
      amountPaid: mode === "partial" ? paid : 0,
      items,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
        <Plus className="size-4" /> New Sale
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">New Sale</DialogTitle>
          <DialogDescription>Record a counter bill in the day book.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Customer</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">Walk-in customer</option>
                {(customers.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Payment status</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="paid">Paid</option>
                <option value="credit">Credit / Udhar</option>
                <option value="partial">Partially paid</option>
              </select>
            </label>
          </div>

          {mode !== "credit" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-foreground/80">Payment method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank</option>
                </select>
              </label>
              {mode === "partial" && (
                <label className="block">
                  <span className="text-xs font-medium text-foreground/80">Amount paid now</span>
                  <input
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </label>
              )}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground/80">Items</span>
            {lines.map((line, idx) => {
              const p = productList.find((x) => x.id === line.productId);
              return (
                <div key={idx} className="grid grid-cols-[1fr_84px_84px_32px] items-end gap-2">
                  <select
                    value={line.productId}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, i) =>
                          i === idx
                            ? { ...l, productId: e.target.value === "" ? "" : Number(e.target.value) }
                            : l,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="">Select product</option>
                    {productList.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.stock} left)
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.quantity}
                    inputMode="decimal"
                    onChange={(e) =>
                      setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <div className="flex h-10 items-center justify-end pr-1 font-mono text-sm text-muted-foreground">
                    {p ? inr(p.price * (Number(line.quantity) || 0)) : "—"}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove item"
                    onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls))}
                    className="grid h-10 place-items-center rounded-lg text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, { productId: "", quantity: "1" }])}
              className="text-xs font-medium text-brand hover:text-brand-deep"
            >
              + Add another item
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
            <span className="text-xs font-medium text-brand-deep">Bill total</span>
            <span className="font-mono text-lg font-semibold text-brand-deep">{inr(total)}</span>
          </div>

          {mode === "partial" && (
            <p className="text-[11px] text-muted-foreground">
              Udhar added: {inr(Math.max(0, total - (Number(amountPaid) || 0)))}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
          )}
        </div>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={save.isPending}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-deep disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save Bill"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
