"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { DiscoveryDrawer } from "./discovery-drawer";

interface Props {
  candidateId: string;
  candidateTitle: string | null;
  /** Optional size override. Defaults to "sm" for use inside table rows. */
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
}

export function InvestigationTrigger({
  candidateId,
  candidateTitle,
  size = "sm",
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <MagnifyingGlass size={14} className="mr-1" />
        Istraži
      </Button>
      <DiscoveryDrawer
        open={open}
        onClose={() => setOpen(false)}
        mode="investigation"
        id={candidateId}
        title={candidateTitle}
      />
    </>
  );
}
