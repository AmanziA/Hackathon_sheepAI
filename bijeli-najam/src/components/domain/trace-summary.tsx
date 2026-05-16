"use client";

import { useState } from "react";
import {
  Gavel,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  FileText,
  Briefcase,
  Image,
  MapPin,
  TextAa,
  Lightning,
  Drop,
  ArrowSquareOut,
  Globe,
  CheckSquare,
  ListChecks,
  Dot,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AgentTrace, TraceStep } from "@/lib/types";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  search_htz_registry: <MagnifyingGlass size={14} />,
  get_htz_listing: <FileText size={14} />,
  search_sudski_registar: <Briefcase size={14} />,
  phash_compare: <Image size={14} />,
  geocode: <MapPin size={14} />,
  normalize_croatian: <TextAa size={14} />,
  check_hep_consumption: <Lightning size={14} />,
  check_vodovod_consumption: <Drop size={14} />,
  search_web: <Globe size={14} />,
  fetch_url: <FileText size={14} />,
  update_candidate: <ListChecks size={14} />,
  record_match: <CheckSquare size={14} />,
  record_decision: <CheckSquare size={14} />,
};

const TOOL_LABEL: Record<string, string> = {
  search_htz_registry: "Pretraga HTZ registra",
  get_htz_listing: "Detalji HTZ zapisa",
  search_sudski_registar: "Sudski registar",
  phash_compare: "Vizualna usporedba fotografija",
  geocode: "Geokodiranje lokacije",
  normalize_croatian: "Normalizacija imena/kvarta",
  check_hep_consumption: "HEP — potrošnja struje",
  check_vodovod_consumption: "Vodovod — potrošnja vode",
  search_web: "Pretraga weba",
  fetch_url: "Otvaranje oglasa",
  update_candidate: "Spremanje podataka oglasa",
  record_match: "Bilježenje oglasa",
  record_decision: "Bilježenje zaključka",
};

function sourceLink(step: TraceStep): { href: string; label: string } | null {
  const input = step.tool_input as Record<string, unknown>;
  const output = step.tool_output as Record<string, unknown>;
  const lat = (output.lat as number | undefined) ?? (input.lat as number | undefined);
  const lon = (output.lon as number | undefined) ?? (input.lon as number | undefined);
  switch (step.tool_called) {
    case "search_htz_registry":
    case "get_htz_listing":
      return { href: "https://www.accommodation.croatia.hr/en-gb/private-rooms/split", label: "accommodation.croatia.hr" };
    case "search_sudski_registar":
      return { href: "https://sudreg.pravosudje.hr", label: "sudreg.pravosudje.hr" };
    case "geocode":
      if (lat != null && lon != null) {
        return {
          href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
          label: "openstreetmap.org",
        };
      }
      return { href: "https://nominatim.openstreetmap.org", label: "nominatim.openstreetmap.org" };
    case "check_hep_consumption":
      return { href: "https://mojracun.hep.hr", label: "mojracun.hep.hr" };
    case "check_vodovod_consumption":
      return { href: "https://www.vik-split.hr", label: "vik-split.hr" };
    default:
      return null;
  }
}

function shortFinding(step: TraceStep): string {
  const out = step.tool_output as Record<string, unknown>;
  const inp = step.tool_input as Record<string, unknown>;
  switch (step.tool_called) {
    case "search_htz_registry": {
      const count = (out.count as number | undefined) ?? 0;
      return count === 0 ? "0 podudaranja u registru" : `${count} mogućih kandidata`;
    }
    case "get_htz_listing":
      return (out.found as boolean | undefined) ? "HTZ zapis učitan" : "HTZ zapis nije pronađen";
    case "search_sudski_registar":
      return (out.found as boolean | undefined) ? "Tvrtka pronađena" : "Tvrtka nije u sudskom registru";
    case "phash_compare": {
      const d = out.min_hamming_distance as number | null | undefined;
      if (d == null) return "Nema fotografija za usporedbu";
      return d < 8 ? `Podudaranje (udaljenost ${d})` : `Bez podudaranja (udaljenost ${d})`;
    }
    case "geocode": {
      const c = out.confidence as number | undefined;
      return c != null ? `Lokacija pronađena (${Math.round(c * 100)}% sigurno)` : "Lokacija pronađena";
    }
    case "normalize_croatian":
      return "Normalizirano za usporedbu";
    case "search_web": {
      const q = (inp.query as string | undefined) ?? "";
      const count = (out.count as number | undefined) ?? (out.results as unknown[] | undefined)?.length ?? 0;
      return q ? `“${q.length > 50 ? q.slice(0, 50) + "…" : q}” · ${count} rezultata` : `${count} rezultata`;
    }
    case "fetch_url": {
      const u = (out.url as string | undefined) ?? (inp.url as string | undefined) ?? "";
      try {
        const host = new URL(u).hostname.replace(/^www\./, "");
        return out.ok === false ? `${host} · greška` : host;
      } catch {
        return out.ok === false ? "Stranica nedostupna" : "Stranica učitana";
      }
    }
    case "update_candidate": {
      const fields = out.fields as string[] | undefined;
      return fields && fields.length > 0
        ? `Spremio polja: ${fields.join(", ")}`
        : "Bez izmjena";
    }
    case "record_match":
    case "record_decision":
      return step.updated_hypothesis || "Bilješka zabilježena";
    case "check_hep_consumption": {
      const kwh = out.avg_kwh_per_day as number | undefined;
      const ratio = out.occupancy_ratio as number | undefined;
      if (kwh == null) return "Bez podataka o potrošnji";
      return `${kwh} kWh/dan${ratio ? ` (${ratio.toFixed(1)}× iznad praznog stana)` : ""}`;
    }
    case "check_vodovod_consumption": {
      const m3 = out.avg_m3_per_month as number | undefined;
      const ratio = out.occupancy_ratio as number | undefined;
      if (m3 == null) return "Bez podataka o potrošnji";
      return `${m3} m³/mj${ratio ? ` (${ratio.toFixed(1)}× iznad praznog stana)` : ""}`;
    }
    default:
      return step.updated_hypothesis || "—";
  }
}

