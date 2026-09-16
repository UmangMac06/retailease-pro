import { createFileRoute } from "@tanstack/react-router";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { categorySales, inr, weeklySales } from "@/data/demo";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · RetailEase" },
      { name: "description", content: "Weekly sales trend, category performance and credit summary." },
      { property: "og:title", content: "Reports · RetailEase" },
      {
        property: "og:description",
        content: "Weekly sales trend, category performance and credit summary.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const max = Math.max(...weeklySales.map((d) => d.sales));
  const catMax = Math.max(...categorySales.map((c) => c.value));

  return (
    <AppShell title="Reports" subtitle="How the shop performed this week.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Week Sales" value={inr(117220)} hint="7 days" badge="+8%" badgeTone="success" />
        <KpiCard label="Gross Margin" value={inr(13640)} hint="approx. 11.6%" />
        <KpiCard label="Udhar Added" value={inr(9420)} hint="new credit this week" badge="Udhar" badgeTone="warning" />
        <KpiCard label="Udhar Collected" value={inr(6660)} hint="repayments received" badgeTone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Daily Sales" description="Last 7 days">
          <div className="flex h-56 items-end gap-3 px-5 py-5">
            {weeklySales.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="font-mono text-[10px] text-muted-foreground">
                  {(d.sales / 1000).toFixed(1)}k
                </div>
                <div
                  className="w-full rounded-t-md bg-brand/85"
                  style={{ height: `${(d.sales / max) * 100}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Sales by Category" description="This month">
          <ul className="space-y-4 px-5 py-5">
            {categorySales.map((c) => (
              <li key={c.category}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{c.category}</span>
                  <span className="font-mono text-muted-foreground">{inr(c.value)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gold"
                    style={{ width: `${(c.value / catMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard className="mt-4" title="Weekly Summary" description="Day-wise figures">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>Day</th>
              <th className={`${thStyle} text-right`}>Sales</th>
              <th className={`${thStyle} text-right`}>Bills</th>
              <th className={`${thStyle} text-right`}>Avg. Bill</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {weeklySales.map((d, i) => {
              const bills = 28 + i * 3;
              return (
                <tr key={d.day} className="transition-colors hover:bg-brand-soft/50">
                  <td className={`${tdStyle} font-medium`}>{d.day}</td>
                  <td className={`${tdStyle} text-right font-mono`}>{inr(d.sales)}</td>
                  <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>{bills}</td>
                  <td className={`${tdStyle} text-right font-mono`}>
                    {inr(Math.round(d.sales / bills))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}
