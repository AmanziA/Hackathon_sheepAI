from supabase import Client


# =====================================================================
# Discovery agent (z.ai / OpenAI-compatible) — function tool schema.
# Used by agents/discovery.py.
# =====================================================================
DISCOVERY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the open web (Tavily). Use this FIRST to find Booking/Airbnb/Vrbo listings of the registered property. Construct queries from owner name, street + number, neighborhood, and the word 'Split'. Optionally restrict to a single site with `site` (e.g. 'booking.com', 'airbnb.com', 'vrbo.com'). Returns up to N results with url, title, snippet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "site": {"type": "string", "description": "Optional domain restrict, e.g. 'booking.com'"},
                    "max_results": {"type": "integer"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch a URL and return cleaned text. Use this to verify that a Booking/Airbnb URL really describes the registered property (street name, beds, host name should appear in the page text).",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL to fetch"},
                    "max_chars": {"type": "integer", "description": "Max chars of text to return (default 8000)"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_sudski_registar",
            "description": "Look up a Croatian business in the public court registry. Returns OIB, directors, registered seat. Use ONLY when the registered owner field contains a legal form (d.o.o., d.d., j.d.o.o., obrt) — the director names are often the actual hosts on platforms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                },
                "required": ["company_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "normalize_croatian",
            "description": "Lowercase, strip Croatian diacritics, normalize kvart aliases. Pure helper for string comparison.",
            "parameters": {
                "type": "object",
                "properties": {"text": {"type": "string"}},
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "record_match",
            "description": "Record one online listing you are confident matches the registered unit. Call once per matched URL. Do NOT call if you are not confident (confidence < 0.6). Include every detail you saw on the listing page so we can save it back to candidate_listings (address + host_name especially — those are usually missing from the scrape).",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full listing URL"},
                    "platform": {"type": "string", "enum": ["booking", "airbnb", "vrbo", "croatia.hr", "other"]},
                    "external_id": {"type": "string", "description": "Platform-native id parsed from URL (optional)"},
                    "title": {"type": "string"},
                    "host_name": {"type": "string"},
                    "neighborhood": {"type": "string"},
                    "address": {"type": "string", "description": "Full street + number string from the listing page"},
                    "street": {"type": "string", "description": "Street part only"},
                    "house_number": {"type": "string", "description": "Number part only"},
                    "beds": {"type": "integer"},
                    "guests": {"type": "integer"},
                    "price_per_night": {"type": "number"},
                    "confidence": {"type": "number", "description": "0.0-1.0"},
                    "notes": {"type": "string", "description": "One-line reason (which signals fired)"},
                },
                "required": ["url", "confidence"],
            },
        },
    },
]


