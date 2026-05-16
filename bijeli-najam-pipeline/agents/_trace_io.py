from __future__ import annotations
"""
Shared persistence helpers for both discovery and investigation agents.

Both write to the same agent_traces / trace_steps tables with the same shell
pattern: insert a 'running' shell at the start, append steps live as they
happen, then update the shell with the final verdict at the end.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from supabase import Client

from agents.trace_schema import TraceStep


def create_running_trace(
    *,
    supabase: Client,
    agent_type: str,
    model: str,
    registered_id: str | None = None,
    candidate_id: str | None = None,
) -> str:
    """Insert an agent_traces shell in 'running' state and return its id.

    Exactly one of registered_id / candidate_id is expected to be set for the
    direction (registered=discovery, candidate=investigation), but both are
    technically allowed by the schema.
    """
    trace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("agent_traces").insert(
        {
            "id": trace_id,
            "registered_id": registered_id,
            "candidate_id": candidate_id,
            "agent_type": agent_type,
            "model": model,
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


def write_step_live(trace_id: str, step: TraceStep, supabase: Client) -> None:
    """Persist one trace_steps row and bump the parent's step_count."""
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
    supabase.table("agent_traces").update({"step_count": step.step_index + 1}).eq(
        "id", trace_id
    ).execute()


def mark_trace_error(trace_id: str, error_message: str, supabase: Client) -> None:
    """Mark a running trace as errored so the UI stops polling."""
    supabase.table("agent_traces").update(
        {
            "final_verdict": "error",
            "final_confidence": 0.0,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "evidence_chain": [
                {"step_index": -1, "fact": error_message, "tool_called": "system"}
            ],
        }
    ).eq("id", trace_id).execute()


def synthesized_evidence_chain(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build a fallback evidence_chain from recorded matches if the model didn't.

    Used by both agents when their `final_verdict` JSON omitted evidence_chain.
    """
    return [
        {
            "step_index": m.get("_step_index", 0),
            "fact": (
                f"{(m.get('platform') or 'oglas').upper()}: "
                f"{m.get('title') or m.get('name') or 'pronađen'}"
                + (f" — host: {m['host_name']}" if m.get("host_name") else "")
                + (f" — kreveti: {m['beds']}" if m.get("beds") else "")
                + f" — pouzdanost {int(float(m.get('confidence') or 0) * 100)}%"
                + (f" — {m['notes']}" if m.get("notes") else "")
            ),
            "tool_called": m.get("_tool_called", "record_match"),
        }
        for m in sorted(matches, key=lambda x: float(x.get("confidence") or 0), reverse=True)
    ]
