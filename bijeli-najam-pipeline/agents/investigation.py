from __future__ import annotations
"""
Investigation agent: takes one scraped candidate listing (Booking/Airbnb/…) and
decides whether it corresponds to an HTZ-registered unit. Uses z.ai's GLM models
through the OpenAI-compatible API, plus Firecrawl-backed fetch_url on the
listing's original URL.

Same trace-shell + step-by-step live persistence pattern as `agents/discovery.py`
so the UI can poll progress live via the existing drawer.
"""
import json
import os
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
from agents.tool_registry import INVESTIGATION_TOOLS, dispatch_investigation_tool
from agents._trace_io import (
    create_running_trace as _shared_create_running_trace,
    write_step_live as _write_step_live,
    synthesized_evidence_chain,
)

ZAI_BASE_URL = os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4")
ZAI_MODEL = os.environ.get("ZAI_MODEL", "glm-5")
MAX_STEPS = 10

SYSTEM_PROMPT = """You are an inspector matching ONE scraped Booking/Airbnb/Vrbo candidate listing against the official Croatian tourism registry (HTZ / registered_units). Your job: decide whether this candidate listing corresponds to a registered unit.

TOOLS:
- fetch_url — open the candidate's listing URL via Firecrawl. Returns clean Markdown of the page. USE FIRST to read the actual listing text (street, host first name, beds, stars, unit identifier are usually shown there).
- search_htz_registry — search the local HTZ registered_units table. Filter by neighborhood (required) + optional host_first_name (fuzzy) + beds (exact). Returns 0-N candidates.
- get_htz_listing — fetch ONE registered_unit by UUID for full details (street, owner, stars).
- search_sudski_registar — Croatian court registry. Use when a registered_unit's owner contains 'd.o.o.', 'd.d.', 'j.d.o.o.' or 'obrt'. Returns directors — match against the platform host.
- normalize_croatian — diacritic strip + kvart aliases. Pure helper.
- record_decision — terminal tool. Call ONCE with verdict (matched/unmatched/inconclusive) + registered_id (null when not matched) + confidence + notes.

WHAT THE HTZ TABLE ACTUALLY HAS:
The Supabase `registered_units` rows have these fields populated reliably:
  - street (100%)
  - number / house_number (100%)
  - owner (100%) — either a person's name or a company (e.g. 'd.o.o.', 'obrt')
  - beds (100%)
  - category (100%)
  - stars (~70%)
Everything else (neighborhood, address, oib) is mostly NULL. Match on the populated fields ONLY.

WORKFLOW:
1. fetch_url(candidate.url) — pull the listing page. Extract street + house_number, beds, host first name, owner / company name if visible, any unit identifier.
2. update_candidate(host_name=…, address=…, street=…, house_number=…, beds=…) — save what you extracted back to the candidate listing. Required when the scraper missed these.
3. search_htz_registry — strict street-first:
   - First call: `search_htz_registry(street=<extracted street>, house_number=<extracted number>, beds=<extracted beds>)`. Street + number is the strongest signal and narrows the registry to at most a handful of candidates.
   - If 0 hits, retry as `search_htz_registry(street=<street only>)`.
   - If still 0 and the host on the platform is clearly a person, try `search_htz_registry(host_first_name=<first name>, beds=<beds>)`.
   - If still 0 and the host is a company, try `search_htz_registry(owner_name=<company name>)`.
   - DO NOT pass anything other than street / house_number / owner_name / host_first_name / beds. There is no neighborhood / address column to filter on.
4. For up to 2 promising registry candidates: get_htz_listing(registered_id=<uuid>) → compare street, number, beds, owner, category, stars against what fetch_url showed.
5. If the registered owner is a company (d.o.o., j.d.o.o., obrt) → search_sudski_registar(company_name=…) → match directors against the listing host name.
6. record_decision exactly once. verdict ∈ {matched, unmatched, inconclusive}; pass registered_id when matched; confidence 0.0-1.0; one-line notes naming which signals fired.

CONFIDENCE / VERDICT THRESHOLDS:
- street + beds + (host or director) match → matched, confidence ≥ 0.85
- street + beds match, host ambiguous → matched, confidence ~0.65
- neighborhood + beds match only → inconclusive, confidence 0.4-0.5
- 0 registry candidates after retries → unmatched, confidence 0.85 (high confidence UNREGISTERED)

FINAL JSON (emit as your last text message, no tool call):
{
  "final_verdict": "matched" | "unmatched" | "inconclusive",
  "final_confidence": 0.0-1.0,
  "evidence_chain": [{"step_index": N, "fact": "...", "tool_called": "..."}]
}

RULES:
- Cite step_index for every evidence_chain fact.
- No facts beyond what tools returned. Don't invent.
- Up to ~8 tool calls total. Parallel tool calls in one turn are fine.
"""


