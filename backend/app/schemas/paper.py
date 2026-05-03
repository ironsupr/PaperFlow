from typing import Optional, List, Any
from pydantic import BaseModel

class ConceptBase(BaseModel):
    name: str
    description: Optional[str] = None

class Concept(ConceptBase):
    id: int
    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    content: str
    tags: Optional[List[str]] = None
    position_data: Optional[dict] = None
    paper_id: int

class NoteCreate(NoteBase):
    pass

class Note(NoteBase):
    id: int
    user_id: int
    created_at: str
    class Config:
        from_attributes = True

class PaperBase(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    abstract: Optional[str] = None
    year: Optional[int] = None
    domain: Optional[str] = None
    topic: Optional[str] = None

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
    year: Optional[int] = None
    domain: Optional[str] = None
    topic: Optional[str] = None

    class Config:
        from_attributes = True

class Paper(PaperInDBBase):
    reference_ids: List[int] = []
    concepts: List[Concept] = []
    
    class Config:
        from_attributes = True
