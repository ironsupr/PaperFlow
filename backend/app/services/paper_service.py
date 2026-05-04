import os
import shutil
import re
import logging
import httpx
from typing import List, Dict, Any
from fastapi import UploadFile, BackgroundTasks
import pdfplumber
from scholarly import scholarly
from app.models.paper import Paper, Concept
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

    def extract_sections(self, text: str) -> Dict[str, str]:
        section_headers = [
            "Abstract", "Introduction", "Methods", "Methodology", 
            "Results", "Discussion", "Conclusion", "References", "Bibliography"
        ]
        
        found_sections = {}
        pattern = r'\n\s*(' + '|'.join(section_headers) + r')\s*\n'
        splits = re.split(pattern, text, flags=re.IGNORECASE)
        
        if splits and len(splits) > 0:
            found_sections["Header"] = splits[0][:1000]
            
        for i in range(1, len(splits), 2):
            if i + 1 < len(splits):
                header = splits[i].capitalize()
                content = splits[i+1].strip()
                found_sections[header] = content[:5000]
                
        return found_sections

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
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for title in paper_titles:
            contexts[title] = []
            norm_title = self.normalize_title(title)
            if len(norm_title) < 10: continue
            for sentence in sentences:
                if norm_title in self.normalize_title(sentence):
                    contexts[title].append(sentence.strip())
        return contexts

    async def fetch_paper_from_semantic_scholar(self, title: str) -> Dict[str, Any] | None:
        """Search for a paper on Semantic Scholar API."""
        try:
            async with httpx.AsyncClient() as client:
                query = title.replace(' ', '+')
                response = await client.get(
                    f"https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=1&fields=title,authors,year,url,abstract,venue,externalIds",
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('data') and len(data['data']) > 0:
                        pub = data['data'][0]
                        return {
                            'title': pub.get('title'),
                            'authors': ", ".join([a['name'] for a in pub.get('authors', [])]) if pub.get('authors') else 'Unknown',
                            'year': pub.get('year'),
                            'url': pub.get('url'),
                            'abstract': pub.get('abstract', 'No abstract available'),
                            'venue': pub.get('venue'),
                            'external_ids': pub.get('externalIds', {}),
                        }
        except Exception as e:
            logger.warning(f"Semantic Scholar citation search failed for '{title}': {e}")
        return None

    async def fetch_paper_from_google_scholar(self, title: str) -> Dict[str, Any] | None:
        """Search for a paper on Google Scholar with retry logic."""
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    delay = 2 ** attempt + (attempt * 0.5)
                    logger.info(f"Retrying Google Scholar search for '{title}' (attempt {attempt + 1}/{max_retries}), waiting {delay}s")
                    time.sleep(delay)
                search_query = scholarly.search_pubs(title)
                pub = next(search_query)
                return {
                    'title': pub['bib']['title'],
                    'authors': ", ".join(pub['bib'].get('author', [])) if pub['bib'].get('author') else 'Unknown',
                    'year': int(pub['bib'].get('pub_year', 0)) or None,
                    'url': pub.get('pub_url') or pub.get('eprint_url'),
                    'abstract': pub['bib'].get('abstract', 'No abstract available'),
                }
            except Exception as e:
                error_str = str(e).lower()
                if 'captcha' in error_str or '429' in error_str or 'blocked' in error_str:
                    logger.warning(f"Google Scholar CAPTCHA/rate limit for '{title}' (attempt {attempt + 1})")
                    if attempt < max_retries - 1:
                        time.sleep(5 * (attempt + 1))
                    continue
                logger.warning(f"Google Scholar search failed for '{title}': {e}")
                break
        return None

    async def fetch_and_link_online_citations_sync(self, paper_id: int, titles: List[str], contexts: Dict[str, List[str]]):
        db = SessionLocal()
        try:
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if not paper: return
            new_contexts = paper.citation_contexts or {}

            for title in titles:
                try:
                    search_title = re.sub(r'[^\w\s]', ' ', title).strip()
                    if not search_title: continue

                    logger.info(f"Searching for citation: {search_title}")

                    pub_data = await self.fetch_paper_from_semantic_scholar(search_title)
                    source = "Semantic Scholar"
                    if not pub_data:
                        pub_data = await self.fetch_paper_from_google_scholar(search_title)
                        source = "Google Scholar"

                    if not pub_data or not pub_data.get('title'):
                        logger.warning(f"No results found for citation: {title}")
                        continue

                    pub_title = pub_data['title']
                    existing = db.query(Paper).filter(Paper.title == pub_title).first()
                    if not existing:
                        existing = Paper(
                            title=pub_title,
                            authors=pub_data.get('authors', 'Unknown'),
                            abstract=pub_data.get('abstract', 'No abstract available'),
                            scholar_url=pub_data.get('url'),
                            user_id=paper.user_id,
                            is_external=1,
                            year=pub_data.get('year')
                        )
                        db.add(existing)
                        db.flush()
                        logger.info(f"Added new citation from {source}: {pub_title}")

                    if existing not in paper.references:
                        paper.references.append(existing)
                        if title in contexts:
                            new_contexts[str(existing.id)] = contexts[title]
                        paper.citation_contexts = new_contexts
                        db.commit()
                except Exception as e:
                    logger.warning(f"Failed to process citation '{title}': {e}")
                    db.rollback()
        finally:
            db.close()

    def normalize_title(self, title: str) -> str:
        return re.sub(r'[^\w\s]', '', title).lower().strip()

    async def fetch_metadata_from_semantic_scholar(self, db: Session, paper_id: int) -> bool:
        """Fetch metadata from Semantic Scholar API (faster fallback)."""
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper: return False
        try:
            async with httpx.AsyncClient() as client:
                query = paper.title.replace(' ', '+')
                response = await client.get(
                    f"https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=1&fields=title,authors,year,url,abstract",
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('data') and len(data['data']) > 0:
                        pub = data['data'][0]
                        if paper.authors == "Unknown":
                            paper.authors = ", ".join([a['name'] for a in pub.get('authors', [])])
                        if not paper.year:
                            paper.year = pub.get('year')
                        if not paper.scholar_url:
                            paper.scholar_url = pub.get('url')
                        db.commit()
                        logger.info(f"Semantic Scholar enrichment success: {paper.title}")
                        return True
        except Exception as e:
            logger.warning(f"Semantic Scholar enrichment failed for '{paper.title}': {e}")
        return False

    async def fetch_metadata_from_scholar(self, db: Session, paper_id: int):
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper: return
        try:
            logger.info(f"Fetching Scholar metadata fallback for: {paper.title}")
            search_query = scholarly.search_pubs(paper.title)
            pub = next(search_query)
            if paper.authors == "Unknown":
                authors_data = pub['bib'].get('author', 'Unknown')
                paper.authors = ", ".join(authors_data) if isinstance(authors_data, list) else str(authors_data)
            if not paper.year:
                try:
                    paper.year = int(pub['bib'].get('pub_year', 0)) or None
                except: pass
            if not paper.scholar_url:
                paper.scholar_url = pub.get('pub_url') or pub.get('eprint_url')
            db.commit()
        except Exception as e:
            logger.warning(f"Scholar fallback failed for '{paper.title}': {e}")

    async def extract_and_link_concepts(self, db: Session, paper_id: int, text: str):
        concepts_data = await ai_service.get_core_concepts(text)
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper: return

        for c_data in concepts_data:
            concept_name = c_data.get("name")
            if not concept_name: continue
            existing_concept = db.query(Concept).filter(Concept.name == concept_name).first()
            if not existing_concept:
                existing_concept = Concept(name=concept_name, description=c_data.get("description"))
                db.add(existing_concept)
                db.flush()
            
            if existing_concept not in paper.concepts:
                paper.concepts.append(existing_concept)
        
        db.commit()

    async def enrich_paper_background(self, paper_id: int, text: str):
        """Perform heavy enrichment tasks in the background."""
        db = SessionLocal()
        try:
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if not paper: return

            # 1. AI Metadata Extraction (Year, Domain, Topic)
            metadata = await ai_service.extract_metadata(text)
            paper.year = metadata.get("year")
            paper.domain = metadata.get("domain")
            paper.topic = metadata.get("topic")
            db.commit()

            # 2. External Metadata Fallback (Semantic Scholar then Google Scholar)
            if paper.authors == "Unknown" or not paper.year:
                success = await self.fetch_metadata_from_semantic_scholar(db, paper.id)
                if not success:
                    await self.fetch_metadata_from_scholar(db, paper.id)

            # 3. Concept Mapping
            await self.extract_and_link_concepts(db, paper.id, text)

            # 4. Citation Discovery
            citation_titles = self.extract_citations_titles(text)
            if citation_titles:
                online_contexts = self.extract_citation_contexts(text, citation_titles)
                await self.fetch_and_link_online_citations_sync(paper.id, citation_titles, online_contexts)
                
            db.commit()
            logger.info(f"Background enrichment complete for paper: {paper.title}")
        except Exception as e:
            logger.error(f"Background enrichment failed for paper {paper_id}: {e}")
            db.rollback()
        finally:
            db.close()

    async def process_paper(self, db: Session, file: UploadFile, user_id: int, background_tasks: BackgroundTasks) -> Paper:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = self.parse_pdf(file_path)
        sections = self.extract_sections(text)
        
        paper = Paper(
            title=file.filename.replace(".pdf", ""),
            authors="Unknown",
            abstract=sections.get("Abstract", text[:500] + "..."),
            upload_url=file_path,
            user_id=user_id,
            is_external=0,
            sections=sections,
            highlights=[]
        )
        
        norm_text = self.normalize_title(text)
        existing_papers = db.query(Paper).filter(Paper.user_id == user_id).all()
        local_contexts = {}
        for existing in existing_papers:
            norm_title = self.normalize_title(existing.title)
            if len(norm_title) > 10 and norm_title in norm_text:
                if existing not in paper.references:
                    paper.references.append(existing)
                    paper_contexts = self.extract_citation_contexts(text, [existing.title])
                    local_contexts[str(existing.id)] = paper_contexts.get(existing.title, [])

        paper.citation_contexts = local_contexts
        db.add(paper)
        db.commit()
        db.refresh(paper)
        
        chunks = self.chunk_text(text)
        await ai_service.add_to_index(chunks, paper.id)
        background_tasks.add_task(self.enrich_paper_background, paper.id, text)

        return paper

paper_service = PaperService()
