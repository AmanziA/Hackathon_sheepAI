"""
Seeds exactly one mock monitoring_deltas row for the demo pitch.
Also pins the top 6 flagged listings as money-shot listings by adding a note.

Run AFTER matching_stage.py has populated flags.

Usage:
    python seed_demo.py
"""
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def seed():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Pick the top flagged candidate for the mock delta
    top_flags = (
        supabase.table("flags")
        .select("id, candidate_id, confidence_unregistered, candidate_listings(title, host_name, beds, neighborhood)")
        .eq("status", "open")
        .order("confidence_unregistered", desc=True)
        .limit(10)
        .execute()
    )

    if not top_flags.data:
        print("No flags found. Run matching_stage.py first.")
        return

    # Choose one that has a host_name and beds for a compelling delta
    target = None
    for flag in top_flags.data:
        listing = flag.get("candidate_listings") or {}
        if listing.get("host_name") and listing.get("beds"):
            target = flag
            break
    if not target:
        target = top_flags.data[0]

    candidate_id = target["candidate_id"]
    listing = target.get("candidate_listings") or {}
    original_host = listing.get("host_name", "Marko")
    original_beds = listing.get("beds", 4)
    first_name = original_host.split()[0] if original_host else "Marko"

    # 2. Insert mock monitoring delta
    delta_row = {
        "id": str(uuid.uuid4()),
        "candidate_id": candidate_id,
        "delta_type": "host_changed",
        "before_value": {
            "host_name": first_name,
            "beds": original_beds,
        },
        "after_value": {
            "host_name": f"Apartments {first_name} d.o.o.",
            "beds": original_beds + 4,
        },
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "triage_verdict": "reinvestigate",
        "triage_reason": (
            f"Domaćin promijenjen iz '{first_name}' u 'Apartments {first_name} d.o.o.' "
            f"i broj kreveta povećan s {original_beds} na {original_beds + 4}. "
            "Identitetska promjena — preporučuje se ponovna istraga."
        ),
        "is_mock": True,
    }
    supabase.table("monitoring_deltas").insert(delta_row).execute()
    print(f"✓ Mock delta inserted for candidate {candidate_id}")
    print(f"  Before: host={first_name}, beds={original_beds}")
    print(f"  After:  host=Apartments {first_name} d.o.o., beds={original_beds + 4}")

    # 3. Pin top 6 flags as money-shot listings
    money_shots = top_flags.data[:6]
    for i, flag in enumerate(money_shots):
        supabase.table("flags").update({
            "notes": f"MONEY_SHOT_{i+1}",
        }).eq("id", flag["id"]).execute()
        title = (flag.get("candidate_listings") or {}).get("title", flag["id"])
        print(f"✓ Pinned money-shot {i+1}: {title[:60]}")

    print("\nSeed complete. Demo is ready.")


if __name__ == "__main__":
    seed()
