from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.services.ai_service import ai_service
from app.services.paper_service import paper_service
from app.db.session import SessionLocal
from app.models.paper import Paper as PaperModel
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    paper_id: int = None

class QueryResponse(BaseModel):
    answer: str
    context: str = ""

class SummarizeRequest(BaseModel):
    paper_id: int
    level: str = "intermediate"

class ExplainRequest(BaseModel):
    selection: str
    paper_id: int = None

class InsightRequest(BaseModel):
    paper_id: int
    role: str

@router.post("/query", response_model=QueryResponse)
async def query_papers(
    *,
    request: QueryRequest,
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    context_chunks = ai_service.search_similar(request.query)
    context = "\n".join(context_chunks)
    answer = await ai_service.generate_response(request.query, context)
    return {"answer": answer, "context": context[:1000]}

@router.post("/summarize")
async def summarize_paper(
    *,
    request: SummarizeRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == request.paper_id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    text = str(paper.sections) if paper.sections else paper.abstract
    summary = await ai_service.generate_summary(text, request.level)
    return {"summary": summary, "level": request.level}

@router.post("/explain")
async def explain_text(
    *,
    request: ExplainRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    paper_context = ""
    if request.paper_id:
        paper = db.query(PaperModel).filter(PaperModel.id == request.paper_id, PaperModel.user_id == current_user.id).first()
        if paper:
            paper_context = paper.abstract
    explanation = await ai_service.explain_text(request.selection, paper_context)
    return {"explanation": explanation}

@router.get("/definitions")
async def get_definitions(
    *,
    paper_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == paper_id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    definitions = await ai_service.get_definitions(str(paper.sections))
    return {"definitions": definitions}

@router.post("/insight")
async def get_role_insight(
    *,
    request: InsightRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == request.paper_id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    text = str(paper.sections) if paper.sections else paper.abstract
    insight = await ai_service.generate_role_insight(text, request.role)
    return {"insight": insight}

@router.get("/novelty")
async def get_novelty_score(
    *,
    paper_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == paper_id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    score = await ai_service.generate_novelty_score(paper.abstract)
    return {"score": score}
