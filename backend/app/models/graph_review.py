from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from app.db.session import Base

class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_paper_id = Column(Integer, ForeignKey("papers.id"))
    target_paper_id = Column(Integer, ForeignKey("papers.id"))
    relation_type = Column(String) # e.g., "citation", "similarity"

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    scores = Column(JSON) # {clarity: 8, novelty: 7, ...}
    feedback = Column(JSON) # {strengths: [], weaknesses: [], suggestions: []}
