from __future__ import annotations
"""
Discovery agent: takes one registered_units row and searches the open web
(Booking, Airbnb, etc.) for listings of that property using z.ai's GLM models
with their built-in web_search tool.

Each "found" listing is recorded via the record_match tool. Persistence
writes candidate_listings, entity_links, and an agent_trace tied to the
registered_id (candidate_id is set to the best match's id or NULL).
"""
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from openai import OpenAI
from supabase import Client

from agents.trace_schema import (
    AgentTrace,
    AgentVerdict,
    EvidenceItem,
    FinalBreakdown,
    TraceStep,
)
from agents.tool_registry import DISCOVERY_TOOLS, dispatch_discovery_tool

ZAI_BASE_URL = os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4")
ZAI_MODEL = os.environ.get("ZAI_MODEL", "glm-5")
MAX_STEPS = 10

COMPANY_FORMS_RE = re.compile(
    r"\b(d\.o\.o\.?|j\.d\.o\.o\.?|d\.d\.?|obrt|o\.p\.g\.?|j\.t\.d\.?|k\.d\.?|gmbh|ltd|llc|inc)\b",
    re.IGNORECASE,
)

SYSTEM_PROMPT = """You are a discovery agent for Bijeli Najam, a tool that audits short-term rental compliance in Split, Croatia.

GOAL: given ONE officially registered property (street + number, owner, beds, optional stars), find every public listing on Booking.com / Airbnb / Vrbo / Holiday-style platforms that is THE SAME unit. Multiple listings can exist at the same address (apartment buildings often host many units) — you must disambiguate which one matches THIS registered unit, not just "any" listing at that address.

TOOLS:
- search_web — web search (Firecrawl). ALWAYS USE THIS FIRST. Pass `site="booking.com"`, `site="airbnb.com"`, `site="vrbo.com"`, or `site="fininfo.hr"` / `site="companywall.com"` / `site="poslovna.hr"` for restricted searches. Returns url + title + snippet.
- fetch_url — open a specific listing URL and return its cleaned text (Firecrawl handles JS-rendered pages). Use AFTER search_web to verify a candidate. NEVER fetch google.com / bing.com / duckduckgo.com.
- search_sudski_registar — Croatian court registry (sudreg.pravosudje.hr). Use FIRST when owner contains a legal form (d.o.o. / d.d. / j.d.o.o. / obrt). Returns OIB + directors. The actual host on Booking/Airbnb is usually one of the directors, not the company name.
- normalize_croatian — diacritic strip + kvart aliases. Helper for comparing strings.
- record_match — record one matched listing. Call ONCE PER matched listing — multiple calls are fine if you find multiple matches.

CORE WORKFLOW (address-first, then disambiguate):

STEP A — Address search (mandatory first move):
   Query: `"<street> <number>" Split apartment` (quoted) — generic, no site restrict.
   Also try restricted: search_web(query="<street> <number> Split", site="booking.com") and same for airbnb.com.
   This surfaces every public listing that mentions this address.

STEP B — Collect candidate URLs:
   From search results, gather ALL Booking/Airbnb/Vrbo URLs that look related. There may be 0, 1, or many. Do NOT filter prematurely — multiple units in one building is the norm.

STEP C — Fetch & disambiguate each candidate:
   For each candidate URL (up to ~3), call fetch_url. From the page text, extract:
     - exact title / listing name
     - host name (or company)
     - bed count / sleeps / guests
     - neighborhood / area label
     - stars / rating if shown
     - any unit identifier (apt number, floor, name like "Apt B")
   Compare to the registered unit's beds / category / stars / owner.

STEP D — Owner side-lookup (if owner is a company):
   Call search_sudski_registar(company_name=<owner>). If `found:false`, try search_web with `site="fininfo.hr"`, then `site="poslovna.hr"`, then `site="companywall.com"` — these often list directors when the court registry's website search misses. Use the directors' names as candidate host names in STEP C scoring.

STEP E — Decide & record:
   For each candidate listing, score against the registered unit. If confidence ≥ 0.6, call record_match with a `notes` field stating which signals fired ("street + beds + director name match"). Multiple record_match calls are correct when multiple platforms list the same unit.

CONFIDENCE PER MATCH (start at 0):
- Exact street + number string in listing page: +0.30
- Bed count exact match: +0.15  (mismatch when both known: -0.15)
- Stars match: +0.05
- Neighborhood / kvart match: +0.05
- Owner's first or last name in host_name: +0.25
- Owner is company & a director's first/last name in host_name: +0.25 (do NOT also add the owner-name bonus)
- Listing on Booking / Airbnb / Vrbo / accommodation.croatia.hr: +0.05
- Title or unit identifier explicitly matches registered name (e.g. "LIBERTY LIVING"): +0.15

FINAL JSON (emit as your last text message, no tool call):
{
  "final_verdict": "clear" | "inconclusive" | "no_listings_found",
  "final_confidence": 0.0-1.0,
  "evidence_chain": [{"step_index": N, "fact": "...", "tool_called": "..."}]
}

Verdict rules:
- ≥1 record_match with confidence ≥ 0.75 → "clear"
- 0 candidate URLs found anywhere → "no_listings_found"
- otherwise → "inconclusive"

RULES:
- No inventing facts. Every evidence_chain item cites the step_index of the tool call that produced it.
- Do not call record_match on a URL you haven't verified with fetch_url (the listing might be at a similar but different address).
- Stay within 8-10 tool calls total. Parallel tool calls in one turn are allowed and encouraged.
"""


