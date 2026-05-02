from sqlalchemy import Column, Integer, String, Enum as SQLEnum
import enum
from app.db.session import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    RESEARCHER = "researcher"
    REVIEWER = "reviewer"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default=UserRole.STUDENT)
