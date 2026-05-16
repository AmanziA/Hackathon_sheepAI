import { cn } from "@/lib/utils";

interface Props {
  occupancyByDay: Map<string, number>;
  daysBack?: number;
  className?: string;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

export function StaysCalendar({ occupancyByDay, daysBack = 90, className }: Props) {
  const days: { iso: string; guests: number }[] = [];
  const today = new Date("2026-05-14T00:00:00Z");
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, guests: occupancyByDay.get(iso) ?? 0 });
  }

  const startDay = (new Date(days[0].iso + "T00:00:00Z").getUTCDay() + 6) % 7;
  const padded: ({ iso: string; guests: number } | null)[] = [
    ...Array(startDay).fill(null),
    ...days,
  ];

  const occupiedNights = days.filter((d) => d.guests > 0).length;
  const occupancyPct = Math.round((occupiedNights / days.length) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Zauzetost zadnjih {daysBack} dana</span>
        <span className="tabular-nums">
          {occupiedNights} / {days.length} dana · {occupancyPct}%
        </span>
      </div>
      <div className="grid grid-cols-[repeat(13,1fr)] gap-[3px]">
        {padded.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} className="aspect-square" />;
          const tone =
            d.guests === 0
              ? "bg-muted"
              : d.guests <= 1
                ? "bg-success/30"
                : d.guests <= 2
                  ? "bg-success/55"
                  : d.guests <= 4
                    ? "bg-success/80"
                    : "bg-success";
          return (
            <div
              key={d.iso}
              title={
                d.guests > 0
                  ? `${formatDay(d.iso)} · ${d.guests} ${d.guests === 1 ? "gost" : "gostiju"}`
                  : `${formatDay(d.iso)} · prazno`
              }
              aria-label={`${formatDay(d.iso)}: ${d.guests} gostiju`}
              className={cn("aspect-square rounded-sm", tone)}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Manje</span>
        <div className="flex gap-[3px]">
          <span className="w-3 h-3 rounded-sm bg-muted" />
          <span className="w-3 h-3 rounded-sm bg-success/30" />
          <span className="w-3 h-3 rounded-sm bg-success/55" />
          <span className="w-3 h-3 rounded-sm bg-success/80" />
          <span className="w-3 h-3 rounded-sm bg-success" />
        </div>
        <span>Više gostiju</span>
      </div>
    </div>
  );
}
