import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { credits, inr, lowStock, recentSales } from "@/data/demo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · RetailEase" },
      {
        name: "description",
        content: "Daily sales, credit outstanding and low stock at a glance for your kirana store.",
      },
      { property: "og:title", content: "Dashboard · RetailEase" },
      {
        property: "og:description",
        content: "Daily sales, credit outstanding and low stock at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell
      title="Today at the counter"
      subtitle="A quick look at sales, stock and what customers still owe."
      action={
        <Link
          to="/sales"
          className="flex h-9 items-center rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep"
        >
          New Entry
        </Link>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's Sales"
          value={inr(18420)}
          hint="42 transactions · avg ₹ 439"
          badge="+12%"
          badgeTone="success"
        />
        <KpiCard
          label="Credit Outstanding"
          value={inr(24310)}
          hint="18 customers · 5 due today"
          badge="Udhar"
          badgeTone="warning"
        />
        <KpiCard
          label="Low Stock"
          value="7"
          hint="items below reorder level"
          badge="Reorder"
          badgeTone="danger"
        />
        <KpiCard label="Customers" value="312" hint="9 new this week" badge="Active" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Recent Sales"
          action={
            <Link to="/sales" className="text-xs font-medium text-brand hover:text-brand-deep">
              View all →
            </Link>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={thStyle}>Customer</th>
                <th className={thStyle}>Items</th>
                <th className={`${thStyle} text-right`}>Amount</th>
                <th className={`${thStyle} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentSales.slice(0, 5).map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-brand-soft/50">
                  <td className={tdStyle}>
                    <div className="font-medium">{s.customer}</div>
                    <div className="text-[11px] text-muted-foreground">{s.time}</div>
                  </td>
                  <td className={`${tdStyle} text-muted-foreground`}>{s.items} items</td>
                  <td className={`${tdStyle} text-right font-mono`}>{inr(s.amount)}</td>
                  <td className={`${tdStyle} text-right`}>
                    <StatusBadge tone={s.status}>
                      {s.status === "paid" ? "Paid" : s.status === "udhar" ? "Udhar" : "COD"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard
          title="Low Stock"
          className="flex flex-col"
          action={
            <span className="rounded bg-danger-soft px-1.5 py-0.5 font-mono text-[11px] text-danger">
              7
            </span>
          }
        >
          <ul className="flex-1 divide-y divide-border">
            {lowStock.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.category}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm">{p.left} left</div>
                  <div
                    className={`text-[10px] tracking-wide uppercase ${
                      p.level === "critical" ? "text-danger" : "text-warning"
                    }`}
                  >
                    {p.level}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-3">
            <Link
              to="/inventory"
              className="flex h-9 w-full items-center justify-center rounded-lg border border-brand/30 text-sm font-medium text-brand transition-colors hover:bg-brand-soft"
            >
              Go to inventory →
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Customer Credit (Udhar)"
        description="Outstanding balances across the ledger"
        action={
          <Link
            to="/credit"
            className="flex h-8 items-center rounded-md bg-gold px-3 text-xs font-medium text-primary-foreground transition hover:brightness-95"
          >
            Open ledger
          </Link>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Last Entry</th>
              <th className={`${thStyle} text-right`}>Outstanding</th>
              <th className={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {credits.slice(0, 5).map((c) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}
