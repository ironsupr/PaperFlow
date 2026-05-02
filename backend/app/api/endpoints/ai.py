from typing import Any
from fastapi import APIRouter, Depends
from app.api import deps
from app.services.ai_service import ai_service
from pydantic import BaseModel

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    paper_id: int = None

class QueryResponse(BaseModel):
    answer: str
    context: str = ""

@router.post("/query", response_model=QueryResponse)
async def query_papers(
    *,
    request: QueryRequest,
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    # Search for context
    context_chunks = ai_service.search_similar(request.query)
    context = "\n".join(context_chunks)
    
    # Generate response
    answer = await ai_service.generate_response(request.query, context)
    
    return {"answer": answer, "context": context[:1000]}

@router.post("/summarize")
async def summarize_paper(
    *,
    paper_id: int,
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    # Placeholder for summarization logic
    return {"summary": "This is a summary of the paper."}
