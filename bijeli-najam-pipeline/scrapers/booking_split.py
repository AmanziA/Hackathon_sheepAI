"""
Booking.com scraper for Split listings using Playwright.
Writes to candidate_listings in Supabase.

Usage:
    python -m scrapers.booking_split [--limit N]
"""
import asyncio
import random
import re
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

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

BOOKING_URL = (
    "https://www.booking.com/searchresults.hr.html"
    "?ss=Split%2C+Splitsko-dalmatinska%2C+Hrvatska"
    "&dest_type=city&dest_id=-97068"
    "&group_adults=2&no_rooms=1&group_children=0"
    "&nflt=ht_id%3D220"  # private apartments
)

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


async def scrape_booking(limit: int | None = None):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    inserted = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        offset = 0

        while True:
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={"width": 1440, "height": 900},
                locale="hr-HR",
            )
            page = await context.new_page()
            url = BOOKING_URL + f"&offset={offset}"
            print(f"  Booking.com offset={offset}")

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)
            except Exception as e:
                print(f"  Navigation error: {e}")
                await context.close()
                break

            cards = await page.query_selector_all('[data-testid="property-card"]')
            print(f"  Found {len(cards)} property cards")

            if not cards:
                await context.close()
                break

            for card in cards:
                if limit and inserted >= limit:
                    break
                row = await parse_booking_card(card, page, context)
                if row:
                    supabase.table("candidate_listings").upsert(
                        row, on_conflict="platform,external_id"
                    ).execute()
                    inserted += 1
                    print(f"    [{inserted}] {row.get('title', '')[:60]}")

            await context.close()

            if limit and inserted >= limit:
                break

            # Next page
            offset += 25
            if offset > 500:
                break
            await asyncio.sleep(2 + random.uniform(0, 1))

        await browser.close()

    print(f"Booking scraper done. Inserted/updated {inserted} rows.")


async def parse_booking_card(card, page: Page, context) -> dict | None:
    try:
        title_el = await card.query_selector('[data-testid="title"]')
        title = (await title_el.inner_text()).strip() if title_el else None
        if not title:
            return None

        link_el = await card.query_selector('a[data-testid="title-link"]')
        href = await link_el.get_attribute("href") if link_el else None
        if not href:
            return None

        # Extract external_id from URL
        external_id = re.search(r"hotel/hr/([^.]+)\.hr", href)
        if not external_id:
            external_id_str = href.split("/")[-1].split(".")[0]
        else:
            external_id_str = external_id.group(1)

        price_el = await card.query_selector('[data-testid="price-and-discounted-price"]')
        price_text = (await price_el.inner_text()).strip() if price_el else ""
        price = _parse_price(price_text)

        location_el = await card.query_selector('[data-testid="address"]')
        location = (await location_el.inner_text()).strip() if location_el else ""

        neighborhood = infer_neighborhood(title + " " + location)

        # Open listing for host name + beds + photos
        host_name = None
        beds = None
        photos = []

        try:
            listing_page = await context.new_page()
            await listing_page.goto(href, wait_until="networkidle", timeout=25000)
            await listing_page.wait_for_timeout(1500)

            # Host / property manager name
            host_el = await listing_page.query_selector('.hp-host-name, [data-testid="property-name"]')
            host_name = (await host_el.inner_text()).strip() if host_el else None

            # Beds
            bed_els = await listing_page.query_selector_all('.hprt-roomtype-bed, [data-testid="room-info"] li')
            for el in bed_els:
                text = (await el.inner_text()).lower()
                if "krevet" in text or "bed" in text:
                    m = re.search(r"(\d+)", text)
                    if m:
                        beds = int(m.group(1))
                        break

            # Photos (first 3)
            photo_els = await listing_page.query_selector_all('img.hotel_image, .slick-track img')
            for img in photo_els[:3]:
                src = await img.get_attribute("src") or await img.get_attribute("data-src")
                if src and ("booking.com" in src or "bstatic.com" in src):
                    phash = compute_phash(src)
                    photos.append({"url": src, "phash": phash or ""})

            await listing_page.close()
        except Exception:
            pass

        await asyncio.sleep(1 + random.uniform(0, 0.5))

        return {
            "id": str(uuid.uuid4()),
            "platform": "booking",
            "external_id": external_id_str,
            "title": title,
            "host_name": host_name,
            "neighborhood": neighborhood,
            "city": "Split",
            "approx_lat": None,
            "approx_lon": None,
            "url": href,
            "price_per_night": price,
            "beds": beds,
            "guests": None,
            "photos": photos,
        }
    except Exception as e:
        print(f"  parse_booking_card error: {e}")
        return None


def _parse_price(text: str) -> float | None:
    numbers = re.findall(r"[\d\.]+", text.replace(",", ""))
    for n in numbers:
        try:
            val = float(n)
            if 10 < val < 10000:
                return val
        except ValueError:
            continue
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(scrape_booking(limit=args.limit))
