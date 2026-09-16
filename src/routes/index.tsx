import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · RetailEase Kirana Manager" },
      {
        name: "description",
        content:
          "Sign in to RetailEase, the smart credit and inventory assistant for local grocery and kirana stores.",
      },
      { property: "og:title", content: "Sign in · RetailEase Kirana Manager" },
      {
        property: "og:description",
        content: "Credit ledger, inventory and daily sales for your grocery store, in one place.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand px-12 py-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-white/10 font-serif text-lg font-semibold">
            R
          </div>
          <div className="leading-tight">
            <div className="font-serif text-[19px] font-semibold tracking-tight">RetailEase</div>
            <div className="text-[10px] tracking-[0.18em] text-primary-foreground/50 uppercase">
              Kirana Manager
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-serif text-[34px] leading-tight font-semibold text-balance">
            The shop ledger, finally kept straight.
          </h1>
          <p className="mt-3 text-sm text-pretty text-primary-foreground/70">
            Track daily sales, stock levels and customer udhar from one clean desk view built for
            local grocery stores.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-2.5">
              <Store className="size-4 text-gold" /> Products, inventory and billing in one place
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-gold" /> Credit balances with clear due status
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-primary-foreground/40">
          RetailEase · College project prototype
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="ledger-card w-full max-w-sm p-7">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the shop owner account to open the ledger.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Shop ID or mobile</span>
              <input
                type="text"
                defaultValue="98765 43210"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:border-brand/40 focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">Password</span>
              <input
                type="password"
                defaultValue="retailease"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-brand/40 focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </label>

            <div className="flex items-center justify-between text-[12px]">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="accent-brand" /> Keep me signed in
              </label>
              <span className="text-brand">Forgot password?</span>
            </div>

            <Link
              to="/dashboard"
              className="flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep"
            >
              Open Dashboard
            </Link>
          </form>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Demo prototype · any details will open the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
