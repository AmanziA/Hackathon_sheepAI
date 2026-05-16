"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  MagnifyingGlass,
  WarningCircle,
  CheckCircle,
  Pulse,
  Archive,
  Globe,
  ChartBar,
  ArrowRight,
} from "@phosphor-icons/react";
import { MOCK_FLAGS } from "@/lib/mock-data";

const NAV_ITEMS = [
  { label: "Za provjeru", href: "/dashboard", icon: WarningCircle, group: "Stranice" },
  { label: "Praćenje", href: "/dashboard/monitoring", icon: Pulse, group: "Stranice" },
  { label: "Prijavljeni", href: "/dashboard/prijavljeni", icon: Archive, group: "Stranice" },
  { label: "HTZ registar", href: "/dashboard/registrirani", icon: CheckCircle, group: "Izvori" },
  { label: "Online oglasi", href: "/dashboard/oglasi", icon: Globe, group: "Izvori" },
  { label: "Provjeri adresu", href: "/lookup", icon: MagnifyingGlass, group: "Javno" },
  { label: "Statistika", href: "/impact", icon: ChartBar, group: "Javno" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Command
          loop
          className="w-[560px] max-w-[92vw] rounded-sm border bg-popover shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <MagnifyingGlass size={14} className="text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Idi na… ili pretraži predmete"
              className="flex-1 h-11 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/50">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Nema rezultata.
            </Command.Empty>

            {(["Stranice", "Izvori", "Javno"] as const).map((groupName) => (
              <Command.Group
                key={groupName}
                heading={
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70 px-2 pt-2 pb-1 inline-flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[hsl(28_85%_55%)]" />
                    {groupName}
                  </span>
                }
              >
                {NAV_ITEMS.filter((i) => i.group === groupName).map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm cursor-pointer data-[selected=true]:bg-muted"
                  >
                    <item.icon size={14} className="text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight size={12} className="text-muted-foreground/40" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            <Command.Group
              heading={
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70 px-2 pt-2 pb-1 inline-flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  Predmeti
                </span>
              }
            >
              {MOCK_FLAGS.slice(0, 8).map((flag) => (
                <Command.Item
                  key={flag.id}
                  value={flag.candidate_listings?.title ?? flag.id}
                  onSelect={() => go(`/dashboard/${flag.id}`)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-sm cursor-pointer data-[selected=true]:bg-muted"
                >
                  <WarningCircle size={14} className="text-destructive shrink-0" />
                  <span className="flex-1 truncate">
                    {flag.candidate_listings?.title ?? flag.id}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {Math.round(flag.confidence_unregistered * 100)}%
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted/50 text-[10px]">↑↓</kbd>
              naviguj
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted/50 text-[10px]">↵</kbd>
              odaberi
            </span>
            <span className="ml-auto inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-muted/50 text-[10px]">⌘K</kbd>
              otvori/zatvori
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
