"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowsClockwise } from "@phosphor-icons/react";

export function RefreshButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setLastUpdated(new Date().toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" }));
  }

  return (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">Ažurirano u {lastUpdated}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={loading}
        className="gap-2"
      >
        <ArrowsClockwise size={14} className={loading ? "animate-spin" : ""} />
        {loading ? "Povlačim iz HTZ-a..." : "Ažuriraj iz HTZ-a"}
      </Button>
    </div>
  );
}
