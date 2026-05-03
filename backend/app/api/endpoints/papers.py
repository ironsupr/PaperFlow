from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.models.user import User
from app.schemas.paper import Paper as PaperSchema, Note as NoteSchema, NoteCreate
from app.services.paper_service import paper_service
from app.models.paper import Paper as PaperModel, Note as NoteModel, Concept as ConceptModel
from datetime import datetime

router = APIRouter()

@router.post("/upload", response_model=PaperSchema)
async def upload_paper(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
    background_tasks: BackgroundTasks
) -> Any:
    return await paper_service.process_paper(db, file, current_user.id, background_tasks)

@router.get("/", response_model=List[PaperSchema])
def read_papers(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(PaperModel)\
        .options(joinedload(PaperModel.references))\
        .options(joinedload(PaperModel.concepts))\
        .filter(PaperModel.user_id == current_user.id)\
        .offset(skip).limit(limit).all()

@router.get("/graph-data")
def get_graph_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    papers = db.query(PaperModel)\
        .options(joinedload(PaperModel.references))\
        .options(joinedload(PaperModel.concepts))\
        .filter(PaperModel.user_id == current_user.id).all()
    
    nodes = []
    edges = []
    
    # Calculate influence (in-degree)
    influence_counts = {}
    for paper in papers:
        for ref in paper.references:
            ref_id = f"paper_{ref.id}"
            influence_counts[ref_id] = influence_counts.get(ref_id, 0) + 1

    concept_nodes = {}
    
    for paper in papers:
        p_id = f"paper_{paper.id}"
        nodes.append({
            "id": p_id,
            "type": "paper",
            "data": {
                "label": paper.title,
                "authors": paper.authors,
                "year": paper.year,
                "domain": paper.domain,
                "topic": paper.topic,
                "influence": influence_counts.get(p_id, 0),
                "isExternal": paper.is_external == 1
            }
        })
        
        # Citation edges
        for ref in paper.references:
            edges.append({
                "id": f"e_p{paper.id}_p{ref.id}",
                "source": f"paper_{paper.id}",
                "target": f"paper_{ref.id}",
                "type": "citation"
            })
            
        # Concept nodes and edges
        for concept in paper.concepts:
            c_id = f"concept_{concept.id}"
            if c_id not in concept_nodes:
                concept_nodes[c_id] = {
                    "id": c_id,
                    "type": "concept",
                    "data": {
                        "label": concept.name,
                        "description": concept.description
                    }
                }
                nodes.append(concept_nodes[c_id])
            
            edges.append({
                "id": f"e_p{paper.id}_c{concept.id}",
                "source": f"paper_{paper.id}",
                "target": c_id,
                "type": "semantic"
            })
            
    return {"nodes": nodes, "edges": edges}

@router.delete("/clear/all", response_model=dict)
def clear_workspace(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete all papers, notes, and references for the current user."""
    # SQLAlchemy will handle cascade deletes for notes if configured in models, 
    # but we'll be explicit here for the papers.
    papers = db.query(PaperModel).filter(PaperModel.user_id == current_user.id).all()
    for paper in papers:
        db.delete(paper)
    
    db.commit()
    return {"status": "success", "message": "Entire workspace cleared"}

@router.get("/{id}", response_model=PaperSchema)
def read_paper(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper

@router.delete("/{id}", response_model=dict)
def delete_paper(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    db.delete(paper)
    db.commit()
    return {"status": "success", "message": "Paper deleted"}

@router.get("/{id}/file")
def get_paper_file(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == id, PaperModel.user_id == current_user.id).first()
    if not paper or not paper.upload_url:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(paper.upload_url, media_type="application/pdf")

# Notes Endpoints
@router.post("/{id}/notes", response_model=NoteSchema)
def create_note(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    note_in: NoteCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    note = NoteModel(
        **note_in.dict(),
        user_id=current_user.id,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{id}/notes", response_model=List[NoteSchema])
def get_paper_notes(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return db.query(NoteModel).filter(NoteModel.paper_id == id, NoteModel.user_id == current_user.id).all()
