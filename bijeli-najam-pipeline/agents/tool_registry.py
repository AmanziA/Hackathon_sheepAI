from supabase import Client

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
