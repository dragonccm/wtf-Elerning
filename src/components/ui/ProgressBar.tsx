import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "warning" | "danger" | "success";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const colors = {
    brand: "bg-[var(--brand)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
    success: "bg-[var(--brand)]",
  };
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-[var(--line)]", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