def is_company_owner(owner: str | None) -> bool:
    return bool(owner and COMPANY_FORMS_RE.search(owner))


def build_unit_context(unit: dict) -> str:
    owner = unit.get("owner") or ""
    flags = []
    if is_company_owner(owner):
        flags.append("OWNER LOOKS LIKE A COMPANY — consider search_sudski_registar")
    return f"""Registered unit to investigate online:
- Name: {unit.get('name')}
- Owner: {owner or '—'}
- Address: {unit.get('address') or '—'}
- Street: {unit.get('street') or '—'}
- Number: {unit.get('number') or '—'}
- Postcode: {unit.get('postcode') or '—'}
- Neighborhood: {unit.get('neighborhood') or '—'}
- City: {unit.get('city') or 'Split'}
- Beds: {unit.get('beds')}
- Category: {unit.get('category')}
- Coordinates: {unit.get('lat')}, {unit.get('lon')}
- OIB: {unit.get('oib') or '—'}
- Registered URL: {unit.get('url')}
- Registered ID: {unit.get('id')}
{chr(10).join(flags)}

Find this property's public listings on Booking.com, Airbnb, Vrbo, etc. Begin."""


def _zai_client() -> OpenAI:
    return OpenAI(api_key=os.environ["ZAI_API_KEY"], base_url=ZAI_BASE_URL)


def create_running_trace(unit: dict, supabase: Client) -> str:
    """Insert a shell agent_traces row in 'running' state so the UI can poll
    its trace_steps as they're added. Returns the trace_id."""
    trace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("agent_traces").insert(
        {
            "id": trace_id,
            "registered_id": unit["id"],
            "candidate_id": None,
            "agent_type": "investigation",
            "model": ZAI_MODEL,
            "step_count": 0,
            "final_verdict": "running",
            "final_confidence": 0.0,
            "final_breakdown": {},
            "evidence_chain": [],
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "started_at": now,
            "completed_at": now,
        }
    ).execute()
    return trace_id


def _write_step_live(trace_id: str, step: TraceStep, supabase: Client) -> None:
    """Persist a single step + bump step_count on the parent trace."""
    supabase.table("trace_steps").insert(
        {
            "id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "step_index": step.step_index,
            "tool_called": step.tool_called,
            "tool_input": step.tool_input,
            "tool_output": step.tool_output,
            "why": step.why,
            "updated_hypothesis": step.updated_hypothesis,
            "confidence_delta": float(step.confidence_delta),
            "duration_ms": step.duration_ms,
        }
    ).execute()
    supabase.table("agent_traces").update({"step_count": step.step_index + 1}).eq("id", trace_id).execute()


