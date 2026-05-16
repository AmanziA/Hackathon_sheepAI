"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClipboardText, CheckCircle } from "@phosphor-icons/react";
import { useResolved } from "@/lib/resolved-store";

interface Props {
  id: string;
  kind: "flag" | "monitoring";
  title: string;
  meta?: string;
  href: string;
  className?: string;
}

export function IssueOrderCTA({ id, kind, title, meta, href, className }: Props) {
  const router = useRouter();
  const { items, resolve, unresolve } = useResolved();
  const existing = items[id];
  const isReported = existing?.resolution === "reported";
  const [pendingNav, setPendingNav] = useState(false);

  function issue() {
    resolve({
      id,
      kind,
      resolution: "reported",
      title,
      meta: meta ?? "",
      href,
    });
    toast.success("Nalog pokrenut", {
      description: title,
      action: {
        label: "Pogledaj",
        onClick: () => {
          setPendingNav(true);
          router.push("/dashboard/prijavljeni");
        },
      },
    });
  }

  if (isReported) {
    return (
      <div
        className={
          className ??
          "rounded-lg border border-success/30 bg-success/5 p-4 flex items-center gap-3"
        }
      >
        <CheckCircle size={18} weight="fill" className="text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Nalog već pokrenut</p>
          <p className="text-xs text-muted-foreground">
            Predmet je u listi Prijavljeni za daljnju istragu.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => unresolve(id)}
          className="shrink-0"
        >
          Povuci nalog
        </Button>
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/prijavljeni")}
          disabled={pendingNav}
          className="shrink-0"
        >
          Pogledaj
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "rounded-lg border p-4 flex items-center gap-3"
      }
    >
      <ClipboardText size={18} className="text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Pokreni nalog za dodatnu istragu</p>
        <p className="text-xs text-muted-foreground">
          Predmet se dodaje u listu Prijavljeni i šalje inspekciji na terensku provjeru.
        </p>
      </div>
      <Button onClick={issue} className="shrink-0">
        Pokreni nalog
      </Button>
    </div>
  );
}
