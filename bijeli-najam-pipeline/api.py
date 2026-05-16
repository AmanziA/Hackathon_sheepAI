from __future__ import annotations
"""
FastAPI wrapper around the discovery & investigation agents.

Start with:
    uvicorn api:app --reload --port 8001

The Next.js dashboard proxies to this service via /api/discover and /api/investigate.
"""
import asyncio
import os

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


app = FastAPI(title="Bijeli Najam pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


def _run_discovery_job(unit: dict, trace_id: str) -> None:
    """Background worker — runs the agent and finalizes the trace row."""
    from agents.discovery import investigate, persist_discovery_trace

    supabase = get_supabase()
    try:
        trace, matches = investigate(unit, supabase, trace_id=trace_id)
        persist_discovery_trace(trace, matches, unit, supabase, live=True)
    except Exception as exc:  # noqa: BLE001
        # Mark the shell trace as failed so the UI doesn't poll forever.
        supabase.table("agent_traces").update(
            {
                "final_verdict": "error",
                "final_confidence": 0.0,
                "completed_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                "evidence_chain": [{"step_index": -1, "fact": f"{type(exc).__name__}: {exc}", "tool_called": "system"}],
            }
        ).eq("id", trace_id).execute()


@app.post("/discover/{registered_id}")
def discover(registered_id: str, background_tasks: BackgroundTasks):
    """Kick off a discovery run on one registered unit.

    Inserts a 'running' agent_traces shell row and returns its id immediately.
    The agent runs in a background task and writes trace_steps incrementally,
    so the UI can poll for live progress.
    """
    from agents.discovery import create_running_trace

    supabase = get_supabase()
    result = (
        supabase.table("registered_units")
        .select("*")
        .eq("id", registered_id)
        .single()
        .execute()
    )
    unit = result.data
    if not unit:
        raise HTTPException(status_code=404, detail="registered_unit not found")

    trace_id = create_running_trace(unit, supabase)
    background_tasks.add_task(_run_discovery_job, unit, trace_id)
    return {
        "trace_id": trace_id,
        "registered_id": registered_id,
        "status": "running",
    }


@app.post("/investigate/{candidate_id}")
def investigate_candidate(candidate_id: str):
    """Re-run the existing investigation agent on a single candidate listing."""
    from agents.investigation import investigate as run_investigation
    from matching_stage import persist_trace

    supabase = get_supabase()
    result = (
        supabase.table("candidate_listings")
        .select("*")
        .eq("id", candidate_id)
        .single()
        .execute()
    )
    candidate = result.data
    if not candidate:
        raise HTTPException(status_code=404, detail="candidate_listing not found")

    trace = asyncio.run(run_investigation(candidate, supabase))
    asyncio.run(persist_trace(trace, candidate, supabase))
    return {
        "trace_id": trace.id,
        "candidate_id": candidate_id,
        "verdict": trace.verdict.final_verdict,
        "confidence": float(trace.verdict.final_confidence),
    }
