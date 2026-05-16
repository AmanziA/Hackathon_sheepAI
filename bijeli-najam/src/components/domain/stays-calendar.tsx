import { cn } from "@/lib/utils";

interface Props {
  occupancyByDay: Map<string, number>;
  /** ISO dates blocked on Airbnb/Booking but missing from eVisitor — rendered red. */
  unreportedOnline?: Set<string>;
  daysBack?: number;
  className?: string;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

export function StaysCalendar({
  occupancyByDay,
  unreportedOnline,
  daysBack = 90,
  className,
}: Props) {
  const days: { iso: string; guests: number }[] = [];
  const today = new Date("2026-05-14T00:00:00Z");
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, guests: occupancyByDay.get(iso) ?? 0 });
  }

  const occupiedNights = days.filter((d) => d.guests > 0).length;
  const occupancyPct = Math.round((occupiedNights / days.length) * 100);
  const unreportedCount = unreportedOnline ? days.filter((d) => unreportedOnline.has(d.iso)).length : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Zadnjih {daysBack} dana</span>
        <span className="tabular-nums">
          {occupiedNights}/{days.length} · {occupancyPct}%
          {unreportedCount > 0 ? (
            <>
              {" · "}
              <span className="text-destructive font-medium">{unreportedCount} ne-prijavljen{unreportedCount === 1 ? "" : "ih"}</span>
            </>
          ) : null}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
        {days.map((d) => {
          const isUnreported = unreportedOnline?.has(d.iso) ?? false;
          let tone: string;
          if (isUnreported) {
            tone = "bg-destructive ring-1 ring-destructive/40";
          } else if (d.guests === 0) {
            tone = "bg-muted";
          } else if (d.guests <= 1) {
            tone = "bg-success/30";
          } else if (d.guests <= 2) {
            tone = "bg-success/55";
          } else if (d.guests <= 4) {
            tone = "bg-success/80";
          } else {
            tone = "bg-success";
          }
          const title = isUnreported
            ? `${formatDay(d.iso)} · blokiran online, nije prijavljen`
            : d.guests > 0
              ? `${formatDay(d.iso)} · ${d.guests} ${d.guests === 1 ? "gost" : "gostiju"}`
              : `${formatDay(d.iso)} · prazno`;
          return (
            <div
              key={d.iso}
              title={title}
              aria-label={title}
              className={cn("aspect-square rounded-[2px]", tone)}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-[2px] bg-muted" /> prazno
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-[2px] bg-success/55" /> prijavljeno
        </span>
        {unreportedOnline && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-[2px] bg-destructive" /> blokirano, ne-prijavljeno
          </span>
        )}
      </div>
    </div>
  );
}
