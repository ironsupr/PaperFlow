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
import wave

try:
    from google import genai as _gemini_sdk
    from google.genai import types as _gemini_types
    _GEMINI_TTS_AVAILABLE = True
except ImportError:
    _GEMINI_TTS_AVAILABLE = False

try:
    import edge_tts as _edge_tts
    _EDGE_TTS_AVAILABLE = True
except ImportError:
    _EDGE_TTS_AVAILABLE = False

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
_AI_UNAVAILABLE = HTTPException(status_code=503, detail="AI features require GEMINI_API_KEY to be configured.")

@router.post("/research-gaps")
async def detect_research_gaps(
    *,
    request: ResearchGapRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
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
    if not ai_service.llm:
        raise _AI_UNAVAILABLE
    papers = db.query(PaperModel).filter(PaperModel.id.in_(request.paper_ids), PaperModel.user_id == current_user.id).all()
    papers_data = [{"title": p.title, "abstract": p.abstract} for p in papers]
    review = await ai_service.generate_structured_review(papers_data)
    return {"review": review}

_EDGE_VOICE_MAP = {
    "Alex": "en-US-AndrewNeural",
    "Jamie": "en-US-AriaNeural",
}
_EDGE_DEFAULT_VOICE = "en-US-AndrewNeural"

_GEMINI_VOICE_MAP = {
    "Alex": "Charon",
    "Jamie": "Kore",
}

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

    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    use_gemini = _GEMINI_TTS_AVAILABLE and bool(gemini_key)

    ext = "wav" if use_gemini else "mp3"
    output_path = os.path.join(AUDIO_DIR, f"{podcast_id}.{ext}")

    try:
        if use_gemini:
            await _synthesize_gemini(script, output_path, gemini_key)
        elif _EDGE_TTS_AVAILABLE:
            await _synthesize_edge(script, output_path)
        else:
            raise RuntimeError("No TTS engine available. Set GEMINI_API_KEY or install edge-tts.")
    except Exception as e:
        print(f"TTS synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio synthesis failed: {str(e)}")

    return {
        "podcast_id": podcast_id,
        "script": script,
        "audio_url": f"/static/audio/{podcast_id}.{ext}",
        "status": "ready"
    }


def _pcm_to_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000):
    """Write raw 16-bit mono PCM bytes to a WAV file."""
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)


async def _synthesize_gemini(script: List[dict], output_path: str, api_key: str):
    """Generate WAV using Gemini 2.5 Flash TTS with multi-speaker voices."""
    client = _gemini_sdk.Client(api_key=api_key)

    speaker_voice_configs = [
        _gemini_types.SpeakerVoiceConfig(
            speaker="Alex",
            voice_config=_gemini_types.VoiceConfig(
                prebuilt_voice_config=_gemini_types.PrebuiltVoiceConfig(voice_name="Charon")
            )
        ),
        _gemini_types.SpeakerVoiceConfig(
            speaker="Jamie",
            voice_config=_gemini_types.VoiceConfig(
                prebuilt_voice_config=_gemini_types.PrebuiltVoiceConfig(voice_name="Kore")
            )
        ),
    ]

    script_text = "\n".join(
        f"{line.get('speaker', 'Alex')}: {line.get('text', '').strip()}"
        for line in script
        if line.get("text", "").strip()
    )

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=script_text,
        config=_gemini_types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=_gemini_types.SpeechConfig(
                multi_speaker_voice_config=_gemini_types.MultiSpeakerVoiceConfig(
                    speaker_voice_configs=speaker_voice_configs
                )
            )
        )
    )

    pcm_bytes = b""
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            pcm_bytes += part.inline_data.data

    if not pcm_bytes:
        raise RuntimeError("Gemini TTS returned no audio data")

    _pcm_to_wav(pcm_bytes, output_path)


async def _synthesize_edge(script: List[dict], output_path: str):
    """Generate MP3 using edge-tts (fallback) with two distinct voices."""
    temp_files: List[str] = []
    try:
        for line in script:
            text = line.get("text", "").strip()
            if not text:
                continue
            speaker = line.get("speaker", "Alex")
            voice = _EDGE_VOICE_MAP.get(speaker, _EDGE_DEFAULT_VOICE)
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
                temp_path = tf.name
            communicate = _edge_tts.Communicate(text, voice)
            await communicate.save(temp_path)
            temp_files.append(temp_path)

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
