from __future__ import annotations
"""
Stage 1 — Matching: batch-run the investigation agent on all candidate_listings.
Persists entity_links, agent_traces, trace_steps, and flags to Supabase.

Usage:
    python matching_stage.py [--limit N] [--neighborhood KVART]
"""
import argparse
import asyncio
import sys
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
import os

load_dotenv()

from supabase import create_client, Client
from agents.investigation import investigate

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CONFIDENCE_THRESHOLD_FLAG = 0.2    # ≤ this → flagged
CONFIDENCE_THRESHOLD_CLEAR = 0.8   # ≥ this → clear


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def run_matching(limit: int | None = None, neighborhood: str | None = None):
    supabase = get_supabase()

    query = supabase.table("candidate_listings").select("*").eq("city", "Split")
    if neighborhood:
        query = query.ilike("neighborhood", f"%{neighborhood}%")
    if limit:
        query = query.limit(limit)

    result = query.execute()
    candidates = result.data or []
    print(f"Processing {len(candidates)} candidates...")

    success = 0
    errors = 0

    for i, candidate in enumerate(candidates):
        cid = candidate["id"]
        print(f"  [{i+1}/{len(candidates)}] {candidate.get('title', cid)[:60]}")

        try:
            trace = await investigate(candidate, supabase)
            await persist_trace(trace, candidate, supabase)
            success += 1
        except Exception as e:
            print(f"    ERROR: {e}")
            errors += 1
            continue

        # Small delay to avoid API rate limits
        await asyncio.sleep(0.5)

    print(f"\nDone. {success} succeeded, {errors} failed.")


async def persist_trace(trace, candidate: dict, supabase: Client):
    """Write trace + entity_link + flag to Supabase."""
    cid = candidate["id"]

    # 1. Upsert agent_trace
    trace_row = {
        "id": trace.id,
        "candidate_id": cid,
        "agent_type": trace.agent_type,
        "model": trace.model,
        "step_count": len(trace.steps),
        "final_verdict": trace.verdict.final_verdict,
        "final_confidence": trace.verdict.final_confidence,
        "final_breakdown": trace.verdict.final_breakdown.model_dump(),
        "evidence_chain": [e.model_dump() for e in trace.verdict.evidence_chain],
        "total_tokens": trace.total_tokens,
        "total_cost_usd": float(trace.total_cost_usd),
        "started_at": trace.started_at.isoformat(),
        "completed_at": trace.completed_at.isoformat(),
    }
    supabase.table("agent_traces").upsert(trace_row, on_conflict="id").execute()

    # 2. Upsert trace_steps
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
        # Delete old steps for this trace first
        supabase.table("trace_steps").delete().eq("trace_id", trace.id).execute()
        supabase.table("trace_steps").insert(step_rows).execute()

    # 3. Upsert entity_link
    verdict = trace.verdict
    signals = verdict.final_breakdown.model_dump()
    link_row = {
        "id": str(uuid.uuid4()),
        "candidate_id": cid,
        "registered_id": None,  # TODO: extract from evidence if matched
        "verdict": _map_verdict(verdict.final_verdict),
        "confidence": float(verdict.final_confidence),
        "match_signals": {
            k: {"fired": v > 0, "score": v, "evidence": ""}
            for k, v in signals.items()
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

    # 4. Upsert flag (only if unmatched/flagged)
    if verdict.final_verdict == "flagged":
        confidence_unregistered = 1.0 - verdict.final_confidence
        flag_row = {
            "id": str(uuid.uuid4()),
            "candidate_id": cid,
            "entity_link_id": link_row["id"],
            "trace_id": trace.id,
            "confidence_unregistered": float(confidence_unregistered),
            "status": "open",
        }
        supabase.table("flags").upsert(flag_row, on_conflict="candidate_id").execute()
        print(f"    → FLAGGED (confidence_unregistered={confidence_unregistered:.2f})")
    elif verdict.final_verdict == "clear":
        print(f"    → CLEAR (confidence={verdict.final_confidence:.2f})")
    else:
        print(f"    → INCONCLUSIVE (confidence={verdict.final_confidence:.2f})")


def _map_verdict(v: str) -> str:
    return {"flagged": "unmatched", "clear": "matched", "inconclusive": "inconclusive"}.get(v, "inconclusive")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--neighborhood", type=str, default=None)
    args = parser.parse_args()
    asyncio.run(run_matching(limit=args.limit, neighborhood=args.neighborhood))
