import { createFileRoute } from "@tanstack/react-router";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, payments } from "@/data/demo";

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
  return (
    <AppShell title="Payments" subtitle="Money collected against customer credit.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Collected Today" value={inr(1000)} hint="1 payment" badgeTone="success" />
        <KpiCard label="This Week" value={inr(6660)} hint="6 payments" badge="Week" />
        <KpiCard label="Cash Share" value="52%" hint="rest by UPI and bank" />
        <KpiCard label="Pending Udhar" value={inr(24310)} hint="still on the book" badge="Udhar" badgeTone="warning" />
      </div>

      <SectionCard title="Payment History" description="Latest repayments recorded at the counter">
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
            {payments.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-mono text-[12px] text-muted-foreground`}>{p.id}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{p.date}</td>
                <td className={`${tdStyle} font-medium`}>{p.customer}</td>
                <td className={tdStyle}>
                  <StatusBadge tone={p.method === "Cash" ? "ok" : "brand"}>{p.method}</StatusBadge>
                </td>
                <td className={`${tdStyle} text-muted-foreground`}>{p.note || "—"}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}