function KeyValue({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground italic">prazno</p>;
  }
  return (
    <dl className="text-xs grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-mono break-all">{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) {
    if (v.length === 0) return "[ ]";
    return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

interface Props {
  trace: AgentTrace;
  steps: TraceStep[];
  confidence: number;
}

export function TraceSummary({ trace, steps, confidence }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const sorted = [...steps].sort((a, b) => a.step_index - b.step_index);
  const flagged = trace.final_verdict === "flagged";
  const verdictText = flagged
    ? "Visoka pouzdanost da je objekt neregistriran"
    : trace.final_verdict === "clear"
      ? "Objekt je u registru — vjerojatno legalno"
      : "Nedovoljno dokaza za zaključak";

  return (
    <div className="space-y-5">
      {/* Verdict callout — leads the eye */}
      <header
        className={cn(
          "rounded-sm border p-4 space-y-1.5",
          flagged
            ? "bg-destructive/5 border-destructive/20"
            : trace.final_verdict === "clear"
              ? "bg-success/5 border-success/20"
              : "bg-warning/5 border-warning/30"
        )}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Gavel size={11} />
          <span>Zaključak istrage</span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className={cn("text-base font-semibold leading-tight", flagged ? "text-destructive" : trace.final_verdict === "clear" ? "text-success" : "text-warning")}>
            {verdictText}
          </p>
          <span className="text-2xl font-bold tabular-nums-tight">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Agent je u {trace.step_count} {trace.step_count === 1 ? "koraku" : "koraka"} provjerio dostupne izvore podataka.
        </p>
      </header>

      {/* Steps — numbered with neutral markers, click to expand technical details */}
      <ol className="space-y-2">
        {sorted.map((step, idx) => {
          const open = expandedStep === step.step_index;
          const link = sourceLink(step);
          return (
            <li
              key={step.id}
              className="grid grid-cols-[auto_1fr] gap-x-3 text-sm fade-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Left rail: numbered marker (neutral) */}
              <div className="flex flex-col items-center pt-0.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold tabular-nums border-2 border-border bg-muted/40 text-muted-foreground">
                  {idx + 1}
                </span>
                {idx < sorted.length - 1 && (
                  <span className="w-px flex-1 bg-border mt-1" aria-hidden />
                )}
              </div>

              {/* Right: clickable row + collapsible details */}
              <div className="pb-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setExpandedStep(open ? null : step.step_index)}
                  className="w-full text-left rounded-sm -mx-1 px-1 py-0.5 hover:bg-muted/40 transition-colors"
                  aria-expanded={open}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0" aria-hidden>
                      {TOOL_ICONS[step.tool_called] ?? <Dot size={14} />}
                    </span>
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {TOOL_LABEL[step.tool_called] ?? step.tool_called}
                    </span>
                    <span className="text-muted-foreground shrink-0" aria-hidden>
                      {open ? <CaretDown size={12} /> : <CaretRight size={12} />}
                    </span>
                  </div>
                  <p className="mt-0.5 ml-6 text-xs text-muted-foreground leading-snug break-words">
                    {shortFinding(step)}
                  </p>
                </button>

                {link && !open && (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 mt-1 ml-6 text-[11px] text-muted-foreground hover:text-primary hover:underline break-all"
                  >
                    {link.label}
                    <ArrowSquareOut size={10} />
                  </a>
                )}

                {open && (
                  <div className="mt-2 ml-7 rounded-sm border bg-muted/30 p-2 space-y-2">
                    {step.why && (
                      <p className="text-xs italic text-muted-foreground">{step.why}</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Ulaz
                        </p>
                        <div className="bg-background rounded-sm border px-2 py-1.5">
                          <KeyValue data={step.tool_input} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Izlaz
                        </p>
                        <div className="bg-background rounded-sm border px-2 py-1.5">
                          <KeyValue data={step.tool_output} />
                        </div>
                      </div>
                    </div>
                    {link && (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline"
                      >
                        Izvor: {link.label}
                        <ArrowSquareOut size={10} />
                      </a>
                    )}
                    {step.duration_ms ? (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {step.duration_ms}ms
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-[10px] text-muted-foreground">
        Model: <code className="font-mono">{trace.model}</code>
      </p>
    </div>
  );
}
