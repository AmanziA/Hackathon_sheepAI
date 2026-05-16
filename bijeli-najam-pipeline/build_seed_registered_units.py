"""Build a SQL seed file for registered_units from the croatia.hr scraped JSON."""
import json
import re
import sys
from pathlib import Path

SRC = Path("/Users/nikoladadic/Downloads/croatia_hr_split_apartments.json")
OUT = Path(__file__).parent / "seed_registered_units.sql"


def clean(text):
    if text is None:
        return None
    # croatia.hr scrape appends "\n Telefon\n ... \n E-mail adresa\n ..." etc.
    # Keep only the first line.
    first = str(text).split("\n", 1)[0].strip()
    return first or None


def parse_street_number(address):
    if not address:
        return None, None
    m = re.match(r"^(.*?)\s+(\d+[A-Za-z\-/]*)$", address)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return address, None


def esc(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    lines = [
        "-- Seed registered_units from accommodation.croatia.hr (Split)",
        "-- Generated from croatia_hr_split_apartments.json",
        "",
        "insert into registered_units",
        "  (source, name, address, street, number, city, owner, beds, category, url, lat, lon, raw_address)",
        "values",
    ]
    rows = []
    for r in data:
        raw_address = r.get("address")
        address = clean(raw_address)
        street, number = parse_street_number(address)
        owner = clean(r.get("owner"))
        category = clean(r.get("subcategory")) or clean(r.get("category"))
        rows.append(
            "  ("
            + ", ".join(
                [
                    esc("accommodation.croatia.hr"),
                    esc(r.get("name")),
                    esc(address),
                    esc(street),
                    esc(number),
                    esc(r.get("city") or "Split"),
                    esc(owner),
                    esc(to_int(r.get("beds"))),
                    esc(category),
                    esc(r.get("url")),
                    esc(r.get("lat")),
                    esc(r.get("lon")),
                    esc(raw_address),
                ]
            )
            + ")"
        )
    lines.append(",\n".join(rows))
    lines.append("on conflict (url) do update set")
    lines.append("  name = excluded.name,")
    lines.append("  address = excluded.address,")
    lines.append("  street = excluded.street,")
    lines.append("  number = excluded.number,")
    lines.append("  city = excluded.city,")
    lines.append("  owner = excluded.owner,")
    lines.append("  beds = excluded.beds,")
    lines.append("  category = excluded.category,")
    lines.append("  lat = excluded.lat,")
    lines.append("  lon = excluded.lon,")
    lines.append("  raw_address = excluded.raw_address,")
    lines.append("  scraped_at = now();")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(data)} rows to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
