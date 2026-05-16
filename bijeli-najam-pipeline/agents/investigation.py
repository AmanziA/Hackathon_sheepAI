from __future__ import annotations
"""
Investigation agent: takes one candidate listing, runs up to 6 tool calls,
emits a structured verdict with a full reasoning trace.
"""
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone

import anthropic
from supabase import Client

from agents.trace_schema import (
    AgentTrace,
    AgentVerdict,
    EvidenceItem,
    FinalBreakdown,
    TraceStep,
)
from agents.tool_registry import TOOLS, dispatch_tool

MAX_STEPS = 6
MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """You are an investigation agent for Bijeli Najam, a tool that detects unregistered short-term rentals in Split, Croatia.

Your task: given a candidate listing from Airbnb or Booking.com, determine whether it appears in the official Croatian tourism registry (HTZ / accommodation.croatia.hr).

You have access to 6 tools. Use them efficiently — you have at most 6 tool calls total.

INVESTIGATION STRATEGY:
1. Start with search_htz_registry using the listing's neighborhood and beds. This narrows the registry to candidates.
2. If candidates are found, fetch details with get_htz_listing for the most promising one.
3. Use phash_compare if photos are available and name/bed matching is ambiguous.
4. Use geocode only if the listing reveals a partial address.
5. Use normalize_croatian before any string comparison.
6. If the host name looks like a company, use search_sudski_registar.

CONFIDENCE SCORING (running total, start at 0.5):
- Neighborhood match: ±0.0 (required, not discriminating alone)
- Bed count match (exact): +0.2 | mismatch: -0.1
- Host first name match (fuzzy ≥80%): +0.2 | clear mismatch: -0.15
- Photo pHash match (distance < 8): +0.25
- Property type match: +0.05
- No candidates found in registry: -0.35
- Multiple candidates, none match well: -0.2

VERDICT THRESHOLDS (apply after all tool calls):
- confidence ≥ 0.8 → "clear" (matched to a registered unit)
- confidence ≤ 0.2 → "flagged" (no plausible registered match — actionable)
- otherwise → "inconclusive"

RULES:
- Every fact in evidence_chain MUST reference the step_index of the tool call that produced it.
- No invented facts. Only tool outputs count as evidence.
- State your reasoning for each tool call in the "why" field.
- After each tool call, update your hypothesis in "updated_hypothesis".

When you have enough information (or have used all 6 calls), emit a final answer as JSON matching this schema:
{
  "final_verdict": "flagged" | "clear" | "inconclusive",
  "final_confidence": 0.0-1.0,
  "final_breakdown": {
    "neighborhood": 0.0,
    "host_name": 0.0,
    "beds": 0.0,
    "photo_phash": 0.0,
    "type": 0.0
  },
  "evidence_chain": [
    {"step_index": 0, "fact": "...", "tool_called": "search_htz_registry"}
  ]
}"""


def build_candidate_context(candidate: dict) -> str:
    photos = candidate.get("photos") or []
    photo_phashes = [p["phash"] for p in photos if p.get("phash")]
    return f"""Candidate listing to investigate:
- Platform: {candidate.get('platform')}
- Title: {candidate.get('title')}
- Host name: {candidate.get('host_name')}
- Neighborhood: {candidate.get('neighborhood')}
- City: {candidate.get('city', 'Split')}
- Beds: {candidate.get('beds')}
- Guests: {candidate.get('guests')}
- Price/night: {candidate.get('price_per_night')} EUR
- URL: {candidate.get('url')}
- Photo pHashes available: {photo_phashes if photo_phashes else 'none'}
- Candidate ID: {candidate.get('id')}

Begin your investigation. Use tools to determine if this listing is in the HTZ registry."""


