import os
import shutil
from typing import List
from fastapi import UploadFile
import PyPDF2
from app.models.paper import Paper
from app.services.ai_service import ai_service
from sqlalchemy.orm import Session

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PaperService:
    def parse_pdf(self, file_path: str) -> str:
        text = ""
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text

    def chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        # Simple chunking by characters for now
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    async def process_paper(self, db: Session, file: UploadFile, user_id: int) -> Paper:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = self.parse_pdf(file_path)
        chunks = self.chunk_text(text)
        
        # Add to AI index
        ai_service.add_to_index(chunks)

        # Create paper record
        paper = Paper(
            title=file.filename, # Simple placeholder
            authors="Unknown", # Extract from PDF metadata if possible
            abstract=text[:500] + "...",
            upload_url=file_path,
            user_id=user_id,
        )
        db.add(paper)
        db.commit()
        db.refresh(paper)
        return paper

paper_service = PaperService()
