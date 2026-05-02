import os
import shutil
import re
import logging
from typing import List, Dict
from fastapi import UploadFile, BackgroundTasks
import pdfplumber
from scholarly import scholarly
from app.models.paper import Paper
from app.services.ai_service import ai_service
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Set up logging for background tasks
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaperService:
    def parse_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path} with pdfplumber: {e}")
            try:
                import PyPDF2
                with open(file_path, "rb") as file:
                    reader = PyPDF2.PdfReader(file)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
            except Exception as e2:
                logger.error(f"Fallback PyPDF2 also failed for {file_path}: {e2}")
        return text

    def chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def extract_citations_titles(self, text: str) -> List[str]:
        ref_keywords = [r"References", r"Bibliography", r"Works Cited", r"LITERATURE CITED", r"REFERENCES", r"BIBLIOGRAPHY"]
        lines = text.split('\n')
        refs_start_line = -1
        for i, line in enumerate(reversed(lines)):
            line_clean = line.strip()
            if any(re.fullmatch(kw, line_clean, re.IGNORECASE) for kw in ref_keywords):
                refs_start_line = len(lines) - 1 - i
                break
        
        if refs_start_line == -1:
            refs_start = -1
            for kw in ref_keywords:
                match = re.search(r'\b' + kw + r'\b', text)
                if match:
                    all_matches = list(re.finditer(r'\b' + kw + r'\b', text))
                    refs_start = all_matches[-1].start()
                    break
            if refs_start == -1: return []
            refs_text = text[refs_start:]
        else:
            refs_text = "\n".join(lines[refs_start_line:])

        citations = []
        if re.search(r'\[\d+\]', refs_text):
            citations = re.split(r'\[\d+\]', refs_text)
        elif re.search(r'\n\s*\d+\.\s+', refs_text):
            citations = re.split(r'\n\s*\d+\.\s+', refs_text)
        else:
            citations = refs_text.split('\n\n')

        titles = []
        for cite in citations:
            cite = cite.strip()
            if not cite: continue
            cite_flat = cite.replace('\n', ' ')
            quoted = re.findall(r'\"(.*?)\"', cite_flat)
            if quoted:
                titles.extend(quoted)
                continue
            parts = cite_flat.split('.')
            for part in parts:
                part = part.strip()
                if 20 < len(part) < 150 and len(part.split()) > 3:
                    if not re.search(r'[A-Z]\.\s*[A-Z]\.', part):
                        titles.append(part)
                        break

        unique_titles = []
        seen = set()
        for t in titles:
            clean_t = re.sub(r'\(\d{4}\)', '', t.strip().strip(',').strip('.')).strip()
            if len(clean_t) > 15 and clean_t.lower() not in seen:
                unique_titles.append(clean_t)
                seen.add(clean_t.lower())
        return unique_titles[:15]

    def extract_citation_contexts(self, text: str, paper_titles: List[str]) -> Dict[str, List[str]]:
        contexts = {}
        # Simple sentence tokenizer
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for title in paper_titles:
            contexts[title] = []
            # Normalize title for searching
            norm_title = self.normalize_title(title)
            if len(norm_title) < 10: continue
            
            for sentence in sentences:
                if norm_title in self.normalize_title(sentence):
                    contexts[title].append(sentence.strip())
        return contexts

    def fetch_and_link_online_citations_sync(self, paper_id: int, titles: List[str], contexts: Dict[str, List[str]]):
        db = SessionLocal()
        try:
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if not paper: return

            new_contexts = paper.citation_contexts or {}
            
            for title in titles:
                try:
                    search_title = re.sub(r'[^\w\s]', ' ', title).strip()
                    if not search_title: continue
                    search_query = scholarly.search_pubs(search_title)
                    pub = next(search_query)
                    pub_title = pub['bib']['title']
                    
                    existing = db.query(Paper).filter(Paper.title == pub_title).first()
                    if not existing:
                        authors_data = pub['bib'].get('author', 'Unknown')
                        authors_str = ", ".join(authors_data) if isinstance(authors_data, list) else str(authors_data)
                        
                        existing = Paper(
                            title=pub_title,
                            authors=authors_str,
                            abstract=pub['bib'].get('abstract', 'No abstract available'),
                            scholar_url=pub.get('pub_url') or pub.get('eprint_url'),
                            user_id=paper.user_id,
                            is_external=1,
                            metadata_json=pub
                        )
                        db.add(existing)
                        db.flush()
                    
                    if existing not in paper.references:
                        paper.references.append(existing)
                        # Save context if found
                        if title in contexts:
                            new_contexts[str(existing.id)] = contexts[title]
                        
                        paper.citation_contexts = new_contexts
                        db.commit()
                except Exception as e:
                    logger.warning(f"Failed to process citation '{title}': {e}")
                    db.rollback() # Crucial: rollback to keep the session usable
            
        finally:
            db.close()

    def normalize_title(self, title: str) -> str:
        return re.sub(r'[^\w\s]', '', title).lower().strip()

    async def process_paper(self, db: Session, file: UploadFile, user_id: int, background_tasks: BackgroundTasks) -> Paper:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = self.parse_pdf(file_path)
        chunks = self.chunk_text(text)
        ai_service.add_to_index(chunks)

        paper = Paper(
            title=file.filename.replace(".pdf", ""),
            authors="Unknown",
            abstract=text[:500] + "...",
            upload_url=file_path,
            user_id=user_id,
            is_external=0
        )
        
        # Local citation detection and context extraction
        norm_text = self.normalize_title(text)
        existing_papers = db.query(Paper).filter(Paper.user_id == user_id).all()
        local_contexts = {}
        
        for existing in existing_papers:
            norm_title = self.normalize_title(existing.title)
            if len(norm_title) > 10 and norm_title in norm_text:
                if existing not in paper.references:
                    paper.references.append(existing)
                    # Extract contexts for local paper
                    paper_contexts = self.extract_citation_contexts(text, [existing.title])
                    local_contexts[str(existing.id)] = paper_contexts.get(existing.title, [])

        paper.citation_contexts = local_contexts
        db.add(paper)
        db.commit()
        db.refresh(paper)
        
        citation_titles = self.extract_citations_titles(text)
        if citation_titles:
            # Extract potential contexts for online papers too
            online_contexts = self.extract_citation_contexts(text, citation_titles)
            background_tasks.add_task(self.fetch_and_link_online_citations_sync, paper.id, citation_titles, online_contexts)

        return paper

paper_service = PaperService()