async def investigate(candidate: dict, supabase: Client) -> AgentTrace:
    """Run the investigation agent on one candidate listing."""
    client = anthropic.Anthropic()
    started_at = datetime.now(timezone.utc)

    messages = [{"role": "user", "content": build_candidate_context(candidate)}]
    steps: list[TraceStep] = []
    total_tokens = 0
    running_confidence = 0.5

    for step_idx in range(MAX_STEPS):
        t0 = time.time()
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
        total_tokens += response.usage.input_tokens + response.usage.output_tokens

        # Check if model wants to use a tool
        tool_use_block = next((b for b in response.content if b.type == "tool_use"), None)
        text_block = next((b for b in response.content if b.type == "text"), None)

        if tool_use_block is None or response.stop_reason == "end_turn":
            # Model is done — parse final verdict from text
            final_text = text_block.text if text_block else ""
            verdict = _parse_verdict(final_text, steps, running_confidence)
            break

        # Execute the tool
        tool_name = tool_use_block.name
        tool_input = tool_use_block.input
        duration_ms = int((time.time() - t0) * 1000)

        tool_output = dispatch_tool(tool_name, tool_input, supabase)
        running_confidence = _update_confidence(running_confidence, tool_name, tool_input, tool_output)

        # Extract why / hypothesis from accompanying text
        why = _extract_why(text_block, step_idx)
        updated_hypothesis = f"Confidence now {running_confidence:.2f} after {tool_name}"

        step = TraceStep(
            step_index=step_idx,
            tool_called=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            why=why,
            updated_hypothesis=updated_hypothesis,
            confidence_delta=running_confidence - 0.5 if step_idx == 0 else 0.0,
            duration_ms=duration_ms,
        )
        steps.append(step)

        # Feed tool result back
        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": tool_use_block.id,
                "content": json.dumps(tool_output),
            }],
        })
    else:
        # Hit MAX_STEPS — force inconclusive
        verdict = AgentVerdict(
            final_verdict="inconclusive",
            final_confidence=running_confidence,
            final_breakdown=FinalBreakdown(),
            evidence_chain=[],
        )

    completed_at = datetime.now(timezone.utc)
    trace = AgentTrace(
        id=str(uuid.uuid4()),
        candidate_id=candidate["id"],
        agent_type="investigation",
        model=MODEL,
        steps=steps,
        verdict=verdict,
        total_tokens=total_tokens,
        total_cost_usd=_estimate_cost(total_tokens),
        started_at=started_at,
        completed_at=completed_at,
    )

    if not trace.validate_evidence_integrity():
        print(f"  [WARN] Evidence integrity check failed for {candidate['id']} — marking corrupt")
        trace.verdict.evidence_chain = []

    return trace


def _parse_verdict(text: str, steps: list[TraceStep], fallback_confidence: float) -> AgentVerdict:
    """Extract final verdict JSON from model's text response."""
    try:
        start = text.rfind("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            return AgentVerdict(
                final_verdict=data.get("final_verdict", "inconclusive"),
                final_confidence=float(data.get("final_confidence", fallback_confidence)),
                final_breakdown=FinalBreakdown(**data.get("final_breakdown", {})),
                evidence_chain=[EvidenceItem(**e) for e in data.get("evidence_chain", [])],
            )
    except Exception:
        pass
    return AgentVerdict(
        final_verdict="inconclusive",
        final_confidence=fallback_confidence,
        final_breakdown=FinalBreakdown(),
        evidence_chain=[],
    )


def _extract_why(text_block, step_idx: int) -> str:
    if text_block and text_block.text:
        lines = [l.strip() for l in text_block.text.strip().splitlines() if l.strip()]
        return lines[0][:200] if lines else f"Korak {step_idx + 1}"
    return f"Korak {step_idx + 1}"


def _update_confidence(current: float, tool_name: str, tool_input: dict, tool_output: dict) -> float:
    """Heuristic confidence update based on tool output."""
    delta = 0.0
    if tool_name == "search_htz_registry":
        count = tool_output.get("count", 0)
        if count == 0:
            delta = -0.35
        elif count == 1:
            delta = 0.05  # Promising — one candidate
        # More candidates = more ambiguous, no delta
    elif tool_name == "get_htz_listing":
        # Signal: listing found
        if tool_output.get("found"):
            delta = 0.05
    elif tool_name == "phash_compare":
        if tool_output.get("is_match"):
            delta = 0.25
        elif tool_output.get("min_hamming") is not None:
            delta = -0.05
    elif tool_name == "search_sudski_registar":
        if tool_output.get("found"):
            delta = -0.1  # Company host is a flag (business ≠ private person in HTZ)
    return max(0.0, min(1.0, current + delta))


def _estimate_cost(tokens: int) -> float:
    # Claude Haiku 4.5: ~$0.25/M input, $1.25/M output — rough estimate
    return round(tokens * 0.00000075, 6)
