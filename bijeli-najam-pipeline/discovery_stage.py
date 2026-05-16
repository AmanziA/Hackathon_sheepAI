from __future__ import annotations
"""
Discovery stage CLI — run the discovery agent on registered units.

Usage:
    python -m discovery_stage --registered-id <uuid>
    python -m discovery_stage --neighborhood Bačvice --limit 5
    python -m discovery_stage --all --rate-limit 1.0
"""
import argparse
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv()

from supabase import create_client, Client  # noqa: E402

from agents.discovery import investigate, persist_discovery_trace  # noqa: E402

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def run(registered_id: str | None, neighborhood: str | None, limit: int | None, run_all: bool, rate_limit: float):
    supabase = get_supabase()
    query = supabase.table("registered_units").select("*")
    if registered_id:
        query = query.eq("id", registered_id)
    elif neighborhood:
        query = query.ilike("neighborhood", f"%{neighborhood}%")
    elif not run_all:
        print("Specify --registered-id, --neighborhood, or --all", file=sys.stderr)
        sys.exit(2)

    if limit:
        query = query.limit(limit)

    units = (query.execute().data) or []
    if not units:
        print("No units matched the query.", file=sys.stderr)
        sys.exit(1)

    print(f"Discovering listings for {len(units)} registered unit(s)...")
    ok = err = 0
    for i, unit in enumerate(units, 1):
        label = unit.get("name") or unit.get("id")
        print(f"  [{i}/{len(units)}] {label}")
        try:
            trace, matches = investigate(unit, supabase)
            summary = persist_discovery_trace(trace, matches, unit, supabase)
            print(
                f"    → {summary['verdict']} · {summary['match_count']} match(es) · "
                f"trace={summary['trace_id'][:8]}"
            )
            ok += 1
        except Exception as exc:  # noqa: BLE001
            print(f"    ERROR: {type(exc).__name__}: {exc}")
            err += 1
        if rate_limit > 0 and i < len(units):
            time.sleep(rate_limit)

    print(f"\nDone. {ok} succeeded, {err} failed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--registered-id", type=str, default=None)
    parser.add_argument("--neighborhood", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--rate-limit", type=float, default=1.0, help="Seconds between calls")
    args = parser.parse_args()
    run(args.registered_id, args.neighborhood, args.limit, args.all, args.rate_limit)