# =====================================================================
# Investigation agent (z.ai / OpenAI-compatible) — matches a scraped
# candidate listing against the HTZ registry. Uses registry DB tools +
# Firecrawl fetch on the listing URL.
# =====================================================================
INVESTIGATION_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": "Fetch a URL via Firecrawl and return cleaned text. Use this FIRST on the candidate listing's URL to extract street, beds, host name from the actual page (more reliable than the scrape metadata).",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string"},
                    "max_chars": {"type": "integer"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_htz_registry",
            "description": "Search the official HTZ registered_units table (our Supabase). The ONLY reliably-populated fields are: street, number, owner, beds, category, stars. Address and neighborhood are mostly NULL — DO NOT use them. Combine any of: street + house_number (strongest), owner_name, host_first_name, beds. At least ONE of (street, owner_name, host_first_name) is required. Returns 0-10 candidates sorted by match score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "street": {"type": "string", "description": "Street name from the listing page (e.g. 'Put Žnjana'). Strongest signal."},
                    "house_number": {"type": "string", "description": "House number (e.g. '14F'). Use with street."},
                    "owner_name": {"type": "string", "description": "Owner / company name from the listing or sudski registar."},
                    "host_first_name": {"type": "string", "description": "Host's first name from the platform listing."},
                    "beds": {"type": "integer", "description": "Bed count from the listing."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_htz_listing",
            "description": "Fetch one HTZ registered unit by UUID. Use after search_htz_registry to inspect a promising candidate in detail (full street, lat/lon, stars).",
            "parameters": {
                "type": "object",
                "properties": {"registered_id": {"type": "string"}},
                "required": ["registered_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_sudski_registar",
            "description": "Look up a Croatian business in the court registry. Returns OIB + directors. Use when the registered owner is a company (d.o.o., j.d.o.o., obrt) — directors are often the actual hosts on platforms.",
            "parameters": {
                "type": "object",
                "properties": {"company_name": {"type": "string"}},
                "required": ["company_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "normalize_croatian",
            "description": "Lowercase + diacritic strip + kvart aliases. Pure helper for fuzzy string matching.",
            "parameters": {
                "type": "object",
                "properties": {"text": {"type": "string"}},
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_candidate",
            "description": "Save extracted candidate listing details back to candidate_listings. Call this RIGHT AFTER fetch_url with any fields you found on the listing page that we didn't already have. The scraper often misses address / host_name — this is how we enrich them. All fields optional; only pass what you actually extracted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Listing title shown on the page"},
                    "host_name": {"type": "string", "description": "Host's name (or company) shown on the page"},
                    "address": {"type": "string", "description": "Full street + number string from the page (e.g. 'Put Žnjana 14F')"},
                    "street": {"type": "string", "description": "Street part only (e.g. 'Put Žnjana')"},
                    "house_number": {"type": "string", "description": "Number part (e.g. '14F')"},
                    "neighborhood": {"type": "string", "description": "Kvart / area label from the page"},
                    "beds": {"type": "integer"},
                    "guests": {"type": "integer"},
                    "price_per_night": {"type": "number"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "record_decision",
            "description": "Record the final decision for this candidate listing. Call ONCE. Verdict 'matched' requires registered_id; 'unmatched' / 'inconclusive' set registered_id to null.",
            "parameters": {
                "type": "object",
                "properties": {
                    "verdict": {"type": "string", "enum": ["matched", "unmatched", "inconclusive"]},
                    "registered_id": {"type": "string", "description": "UUID of the matched registered_unit (null when unmatched/inconclusive)"},
                    "confidence": {"type": "number", "description": "0.0-1.0"},
                    "notes": {"type": "string", "description": "One-line reason (which signals fired)"},
                },
                "required": ["verdict", "confidence"],
            },
        },
    },
]


def dispatch_investigation_tool(
    name: str,
    tool_input: dict,
    supabase: Client,
    *,
    candidate_id: str | None = None,
) -> dict:
    """Execute one investigation-agent tool call.

    `candidate_id` is passed through so update_candidate can target the right row.
    """
    if name == "fetch_url":
        from tools.fetch_url import fetch_url
        return fetch_url(**tool_input)

    if name == "update_candidate":
        if not candidate_id:
            return {"updated": False, "error": "no candidate_id in context"}
        # Drop None / empty values so we don't overwrite existing data with nulls.
        ALLOWED = {
            "title",
            "host_name",
            "address",
            "street",
            "house_number",
            "neighborhood",
            "beds",
            "guests",
            "price_per_night",
        }
        payload = {k: v for k, v in tool_input.items() if k in ALLOWED and v not in (None, "", [])}
        if not payload:
            return {"updated": False, "reason": "no fields supplied"}
        try:
            supabase.table("candidate_listings").update(payload).eq("id", candidate_id).execute()
        except Exception as exc:  # noqa: BLE001
            return {"updated": False, "error": f"{type(exc).__name__}: {exc}"}
        return {"updated": True, "fields": list(payload.keys())}

    if name == "search_htz_registry":
        from tools.search_htz_registry import search_htz_registry
        results = search_htz_registry(supabase=supabase, **tool_input)
        return {
            "candidates": [
                {
                    "id": r.id,
                    "name": r.name,
                    "address": r.address,
                    "street": r.street,
                    "number": r.number,
                    "neighborhood": r.neighborhood,
                    "owner": r.owner,
                    "beds": r.beds,
                    "category": r.category,
                    "stars": r.stars,
                    "lat": r.lat,
                    "lon": r.lon,
                }
                for r in results
            ],
            "count": len(results),
        }

    if name == "get_htz_listing":
        from tools.get_htz_listing import get_htz_listing
        listing = get_htz_listing(supabase=supabase, **tool_input)
        if not listing:
            return {"found": False}
        return {
            "found": True,
            "id": listing.id,
            "name": listing.name,
            "address": listing.address,
            "street": listing.street,
            "number": listing.number,
            "neighborhood": listing.neighborhood,
            "owner": listing.owner,
            "stars": listing.stars,
            "beds": listing.beds,
            "category": listing.category,
            "lat": listing.lat,
            "lon": listing.lon,
        }

    if name == "search_sudski_registar":
        from tools.search_sudski_registar import search_sudski_registar
        result = search_sudski_registar(**tool_input)
        if not result:
            return {"found": False}
        return {
            "found": result.found,
            "company_name": result.company_name,
            "oib": result.oib,
            "directors": result.directors,
            "registered_seat": result.registered_seat,
        }

    if name == "normalize_croatian":
        from tools.normalize_croatian import normalize_croatian
        return {"normalized": normalize_croatian(**tool_input)}

    if name == "record_decision":
        # Pure recording — handled in the agent loop.
        return {"recorded": True}

    return {"error": f"Unknown investigation tool: {name}"}


def dispatch_discovery_tool(name: str, tool_input: dict, supabase: Client) -> dict:
    """Execute a tool used by the discovery agent."""
    if name == "search_web":
        from tools.search_web import search_web
        return search_web(**tool_input)

    if name == "fetch_url":
        from tools.fetch_url import fetch_url
        return fetch_url(**tool_input)

    if name == "search_sudski_registar":
        from tools.search_sudski_registar import search_sudski_registar
        result = search_sudski_registar(**tool_input)
        if not result:
            return {"found": False}
        return {
            "found": result.found,
            "company_name": result.company_name,
            "oib": result.oib,
            "directors": result.directors,
            "registered_seat": result.registered_seat,
        }

    if name == "normalize_croatian":
        from tools.normalize_croatian import normalize_croatian
        return {"normalized": normalize_croatian(**tool_input)}

    if name == "record_match":
        # Pure recording — handled in the agent loop. Return an ack so the
        # model can move on.
        return {"recorded": True}

    return {"error": f"Unknown discovery tool: {name}"}


# =====================================================================
# Investigation agent (Anthropic) — original tools, unchanged shape.
# =====================================================================
TOOLS = [
    {
        "name": "search_htz_registry",
        "description": "Narrow the HTZ registry to a neighborhood, optionally filtered by host first name (fuzzy) and bed count (exact). Returns 0-N registered unit candidates. Use this first to see what registered units exist in the same kvart.",
        "input_schema": {
            "type": "object",
            "properties": {
                "neighborhood": {"type": "string", "description": "Neighborhood / kvart name in Split"},
                "host_first_name": {"type": "string", "description": "Host's first name from the platform listing (optional)"},
                "beds": {"type": "integer", "description": "Number of beds on the platform listing (optional)"},
            },
            "required": ["neighborhood"],
        },
    },
    {
        "name": "get_htz_listing",
        "description": "Fetch the full HTZ registry row for one registered unit by its ID. Use after search_htz_registry returns candidates you want to inspect in detail.",
        "input_schema": {
            "type": "object",
            "properties": {
                "registered_id": {"type": "string", "description": "UUID of the registered unit from search_htz_registry"},
            },
            "required": ["registered_id"],
        },
    },
    {
        "name": "search_sudski_registar",
        "description": "Look up a business in the Croatian public court registry by company name. Returns OIB, directors, registered seat. Use when the platform listing shows a company/business name as the host.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {"type": "string", "description": "Business name shown on the platform listing"},
            },
            "required": ["company_name"],
        },
    },
    {
        "name": "phash_compare",
        "description": "Compare the candidate listing's photo perceptual hashes (pHashes) against photos of a specific registered unit. Returns min Hamming distance and is_match (distance < 8). Use as a tie-breaker after name/bed matching.",
        "input_schema": {
            "type": "object",
            "properties": {
                "candidate_photo_phashes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of pHash strings from the candidate listing's photos",
                },
                "registered_id": {"type": "string", "description": "UUID of the registered unit to compare against"},
            },
            "required": ["candidate_photo_phashes", "registered_id"],
        },
    },
    {
        "name": "geocode",
        "description": "Geocode an address fragment to lat/lon using Nominatim. Use when the candidate listing reveals a partial address (rare on Airbnb, sometimes on Booking).",
        "input_schema": {
            "type": "object",
            "properties": {
                "address_fragment": {"type": "string", "description": "Partial address string, e.g. 'Spinčićeva 5'"},
            },
            "required": ["address_fragment"],
        },
    },
    {
        "name": "normalize_croatian",
        "description": "Lowercase, strip diacritics, normalize kvart aliases (e.g. 'Old Town' → 'veli varos'). Pure helper — call before string comparisons.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to normalize"},
            },
            "required": ["text"],
        },
    },
]


