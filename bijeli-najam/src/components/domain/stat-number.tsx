import { formatEur, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  label: string;
  format?: "eur" | "count";
  delta?: number;
  className?: string;
}

export function StatNumber({ value, label, format = "count", delta, className }: Props) {
  const display = format === "eur" ? formatEur(value) : formatCount(value);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-5xl font-bold tracking-tight tabular-nums">{display}</p>
      {delta !== undefined && (
        <p className={cn("text-sm font-medium", delta >= 0 ? "text-destructive" : "text-success")}>
          {delta >= 0 ? "+" : ""}
          {format === "eur" ? formatEur(delta) : formatCount(delta)}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
