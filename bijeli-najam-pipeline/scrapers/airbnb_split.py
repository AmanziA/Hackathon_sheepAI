"""
Airbnb scraper for Split listings using Playwright.
Writes to candidate_listings in Supabase.

Usage:
    python -m scrapers.airbnb_split [--limit N]
"""
import asyncio
import json
import random
import time
import uuid
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from playwright.async_api import async_playwright, Page
from supabase import create_client

from tools.phash_compare import compute_phash

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Split bounding box
SPLIT_BBOX = {
    "ne_lat": 43.5550,
    "ne_lng": 16.5100,
    "sw_lat": 43.4700,
    "sw_lng": 16.3800,
}

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

SPLIT_NEIGHBORHOODS = [
    "Veli Varoš", "Mali Varoš", "Bačvice", "Spinut", "Žnjan", "Firule",
    "Sućidar", "Trstenik", "Lovret", "Meje", "Kman", "Mejaši",
    "Plokite", "Grad", "Kopilica",
]


def infer_neighborhood(text: str) -> str | None:
    if not text:
        return None
    tl = text.lower()
    for nb in SPLIT_NEIGHBORHOODS:
        if nb.lower() in tl:
            return nb
    return None


async def scrape_airbnb(limit: int | None = None):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    inserted = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        search_url = (
            f"https://www.airbnb.com/s/Split--Croatia/homes"
            f"?ne_lat={SPLIT_BBOX['ne_lat']}&ne_lng={SPLIT_BBOX['ne_lng']}"
            f"&sw_lat={SPLIT_BBOX['sw_lat']}&sw_lng={SPLIT_BBOX['sw_lng']}"
            f"&zoom_level=13&place_id=ChIJa6N8l8GLbUcRlpYM62LnFDM"
        )

        page_num = 1
        cursor = None

        while True:
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={"width": 1440, "height": 900},
                locale="hr-HR",
            )
            page = await context.new_page()

            url = search_url
            if cursor:
                url += f"&cursor={cursor}"

            print(f"  Airbnb page {page_num}: {url[:80]}...")

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000 + random.randint(0, 1000))
            except Exception as e:
                print(f"  Navigation error: {e}")
                await context.close()
                break

            # Extract listing cards
            listings = await extract_listings_from_page(page)
            print(f"  Found {len(listings)} listings")

            if not listings:
                await context.close()
                break

            for listing in listings:
                if limit and inserted >= limit:
                    break
                row = await enrich_listing(page, listing, context)
                if row:
                    supabase.table("candidate_listings").upsert(
                        row, on_conflict="platform,external_id"
                    ).execute()
                    inserted += 1
                    print(f"    [{inserted}] {row.get('title', '')[:60]}")

            if limit and inserted >= limit:
                await context.close()
                break

            # Find next page cursor
            cursor = await get_next_cursor(page)
            await context.close()

            if not cursor:
                break

            page_num += 1
            await asyncio.sleep(2 + random.uniform(0, 1))

        await browser.close()

    print(f"Airbnb scraper done. Inserted/updated {inserted} rows.")


async def extract_listings_from_page(page: Page) -> list[dict]:
    """Extract listing cards from the search results page."""
    try:
        # Airbnb search results — listing cards
        cards = await page.query_selector_all('[data-testid="listing-card-wrapper"], [itemprop="itemListElement"]')

        listings = []
        for card in cards:
            try:
                link_el = await card.query_selector("a[href*='/rooms/']")
                if not link_el:
                    continue
                href = await link_el.get_attribute("href")
                if not href:
                    continue

                external_id = href.split("/rooms/")[-1].split("?")[0].split("/")[0]

                title_el = await card.query_selector('[data-testid="listing-card-title"], div[id*="title"]')
                title = await title_el.inner_text() if title_el else "Airbnb listing"

                subtitle_el = await card.query_selector('[data-testid="listing-card-subtitle"]')
                subtitle = await subtitle_el.inner_text() if subtitle_el else ""

                price_el = await card.query_selector('[data-testid="price-availability-row"] span, ._1jo4hgw')
                price_text = await price_el.inner_text() if price_el else ""

                listings.append({
                    "external_id": external_id,
                    "href": "https://www.airbnb.com" + href if href.startswith("/") else href,
                    "title": title.strip(),
                    "subtitle": subtitle.strip(),
                    "price_text": price_text.strip(),
                })
            except Exception:
                continue
        return listings
    except Exception as e:
        print(f"  extract_listings error: {e}")
        return []


async def enrich_listing(page: Page, listing: dict, context) -> dict | None:
    """Open the listing page to get photos, host, beds."""
    try:
        listing_page = await context.new_page()
        await listing_page.goto(listing["href"], wait_until="networkidle", timeout=30000)
        await listing_page.wait_for_timeout(1500)

        # Host name
        host_el = await listing_page.query_selector('[data-testid="host-profile-name"], ._14i3z6h')
        host_name = (await host_el.inner_text()).strip() if host_el else None

        # Beds
        beds = None
        detail_els = await listing_page.query_selector_all('[data-testid="amenity-row"] span, ._kqh46o li')
        for el in detail_els:
            text = (await el.inner_text()).lower()
            if "bed" in text or "krevet" in text:
                for token in text.split():
                    try:
                        beds = int(token)
                        break
                    except ValueError:
                        continue
                if beds:
                    break

        # Photos (first 3)
        photo_els = await listing_page.query_selector_all('img[src*="a0.muscache.com"], picture img')
        photos = []
        for img in photo_els[:3]:
            src = await img.get_attribute("src")
            if src and "a0.muscache.com" in src:
                phash = compute_phash(src)
                photos.append({"url": src, "phash": phash or ""})

        # Neighborhood from breadcrumb or title
        neighborhood = infer_neighborhood(listing["title"] + " " + listing["subtitle"])

        price = _parse_price(listing["price_text"])

        await listing_page.close()
        await asyncio.sleep(1 + random.uniform(0, 0.5))

        return {
            "id": str(uuid.uuid4()),
            "platform": "airbnb",
            "external_id": listing["external_id"],
            "title": listing["title"],
            "host_name": host_name,
            "neighborhood": neighborhood,
            "city": "Split",
            "approx_lat": None,
            "approx_lon": None,
            "url": listing["href"],
            "price_per_night": price,
            "beds": beds,
            "guests": None,
            "photos": photos,
        }
    except Exception as e:
        print(f"  enrich_listing error: {e}")
        return None


async def get_next_cursor(page: Page) -> str | None:
    try:
        next_btn = await page.query_selector('[aria-label="Next"], [data-testid="pagination-next"]')
        if not next_btn:
            return None
        is_disabled = await next_btn.get_attribute("disabled")
        if is_disabled:
            return None
        # Extract cursor from next page URL
        url = page.url
        # Simplified: just return page indicator
        return "next"
    except Exception:
        return None


def _parse_price(text: str) -> float | None:
    import re
    numbers = re.findall(r"[\d,]+", text.replace(".", "").replace(",", ""))
    for n in numbers:
        try:
            val = float(n.replace(",", ""))
            if 10 < val < 10000:
                return val
        except ValueError:
            continue
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(scrape_airbnb(limit=args.limit))
