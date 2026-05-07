from typing import List
from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

# Association table for self-referential many-to-many relationship
paper_references = Table(
    "paper_references",
    Base.metadata,
    Column("paper_id", Integer, ForeignKey("papers.id"), primary_key=True),
    Column("reference_id", Integer, ForeignKey("papers.id"), primary_key=True),
)

# Association table for Paper and Concept
paper_concepts = Table(
    "paper_concepts",
    Base.metadata,
    Column("paper_id", Integer, ForeignKey("papers.id"), primary_key=True),
    Column("concept_id", Integer, ForeignKey("concepts.id"), primary_key=True),
)

class Concept(Base):
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)

    papers = relationship("Paper", secondary=paper_concepts, back_populates="concepts")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    tags = Column(JSON, nullable=True) # ["AI", "Methods"]
    position_data = Column(JSON, nullable=True) # { "page": 1, "rect": [...] }
    paper_id = Column(Integer, ForeignKey("papers.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(String) # For simplicity, can be DateTime

    paper = relationship("Paper", back_populates="notes")
    user = relationship("User")

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    authors = Column(String)
    abstract = Column(Text)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    year = Column(Integer, nullable=True)
    domain = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    upload_url = Column(String)
    scholar_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    metadata_json = Column(JSON, nullable=True)
    is_external = Column(Integer, default=0) # 0 for uploaded, 1 for fetched
    citation_contexts = Column(JSON, nullable=True) # { "ref_id": ["context1", "context2"] }
    sections = Column(JSON, nullable=True) # { "Abstract": "...", "Introduction": "..." }
    highlights = Column(JSON, nullable=True) # [ { "content": "...", "note": "...", "position": {...} } ]

    owner = relationship("User")
    
    # Relationships
    references = relationship(
        "Paper",
        secondary=paper_references,
        primaryjoin=id == paper_references.c.paper_id,
        secondaryjoin=id == paper_references.c.reference_id,
        backref="cited_by"
    )
    
    concepts = relationship("Concept", secondary=paper_concepts, back_populates="papers")
    notes = relationship("Note", back_populates="paper", cascade="all, delete-orphan")

    @property
    def reference_ids(self) -> List[int]:
        return [ref.id for ref in self.references]
