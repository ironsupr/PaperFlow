from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from app.api import deps
from app.models.user import User
from app.schemas.paper import Paper as PaperSchema
from app.services.paper_service import paper_service
from app.models.paper import Paper as PaperModel

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
        .filter(PaperModel.user_id == current_user.id)\
        .offset(skip).limit(limit).all()

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

@router.post("/{id}/references/{ref_id}", response_model=PaperSchema)
def add_paper_reference(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    ref_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == id, PaperModel.user_id == current_user.id).first()
    reference = db.query(PaperModel).filter(PaperModel.id == ref_id, PaperModel.user_id == current_user.id).first()
    
    if not paper or not reference:
        raise HTTPException(status_code=404, detail="Paper or reference not found")
    
    if reference not in paper.references:
        paper.references.append(reference)
        db.add(paper)
        db.commit()
        db.refresh(paper)
    
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

@router.delete("/clear/all", response_model=dict)
def clear_all_papers(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    db.query(PaperModel).filter(PaperModel.user_id == current_user.id).delete()
    db.commit()
    return {"status": "success", "message": "Workspace cleared"}

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

@router.post("/{id}/highlights", response_model=PaperSchema)
def update_paper_highlights(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    highlights: List[dict],
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    paper = db.query(PaperModel).filter(PaperModel.id == id, PaperModel.user_id == current_user.id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.highlights = highlights
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper
