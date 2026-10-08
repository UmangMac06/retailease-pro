import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { NotebookPen, Search, Eye, ArrowUpRight, ArrowDownLeft, History, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, shortDate, shortTime } from "@/lib/format";
import {
  getCreditOverview,
  getCreditDetail
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
import { RecordPaymentDialog } from "./payments";

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
  const [query, setQuery] = useState("");
  const overview = useQuery({ queryKey: ["credit-overview"], queryFn: () => getCreditOverview() });
  
  const data = overview.data?.rows ?? [];
  const rows = useMemo(() => {
    return data.filter((c) =>
      (c.name + c.phone).toLowerCase().includes(query.toLowerCase()),
    );
  }, [data, query]);

  return (
    <AppShell
      title="Udhar / Credit"
      subtitle="Who owes what, and how long it has been on the book."
      action={<RecordPaymentDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard 
          label="Total Outstanding" 
          value={inr(overview.data?.totalOutstanding ?? 0)} 
          hint={`${overview.data?.customersWithUdhar ?? 0} customers`} 
          badge="Udhar" 
          badgeTone="warning" 
        />
        <KpiCard 
          label="Total Credit Given" 
          value={inr(overview.data?.totalCredit ?? 0)} 
          hint="lifetime udhar" 
        />
        <KpiCard 
          label="Total Collected" 
          value={inr(overview.data?.totalPaid ?? 0)} 
          hint="lifetime payments" 
          badgeTone="success"
        />
        <KpiCard 
          label="Collected This Week" 
          value={inr(overview.data?.collectedWeek ?? 0)} 
          hint="last 7 days" 
          badgeTone="success" 
        />
      </div>

      <SectionCard 
        title="Credit Ledger" 
        description={`${rows.length} customers with balance`}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or phone…"
              className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className={thStyle}>Customer</th>
                <th className={thStyle}>Last Entry</th>
                <th className={`${thStyle} text-right`}>Credit Given</th>
                <th className={`${thStyle} text-right`}>Total Paid</th>
                <th className={`${thStyle} text-right`}>Outstanding</th>
                <th className={`${thStyle} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-brand-soft/50">
                  <td className={tdStyle}>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.phone}</div>
                  </td>
                  <td className={`${tdStyle} text-muted-foreground`}>
                    {c.lastEntry ? shortDate(c.lastEntry) : "—"}
                  </td>
                  <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>{inr(c.totalCredit)}</td>
                  <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>{inr(c.totalPaid)}</td>
                  <td className={`${tdStyle} text-right font-mono font-medium text-brand-deep`}>{inr(c.outstanding)}</td>
                  <td className={`${tdStyle} text-right`}>
                    <div className="flex justify-end gap-3">
                      <CreditDetailDialog customerId={c.id} />
                      <RecordPaymentDialog 
                        customerId={c.id} 
                        trigger={
                          <button className="text-xs font-medium text-brand hover:text-brand-deep transition-colors">
                            Add payment
                          </button>
                        } 
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {overview.isLoading ? "Loading ledger..." : "No outstanding credit found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AppShell>
  );
}

function CreditDetailDialog({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ["credit-detail", customerId],
    queryFn: () => getCreditDetail({ data: { id: customerId } }),
    enabled: open
  });

  const data = detail.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs font-medium text-muted-foreground hover:text-brand transition-colors flex items-center gap-1">
          <Eye className="size-3" /> View history
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Credit Statement</DialogTitle>
          <DialogDescription>Detailed ledger for {data?.name || 'customer'}</DialogDescription>
        </DialogHeader>

        {detail.isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading ledger...</div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-border p-4 bg-muted/30">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Total Credit</div>
                <div className="font-mono font-bold text-danger">{inr(data.totalCredit)}</div>
              </div>
              <div className="text-center border-x border-border">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Total Paid</div>
                <div className="font-mono font-bold text-success">{inr(data.totalPaid)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Outstanding</div>
                <div className="font-mono font-bold text-brand-deep text-lg">{inr(data.outstanding)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-serif text-lg">
                  <History className="size-5 text-brand" /> Transaction History
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border text-left">
                      <th className={thStyle}>Date & Time</th>
                      <th className={thStyle}>Ref / Note</th>
                      <th className={`${thStyle} text-right`}>Debit (Udhar)</th>
                      <th className={`${thStyle} text-right`}>Credit (Paid)</th>
                      <th className={`${thStyle} text-right`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.entries.map((e, idx) => {
                      const balanceAfter = data.entries.slice(idx).reduce((acc, curr) => {
                        return acc + (curr.type === 'debit' ? curr.amount : -curr.amount);
                      }, 0);
                      
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className={tdStyle}>
                            <div>{shortDate(e.occurredAt)}</div>
                            <div className="text-[10px] text-muted-foreground">{shortTime(e.occurredAt)}</div>
                          </td>
                          <td className={tdStyle}>
                            <div className="font-medium">{e.invoice || 'Payment'}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{e.note}</div>
                          </td>
                          <td className={`${tdStyle} text-right font-mono text-danger`}>
                            {e.type === 'debit' ? inr(e.amount) : '—'}
                          </td>
                          <td className={`${tdStyle} text-right font-mono text-success`}>
                            {e.type === 'credit' ? inr(e.amount) : '—'}
                          </td>
                          <td className={`${tdStyle} text-right font-mono font-medium`}>
                            {inr(balanceAfter)}
                          </td>
                        </tr>
                      );
                    })}
                    {data.entries.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground italic">No transactions recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-danger">Failed to load statement.</div>
        )}

        <DialogFooter className="mt-4">
          <button
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-deep"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

