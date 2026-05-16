"""
Scraper for accommodation.croatia.hr — official HTZ registry.
Writes to registered_units in Supabase.

Usage:
    python -m scrapers.htz_registered
"""
import asyncio
import time
import uuid
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv()

from supabase import create_client
from tools.geocode import geocode
from tools.normalize_croatian import normalize_kvart

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BASE_URL = "https://accommodation.croatia.hr"
PATHS = [
    "/en-gb/private-rooms/split/",
    "/en-gb/apartments/split/",
    "/en-gb/holiday-houses/split/",
    "/en-gb/studios/split/",
]
THROTTLE = 1.2  # seconds between requests
USER_AGENT = "BijeliNajam/1.0 (hackathon@bijeli-najam.hr)"

SPLIT_NEIGHBORHOODS = [
    "Veli Varoš", "Mali Varoš", "Bačvice", "Spinut", "Žnjan", "Firule",
    "Sućidar", "Trstenik", "Lovret", "Meje", "Kman", "Mejaši",
    "Plokite", "Ravne njive", "Grad", "Kopilica", "Bol", "Neslanovac",
]


def infer_neighborhood(address: str) -> str | None:
    if not address:
        return None
    addr_lower = address.lower()
    for nb in SPLIT_NEIGHBORHOODS:
        if nb.lower() in addr_lower:
            return nb
    return None


async def scrape_htz():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    headers = {"User-Agent": USER_AGENT}
    inserted = 0

    async with httpx.AsyncClient(headers=headers, timeout=20, follow_redirects=True) as client:
        for path in PATHS:
            page = 1
            while True:
                url = urljoin(BASE_URL, path) + f"?page={page}"
                print(f"  Fetching {url}")
                try:
                    resp = await client.get(url)
                except Exception as e:
                    print(f"  Error: {e}")
                    break

                if resp.status_code != 200:
                    break

                soup = BeautifulSoup(resp.text, "html.parser")
                listings = soup.select(".accommodation-unit, .listing-item, article.unit")

                if not listings:
                    # Try generic card selectors
                    listings = soup.select("[class*='unit'], [class*='listing'], [class*='apartment']")

                if not listings:
                    print(f"  No listings found on page {page}, stopping.")
                    break

                for item in listings:
                    row = parse_listing(item, path)
                    if not row:
                        continue

                    # Geocode if no lat/lon
                    if not row.get("lat") and row.get("address"):
                        geo = geocode(row["address"])
                        if geo:
                            row["lat"] = geo.lat
                            row["lon"] = geo.lon

                    supabase.table("registered_units").upsert(row, on_conflict="url").execute()
                    inserted += 1

                page += 1
                time.sleep(THROTTLE)

                # Safety cap
                if page > 50:
                    break

    print(f"HTZ scraper done. Inserted/updated {inserted} rows.")


def parse_listing(item, path: str) -> dict | None:
    """Parse a single listing card from the HTZ website."""
    try:
        name_el = item.select_one("h2, h3, .unit-name, .title")
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            return None

        link_el = item.select_one("a[href]")
        url = urljoin(BASE_URL, link_el["href"]) if link_el else None

        address_el = item.select_one(".address, .location, [class*='address']")
        address = address_el.get_text(strip=True) if address_el else None

        beds_el = item.select_one("[class*='bed'], [class*='capacity']")
        beds_text = beds_el.get_text(strip=True) if beds_el else ""
        beds = None
        for token in beds_text.split():
            try:
                beds = int(token)
                break
            except ValueError:
                continue

        owner_el = item.select_one(".owner, .host, [class*='owner']")
        owner = owner_el.get_text(strip=True) if owner_el else None

        stars_el = item.select_one("[class*='star'], [class*='category']")
        stars = None
        if stars_el:
            try:
                stars = int(stars_el.get_text(strip=True)[0])
            except Exception:
                pass

        category = "Apartman"
        if "room" in path or "soba" in path:
            category = "Soba"
        elif "house" in path or "kuca" in path:
            category = "Kuća za odmor"
        elif "studio" in path:
            category = "Studio apartman"

        neighborhood = infer_neighborhood(address or "")

        return {
            "id": str(uuid.uuid4()),
            "source": "accommodation.croatia.hr",
            "name": name,
            "address": address,
            "neighborhood": neighborhood,
            "city": "Split",
            "owner": owner,
            "stars": stars,
            "beds": beds,
            "category": category,
            "url": url,
            "lat": None,
            "lon": None,
            "raw_address": address,
        }
    except Exception as e:
        print(f"  Parse error: {e}")
        return None


if __name__ == "__main__":
    asyncio.run(scrape_htz())
