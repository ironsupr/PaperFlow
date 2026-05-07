from typing import Any, List, Optional
import httpx
import os
import asyncio
from datetime import datetime
from collections import OrderedDict
from time import time as now
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.paper import Paper as PaperModel
from app.schemas.paper import Paper as PaperSchema, PaperImport
from app.services.paper_service import paper_service

router = APIRouter()

SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

# Simple in-memory TTL cache (per-process). Keys: "query::limit" -> (timestamp, results)
CACHE_TTL = int(os.getenv("SEARCH_CACHE_TTL", 600))  # seconds (increased to 10 mins)
CACHE_MAX = int(os.getenv("SEARCH_CACHE_MAX", 256))
_search_cache: "OrderedDict[str, tuple[float, list]]" = OrderedDict()
_cache_lock = asyncio.Lock()

# Per-user rate limiting: user_id -> (last_search_timestamp, consecutive_failures)
_user_rate_limit: dict[int, tuple[float, int]] = {}
USER_SEARCH_COOLDOWN = 2.0  # seconds between searches per user
MAX_CONSECUTIVE_FAILURES = 3
CIRCUIT_BREAKER_COOLDOWN = 60  # seconds

@router.get("/search")
async def search_global_papers(
    query: str,
    limit: int = 15,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Search for papers globally using Semantic Scholar API with rate limiting and caching."""
    # Check per-user rate limit
    user_id = current_user.id
    now_ts = now()
    
    if user_id in _user_rate_limit:
        last_ts, fail_count = _user_rate_limit[user_id]
        
        # Circuit breaker: if too many failures, reject requests temporarily
        if fail_count >= MAX_CONSECUTIVE_FAILURES:
            if now_ts - last_ts < CIRCUIT_BREAKER_COOLDOWN:
                raise HTTPException(
                    status_code=429,
                    detail=f"Search service temporarily unavailable. Please try again in {int(CIRCUIT_BREAKER_COOLDOWN - (now_ts - last_ts))} seconds."
                )
            else:
                # Reset circuit breaker
                _user_rate_limit[user_id] = (now_ts, 0)
        
        # Enforce search cooldown
        if now_ts - last_ts < USER_SEARCH_COOLDOWN:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {int(USER_SEARCH_COOLDOWN - (now_ts - last_ts))} seconds before searching again."
            )
    
    # Optional API key to increase quota: set SEMANTIC_SCHOLAR_API_KEY in env
    api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
    headers = {"Accept": "application/json"}
    if api_key:
        headers["x-api-key"] = api_key

    params = {
        "query": query,
        "limit": limit,
        "fields": "title,authors,year,url,abstract,citationCount"
    }

    cache_key = f"{query}::{limit}"
    # Check cache
    async with _cache_lock:
        entry = _search_cache.get(cache_key)
        if entry:
            ts, cached_results = entry
            if now_ts - ts < CACHE_TTL:
                # Update last search time on cache hit
                _user_rate_limit[user_id] = (now_ts, 0)
                return cached_results
            else:
                # expired
                _search_cache.pop(cache_key, None)

    max_attempts = 3
    backoff_base = 1.0

    try:
        async with httpx.AsyncClient() as client:
            for attempt in range(1, max_attempts + 1):
                try:
                    response = await client.get(SEMANTIC_SCHOLAR_SEARCH_URL, params=params, headers=headers, timeout=10.0)
                except Exception as e:
                    # network-level error
                    if attempt == max_attempts:
                        # Record failure
                        fail_count = _user_rate_limit.get(user_id, (now_ts, 0))[1]
                        _user_rate_limit[user_id] = (now_ts, fail_count + 1)
                        raise HTTPException(status_code=500, detail=f"External API request failed: {e}")
                    await asyncio.sleep(backoff_base * (2 ** (attempt - 1)))
                    continue

                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for item in data.get("data", []):
                        authors = ", ".join([a.get("name", "") for a in item.get("authors", [])])
                        results.append({
                            "title": item.get("title"),
                            "authors": authors,
                            "year": item.get("year"),
                            "scholar_url": item.get("url"),
                            "abstract": item.get("abstract"),
                            "citation_count": item.get("citationCount")
                        })
                    # Store into cache (best-effort)
                    try:
                        async with _cache_lock:
                            _search_cache[cache_key] = (now_ts, results)
                            # evict oldest if over capacity
                            while len(_search_cache) > CACHE_MAX:
                                _search_cache.popitem(last=False)
                    except Exception:
                        pass
                    
                    # Reset failure count on success
                    _user_rate_limit[user_id] = (now_ts, 0)
                    return results

                # If rate-limited or server error, retry with backoff
                if response.status_code in (429, 502, 503, 504) and attempt < max_attempts:
                    await asyncio.sleep(backoff_base * (2 ** (attempt - 1)))
                    continue

                # Otherwise propagate the external status
                fail_count = _user_rate_limit.get(user_id, (now_ts, 0))[1]
                _user_rate_limit[user_id] = (now_ts, fail_count + 1)
                raise HTTPException(status_code=response.status_code, detail="External API error")
    except HTTPException:
        raise
    except Exception as e:
        fail_count = _user_rate_limit.get(user_id, (now_ts, 0))[1]
        _user_rate_limit[user_id] = (now_ts, fail_count + 1)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/import", response_model=PaperSchema)
async def import_discovered_paper(
    *,
    db: Session = Depends(deps.get_db),
    paper_in: PaperImport,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Import a discovered paper into the user's personal library."""
    # Check if paper already exists for this user
    existing = db.query(PaperModel).filter(
        PaperModel.title == paper_in.title,
        PaperModel.user_id == current_user.id
    ).first()
    
    if existing:
        return existing

    # Create paper record
    paper = PaperModel(
        title=paper_in.title,
        authors=paper_in.authors or "Unknown",
        abstract=paper_in.abstract or "No abstract available.",
        year=paper_in.year,
        scholar_url=paper_in.scholar_url,
        user_id=current_user.id,
        is_external=1, # Mark as external/discovered
        upload_url=None, # No local PDF yet
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(paper)
    db.commit()
    db.refresh(paper)
    
    # Schedule enrichment in background (concepts, etc.)
    # We pass the abstract as 'text' for enrichment since we don't have the PDF content yet
    background_tasks.add_task(paper_service.enrich_paper_background, paper.id, paper.abstract)
    
    return paper
