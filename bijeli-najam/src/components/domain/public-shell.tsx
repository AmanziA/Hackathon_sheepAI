"use client";

import Link from "next/link";
import { Buildings } from "@phosphor-icons/react";

interface Props {
  children: React.ReactNode;
}

export function PublicShell({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Buildings size={20} />
            Bijeli Najam
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">
              Provjeri adresu
            </Link>
            <Link href="/impact" className="text-muted-foreground hover:text-foreground transition-colors">
              Učinak
            </Link>
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Inspektor →
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Bijeli Najam · Snimak podataka: 14. svibnja 2026.
      </footer>
    </div>
  );
}
