from __future__ import annotations
import time
import httpx
from dataclasses import dataclass

_cache: dict[str, tuple[float, float] | None] = {}
_last_request = 0.0
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "BijeliNajam/1.0 (hackathon@bijeli-najam.hr)"


@dataclass
class GeocodeResult:
    lat: float
    lon: float
    display_name: str


def geocode(address_fragment: str) -> GeocodeResult | None:
    """Nominatim lookup. Throttled to 1 req/sec."""
    global _last_request
    query = f"{address_fragment}, Split, Croatia"
    if query in _cache:
        result = _cache[query]
        return GeocodeResult(lat=result[0], lon=result[1], display_name=query) if result else None

    elapsed = time.time() - _last_request
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)

    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "hr"},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        _last_request = time.time()
        data = resp.json()
        if not data:
            _cache[query] = None
            return None
        r = data[0]
        lat, lon = float(r["lat"]), float(r["lon"])
        _cache[query] = (lat, lon)
        return GeocodeResult(lat=lat, lon=lon, display_name=r.get("display_name", query))
    except Exception:
        _last_request = time.time()
        return None
