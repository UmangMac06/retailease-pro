import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { login, signup, NO_ACCOUNT } from "@/lib/retailease-db";
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [prefill, setPrefill] = useState("");
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
          {mode === "login" ? <LoginForm onSignup={(p) => { setPrefill(p); setMode("signup"); }} prefill={prefill} /> : <SignupForm onLogin={() => setMode("login")} prefill={prefill} />}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-brand/40 focus:ring-2 focus:ring-ring focus:outline-none";

function validMobile(v: string) {
  const digits = v.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(digits)) return "Enter a valid 10-digit mobile number (digits only)";
  return null;
}

function cleanError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message as string;
  } catch {
    /* plain message */
  }
  return msg;
}

function LoginForm({ onSignup, prefill }: { onSignup: (phone: string) => void; prefill: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(prefill);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoAccount(false);
    const err = validMobile(phone) ?? (password ? null : "Enter your password");
    if (err) return setError(err);
    setError(null);
    setBusy(true);
    try {
      await login({ phone, password });
      queryClient.clear();
      navigate({ to: "/dashboard" });
    } catch (e) {
      const msg = cleanError(e);
      if (msg.includes(NO_ACCOUNT)) {
        setNoAccount(true);
        setError("No account exists with this mobile number.");
      } else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="font-serif text-[22px] font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">Use your shop owner account to open the ledger.</p>
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        <label className="block">
          <span className="text-xs font-medium text-foreground/80">Mobile number</span>
          <input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className={`${inputCls} font-mono`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-foreground/80">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
            {noAccount && (
              <button type="button" onClick={() => onSignup(phone)} className="mt-1 block font-medium text-brand underline">
                Create a new account with this number
              </button>
            )}
          </div>
        )}
        <button disabled={busy} className="flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60">
          {busy ? "Signing in…" : "Open Dashboard"}
        </button>
      </form>
      <p className="mt-5 text-center text-[12px] text-muted-foreground">
        New shop?{" "}
        <button type="button" onClick={() => onSignup(phone)} className="font-medium text-brand">Create an account</button>
      </p>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Demo account · 9876543210 / retailease</p>
    </>
  );
}

function SignupForm({ onLogin, prefill }: { onLogin: () => void; prefill: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", shopName: "", phone: prefill, password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err =
      (form.name.trim().length < 2 && "Enter your name") ||
      (form.shopName.trim().length < 2 && "Enter your shop name") ||
      validMobile(form.phone) ||
      (form.password.length < 6 && "Password must be at least 6 characters") ||
      null;
    if (err) return setError(err);
    setError(null);
    setBusy(true);
    try {
      await signup(form);
      queryClient.clear();
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="font-serif text-[22px] font-semibold tracking-tight">Create account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your shop starts with an empty ledger.</p>
      <form className="mt-6 space-y-3.5" onSubmit={submit} noValidate>
        <label className="block"><span className="text-xs font-medium text-foreground/80">Your name</span><input value={form.name} onChange={set("name")} className={inputCls} /></label>
        <label className="block"><span className="text-xs font-medium text-foreground/80">Shop name</span><input value={form.shopName} onChange={set("shopName")} className={inputCls} /></label>
        <label className="block"><span className="text-xs font-medium text-foreground/80">Mobile number</span><input inputMode="numeric" value={form.phone} onChange={set("phone")} placeholder="10-digit mobile" className={`${inputCls} font-mono`} /></label>
        <label className="block"><span className="text-xs font-medium text-foreground/80">Password</span><input type="password" value={form.password} onChange={set("password")} className={inputCls} /></label>
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
        <button disabled={busy} className="flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60">
          {busy ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="mt-5 text-center text-[12px] text-muted-foreground">
        Already registered? <button type="button" onClick={onLogin} className="font-medium text-brand">Sign in</button>
      </p>
    </>
  );
}
