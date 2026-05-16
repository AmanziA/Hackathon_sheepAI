from __future__ import annotations
"""
Fetch a URL and return cleaned text.

Primary backend: Firecrawl `/v1/scrape` — handles JS rendering, anti-bot, and
returns Markdown. This is critical for Booking.com / Airbnb listing pages.

Fallback: plain httpx GET + HTML strip. Works for static pages
(accommodation.croatia.hr, fininfo.hr, etc.) but blocked by major platforms.
"""
import os
import re
import httpx

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")
FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)


def _strip_html(html: str) -> str:
    cleaned = _SCRIPT_RE.sub(" ", html)
    cleaned = _TAG_RE.sub(" ", cleaned)
    cleaned = _WS_RE.sub(" ", cleaned)
    return cleaned.strip()


def _firecrawl_scrape(url: str, max_chars: int) -> dict:
    try:
        resp = httpx.post(
            FIRECRAWL_SCRAPE_URL,
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}", "Content-Type": "application/json"},
            timeout=45.0,
        )
    except httpx.HTTPError as exc:
        return {"ok": False, "url": url, "error": f"firecrawl {type(exc).__name__}: {exc}"}

    if resp.status_code >= 400:
        return {"ok": False, "url": url, "status": resp.status_code, "error": resp.text[:300]}

    body = resp.json()
    data = body.get("data") or {}
    text = data.get("markdown") or data.get("content") or ""
    return {
        "ok": True,
        "backend": "firecrawl",
        "url": data.get("metadata", {}).get("sourceURL") or url,
        "title": data.get("metadata", {}).get("title"),
        "text": text[:max_chars],
        "truncated": len(text) > max_chars,
    }


def _httpx_fetch(url: str, max_chars: int) -> dict:
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True, headers={"User-Agent": UA}) as client:
            resp = client.get(url)
        body = resp.text or ""
        text = _strip_html(body) if "html" in (resp.headers.get("content-type") or "").lower() else body
        return {
            "ok": resp.is_success,
            "backend": "httpx",
            "status": resp.status_code,
            "url": str(resp.url),
            "content_type": resp.headers.get("content-type"),
            "text": text[:max_chars],
            "truncated": len(text) > max_chars,
        }
    except httpx.HTTPError as exc:
        return {"ok": False, "url": url, "error": f"httpx {type(exc).__name__}: {exc}"}


def fetch_url(url: str, max_chars: int = 8000) -> dict:
    """Fetch a URL. Uses Firecrawl when available; falls back to plain httpx."""
    if FIRECRAWL_API_KEY:
        return _firecrawl_scrape(url, max_chars)
    return _httpx_fetch(url, max_chars)
