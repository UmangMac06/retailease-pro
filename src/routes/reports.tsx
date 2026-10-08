import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { inr, shortDate } from "@/lib/format";
import { getReports } from "@/lib/retailease.functions";

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
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(),
  });

  if (isLoading || !data) return null;

  const max = Math.max(0, ...data.daily.map((d) => d.total));
  const catMax = Math.max(0, ...data.byCategory.map((c) => c.total));

  return (
    <AppShell title="Reports" subtitle="How the shop performed this week.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Week Sales" value={inr(data.weekSales)} hint="last 7 days" badge="Week" badgeTone="success" />
        <KpiCard label="Gross Margin" value="—" hint="coming soon" />
        <KpiCard label="Udhar Added" value="—" hint="coming soon" badge="Udhar" badgeTone="warning" />
        <KpiCard label="Udhar Collected" value={inr(data.collected)} hint="repayments received" badgeTone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Daily Sales" description="Last 7 days">
          <div className="flex h-56 items-end gap-3 px-5 py-5">
            {data.daily.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="font-mono text-[10px] text-muted-foreground">
                  {(d.total / 1000).toFixed(1)}k
                </div>
                <div
                  className="w-full rounded-t-md bg-brand/85"
                  style={{ height: max > 0 ? `${(d.total / max) * 100}%` : "0%" }}
                />
                <span className="text-[11px] text-muted-foreground">{shortDate(d.day)}</span>
              </div>
            ))}
            {data.daily.length === 0 && (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No sales in the last 7 days.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Sales by Category" description="All time">
          <ul className="space-y-4 px-5 py-5">
            {data.byCategory.map((c) => (
              <li key={c.category}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{c.category}</span>
                  <span className="font-mono text-muted-foreground">{inr(c.total)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-gold"
                    style={{ width: catMax > 0 ? `${(c.total / catMax) * 100}%` : "0%" }}
                  />
                </div>
              </li>
            ))}
            {data.byCategory.length === 0 && (
              <li className="text-center text-sm text-muted-foreground">
                No category data.
              </li>
            )}
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
            {data.daily.map((d) => (
              <tr key={d.day} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-medium`}>{shortDate(d.day)}</td>
                <td className={`${tdStyle} text-right font-mono`}>{inr(d.total)}</td>
                <td className={`${tdStyle} text-right font-mono text-muted-foreground`}>{d.bills}</td>
                <td className={`${tdStyle} text-right font-mono`}>
                  {inr(d.bills > 0 ? Math.round(d.total / d.bills) : 0)}
                </td>
              </tr>
            ))}
            {data.daily.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No data for this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}