def build_candidate_context(candidate: dict) -> str:
    photos = candidate.get("photos") or []
    return f"""Candidate listing to investigate:
- Platform: {candidate.get('platform')}
- Title: {candidate.get('title')}
- Host name: {candidate.get('host_name') or '—'}
- Neighborhood: {candidate.get('neighborhood') or '—'}
- City: {candidate.get('city') or 'Split'}
- Beds: {candidate.get('beds')}
- Guests: {candidate.get('guests')}
- Price/night: {candidate.get('price_per_night')} EUR
- URL: {candidate.get('url')}
- Photos: {len(photos)} attached
- Candidate ID: {candidate.get('id')}

Begin your investigation."""


def _zai_client() -> OpenAI:
    return OpenAI(api_key=os.environ["ZAI_API_KEY"], base_url=ZAI_BASE_URL)


def create_running_trace(candidate: dict, supabase: Client) -> str:
    """Insert an agent_traces shell tied to this candidate."""
    return _shared_create_running_trace(
        supabase=supabase,
        agent_type="investigation",
        model=ZAI_MODEL,
        candidate_id=candidate["id"],
    )


def investigate(
    candidate: dict, supabase: Client, trace_id: str | None = None
) -> tuple[AgentTrace, list[dict]]:
    """Run the investigation agent on one candidate listing (sync).

    If `trace_id` is supplied, persist each step live to trace_steps.
    Returns (trace, decisions) — decisions has 0 or 1 entries (record_decision).
    """
    client = _zai_client()
    started_at = datetime.now(timezone.utc)
    live = trace_id is not None
    if trace_id is None:
        trace_id = str(uuid.uuid4())

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_candidate_context(candidate)},
    ]
    steps: list[TraceStep] = []
    decisions: list[dict] = []
    total_tokens = 0
    verdict: AgentVerdict | None = None
    step_counter = 0

    tools = INVESTIGATION_TOOLS

    for _turn_idx in range(MAX_STEPS):
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
            verdict = _parse_verdict(msg.content or "", decisions)
            break

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

            tool_output = dispatch_investigation_tool(
                tool_name, tool_input, supabase, candidate_id=candidate["id"]
            )
            if tool_name == "record_decision":
                decisions.append({**tool_input, "_step_index": step_counter, "_tool_called": tool_name})

            why = (msg.content or "").strip().splitlines()[0][:200] if msg.content else f"Korak {step_counter + 1}"
            step = TraceStep(
                step_index=step_counter,
                tool_called=tool_name,
                tool_input=tool_input,
                tool_output=tool_output,
                why=why,
                updated_hypothesis=_hypothesis(tool_name, tool_output, decisions),
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
        # MAX_STEPS hit
        verdict = AgentVerdict(
            final_verdict=(decisions[0]["verdict"] if decisions else "inconclusive"),
            final_confidence=float(decisions[0].get("confidence") or 0.0) if decisions else 0.0,
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )

    if verdict is None:
        verdict = AgentVerdict(
            final_verdict=(decisions[0]["verdict"] if decisions else "inconclusive"),
            final_confidence=float(decisions[0].get("confidence") or 0.0) if decisions else 0.0,
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )

    completed_at = datetime.now(timezone.utc)
    trace = AgentTrace(
        id=trace_id,
        candidate_id=candidate["id"],
        agent_type="investigation",
        model=ZAI_MODEL,
        steps=steps,
        verdict=verdict,
        total_tokens=total_tokens,
        total_cost_usd=_estimate_cost(total_tokens),
        started_at=started_at,
        completed_at=completed_at,
    )
    return trace, decisions


def _hypothesis(tool_name: str, output: dict, decisions: list[dict]) -> str:
    if tool_name == "record_decision":
        last = decisions[-1] if decisions else {}
        return f"Decision: {last.get('verdict')} (conf {last.get('confidence')})"
    if tool_name == "search_htz_registry":
        return f"Registry returned {output.get('count', 0)} candidate(s)"
    if tool_name == "get_htz_listing":
        return "Registered unit detail loaded" if output.get("found") else "Registered unit not found"
    if tool_name == "fetch_url" and output.get("ok"):
        return "Listing page fetched"
    if tool_name == "search_sudski_registar" and output.get("found"):
        return f"Directors: {', '.join((output.get('directors') or [])[:3])}"
    return f"Result from {tool_name}"


def _parse_verdict(text: str, decisions: list[dict]) -> AgentVerdict:
    try:
        start = text.rfind("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return AgentVerdict(
                final_verdict=data.get("final_verdict")
                or (decisions[0]["verdict"] if decisions else "inconclusive"),
                final_confidence=float(data.get("final_confidence", 0.0)),
                final_breakdown=FinalBreakdown(**data.get("final_breakdown", {})),
                evidence_chain=[
                    EvidenceItem(**e)
                    for e in data.get("evidence_chain", [])
                    if "step_index" in e
                ],
            )
    except Exception:
        pass
    # Fallback to the recorded decision (if any).
    if decisions:
        d = decisions[0]
        return AgentVerdict(
            final_verdict=d.get("verdict") or "inconclusive",
            final_confidence=float(d.get("confidence") or 0.0),
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )
    return AgentVerdict(
        final_verdict="inconclusive",
        final_confidence=0.0,
        final_breakdown=FinalBreakdown(),
        evidence_chain=[],
    )


def _estimate_cost(tokens: int) -> float:
    return round(tokens * 0.0000005, 6)


def persist_investigation_trace(
    trace: AgentTrace,
    decisions: list[dict],
    candidate: dict,
    supabase: Client,
    *,
    live: bool = False,
) -> dict[str, Any]:
    """Finalize the agent_traces row, write entity_links + flag where appropriate."""
    decision = decisions[0] if decisions else None
    raw_verdict = (decision or {}).get("verdict") or trace.verdict.final_verdict
    raw_confidence = float((decision or {}).get("confidence") or trace.verdict.final_confidence or 0.0)
    registered_id = (decision or {}).get("registered_id") or None

    # Enforce verdict thresholds even if the model under-reported.
    if raw_verdict == "matched" and not registered_id:
        # Model said matched but no id — treat as inconclusive.
        raw_verdict = "inconclusive"

    final_verdict = raw_verdict if raw_verdict in {"matched", "unmatched", "inconclusive"} else "inconclusive"
    final_confidence = max(0.0, min(1.0, raw_confidence))

    # Synthesize an evidence chain if model didn't emit one.
    evidence_chain = [e.model_dump() for e in trace.verdict.evidence_chain]
    if not evidence_chain and decision:
        evidence_chain = synthesized_evidence_chain([
            {
                "name": "HTZ podudaranje" if final_verdict == "matched" else "Nije pronađeno",
                "host_name": candidate.get("host_name"),
                "beds": candidate.get("beds"),
                "confidence": final_confidence,
                "notes": decision.get("notes") or "",
                "_step_index": decision.get("_step_index", 0),
                "_tool_called": "record_decision",
            }
        ])

    trace_update = {
        "candidate_id": candidate["id"],
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
        supabase.table("agent_traces").update(trace_update).eq("id", trace.id).execute()
    else:
        full = {
            "id": trace.id,
            "candidate_id": candidate["id"],
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

    # entity_link — one per candidate, regardless of verdict.
    link_row: dict[str, Any] = {
        "candidate_id": candidate["id"],
        "registered_id": registered_id,
        "verdict": final_verdict,
        "confidence": final_confidence,
        "match_signals": {
            "decision": {
                "fired": True,
                "score": final_confidence,
                "evidence": (decision or {}).get("notes") or "",
            },
        },
        "composite_key": {
            "kvart": candidate.get("neighborhood"),
            "beds": candidate.get("beds"),
            "host_first_name": (candidate.get("host_name") or "").split()[0] if candidate.get("host_name") else None,
        },
        "trace_id": trace.id,
        "matched_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("entity_links").upsert(link_row, on_conflict="candidate_id").execute()

    # flag — only when clearly unregistered.
    if final_verdict == "unmatched" and final_confidence >= 0.6:
        # Look up the entity_link's id we just upserted so flag can reference it.
        link = (
            supabase.table("entity_links")
            .select("id")
            .eq("candidate_id", candidate["id"])
            .limit(1)
            .execute()
        )
        link_id = (link.data or [{}])[0].get("id")
        flag_row = {
            "candidate_id": candidate["id"],
            "entity_link_id": link_id,
            "trace_id": trace.id,
            "confidence_unregistered": final_confidence,
            "status": "open",
        }
        supabase.table("flags").upsert(flag_row, on_conflict="candidate_id").execute()

    return {
        "trace_id": trace.id,
        "candidate_id": candidate["id"],
        "registered_id": registered_id,
        "verdict": final_verdict,
        "confidence": final_confidence,
    }
