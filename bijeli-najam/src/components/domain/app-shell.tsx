"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle,
  Globe,
  MagnifyingGlass,
  ChartBar,
  WarningCircle,
  Pulse,
  Intersect,
  Archive,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import { LogoMark } from "@/components/domain/logo-mark";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MOCK_FLAGS } from "@/lib/mock-data";
import { useResolved } from "@/lib/resolved-store";
import { InvestigationOverlay } from "@/components/domain/investigation-overlay";
import { CommandPalette } from "@/components/domain/command-palette";

interface Props {
  children: React.ReactNode;
}

const TOTAL_CANDIDATES = MOCK_FLAGS.length;

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const { items: resolvedItems } = useResolved();
  const [queueIds, setQueueIds] = useState<string[] | null>(null);

  // Pull the actual queue ids from the server so the sidebar count only
  // subtracts resolved items that are still in the queue. Otherwise stale
  // localStorage resolutions from earlier sessions would shrink the count
  // even though those items aren't in the current list.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/queue-count", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ids: string[] }) => {
        if (!cancelled) setQueueIds(d.ids);
      })
      .catch(() => {
        if (!cancelled) setQueueIds(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const todoCount = useMemo(() => {
    if (queueIds == null) return null;
    return queueIds.filter((id) => !resolvedItems[id]).length;
  }, [resolvedItems, queueIds]);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const dashActive = isActive("/dashboard", true);

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-52 border-r bg-background/85 backdrop-blur-sm flex flex-col shrink-0">
        <Link
          href="/dashboard"
          aria-label="Bijeli Najam — početna"
          className="h-14 flex items-center px-4 border-b transition-opacity hover:opacity-80"
        >
          <LogoMark variant="full" width={108} />
        </Link>

        <div className="px-3 py-3 border-b">
          <button
            onClick={() => setRunning(true)}
            disabled={running}
            className={cn(
              "group w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-150 ease-out",
              running
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[var(--brand-blue-500)] hover:bg-[color-mix(in_oklch,var(--brand-blue-500)_92%,black)] text-white"
            )}
          >
            <Intersect
              size={18}
              className="shrink-0 transition-transform duration-200 group-hover:rotate-45"
            />
            Pokreni istragu
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
          <Link
            href="/dashboard"
            className={cn(
              "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-200 ease-out font-medium overflow-hidden",
              dashActive
                ? "bg-black/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 hover:translate-x-px"
            )}
          >
            <WarningCircle
              size={15}
              weight={dashActive ? "bold" : "regular"}
              className="transition-transform duration-200"
            />
            <span className="flex-1">Za provjeru</span>
            {todoCount != null && todoCount > 0 && (
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums leading-none rounded-full px-1.5 py-0.5 transition-transform duration-200",
                  dashActive
                    ? "bg-foreground/15 text-foreground"
                    : "bg-destructive/15 text-destructive group-hover:scale-110"
                )}
              >
                {todoCount}
              </span>
            )}
          </Link>
          <NavItem
            href="/dashboard/monitoring"
            label="Praćenje"
            icon={Pulse}
            active={isActive("/dashboard/monitoring")}
          />
          <NavItem
            href="/dashboard/prijavljeni"
            label="Prijavljeni"
            icon={Archive}
            active={isActive("/dashboard/prijavljeni")}
          />

          <div className="my-3 mx-1 border-t" />

          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Izvori podataka
          </p>

          <NavItem
            href="/dashboard/oglasi"
            label="Online oglasi"
            icon={Globe}
            active={isActive("/dashboard/oglasi")}
          />
          <NavItem
            href="/dashboard/registrirani"
            label="HTZ registar"
            icon={CheckCircle}
            active={isActive("/dashboard/registrirani")}
          />

          <div className="my-3 mx-1 border-t" />

          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Javno
          </p>

          <NavItem
            href="/lookup"
            label="Provjeri adresu"
            icon={MagnifyingGlass}
            active={isActive("/lookup")}
          />
          <NavItem
            href="/impact"
            label="Statistika"
            icon={ChartBar}
            active={isActive("/impact")}
          />
        </nav>

        <div className="px-4 py-3 border-t text-[11px] text-muted-foreground/50 flex items-center justify-between gap-2">
          <span>Snimak: 14. svi. 2026.</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono px-1 py-0.5 rounded-sm border border-border bg-muted/40 text-[9px] leading-none text-muted-foreground/70">
              ⌘K
            </kbd>
          </span>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>

      {running && (
        <InvestigationOverlay
          total={TOTAL_CANDIDATES}
          onCancel={() => setRunning(false)}
          onDone={() => setRunning(false)}
        />
      )}

      <CommandPalette />
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: IconComp,
  active,
  sub = false,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  sub?: boolean;
}) {
  const weight: IconWeight = active ? "bold" : "regular";
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 py-2 rounded-md text-sm transition-all duration-200 ease-out",
        sub ? "px-4" : "px-3",
        active
          ? "bg-black/10 text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-black/5 hover:translate-x-px"
      )}
    >
      <IconComp size={15} weight={weight} />
      {label}
    </Link>
  );
}
