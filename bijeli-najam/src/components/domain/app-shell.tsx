"use client";

import Link from "next/link";
import { Buildings, ListChecks, MagnifyingGlass, ChartBar } from "@phosphor-icons/react";

interface Props {
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Oznake", icon: <ListChecks size={18} /> },
  { href: "/lookup", label: "Provjeri adresu", icon: <MagnifyingGlass size={18} /> },
  { href: "/impact", label: "Učinak", icon: <ChartBar size={18} /> },
];

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-background flex flex-col shrink-0">
        <div className="h-14 flex items-center gap-2 px-4 border-b font-semibold">
          <Buildings size={20} />
          Bijeli Najam
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Snimak: 14. svi. 2026.
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
