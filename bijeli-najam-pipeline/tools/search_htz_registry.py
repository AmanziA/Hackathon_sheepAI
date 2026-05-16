from __future__ import annotations
from dataclasses import dataclass
from supabase import Client
from rapidfuzz import fuzz
from tools.normalize_croatian import normalize_croatian, normalize_kvart


@dataclass
class HtzCandidate:
    id: str
    name: str
    address: str | None
    neighborhood: str | None
    owner: str | None
    beds: int | None
    category: str | None
    lat: float | None
    lon: float | None


def search_htz_registry(
    neighborhood: str,
    host_first_name: str | None = None,
    beds: int | None = None,
    supabase: Client = None,
) -> list[HtzCandidate]:
    """
    Narrow registered_units to a kvart, optionally filter by host first name (fuzzy)
    and bed count (exact). Returns 0-N candidates.
    """
    canonical_kvart = normalize_kvart(neighborhood)
    norm_kvart = normalize_croatian(canonical_kvart)

    query = supabase.table("registered_units").select(
        "id, name, address, neighborhood, owner, beds, category, lat, lon"
    ).eq("city", "Split")

    result = query.execute()
    rows = result.data or []

    # Filter by neighborhood (fuzzy to handle alias mismatches)
    filtered = []
    for row in rows:
        nb = row.get("neighborhood") or ""
        nb_norm = normalize_croatian(nb)
        if fuzz.partial_ratio(norm_kvart, nb_norm) >= 70:
            filtered.append(row)

    # Filter by bed count (exact match, allow ±1 for registration edge cases)
    if beds is not None:
        filtered = [r for r in filtered if r.get("beds") is None or abs((r.get("beds") or 0) - beds) <= 1]

    # Filter by host first name (fuzzy match on first token of owner field)
    if host_first_name:
        norm_first = normalize_croatian(host_first_name)
        def name_score(row: dict) -> int:
            owner = row.get("owner") or ""
            owner_first = normalize_croatian(owner.split()[0]) if owner else ""
            return fuzz.ratio(norm_first, owner_first)
        filtered = [r for r in filtered if name_score(r) >= 60]

    return [
        HtzCandidate(
            id=r["id"],
            name=r["name"],
            address=r.get("address"),
            neighborhood=r.get("neighborhood"),
            owner=r.get("owner"),
            beds=r.get("beds"),
            category=r.get("category"),
            lat=r.get("lat"),
            lon=r.get("lon"),
        )
        for r in filtered
    ]
