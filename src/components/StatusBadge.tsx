import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  paid: "text-success bg-success-soft",
  ok: "text-success bg-success-soft",
  ontrack: "text-success bg-success-soft",
  udhar: "text-warning bg-warning-soft",
  due: "text-warning bg-warning-soft",
  low: "text-warning bg-warning-soft",
  overdue: "text-danger bg-danger-soft",
  critical: "text-danger bg-danger-soft",
  cod: "text-muted-foreground bg-muted",
  neutral: "text-muted-foreground bg-muted",
  brand: "text-brand bg-brand-soft",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof tones | string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone] ?? tones["neutral"],
        className,
      )}
    >
      {children}
    </span>
  );
}
