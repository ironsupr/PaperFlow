import os
import shutil
import re
import logging
from typing import List
from fastapi import UploadFile, BackgroundTasks
import pdfplumber
from scholarly import scholarly
from app.models.paper import Paper
from app.services.ai_service import ai_service
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
        ref_keywords = [
            r"References", 
            r"Bibliography", 
            r"Works Cited", 
            r"LITERATURE CITED",
            r"REFERENCES",
            r"BIBLIOGRAPHY"
        ]
        
        lines = text.split('\n')
        refs_start_line = -1
        
        for i, line in enumerate(reversed(lines)):
            line_clean = line.strip()
            if any(re.fullmatch(kw, line_clean, re.IGNORECASE) for kw in ref_keywords):
                refs_start_line = len(lines) - 1 - i
                break
        
        if refs_start_line == -1:
            logger.info("No clear Reference header found, falling back to keyword search.")
            refs_start = -1
            for kw in ref_keywords:
                match = re.search(r'\b' + kw + r'\b', text, re.IGNORECASE)
                if match:
                    all_matches = list(re.finditer(r'\b' + kw + r'\b', text, re.IGNORECASE))
                    refs_start = all_matches[-1].start()
                    break
            
            if refs_start == -1:
                logger.warning("No reference markers found at all.")
                return []
            refs_text = text[refs_start:]
        else:
            refs_text = "\n".join(lines[refs_start_line:])

        logger.info(f"Extracting titles from reference section (length: {len(refs_text)})")

        citation_patterns = [
            r'(?:\[\d+\])\s*(.+?)(?:\.\s+\d{4}|\()',
            r'^\d+\.\s+(.+?)(?:\.\s+\d{4}|\()',
            r'^([A-Z][^.]{20,150})\.',
        ]
        
        citations = []
        for pattern in citation_patterns:
            matches = re.findall(pattern, refs_text, re.MULTILINE | re.DOTALL)
            if matches:
                citations = [m.strip() for m in matches if len(m.strip()) > 10]
                break
        
        if not citations:
            citations = re.split(r'\n\s*\n', refs_text)

        titles = []
        for cite in citations:
            cite_flat = cite.replace('\n', ' ').strip()
            if len(cite_flat) < 15:
                continue
            
            quoted = re.findall(r'"([^"]{20,200})"', cite_flat)
            if quoted:
                for q in quoted:
                    if len(q) > 15 and not re.search(r'\d{4}', q):
                        titles.append(q)
                        continue
            
            author_year_pattern = re.search(r'([A-Z][^.]{15,180})\.\s*\(?\d{4}', cite_flat)
            if author_year_pattern:
                title_candidate = author_year_pattern.group(1).strip()
                if 20 < len(title_candidate) < 150 and not re.match(r'^[A-Z]\.\s*[A-Z]\.', title_candidate):
                    titles.append(title_candidate)
                    continue
            
            parts = cite_flat.split('.')
            for part in parts:
                part = part.strip()
                if 25 < len(part) < 140 and len(part.split()) > 3:
                    if not re.search(r'\(\d{4}\)', part) and not re.search(r'^[A-Z]\.\s*[A-Z]\.', part):
                        titles.append(part)
                        break

        unique_titles = []
        seen = set()
        for t in titles:
            clean_t = re.sub(r'\s+', ' ', t).strip()
            clean_t = re.sub(r'\(\d{4}[a-z]?\)', '', clean_t).strip()
            clean_t = re.sub(r'^\d+\.\s*', '', clean_t).strip()
            clean_t = re.sub(r'^\[\d+\]\s*', '', clean_t).strip()
            
            clean_lower = clean_t.lower()
            if len(clean_t) > 15 and clean_lower not in seen:
                unique_titles.append(clean_t)
                seen.add(clean_lower)
                
        logger.info(f"Found {len(unique_titles)} potential citation titles.")
        return unique_titles[:15]

    def fetch_and_link_online_citations_sync(self, paper_id: int, titles: List[str]):
        db = SessionLocal()
        try:
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if not paper:
                logger.error(f"Paper ID {paper_id} not found for citation linking.")
                return

            logger.info(f"Starting online citation fetch for paper: {paper.title}")
            for title in titles:
                try:
                    logger.info(f"Searching for: {title}")
                    search_query = scholarly.search_pubs(title)
                    pub = next(search_query)
                    
                    pub_title = pub['bib'].get('title', title)
                    pub_url = pub.get('pub_url', '')
                    pub_year = pub['bib'].get('pub_year', '')
                    
                    logger.info(f"Found on Google Scholar: {pub_title} ({pub_year})")

                    existing = db.query(Paper).filter(Paper.title == pub_title).first()
                    if not existing:
                        metadata = {
                            'author': pub['bib'].get('author', 'Unknown'),
                            'abstract': pub['bib'].get('abstract', 'No abstract'),
                            'pub_year': pub_year,
                            'pub_url': pub_url,
                            'venue': pub['bib'].get('venue', ''),
                            'citations': pub.get('num_citations', 0)
                        }
                        existing = Paper(
                            title=pub_title,
                            authors=pub['bib'].get('author', 'Unknown'),
                            abstract=pub['bib'].get('abstract', 'No abstract available'),
                            user_id=paper.user_id,
                            is_external=1,
                            scholar_url=pub_url if pub_url else None,
                            metadata_json=metadata
                        )
                        db.add(existing)
                        db.flush()

                    if existing not in paper.references:
                        paper.references.append(existing)
                        db.commit()
                        logger.info(f"Linked citation: {pub_title}")
                except StopIteration:
                    logger.warning(f"No Google Scholar results for: {title}")
                except Exception as e:
                    logger.warning(f"Failed to process citation '{title}': {e}")
            
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
        
        norm_text = self.normalize_title(text)
        existing_papers = db.query(Paper).filter(Paper.user_id == user_id).all()
        for existing in existing_papers:
            norm_title = self.normalize_title(existing.title)
            if len(norm_title) > 10 and norm_title in norm_text:
                if existing not in paper.references:
                    paper.references.append(existing)

        db.add(paper)
        db.commit()
        db.refresh(paper)
        
        citation_titles = self.extract_citations_titles(text)
        if citation_titles:
            background_tasks.add_task(self.fetch_and_link_online_citations_sync, paper.id, citation_titles)

        return paper

paper_service = PaperService()