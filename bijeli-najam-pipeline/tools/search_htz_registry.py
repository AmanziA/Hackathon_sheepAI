from __future__ import annotations
from dataclasses import dataclass
from supabase import Client
from rapidfuzz import fuzz
from tools.normalize_croatian import normalize_croatian


@dataclass
class HtzCandidate:
    id: str
    name: str
    address: str | None
    street: str | None
    number: str | None
    neighborhood: str | None
    owner: str | None
    beds: int | None
    category: str | None
    stars: int | None
    lat: float | None
    lon: float | None


def _norm(s: str | None) -> str:
    return normalize_croatian(s or "")


def search_htz_registry(
    street: str | None = None,
    house_number: str | None = None,
    owner_name: str | None = None,
    host_first_name: str | None = None,
    beds: int | None = None,
    supabase: Client = None,
    # Accepted but ignored — HTZ rows have neighborhood populated only ~10% of
    # the time and address is always NULL. Kept so older agent calls still work.
    neighborhood: str | None = None,  # noqa: ARG001
    address: str | None = None,       # noqa: ARG001
) -> list[HtzCandidate]:
    """Search Supabase `registered_units` (Split) by reliable fields only.

    Coverage of registered_units (audited on the live seed of 263 rows):
        street: 100%, number: 100%, owner: 100%, beds: 100%, stars: 70%
        neighborhood: 10%, address: 0%

    So matching IS street + number first, with owner and beds as discriminators.
    Anything else is unreliable on this seed.

    At least one of `street`, `owner_name`, `host_first_name` must be set —
    without any of them this returns [] to avoid scanning the whole table.
    """
    if not any([street, owner_name, host_first_name]):
        return []

    query = supabase.table("registered_units").select(
        "id, name, address, street, number, neighborhood, owner, beds, category, stars, lat, lon"
    ).eq("city", "Split")
    rows = (query.execute().data) or []

    norm_street = _norm(street) if street else None
    norm_number = (house_number or "").strip().lower() if house_number else None
    norm_owner = _norm(owner_name) if owner_name else None
    norm_first = _norm(host_first_name) if host_first_name else None

    scored: list[tuple[int, dict]] = []
    for row in rows:
        score = 0

        if norm_street:
            row_street = _norm(row.get("street"))
            street_score = fuzz.partial_ratio(norm_street, row_street) if row_street else 0
            if street_score < 80:
                continue
            score += street_score
            if norm_number:
                row_num = (row.get("number") or "").strip().lower()
                if not row_num:
                    pass
                elif row_num == norm_number:
                    score += 100  # exact street + number = jackpot
                elif norm_number in row_num or row_num in norm_number:
                    score += 60
                else:
                    # Different number on the same street is a different unit;
                    # keep but penalize so it sorts below exact matches.
                    score -= 20

        if norm_owner:
            row_owner = _norm(row.get("owner"))
            owner_score = fuzz.partial_ratio(norm_owner, row_owner) if row_owner else 0
            if owner_score >= 75:
                score += owner_score
            elif not norm_street:
                # Owner was the only criterion and it didn't match → drop.
                continue

        if norm_first:
            owner = row.get("owner") or ""
            owner_first = _norm(owner.split()[0]) if owner else ""
            if owner_first and fuzz.ratio(norm_first, owner_first) >= 70:
                score += 60

        if beds is not None:
            row_beds = row.get("beds")
            if row_beds is None:
                pass
            elif row_beds == beds:
                score += 40
            elif abs(row_beds - beds) == 1:
                score += 15
            elif norm_street:
                # Different bed count but same street → still keep as candidate;
                # listings often differ by ±a sofa-bed.
                score -= 10
            else:
                # No street pinned it down, beds mismatch → drop.
                continue

        if score > 0:
            scored.append((score, row))

    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[:10]

    return [
        HtzCandidate(
            id=r["id"],
            name=r["name"],
            address=r.get("address"),
            street=r.get("street"),
            number=r.get("number"),
            neighborhood=r.get("neighborhood"),
            owner=r.get("owner"),
            beds=r.get("beds"),
            category=r.get("category"),
            stars=r.get("stars"),
            lat=r.get("lat"),
            lon=r.get("lon"),
        )
        for _, r in top
    ]