def investigate(unit: dict, supabase: Client, trace_id: str | None = None) -> tuple[AgentTrace, list[dict]]:
    """Run the discovery agent on one registered unit (sync).

    If `trace_id` is supplied, persist each step live to trace_steps as it's
    generated. Otherwise a fresh trace_id is allocated but no live writes occur.
    """
    client = _zai_client()
    started_at = datetime.now(timezone.utc)
    live = trace_id is not None
    if trace_id is None:
        trace_id = str(uuid.uuid4())

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_unit_context(unit)},
    ]
    steps: list[TraceStep] = []
    matches: list[dict] = []
    total_tokens = 0
    verdict: AgentVerdict | None = None
    step_counter = 0  # global, advances per persisted TraceStep (parallel tool calls included)

    # All search/fetch goes through our function tools — z.ai's built-in web_search
    # is not active on the coding plan, so we drive search ourselves via Tavily.
    tools = DISCOVERY_TOOLS

    for turn_idx in range(MAX_STEPS):
        t0 = time.time()
        try:
            response = client.chat.completions.create(
                model=ZAI_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=4096,
            )
        except Exception as exc:
            # Surface API errors as a single step + inconclusive verdict.
            err_step = TraceStep(
                step_index=step_counter,
                tool_called="zai_error",
                tool_input={"model": ZAI_MODEL},
                tool_output={"error": f"{type(exc).__name__}: {exc}"},
                why="z.ai API call failed",
                updated_hypothesis="Cannot proceed without LLM",
                confidence_delta=0.0,
                duration_ms=int((time.time() - t0) * 1000),
            )
            step_counter += 1
            steps.append(err_step)
            if live:
                _write_step_live(trace_id, err_step, supabase)
            verdict = AgentVerdict(
                final_verdict="inconclusive",
                final_confidence=0.0,
                final_breakdown=FinalBreakdown(),
                evidence_chain=[],
            )
            break

        usage = getattr(response, "usage", None)
        if usage:
            total_tokens += (usage.prompt_tokens or 0) + (usage.completion_tokens or 0)

        msg = response.choices[0].message
        tool_calls = msg.tool_calls or []

        if not tool_calls:
            verdict = _parse_verdict(msg.content or "", len(matches))
            break

        # Append the assistant message so subsequent tool_result messages reference its tool_call_ids.
        messages.append(
            {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tool_calls
                ],
            }
        )

        for tc in tool_calls:
            tool_name = tc.function.name
            try:
                tool_input = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {"_raw": tc.function.arguments}

            tool_output = dispatch_discovery_tool(tool_name, tool_input, supabase)
            if tool_name == "record_match":
                matches.append({**tool_input, "_step_index": step_counter})

            why = (msg.content or "").strip().splitlines()[0][:200] if msg.content else f"Korak {step_counter + 1}"
            step = TraceStep(
                step_index=step_counter,
                tool_called=tool_name,
                tool_input=tool_input,
                tool_output=tool_output,
                why=why,
                updated_hypothesis=_hypothesis(tool_name, tool_output, len(matches)),
                confidence_delta=0.0,
                duration_ms=int((time.time() - t0) * 1000),
            )
            step_counter += 1
            steps.append(step)
            if live:
                _write_step_live(trace_id, step, supabase)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(tool_output)[:8000],
                }
            )
    else:
        verdict = AgentVerdict(
            final_verdict="inconclusive" if matches else "no_listings_found",
            final_confidence=max((m.get("confidence", 0.0) for m in matches), default=0.0),
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )

    if verdict is None:
        verdict = AgentVerdict(
            final_verdict="inconclusive" if matches else "no_listings_found",
            final_confidence=max((m.get("confidence", 0.0) for m in matches), default=0.0),
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )

    completed_at = datetime.now(timezone.utc)
    trace = AgentTrace(
        id=trace_id,
        candidate_id="",  # filled by persist if we have a best match
        agent_type="investigation",
        model=ZAI_MODEL,
        steps=steps,
        verdict=verdict,
        total_tokens=total_tokens,
        total_cost_usd=_estimate_cost(total_tokens),
        started_at=started_at,
        completed_at=completed_at,
    )
    return trace, matches


