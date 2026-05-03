from typing import Optional, List
from pydantic import BaseModel

class PaperBase(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    abstract: Optional[str] = None

class PaperCreate(PaperBase):
    title: str

class PaperUpdate(PaperBase):
    pass

class PaperInDBBase(PaperBase):
    id: int
    upload_url: Optional[str] = None
    scholar_url: Optional[str] = None
    user_id: int
    is_external: int = 0
    citation_contexts: Optional[dict] = None
    sections: Optional[dict] = None
    highlights: Optional[List[dict]] = None

    class Config:
        from_attributes = True

class Paper(PaperInDBBase):
    reference_ids: List[int] = []
    
    class Config:
        from_attributes = True
