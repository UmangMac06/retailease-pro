import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Boxes,
  ReceiptText,
  Users,
  NotebookPen,
  Wallet,
  Search,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { shop } from "@/data/demo";

const groups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Store",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/sales", label: "Sales", icon: ReceiptText },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/credit", label: "Udhar / Credit", icon: NotebookPen },
      { to: "/payments", label: "Payments", icon: Wallet },
    ],
  },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-brand text-primary-foreground transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 font-serif text-lg font-semibold">
            R
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-serif text-[19px] font-semibold tracking-tight">RetailEase</div>
              <div className="text-[10px] tracking-[0.18em] text-primary-foreground/50 uppercase">
                Kirana Manager
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-2 pt-4 pb-1.5 text-[10px] font-medium tracking-[0.16em] text-primary-foreground/40 uppercase first:pt-0">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={cn(
                      "mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors",
                      active
                        ? "bg-white/12 font-medium text-primary-foreground"
                        : "text-primary-foreground/70 hover:bg-white/5 hover:text-primary-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <div className={cn("flex items-center gap-2.5 px-1", collapsed && "justify-center px-0")}>
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-xs font-semibold text-primary-foreground">
              {shop.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-medium">{shop.owner}</div>
                <div className="truncate text-[11px] text-primary-foreground/50">{shop.role}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Link
              to="/"
              className="mt-3 flex items-center gap-2 rounded-md px-1 py-1.5 text-[12px] text-primary-foreground/60 transition-colors hover:text-primary-foreground"
            >
              <LogOut className="size-3.5" /> Sign out
            </Link>
          )}
        </div>
      </aside>

      <div className={cn("flex min-w-0 flex-1 flex-col", collapsed ? "ml-16" : "ml-64")}>
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-4 px-6">
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
            <div className="min-w-0">
              <div className="font-serif text-[17px] leading-tight font-semibold tracking-tight">
                {shop.name}
              </div>
              <div className="text-[11px] leading-none text-muted-foreground">
                Ledger open · {shop.today}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <div className="relative hidden lg:block">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customers, products…"
                  className="h-9 w-72 rounded-lg border border-input bg-card pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:border-brand/40 focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              {action}
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h1 className="max-w-[24ch] text-[26px] leading-tight font-semibold tracking-tight text-balance">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-pretty text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ledger-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-serif text-[15px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  badge,
  badgeTone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: string;
  badgeTone?: "brand" | "success" | "warning" | "danger";
}) {
  const tone = {
    brand: "text-brand bg-brand-soft",
    success: "text-success bg-success-soft",
    warning: "text-warning bg-warning-soft",
    danger: "text-danger bg-danger-soft",
  }[badgeTone];

  return (
    <div className="ledger-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {badge && <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px]", tone)}>{badge}</span>}
      </div>
      <div className="mt-2.5 font-mono text-[26px] leading-none font-semibold">{value}</div>
      {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export const thStyle =
  "px-3 py-2.5 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase";
export const tdStyle = "px-3 py-3 align-middle";
