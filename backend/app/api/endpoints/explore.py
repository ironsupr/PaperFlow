from typing import Any, List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.paper import Paper as PaperModel
from app.schemas.paper import Paper as PaperSchema, PaperImport
from app.services.paper_service import paper_service

router = APIRouter()

SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

@router.get("/search")
async def search_global_papers(
    query: str,
    limit: int = 15,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Search for papers globally using Semantic Scholar API."""
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "query": query,
                "limit": limit,
                "fields": "title,authors,year,url,abstract,citationCount"
            }
            response = await client.get(SEMANTIC_SCHOLAR_SEARCH_URL, params=params, timeout=10.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="External API error")
            
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
