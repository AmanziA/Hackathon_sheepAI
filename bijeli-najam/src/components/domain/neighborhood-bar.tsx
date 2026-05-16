import { Progress } from "@/components/ui/progress";
import { formatEur, formatCount } from "@/lib/format";
import type { Neighborhood } from "@/lib/types";

interface Props {
  neighborhood: Neighborhood;
  maxLoss: number;
}

export function NeighborhoodBar({ neighborhood, maxLoss }: Props) {
  const pct = maxLoss > 0 ? (neighborhood.estimated_annual_loss_eur / maxLoss) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{neighborhood.name}</span>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>{formatCount(neighborhood.flag_count)} nalaza</span>
          <span className="font-semibold text-foreground">{formatEur(neighborhood.estimated_annual_loss_eur)}</span>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
