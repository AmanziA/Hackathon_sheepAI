from __future__ import annotations
"""
Web search tool for the discovery agent.

Primary backend: Firecrawl (`/v1/search`). Handles Google-quality search and
returns structured results. Set FIRECRAWL_API_KEY in .env.

Fallback: Tavily (`/search`). Set TAVILY_API_KEY instead.

If neither key is set, returns an error result so the agent fails gracefully.
"""
import os
import httpx

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")

FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search"
TAVILY_URL = "https://api.tavily.com/search"


def _firecrawl_search(query: str, max_results: int, site: str | None) -> dict:
    q = f"site:{site} {query}" if site else query
    payload = {
        "query": q,
        "limit": max(1, min(max_results, 20)),
    }
    try:
        resp = httpx.post(
            FIRECRAWL_SEARCH_URL,
            json=payload,
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}", "Content-Type": "application/json"},
            timeout=20.0,
        )
    except httpx.HTTPError as exc:
        return {"ok": False, "query": q, "error": f"firecrawl {type(exc).__name__}: {exc}", "results": []}

    if resp.status_code >= 400:
        return {"ok": False, "query": q, "status": resp.status_code, "error": resp.text[:300], "results": []}

    body = resp.json()
    # v2 returns {"success": true, "data": {"web": [...]}}; v1/older may return data as a list.
    raw_data = body.get("data") or {}
    if isinstance(raw_data, dict):
        raw = raw_data.get("web") or raw_data.get("results") or []
    else:
        raw = raw_data
    results = [
        {
            "url": r.get("url"),
            "title": r.get("title") or r.get("metadata", {}).get("title"),
            "snippet": r.get("description") or r.get("snippet") or r.get("metadata", {}).get("description"),
        }
        for r in raw
        if r.get("url")
    ]
    return {"ok": True, "backend": "firecrawl", "query": q, "results": results, "count": len(results)}


def _tavily_search(query: str, max_results: int, site: str | None) -> dict:
    payload: dict = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": max(1, min(max_results, 20)),
        "search_depth": "basic",
        "include_answer": False,
    }
    if site:
        payload["include_domains"] = [site]

    try:
        resp = httpx.post(TAVILY_URL, json=payload, timeout=15.0)
    except httpx.HTTPError as exc:
        return {"ok": False, "query": query, "error": f"tavily {type(exc).__name__}: {exc}", "results": []}

    if resp.status_code >= 400:
        return {"ok": False, "query": query, "status": resp.status_code, "error": resp.text[:300], "results": []}

    data = resp.json()
    results = [
        {"url": r.get("url"), "title": r.get("title"), "snippet": r.get("content")}
        for r in (data.get("results") or [])
    ]
    return {"ok": True, "backend": "tavily", "query": query, "results": results, "count": len(results)}


def search_web(
    query: str,
    max_results: int = 8,
    site: str | None = None,
) -> dict:
    """Run a web search via Firecrawl (preferred) or Tavily (fallback).

    Args:
        query: free-text query string.
        max_results: 1-20.
        site: optional domain restrict, e.g. "booking.com".
    """
    if FIRECRAWL_API_KEY:
        return _firecrawl_search(query, max_results, site)
    if TAVILY_API_KEY:
        return _tavily_search(query, max_results, site)
    return {
        "ok": False,
        "query": query,
        "error": "No search backend configured. Set FIRECRAWL_API_KEY or TAVILY_API_KEY in bijeli-najam-pipeline/.env.",
        "results": [],
    }
