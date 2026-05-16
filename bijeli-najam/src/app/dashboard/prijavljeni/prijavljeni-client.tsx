"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FilePdf,
  X,
  CheckCircle,
  ArrowSquareOut,
  ClockClockwise,
} from "@phosphor-icons/react";
import { useResolved, type ResolvedItem } from "@/lib/resolved-store";
import { cn } from "@/lib/utils";

type Filter = "all" | "reported" | "dismissed";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("hr-HR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(items: ResolvedItem[]): Array<{ day: string; items: ResolvedItem[] }> {
  const map = new Map<string, ResolvedItem[]>();
  for (const item of items) {
    const day = new Date(item.resolved_at).toLocaleDateString("hr-HR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(item);
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }));
}

export function PrijavljeniClient() {
  const { items, unresolve, clearAll } = useResolved();
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(
    () =>
      Object.values(items).sort((a, b) =>
        a.resolved_at < b.resolved_at ? 1 : -1
      ),
    [items]
  );

  const reported = all.filter((i) => i.resolution === "reported");
  const dismissed = all.filter((i) => i.resolution === "dismissed");
  const visible =
    filter === "reported" ? reported : filter === "dismissed" ? dismissed : all;
  const grouped = groupByDay(visible);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Prijavljeni predmeti</h1>
        <p className="text-sm text-muted-foreground">
          Povijesni log svih predmeta koje ste poslali inspekciji ili odbacili.
          Klikom na &ldquo;Poništi prijavu&rdquo; predmet se vraća na popis Za provjeru.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {(
            [
              { key: "all", label: "Sve", count: all.length },
              { key: "reported", label: "Prijavljeno", count: reported.length },
              { key: "dismissed", label: "Odbačeno", count: dismissed.length },
            ] as { key: Filter; label: string; count: number }[]
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === key
                  ? "bg-black/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  filter === key
                    ? key === "reported"
                      ? "bg-success/15 text-success"
                      : key === "dismissed"
                        ? "bg-muted-foreground/15 text-muted-foreground"
                        : "bg-muted text-muted-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {all.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Obrisati cijeli povijesni log?")) clearAll();
            }}
            className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Obriši povijest
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center py-20 px-6 border rounded-lg">
          <FilePdf size={40} className="text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">
            {filter === "all" ? "Još nema prijava" : "Nema rezultata za ovaj filter"}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filter === "all"
              ? "Predmeti koje pošaljete inspekciji ili odbacite na popisu Za provjeru bit će ovdje."
              : "Pokušajte drugi filter."}
          </p>
          {filter === "all" && (
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:underline mt-2"
            >
              Idi na Za provjeru →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ day, items: dayItems }) => (
            <section key={day} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </h2>
              <div className="rounded-lg border divide-y">
                {dayItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    {item.resolution === "reported" ? (
                      <FilePdf size={16} className="text-success shrink-0" />
                    ) : (
                      <X size={16} className="text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <Link
                        href={item.href}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.kind === "flag" ? "Oglas" : "Registrirani"}
                        </Badge>
                        {item.meta && <span>{item.meta}</span>}
                        <span>·</span>
                        <span>{formatDateTime(item.resolved_at)}</span>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        item.resolution === "reported"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground border-muted-foreground/20"
                      )}
                    >
                      {item.resolution === "reported" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={11} weight="fill" />
                          Prijavljeno
                        </span>
                      ) : (
                        "Odbačeno"
                      )}
                    </Badge>
                    <a
                      href={item.href}
                      aria-label="Otvori detalje"
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <ArrowSquareOut size={14} />
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground gap-1"
                      onClick={() => unresolve(item.id)}
                    >
                      <ClockClockwise size={12} />
                      Poništi prijavu
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
