from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.services.ai_service import ai_service
from app.services.paper_service import paper_service
from app.models.paper import Paper as PaperModel
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import time
import tempfile
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

# Researcher Mode Requests
class ResearchGapRequest(BaseModel):
    paper_ids: List[int]

class NoveltyCheckRequest(BaseModel):
    idea: str
    paper_ids: Optional[List[int]] = None # Context to check against

class TrendAnalysisRequest(BaseModel):
    paper_ids: List[int]

class IdeaGeneratorRequest(BaseModel):
    paper_ids: List[int]
    risk_level: str = "moderate"
    domain: Optional[str] = None

class MethodCompareRequest(BaseModel):
    paper_ids: List[int]

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

# Researcher Mode Endpoints
@router.post("/research-gaps")
async def detect_research_gaps(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    gaps = await ai_service.detect_research_gaps(papers_data)
    return {"gaps": gaps}

@router.post("/novelty-check")
async def novelty_check(
    *,
    request: NoveltyCheckRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    # Use FAISS to find similar chunks globally or in selected subset
    similar_chunks = await ai_service.search_similar(request.idea, paper_ids=request.paper_ids, top_k=10)
    result = await ai_service.check_novelty_critique(request.idea, similar_chunks)
    return result

@router.post("/trend-analysis")
async def trend_analysis(
    *,
    request: TrendAnalysisRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    trends = await ai_service.analyze_trends(papers_data)
    return trends

@router.post("/idea-generator")
async def generate_ideas(
    *,
    request: IdeaGeneratorRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    ideas = await ai_service.generate_research_ideas(papers_data, risk_level=request.risk_level)
    return {"ideas": ideas}

@router.post("/method-compare")
async def method_compare(
    *,
    request: MethodCompareRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    comparison = await ai_service.compare_methodologies(papers_data)
    return {"comparison": comparison}

@router.post("/flaw-detection")
async def detect_flaws(
    *,
    request: ResearchGapRequest, # Reusing simple paper_ids request
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids), 
        PaperModel.user_id == current_user.id
    ).all()
    
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    flaws = await ai_service.detect_flaws(papers_data)
    return {"flaws": flaws}

# --- Reviewer Mode Endpoints ---

@router.post("/reviewer-scores")
async def get_reviewer_scores(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(PaperModel.id.in_(request.paper_ids), PaperModel.user_id == current_user.id).all()
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    scores = await ai_service.generate_reviewer_scores(papers_data)
    return scores

@router.post("/verify-claims")
async def verify_claims(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(PaperModel.id.in_(request.paper_ids), PaperModel.user_id == current_user.id).all()
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    claims = await ai_service.verify_claims(papers_data)
    return {"claims": claims}

@router.post("/bias-report")
async def get_bias_report(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(PaperModel.id.in_(request.paper_ids), PaperModel.user_id == current_user.id).all()
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    report = await ai_service.generate_bias_report(papers_data)
    return {"report": report}

@router.post("/structured-review")
async def generate_structured_review(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(PaperModel.id.in_(request.paper_ids), PaperModel.user_id == current_user.id).all()
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    review = await ai_service.generate_structured_review(papers_data)
    return {"review": review}

VOICE_MAP = {
    "Alex": "en-US-AndrewNeural",
    "Jamie": "en-US-AriaNeural",
}
DEFAULT_VOICE = "en-US-AndrewNeural"

@router.post("/podcast")
async def generate_podcast(
    *,
    request: PodcastRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel).filter(
        PaperModel.id.in_(request.paper_ids),
        PaperModel.user_id == current_user.id
    ).all()

    if not papers:
        raise HTTPException(status_code=404, detail="No papers found for the given IDs")

    papers_data = [{"title": p.title, "abstract": p.abstract or ""} for p in papers]
    script = await ai_service.generate_podcast_script(papers_data, request.tone)

    if not script:
        raise HTTPException(status_code=500, detail="Failed to generate podcast script")

    podcast_id = f"podcast_{current_user.id}_{int(time.time())}"
    output_path = os.path.join(AUDIO_DIR, f"{podcast_id}.mp3")

    try:
        await synthesize_podcast(script, output_path)
    except Exception as e:
        print(f"TTS synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio synthesis failed: {str(e)}")

    return {
        "podcast_id": podcast_id,
        "script": script,
        "audio_url": f"/static/audio/{podcast_id}.mp3",
        "status": "ready"
    }

async def synthesize_podcast(script: List[dict], output_path: str):
    """Generate MP3 with two distinct voices — Alex (male) and Jamie (female)."""
    temp_files: List[str] = []
    try:
        for line in script:
            text = line.get("text", "").strip()
            if not text:
                continue
            speaker = line.get("speaker", "Alex")
            voice = VOICE_MAP.get(speaker, DEFAULT_VOICE)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
                temp_path = tf.name
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(temp_path)
            temp_files.append(temp_path)

        # Concatenate MP3 frames — works because MP3 is a frame-based stream format
        with open(output_path, "wb") as out:
            for temp_path in temp_files:
                with open(temp_path, "rb") as f:
                    out.write(f.read())
    finally:
        for temp_path in temp_files:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

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