def _hypothesis(tool_name: str, output: dict, match_count: int) -> str:
    if tool_name == "record_match":
        return f"Match recorded (total now {match_count})"
    if tool_name == "fetch_url" and output.get("ok"):
        return "Fetched listing page text; checking for street/host evidence"
    if tool_name == "search_sudski_registar" and output.get("found"):
        return f"Got directors: {', '.join(output.get('directors') or [])[:120]}"
    return f"Result from {tool_name}"


def _parse_verdict(text: str, match_count: int) -> AgentVerdict:
    try:
        start = text.rfind("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return AgentVerdict(
                final_verdict=data.get("final_verdict") or ("no_listings_found" if match_count == 0 else "inconclusive"),
                final_confidence=float(data.get("final_confidence", 0.0)),
                final_breakdown=FinalBreakdown(**data.get("final_breakdown", {})),
                evidence_chain=[EvidenceItem(**e) for e in data.get("evidence_chain", []) if "step_index" in e],
            )
    except Exception:
        pass
    return AgentVerdict(
        final_verdict="no_listings_found" if match_count == 0 else "inconclusive",
        final_confidence=0.0,
        final_breakdown=FinalBreakdown(),
        evidence_chain=[],
    )


def _estimate_cost(tokens: int) -> float:
    # GLM-4.6 pricing approx — adjust when z.ai publishes exact rates.
    return round(tokens * 0.0000005, 6)


def _platform_from_url(url: str) -> str:
    u = url.lower()
    if "booking.com" in u:
        return "booking"
    if "airbnb." in u:
        return "airbnb"
    if "vrbo." in u or "homeaway." in u:
        return "vrbo"
    if "accommodation.croatia.hr" in u:
        return "croatia.hr"
    return "other"


def _external_id_from_url(url: str, platform: str) -> str:
    if platform == "booking":
        m = re.search(r"/hotel/[^/]+/([^./?]+)", url)
        if m:
            return m.group(1)
    if platform == "airbnb":
        m = re.search(r"/rooms/(\d+)", url)
        if m:
            return m.group(1)
    return url[-80:]


