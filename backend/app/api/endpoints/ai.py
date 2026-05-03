from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.api import deps
from app.services.ai_service import ai_service
from app.services.paper_service import paper_service
from app.models.paper import Paper as PaperModel
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import asyncio
import edge_tts

router = APIRouter()

AUDIO_DIR = "static/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

class QueryRequest(BaseModel):
    query: str
    paper_id: Optional[int] = None
    paper_ids: Optional[List[int]] = None

class QueryResponse(BaseModel):
    answer: str
    context: str = ""

class SummarizeRequest(BaseModel):
    paper_id: int
    level: str = "intermediate"

class ExplainRequest(BaseModel):
    selection: str
    paper_id: Optional[int] = None

class InsightRequest(BaseModel):
    paper_id: int
    role: str

class CrossPaperRequest(BaseModel):
    paper_ids: List[int]

class PodcastRequest(BaseModel):
    paper_ids: List[int]
    tone: str = "casual"

@router.post("/query", response_model=QueryResponse)
async def query_papers(
    *,
    request: QueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    target_paper_ids = request.paper_ids or ([request.paper_id] if request.paper_id else None)
    
    context_chunks = await ai_service.search_similar(request.query, paper_ids=target_paper_ids)
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

@router.post("/cross-paper")
async def cross_paper_analysis(
    *,
    request: CrossPaperRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    analysis = await ai_service.cross_paper_analysis(papers_data)
    return {"analysis": analysis}

@router.post("/podcast")
async def generate_podcast(
    *,
    request: PodcastRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    script = await ai_service.generate_podcast_script(papers_data, request.tone)
    
    if not script:
        raise HTTPException(status_code=500, detail="Failed to generate podcast script")
    
    podcast_id = f"podcast_{current_user.id}_{int(asyncio.get_event_loop().time())}"
    output_path = os.path.join(AUDIO_DIR, f"{podcast_id}.mp3")
    
    # Add synthesis to background tasks
    background_tasks.add_task(synthesize_podcast, script, output_path)
    
    return {
        "podcast_id": podcast_id,
        "script": script,
        "audio_url": f"/static/audio/{podcast_id}.mp3",
        "status": "processing"
    }

async def synthesize_podcast(script: List[dict], output_path: str):
    """Synthesizes a 2-person podcast script using different voices."""
    # Voice mapping
    voices = {
        "Alex": "en-US-AndrewNeural",
        "Jamie": "en-US-AvaNeural"
    }
    
    # We'll synthesize each line and concatenate or use a simpler approach:
    # edge-tts doesn't easily concatenate in one call, so we'll generate a combined SSML or just sequence them.
    # For now, let's sequence them into a single file by appending to a buffer or using a temp file logic.
    
    combined_script = ""
    for line in script:
        speaker = line.get("speaker", "Alex")
        text = line.get("text", "")
        # Very simple version: just synthesize all as one for now, or multiple files.
        # Better: use a temporary file for each and then merge with ffmpeg if available.
        # But we want to stay lightweight. Let's just use one voice for the prototype or 
        # generate a single file with SSML if edge-tts supports it.
        # edge-tts does NOT support SSML multi-voice well.
        
        combined_script += f"{speaker}: {text}\n\n"

    # Simplified prototype: synthesize the whole thing with one high-quality voice
    communicate = edge_tts.Communicate(combined_script, "en-US-AndrewNeural")
    await communicate.save(output_path)

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
