from typing import List
from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from app.db.session import Base

# Association table for self-referential many-to-many relationship
paper_references = Table(
    "paper_references",
    Base.metadata,
    Column("paper_id", Integer, ForeignKey("papers.id"), primary_key=True),
    Column("reference_id", Integer, ForeignKey("papers.id"), primary_key=True),
)

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    authors = Column(String)
    abstract = Column(Text)
    upload_url = Column(String)
    scholar_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    metadata_json = Column(JSON, nullable=True)
    is_external = Column(Integer, default=0) # 0 for uploaded, 1 for fetched
    citation_contexts = Column(JSON, nullable=True) # { "ref_id": ["context1", "context2"] }
    sections = Column(JSON, nullable=True) # { "Abstract": "...", "Introduction": "..." }
    highlights = Column(JSON, nullable=True) # [ { "content": "...", "note": "...", "position": {...} } ]

    owner = relationship("User")
    
    # Self-referential relationship
    references = relationship(
        "Paper",
        secondary=paper_references,
        primaryjoin=id == paper_references.c.paper_id,
        secondaryjoin=id == paper_references.c.reference_id,
        backref="cited_by"
    )

    @property
    def reference_ids(self) -> List[int]:
        return [ref.id for ref in self.references]