def persist_discovery_trace(
    trace: AgentTrace,
    matches: list[dict],
    unit: dict,
    supabase: Client,
    *,
    live: bool = False,
) -> dict[str, Any]:
    """Persist trace + steps + candidate_listings + entity_links for a discovery run.

    Returns a small summary dict the API can return to the UI.
    """
    registered_id = unit["id"]
    best_match_id: str | None = None
    candidate_ids: list[str] = []

    for m in sorted(matches, key=lambda x: x.get("confidence", 0.0), reverse=True):
        url = (m.get("url") or "").strip()
        if not url:
            continue
        platform = m.get("platform") or _platform_from_url(url)
        external_id = m.get("external_id") or _external_id_from_url(url, platform)
        # NOTE: do NOT send `id` on upsert — if the row already exists, Postgres
        # tries to *change* the primary key which collides with FKs from
        # agent_traces / entity_links / flags.
        cand_row = {
            "platform": platform,
            "external_id": external_id,
            "title": (m.get("title") or unit.get("name") or "?")[:500],
            "host_name": m.get("host_name"),
            "neighborhood": m.get("neighborhood") or unit.get("neighborhood"),
            "city": unit.get("city") or "Split",
            "approx_lat": unit.get("lat"),
            "approx_lon": unit.get("lon"),
            "url": url,
            "beds": m.get("beds") or unit.get("beds"),
        }
        upserted = (
            supabase.table("candidate_listings")
            .upsert(cand_row, on_conflict="platform,external_id")
            .execute()
        )
        rows = upserted.data or []
        if rows:
            cid = rows[0].get("id")
        else:
            # Upsert didn't return data (rare); query back.
            found = (
                supabase.table("candidate_listings")
                .select("id")
                .eq("platform", platform)
                .eq("external_id", external_id)
                .maybeSingle()
                .execute()
            )
            cid = (found.data or {}).get("id")
        if not cid:
            continue
        candidate_ids.append(cid)
        if best_match_id is None:
            best_match_id = cid

        # entity_link — same gotcha: omit `id` on conflict.
        link_row = {
            "candidate_id": cid,
            "registered_id": registered_id,
            "verdict": "matched",
            "confidence": float(m.get("confidence") or 0.0),
            "match_signals": {
                "address": {"fired": True, "score": float(m.get("confidence") or 0.0), "evidence": m.get("notes") or ""},
            },
            "composite_key": {
                "kvart": unit.get("neighborhood"),
                "beds": unit.get("beds"),
                "owner": unit.get("owner"),
            },
            "trace_id": trace.id,
            "matched_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("entity_links").upsert(link_row, on_conflict="candidate_id").execute()

    # Enforce the verdict thresholds even if the model under-reported them.
    top_confidence = max((float(m.get("confidence") or 0.0) for m in matches), default=0.0)
    final_verdict = trace.verdict.final_verdict
    final_confidence = float(trace.verdict.final_confidence)
    if len(matches) > 0:
        # We have at least one record_match → never "no_listings_found".
        if top_confidence >= 0.6:
            final_verdict = "clear"
        else:
            final_verdict = "inconclusive"
        final_confidence = max(final_confidence, top_confidence)
    elif final_verdict in ("running", "", None):
        # No matches and the model stopped without a verdict.
        final_verdict = "no_listings_found"

    # Synthesize an evidence chain from the matches if the model didn't fill one.
    evidence_chain = [e.model_dump() for e in trace.verdict.evidence_chain]
    if not evidence_chain and matches:
        evidence_chain = [
            {
                "step_index": m.get("_step_index", 0),
                "fact": (
                    f"{(m.get('platform') or 'oglas').upper()}: "
                    f"{m.get('title') or 'oglas pronađen'}"
                    + (f" — host: {m['host_name']}" if m.get("host_name") else "")
                    + (f" — kreveti: {m['beds']}" if m.get("beds") else "")
                    + f" — pouzdanost {int(float(m.get('confidence') or 0) * 100)}%"
                    + (f" — {m['notes']}" if m.get("notes") else "")
                ),
                "tool_called": "record_match",
            }
            for m in sorted(matches, key=lambda x: float(x.get("confidence") or 0), reverse=True)
        ]

    trace_update = {
        "candidate_id": best_match_id,
        "step_count": len(trace.steps),
        "final_verdict": final_verdict,
        "final_confidence": final_confidence,
        "final_breakdown": trace.verdict.final_breakdown.model_dump(),
        "evidence_chain": evidence_chain,
        "total_tokens": trace.total_tokens,
        "total_cost_usd": float(trace.total_cost_usd),
        "completed_at": trace.completed_at.isoformat(),
    }

    if live:
        # The shell row exists; just update it.
        supabase.table("agent_traces").update(trace_update).eq("id", trace.id).execute()
    else:
        # Fresh insert (CLI / batch mode).
        full = {
            "id": trace.id,
            "registered_id": registered_id,
            "agent_type": "investigation",
            "model": trace.model,
            "started_at": trace.started_at.isoformat(),
            **trace_update,
        }
        supabase.table("agent_traces").insert(full).execute()

        if trace.steps:
            step_rows = [
                {
                    "id": str(uuid.uuid4()),
                    "trace_id": trace.id,
                    "step_index": s.step_index,
                    "tool_called": s.tool_called,
                    "tool_input": s.tool_input,
                    "tool_output": s.tool_output,
                    "why": s.why,
                    "updated_hypothesis": s.updated_hypothesis,
                    "confidence_delta": float(s.confidence_delta),
                    "duration_ms": s.duration_ms,
                }
                for s in trace.steps
            ]
            supabase.table("trace_steps").insert(step_rows).execute()

    return {
        "trace_id": trace.id,
        "registered_id": registered_id,
        "match_count": len(candidate_ids),
        "candidate_ids": candidate_ids,
        "verdict": trace.verdict.final_verdict,
        "confidence": float(trace.verdict.final_confidence),
    }
