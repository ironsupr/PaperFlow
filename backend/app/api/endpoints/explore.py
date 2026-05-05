from typing import Any, List, Optional
import httpx
import os
import asyncio
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
CACHE_TTL = int(os.getenv("SEARCH_CACHE_TTL", 300))  # seconds
CACHE_MAX = int(os.getenv("SEARCH_CACHE_MAX", 128))
_search_cache: "OrderedDict[str, tuple[float, list]]" = OrderedDict()
_cache_lock = asyncio.Lock()

@router.get("/search")
async def search_global_papers(
    query: str,
    limit: int = 15,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Search for papers globally using Semantic Scholar API."""
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
            if now() - ts < CACHE_TTL:
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
                    return results
                    # Store into cache (best-effort)
                    try:
                        async with _cache_lock:
                            _search_cache[cache_key] = (now(), results)
                            # evict oldest if over capacity
                            while len(_search_cache) > CACHE_MAX:
                                _search_cache.popitem(last=False)
                    except Exception:
                        pass

                # If rate-limited or server error, retry with backoff
                if response.status_code in (429, 502, 503, 504) and attempt < max_attempts:
                    await asyncio.sleep(backoff_base * (2 ** (attempt - 1)))
                    continue

                # Otherwise propagate the external status
                raise HTTPException(status_code=response.status_code, detail="External API error")
    except HTTPException:
        raise
    except Exception as e:
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
        upload_url=None # No local PDF yet
    )
    
    db.add(paper)
    db.commit()
    db.refresh(paper)
    
    # Schedule enrichment in background (concepts, etc.)
    # We pass the abstract as 'text' for enrichment since we don't have the PDF content yet
    background_tasks.add_task(paper_service.enrich_paper_background, paper.id, paper.abstract)
    
    return paper
