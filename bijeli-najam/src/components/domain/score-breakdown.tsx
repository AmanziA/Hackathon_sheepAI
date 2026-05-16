import { MapPin, Image, TextAa, Buildings, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import type { EntityLink } from "@/lib/types";

const SIGNAL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  neighborhood: { label: "Kvart", icon: <MapPin size={16} /> },
  host_name: { label: "Ime domaćina", icon: <TextAa size={16} /> },
  beds: { label: "Broj kreveta", icon: <Buildings size={16} /> },
  photo_phash: { label: "Fotografije (pHash)", icon: <Image size={16} /> },
  type: { label: "Vrsta smještaja", icon: <Buildings size={16} /> },
};

interface Props {
  signals: EntityLink["match_signals"];
}

export function ScoreBreakdown({ signals }: Props) {
  const entries = Object.entries(signals) as Array<[keyof typeof signals, NonNullable<(typeof signals)[keyof typeof signals]>]>;

  return (
    <div className="space-y-2">
      {entries.map(([key, signal]) => {
        if (!signal) return null;
        const meta = SIGNAL_META[key];
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{meta?.icon}</span>
            <span className="flex-1 text-muted-foreground">{meta?.label ?? key}</span>
            <span className={cn("font-mono text-xs", signal.fired ? "text-success" : "text-muted-foreground")}>
              {(signal.score * 100).toFixed(0)}%
            </span>
            {signal.fired ? (
              <CheckCircle size={16} className="text-success" weight="fill" />
            ) : (
              <WarningCircle size={16} className="text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
