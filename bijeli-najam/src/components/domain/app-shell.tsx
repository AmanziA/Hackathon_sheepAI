"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Buildings,
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
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MOCK_FLAGS } from "@/lib/mock-data";
import { InvestigationOverlay } from "@/components/domain/investigation-overlay";

interface Props {
  children: React.ReactNode;
}

const AUTO_COUNT = MOCK_FLAGS.filter((f) => f.confidence_unregistered >= 0.9).length;
const TOTAL_CANDIDATES = MOCK_FLAGS.length;

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);

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
          className="h-14 flex items-center gap-2.5 px-4 border-b group"
        >
          <Buildings size={18} className="transition-transform duration-200 group-hover:rotate-[8deg]" />
          <span className="font-semibold text-sm tracking-tight">Bijeli Najam</span>
        </Link>

        <div className="px-3 py-3 border-b">
          <button
            onClick={() => setRunning(true)}
            disabled={running}
            className={cn(
              "group w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-all duration-200 ease-out",
              running
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-blue-100 hover:bg-blue-200 text-blue-900 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0"
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
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted hover:translate-x-px"
            )}
          >
            <WarningCircle
              size={15}
              weight={dashActive ? "bold" : "regular"}
              className="transition-transform duration-200"
            />
            <span className="flex-1">Za provjeru</span>
            {!dashActive && AUTO_COUNT > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold leading-none rounded-full px-1.5 py-0.5 transition-transform duration-200 group-hover:scale-110">
                {AUTO_COUNT}
              </span>
            )}
          </Link>
          <NavItem
            href="/dashboard/monitoring"
            label="Monitoring"
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

        <div className="px-4 py-3 border-t text-[11px] text-muted-foreground/50">
          Snimak: 14. svi. 2026.
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
          ? "bg-foreground text-background font-medium shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted hover:translate-x-px"
      )}
    >
      <IconComp size={15} weight={weight} />
      {label}
    </Link>
  );
}
