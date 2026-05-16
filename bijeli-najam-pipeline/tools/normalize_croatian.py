import unicodedata
import re

KVART_ALIASES: dict[str, str] = {
    "stari grad": "veli varoš",
    "old town": "veli varoš",
    "veli varos": "veli varoš",
    "mali varos": "mali varoš",
    "bacvice": "bačvice",
    "bačvice": "bačvice",
    "znjan": "žnjan",
    "znjan plaža": "žnjan",
    "solin": "solin",
    "mejaši": "mejaši",
    "mejasi": "mejaši",
    "firule": "firule",
    "sirobuja": "sirobuja",
    "kman": "kman",
    "spinut": "spinut",
    "trstenik": "trstenik",
    "lovret": "lovret",
    "bol": "bol",
    "kopilica": "kopilica",
    "meje": "meje",
    "pazdigrad": "pazdigrad",
    "plokite": "plokite",
    "ravne njive": "ravne njive",
    "smokovik": "smokovik",
    "sukoisan": "sućidar",
    "sucidar": "sućidar",
    "sućidar": "sućidar",
    "visoka": "visoka",
    "kila": "kila",
    "neslanovac": "neslanovac",
    "center": "grad",
    "centre": "grad",
    "city center": "grad",
    "downtown": "grad",
    "historic center": "veli varoš",
}


def normalize_croatian(text: str) -> str:
    """Lowercase, strip diacritics, normalize kvart aliases."""
    # Strip diacritics
    nfd = unicodedata.normalize("NFD", text.lower().strip())
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", stripped).strip()
    # Check kvart alias first (before stripping so we match canonical forms)
    lower = text.lower().strip()
    if lower in KVART_ALIASES:
        canonical = KVART_ALIASES[lower]
        # Return normalized version of canonical
        nfd2 = unicodedata.normalize("NFD", canonical.lower())
        return "".join(c for c in nfd2 if unicodedata.category(c) != "Mn")
    return cleaned


def normalize_kvart(kvart: str) -> str:
    """Return the canonical kvart slug for a neighborhood string."""
    lower = kvart.lower().strip()
    if lower in KVART_ALIASES:
        canonical = KVART_ALIASES[lower]
        return canonical
    # Try stripped version
    stripped = normalize_croatian(kvart)
    for alias, canonical in KVART_ALIASES.items():
        if normalize_croatian(alias) == stripped:
            return canonical
    return lower
