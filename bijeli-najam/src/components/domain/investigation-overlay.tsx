"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  ArrowsClockwise,
  CheckCircle,
  Circle,
  X,
  MagnifyingGlass,
  Image as ImageIcon,
  Lightning,
  Drop,
  Gavel,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Phase = {
  icon: React.ReactNode;
  label: string;
  detail: string;
  durationMs: number;
};

const PHASES: Phase[] = [
  {
    icon: <MagnifyingGlass size={14} />,
    label: "Pretraga HTZ registra",
    detail: "Učitavam accommodation.croatia.hr za sve kandidate u Splitu",
    durationMs: 1100,
  },
  {
    icon: <ImageIcon size={14} />,
    label: "Vizualna usporedba fotografija (pHash)",
    detail: "Izračunavam perceptual hashes i tražim duplikate među registriranima",
    durationMs: 1500,
  },
  {
    icon: <Lightning size={14} />,
    label: "HEP — provjera potrošnje struje",
    detail: "Učitavam mjesečnu potrošnju za adrese kandidata",
    durationMs: 1300,
  },
  {
    icon: <Drop size={14} />,
    label: "Vodovod — provjera potrošnje vode",
    detail: "Uspoređujem s prosjekom za prazne stanove u zoni",
    durationMs: 1100,
  },
  {
    icon: <Gavel size={14} />,
    label: "Zaključak agenta",
    detail: "Računam pouzdanost i grupiram dokaze po oglasu",
    durationMs: 900,
  },
];

interface Props {
  total: number;
  onCancel: () => void;
  onDone: () => void;
}

export function InvestigationOverlay({ total, onCancel, onDone }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [processed, setProcessed] = useState(0);

  useEffect(() => {
    if (phaseIdx >= PHASES.length) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const phase = PHASES[phaseIdx];
    const t = setTimeout(() => setPhaseIdx((i) => i + 1), phase.durationMs);
    return () => clearTimeout(t);
  }, [phaseIdx, onDone]);

  useEffect(() => {
    const totalMs = PHASES.reduce((s, p) => s + p.durationMs, 0);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setProcessed(Math.min(total, Math.floor((elapsed / totalMs) * total)));
      if (elapsed >= totalMs) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [total]);

  const progress = Math.min(100, Math.round((phaseIdx / PHASES.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-lg border shadow-lg overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b">
          <div className="flex items-center gap-2">
            <ArrowsClockwise size={16} className="text-primary animate-spin" />
            <h2 className="text-sm font-semibold">Pokrenuta istraga agenta</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Prekini istragu"
            className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </header>

        <div className="px-5 pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Obrađeno oglasa</span>
            <span className="font-mono tabular-nums">
              {processed} / {total}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <ol className="px-5 py-4 space-y-2.5">
          {PHASES.map((phase, i) => {
            const done = i < phaseIdx;
            const active = i === phaseIdx;
            return (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    done ? "text-success" : active ? "text-primary" : "text-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {done ? (
                    <CheckCircle size={16} weight="fill" />
                  ) : active ? (
                    <ArrowsClockwise size={16} className="animate-spin" />
                  ) : (
                    <Circle size={16} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-muted-foreground", active && "text-foreground")}>
                      {phase.icon}
                    </span>
                    <span
                      className={cn(
                        active || done ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {phase.label}
                    </span>
                  </div>
                  {active && (
                    <p className="text-xs text-muted-foreground mt-0.5">{phase.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <footer className="px-5 py-3 bg-muted/30 border-t text-xs text-muted-foreground">
          Agent pretražuje 5 izvora — HTZ registar, pHash usporedba, HEP, Vodovod i sudski registar — i sastavlja dokaze po oglasu.
        </footer>
      </div>
    </div>
  );
}
