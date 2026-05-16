"use client";

import dynamic from "next/dynamic";
import type { Neighborhood } from "@/lib/types";

interface Props {
  neighborhoods: Neighborhood[];
  className?: string;
}

const ImpactMapInner = dynamic(() => import("./impact-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full rounded-sm border bg-muted/30 animate-pulse" />
  ),
});

export function ImpactMap(props: Props) {
  return <ImpactMapInner {...props} />;
}
