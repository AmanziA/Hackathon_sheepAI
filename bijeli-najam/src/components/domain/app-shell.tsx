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
  ArrowsClockwise,
  Intersect,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MOCK_FLAGS } from "@/lib/mock-data";
import { useRouter } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

// Count unresolved flags — in production this would come from DB
const OPEN_COUNT = MOCK_FLAGS.length;
const AUTO_COUNT = MOCK_FLAGS.filter((f) => f.confidence_unregistered >= 0.9).length;

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [matching, setMatching] = useState(false);

  async function handleMatch() {
    setMatching(true);
    await new Promise((r) => setTimeout(r, 2500));
    setMatching(false);
    router.push("/dashboard");
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const dashActive = isActive("/dashboard", true);

  return (
    <div className="min-h-screen flex">
      <aside className="w-52 border-r bg-background flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b">
          <Buildings size={18} />
          <span className="font-semibold text-sm tracking-tight">Bijeli Najam</span>
        </div>

        {/* Compose-style button */}
        <div className="px-3 py-3 border-b">
          <button
            onClick={handleMatch}
            disabled={matching}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
              matching
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-blue-100 hover:bg-blue-200 text-blue-900 shadow-sm hover:shadow"
            )}
          >
            {matching
              ? <ArrowsClockwise size={18} className="animate-spin shrink-0" />
              : <Intersect size={18} className="shrink-0" />
            }
            {matching ? "Analiziranje..." : "Pokreni uspoređivanje"}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">

          {/* ── Neregistrirani — inbox, top ── */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors font-medium",
              dashActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <WarningCircle size={15} weight={dashActive ? "bold" : "regular"} />
            <span className="flex-1">Neregistrirani</span>
            {!dashActive && AUTO_COUNT > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold leading-none rounded-full px-1.5 py-0.5">
                {AUTO_COUNT}
              </span>
            )}
          </Link>

          <NavItem
            href="/dashboard/registrirani"
            label="Registrirani"
            icon={CheckCircle}
            active={isActive("/dashboard/registrirani")}
          />
          <NavItem
            href="/dashboard/oglasi"
            label="Online oglasi"
            icon={Globe}
            active={isActive("/dashboard/oglasi")}
          />

          <div className="my-3 mx-1 border-t" />

          {/* ── Javno ── */}
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
        "flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors",
        sub ? "px-4" : "px-3",
        active
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <IconComp size={15} weight={weight} />
      {label}
    </Link>
  );
}
