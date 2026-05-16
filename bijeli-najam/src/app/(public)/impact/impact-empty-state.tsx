"use client";

import { EmptyState } from "@/components/domain/empty-state";
import { ChartBar } from "@phosphor-icons/react";

export function ImpactEmptyState() {
  return (
    <EmptyState
      icon={<ChartBar />}
      headline="Nema podataka o kvartovima"
      body="Podaci će biti dostupni nakon učitavanja baze."
    />
  );
}
