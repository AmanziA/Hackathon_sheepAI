from __future__ import annotations
from dataclasses import dataclass
from supabase import Client


@dataclass
class PhotoMatchResult:
    min_hamming: int | None
    is_match: bool
    compared_count: int


def phash_compare(
    candidate_photo_phashes: list[str],
    registered_id: str,
    supabase: Client,
) -> PhotoMatchResult:
    """
    Compare candidate's photo pHashes against a registered unit's photo set.
    Returns min Hamming distance and is_match (distance < 8).
    """
    if not candidate_photo_phashes:
        return PhotoMatchResult(min_hamming=None, is_match=False, compared_count=0)

    row = supabase.table("registered_units").select("photos").eq("id", registered_id).single().execute()
    if not row.data or not row.data.get("photos"):
        return PhotoMatchResult(min_hamming=None, is_match=False, compared_count=0)

    registered_phashes: list[str] = [p["phash"] for p in row.data["photos"] if p.get("phash")]
    if not registered_phashes:
        return PhotoMatchResult(min_hamming=None, is_match=False, compared_count=0)

    min_dist = None
    for c_hash in candidate_photo_phashes:
        for r_hash in registered_phashes:
            dist = hamming_distance(c_hash, r_hash)
            if dist is not None:
                if min_dist is None or dist < min_dist:
                    min_dist = dist

    is_match = min_dist is not None and min_dist < 8
    return PhotoMatchResult(
        min_hamming=min_dist,
        is_match=is_match,
        compared_count=len(candidate_photo_phashes) * len(registered_phashes),
    )


def hamming_distance(hash1: str, hash2: str) -> int | None:
    try:
        if len(hash1) != len(hash2):
            return None
        return sum(c1 != c2 for c1, c2 in zip(hash1, hash2))
    except Exception:
        return None


def compute_phash(image_url: str) -> str | None:
    """Download an image and compute its perceptual hash."""
    try:
        import httpx
        import imagehash
        from PIL import Image
        import io

        resp = httpx.get(image_url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return str(imagehash.phash(img))
    except Exception:
        return None