def dispatch_tool(name: str, tool_input: dict, supabase: Client) -> dict:
    """Execute a tool by name and return its output as a JSON-serializable dict."""
    if name == "search_htz_registry":
        from tools.search_htz_registry import search_htz_registry
        results = search_htz_registry(supabase=supabase, **tool_input)
        return {
            "candidates": [
                {
                    "id": r.id,
                    "name": r.name,
                    "address": r.address,
                    "neighborhood": r.neighborhood,
                    "owner": r.owner,
                    "beds": r.beds,
                    "category": r.category,
                    "lat": r.lat,
                    "lon": r.lon,
                }
                for r in results
            ],
            "count": len(results),
        }

    elif name == "get_htz_listing":
        from tools.get_htz_listing import get_htz_listing
        listing = get_htz_listing(supabase=supabase, **tool_input)
        if not listing:
            return {"found": False}
        return {
            "found": True,
            "id": listing.id,
            "name": listing.name,
            "address": listing.address,
            "street": listing.street,
            "number": listing.number,
            "neighborhood": listing.neighborhood,
            "owner": listing.owner,
            "stars": listing.stars,
            "beds": listing.beds,
            "category": listing.category,
            "lat": listing.lat,
            "lon": listing.lon,
        }

    elif name == "search_sudski_registar":
        from tools.search_sudski_registar import search_sudski_registar
        result = search_sudski_registar(**tool_input)
        if not result:
            return {"found": False}
        return {
            "found": result.found,
            "company_name": result.company_name,
            "oib": result.oib,
            "directors": result.directors,
            "registered_seat": result.registered_seat,
        }

    elif name == "phash_compare":
        from tools.phash_compare import phash_compare
        result = phash_compare(supabase=supabase, **tool_input)
        return {
            "min_hamming": result.min_hamming,
            "is_match": result.is_match,
            "compared_count": result.compared_count,
        }

    elif name == "geocode":
        from tools.geocode import geocode
        result = geocode(**tool_input)
        if not result:
            return {"found": False}
        return {"found": True, "lat": result.lat, "lon": result.lon, "display_name": result.display_name}

    elif name == "normalize_croatian":
        from tools.normalize_croatian import normalize_croatian
        return {"normalized": normalize_croatian(**tool_input)}

    else:
        return {"error": f"Unknown tool: {name}"}
