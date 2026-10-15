import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackagePlus } from "lucide-react";

import { AppShell, KpiCard, SectionCard, thStyle, tdStyle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { inr } from "@/lib/format";
import { listProducts } from "@/lib/retailease-db";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products · RetailEase" },
      { name: "description", content: "Product catalogue with cost, selling price and stock on hand." },
      { property: "og:title", content: "Products · RetailEase" },
      {
        property: "og:description",
        content: "Product catalogue with cost, selling price and stock on hand.",
      },
    ],
  }),
  component: ProductsPage,
});

const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

function ProductsPage() {
  const [active, setActive] = useState("All");
  const rows = active === "All" ? products : products.filter((p) => p.category === active);

  return (
    <AppShell
      title="Products"
      subtitle="Your catalogue with purchase cost, selling price and margin."
      action={<AddProductDialog />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Products" value="248" hint="across 11 categories" badge="Catalogue" />
        <KpiCard label="Avg. Margin" value="11.4%" hint="on current price list" badgeTone="success" />
        <KpiCard label="Stock Value" value={inr(184300)} hint="at purchase cost" />
        <KpiCard label="Out of Stock" value="3" hint="needs restocking" badge="Urgent" badgeTone="danger" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`h-8 rounded-full px-3.5 text-xs font-medium transition-colors ${
              active === c
                ? "bg-brand text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <SectionCard title="Price List" description={`${rows.length} products`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={thStyle}>SKU</th>
              <th className={thStyle}>Product</th>
              <th className={thStyle}>Category</th>
              <th className={thStyle}>Unit</th>
              <th className={`${thStyle} text-right`}>Cost</th>
              <th className={`${thStyle} text-right`}>Price</th>
              <th className={`${thStyle} text-right`}>Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.sku} className="transition-colors hover:bg-brand-soft/50">
                <td className={`${tdStyle} font-mono text-[12px] text-muted-foreground`}>{p.sku}</td>
                <td className={`${tdStyle} font-medium`}>{p.name}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{p.category}</td>
                <td className={`${tdStyle} text-muted-foreground`}>{p.unit}</td>
                <td className={`${tdStyle} text-right font-mono`}>{inr(p.cost)}</td>
                <td className={`${tdStyle} text-right font-mono font-medium`}>{inr(p.price)}</td>
                <td className={`${tdStyle} text-right`}>
                  <StatusBadge tone={p.stock <= 3 ? "critical" : p.stock <= 6 ? "low" : "ok"}>
                    {p.stock} {p.unit}s
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  );
}

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep">
        <PackagePlus className="size-4" /> Add Product
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Product</DialogTitle>
          <DialogDescription>Add a new item to the shop catalogue.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-xs font-medium text-foreground/80">Product name</span>
            <input
              placeholder="e.g. Tata Salt 1kg"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Category</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                {categories.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Unit</span>
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
                <option>packet</option>
                <option>bottle</option>
                <option>kg</option>
                <option>piece</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Cost" value="22" />
            <NumField label="Price" value="26" />
            <NumField label="Opening stock" value="40" />
          </div>
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
            Save Product
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <input
        defaultValue={value}
        className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
      />
    </label>
  );
}
