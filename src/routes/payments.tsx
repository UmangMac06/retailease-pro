import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, shortDate } from "@/lib/format";
import {
  getCreditOverview,
  getPaymentSummary,
  listPayments,
  recordPayment,
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

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments · RetailEase" },
      { name: "description", content: "Record of udhar repayments received from customers." },
      { property: "og:title", content: "Payments · RetailEase" },
      { property: "og:description", content: "Record of udhar repayments received from customers." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const payments = useQuery({ queryKey: ["payments"], queryFn: () => listPayments() });
  const summary = useQuery({ queryKey: ["payment-summary"], queryFn: () => getPaymentSummary() });
  const rows = payments.data ?? [];

  return (
    <AppShell
      title="Payments"
      subtitle="Money collected against customer credit."
      action={<RecordPaymentDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Collected Today"
          value={inr(summary.data?.today ?? 0)}
          hint={`${summary.data?.todayCount ?? 0} payments`}
          badgeTone="success"
        />
        <KpiCard
          label="This Week"
          value={inr(summary.data?.week ?? 0)}
          hint={`${summary.data?.weekCount ?? 0} payments`}
          badge="Week"
        />
        <KpiCard label="Cash Share" value={`${summary.data?.cashShare ?? 0}%`} hint="rest by UPI and bank" />
        <KpiCard
          label="Pending Udhar"
          value={inr(summary.data?.outstanding ?? 0)}
          hint="still on the book"
          badge="Udhar"
          badgeTone="warning"
        />
      </div>

      <SectionCard title="Payment History" description={`${rows.length} receipts`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Receipt</th>
              <th className={thStyle}>Date</th>
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Method</th>
              <th className={thStyle}>Note</th>
              <th className={`${thStyle} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.receipt} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-mono text-[12px] text-muted-foreground`}>{p.receipt}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{shortDate(p.paidAt)}</td>
                <td className={`${tdStyle} font-medium`}>{p.customer}</td>
                <td className={tdStyle}>
                  <StatusBadge tone={p.method === "Cash" ? "ok" : "brand"}>{p.method}</StatusBadge>
                </td>
                <td className={`${tdStyle} text-muted-foreground`}>{p.note || "—"}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(p.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}

export function RecordPaymentDialog({
  customerId: fixedCustomer,
  trigger,
}: {
  customerId?: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | "">(fixedCustomer ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();
  const credit = useQuery({ queryKey: ["credit-overview"], queryFn: () => getCreditOverview() });
  const debtors = credit.data?.rows ?? [];
  const selected = debtors.find((c) => c.id === customerId);

  const save = useMutation({
    mutationFn: (payload: { customerId: number; amount: number; method: "Cash" | "UPI" | "Bank"; note: string }) =>
      recordPayment({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries();
      setOpen(false);
      setAmount("");
      setNote("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    setError(null);
    if (customerId === "") {
      setError("Select a customer");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    if (selected && value > selected.outstanding) {
      setError(`Payment cannot be more than the outstanding ${inr(selected.outstanding)}`);
      return;
    }
    save.mutate({ customerId, amount: value, method, note });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setCustomerId(fixedCustomer ?? "");
        }
      }}
    >
      <DialogTrigger asChild={!!trigger}>
        {trigger ?? (
          <span className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-gold px-3.5 text-sm font-medium text-primary-foreground transition hover:brightness-95">
            <Wallet className="size-4" /> Record Payment
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Record Payment</DialogTitle>
          <DialogDescription>
            {selected
              ? `${selected.name} · outstanding ${inr(selected.outstanding)}`
              : "Collect money against a customer's udhar."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Customer</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">Select customer</option>
              {debtors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {inr(c.outstanding)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Amount received</span>
              <input
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Method</span>
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
          </div>
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Partial payment"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </label>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
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
            {save.isPending ? "Saving…" : "Record Payment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
