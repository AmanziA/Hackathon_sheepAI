from __future__ import annotations
from dataclasses import dataclass
from supabase import Client


@dataclass
class HtzListing:
    id: str
    name: str
    address: str | None
    street: str | None
    number: str | None
    neighborhood: str | None
    city: str
    owner: str | None
    stars: int | None
    beds: int | None
    category: str | None
    tourist_board: str | None
    url: str | None
    lat: float | None
    lon: float | None


def get_htz_listing(registered_id: str, supabase: Client) -> HtzListing | None:
    """Fetch full row from registered_units by id."""
    result = supabase.table("registered_units").select("*").eq("id", registered_id).single().execute()
    if not result.data:
        return None
    r = result.data
    return HtzListing(
        id=r["id"],
        name=r["name"],
        address=r.get("address"),
        street=r.get("street"),
        number=r.get("number"),
        neighborhood=r.get("neighborhood"),
        city=r.get("city", "Split"),
        owner=r.get("owner"),
        stars=r.get("stars"),
        beds=r.get("beds"),
        category=r.get("category"),
        tourist_board=r.get("tourist_board"),
        url=r.get("url"),
        lat=r.get("lat"),
        lon=r.get("lon"),
    )
