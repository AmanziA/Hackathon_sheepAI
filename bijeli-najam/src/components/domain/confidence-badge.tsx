import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatConfidence } from "@/lib/format";

interface Props {
  score: number;
  size?: "sm" | "md";
}

export function ConfidenceBadge({ score, size = "md" }: Props) {
  const color =
    score >= 0.7
      ? "bg-destructive text-destructive-foreground"
      : score >= 0.4
      ? "bg-warning text-warning-foreground"
      : "bg-muted text-muted-foreground";

  return (
    <Badge
      className={cn(color, size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5")}
      aria-label={`Pouzdanost: ${formatConfidence(score)}`}
    >
      {formatConfidence(score)}
    </Badge>
  );
}
