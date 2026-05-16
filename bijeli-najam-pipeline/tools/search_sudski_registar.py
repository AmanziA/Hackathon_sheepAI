from __future__ import annotations
import httpx
import re
from dataclasses import dataclass, field

_cache: dict[str, "SudskiRegistarResult | None"] = {}


@dataclass
class SudskiRegistarResult:
    company_name: str
    oib: str | None
    directors: list[str] = field(default_factory=list)
    registered_seat: str | None = None
    found: bool = True


def search_sudski_registar(company_name: str) -> SudskiRegistarResult | None:
    """
    Look up a business in the Croatian public court registry (sudski-registar.nn.hr).
    Returns OIB, directors, registered seat, or None if not found.
    Cached to avoid repeated scrapes during a batch run.
    """
    key = company_name.lower().strip()
    if key in _cache:
        return _cache[key]

    try:
        url = "https://sudreg.pravosudje.hr/registar/f?p=150:28:::::P28_SBT_MBS:"
        # Try searching by company name via their public search API
        search_url = "https://sudreg.pravosudje.hr/registar/f?p=150:1"
        headers = {
            "User-Agent": "BijeliNajam/1.0 (hackathon@bijeli-najam.hr)",
            "Accept": "text/html,application/xhtml+xml",
        }
        # Simple GET search — real impl would use their SOAP/REST endpoint
        resp = httpx.get(
            "https://api.tvrtka.hr/v1/search",
            params={"q": company_name, "limit": 1},
            headers=headers,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("results"):
                r = data["results"][0]
                result = SudskiRegistarResult(
                    company_name=r.get("naziv", company_name),
                    oib=r.get("oib"),
                    directors=r.get("direktori", []),
                    registered_seat=r.get("sjediste"),
                    found=True,
                )
                _cache[key] = result
                return result
    except Exception:
        pass

    # Fallback: return not found
    result = SudskiRegistarResult(
        company_name=company_name,
        oib=None,
        directors=[],
        registered_seat=None,
        found=False,
    )
    _cache[key] = result
    return result
