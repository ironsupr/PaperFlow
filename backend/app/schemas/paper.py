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
    upload_url: str
    user_id: int

    class Config:
        from_attributes = True

class Paper(PaperInDBBase):
    pass
