from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
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
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    return await paper_service.process_paper(db, file, current_user.id)

@router.get("/", response_model=List[PaperSchema])
def read_papers(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(PaperModel).filter(PaperModel.user_id == current_user.id).offset(skip).limit(limit).all()

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
