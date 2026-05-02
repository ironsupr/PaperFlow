from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    authors = Column(String)
    abstract = Column(Text)
    upload_url = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    metadata_json = Column(JSON, nullable=True)

    owner = relationship("User")
