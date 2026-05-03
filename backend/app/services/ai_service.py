import os
from typing import List, Dict, Any
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.core.config import settings

SYSTEM_INSTRUCTION = """You are the PaperFlow AI Research Assistant. 
Your primary goal is to answer questions strictly using the provided research paper context.
If context is provided, base your answer entirely on that text. If the information is not in the context, state that clearly but try to provide the most relevant information found within the paper.
Always be professional, concise, and scientifically accurate."""

class AIService:
    def __init__(self):
        # Gemini Configuration
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.llm = genai.GenerativeModel(
                model_name='gemini-3.1-flash-lite-preview',
                system_instruction=SYSTEM_INSTRUCTION
            )
            self.embedding_model = "models/gemini-embedding-2"
            self.dimension = 3072
        else:
            self.llm = None
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.dimension = 384
            
        self.index = faiss.IndexFlatL2(self.dimension)
        self.chunks = []
        self.chunk_metadata = [] # List of {"paper_id": int}

    async def generate_embeddings(self, text: str) -> np.ndarray:
        if self.llm:
            try:
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=text,
                    task_type="retrieval_document"
                )
                return np.array(result['embedding'])
            except Exception as e:
                print(f"Embedding Error: {e}")
                return np.zeros(self.dimension)
        return self.model.encode([text])[0]

    async def add_to_index(self, text_chunks: List[str], paper_id: int):
        if not text_chunks:
            return
        
        if self.llm:
            try:
                embeddings = []
                batch_size = 100
                for i in range(0, len(text_chunks), batch_size):
                    batch = text_chunks[i:i+batch_size]
                    result = genai.embed_content(
                        model=self.embedding_model,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    embeddings.extend(result['embedding'])
                
                self.index.add(np.array(embeddings).astype('float32'))
            except Exception as e:
                print(f"Add to Index Error: {e}")
        else:
            embeddings = self.model.encode(text_chunks)
            self.index.add(np.array(embeddings).astype('float32'))
            
        self.chunks.extend(text_chunks)
        self.chunk_metadata.extend([{"paper_id": paper_id}] * len(text_chunks))

    async def search_similar(self, query: str, paper_ids: List[int] = None, top_k: int = 5) -> List[str]:
        if not self.chunks:
            return []
            
        if self.llm:
            try:
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=query,
                    task_type="retrieval_query"
                )
                query_vector = np.array([result['embedding']]).astype('float32')
            except Exception as e:
                print(f"Search Embedding Error: {e}")
                return []
        else:
            query_vector = self.model.encode([query]).astype('float32')
            
        search_k = top_k * 10 if paper_ids else top_k
        distances, indices = self.index.search(query_vector, min(search_k, len(self.chunks)))
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.chunks):
                if paper_ids:
                    if self.chunk_metadata[idx]["paper_id"] in paper_ids:
                        results.append(self.chunks[idx])
                else:
                    results.append(self.chunks[idx])
            
            if len(results) >= top_k:
                break
        return results

    async def generate_response(self, prompt: str, context: str = "", follow_ups: bool = True) -> str:
        if not self.llm:
            return "Gemini API Key not configured."
        
        instr = "Answer the following question based ONLY on the research paper context provided below. If the information is not present in the context, say you don't know based on the paper."
        if follow_ups:
            instr += " Also, provide 2 short, relevant follow-up questions at the very end of your response, prefixed with 'FOLLOW_UP: '."

        if context:
            full_prompt = f"INSTRUCTION: {instr}\n\nCONTEXT:\n{context}\n\nUSER QUESTION: {prompt}"
        else:
            full_prompt = f"The user is asking a question but no specific paper context was found. Please answer based on your general knowledge but emphasize that you don't have the specific paper context yet.\n\nUSER QUESTION: {prompt}"
            
        try:
            response = await self.llm.generate_content_async(full_prompt)
            return response.text
        except Exception as e:
            return f"AI Error: {str(e)}"

    async def generate_summary(self, text: str, level: str = "intermediate") -> str:
        if not self.llm:
            return "Gemini API Key not configured."

        level_prompts = {
            "beginner": "Explain this research text like I'm 5 years old. Use simple analogies and avoid jargon.",
            "intermediate": "Provide a clear and concise academic summary of this text for a general researcher.",
            "technical": "Provide a high-level technical summary of this text. Focus on data, methodology, and specific results."
        }
        
        system_instruction = level_prompts.get(level, level_prompts["intermediate"])
        prompt = f"{system_instruction}\n\nText to summarize:\n{text[:15000]}"
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Summarization Error: {str(e)}"

    async def explain_text(self, selection: str, paper_context: str = "") -> str:
        if not self.llm:
            return "Gemini API Key not configured."

        prompt = f"Selection from a research paper: '{selection}'\n\nPaper Context (Abstract/Intro): {paper_context}\n\nPlease explain this selection in simple terms, clarifying any technical jargon used."
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Explanation Error: {str(e)}"

    async def get_definitions(self, text: str) -> dict:
        if not self.llm:
            return {}

        prompt = f"Identify the top 5 most complex technical terms in the following text and provide concise 1-sentence definitions for each. Format your response exactly as a valid JSON object like this: {{\"term\": \"definition\"}}\n\nText:\n{text[:5000]}"
        
        try:
            response = await self.llm.generate_content_async(prompt)
            import json
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Glossary Extraction Error: {e}")
            return {}

    async def get_core_concepts(self, text: str) -> List[Dict[str, str]]:
        if not self.llm:
            return []
        
        prompt = """Identify the top 5 core scientific concepts or specialized terms discussed in this text. 
        For each, provide a name and a brief 1-sentence description.
        Format your response as a valid JSON list of objects: [{"name": "Concept", "description": "..."}]
        TEXT:
        """ + text[:10000]
        
        try:
            response = await self.llm.generate_content_async(prompt)
            import json
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Concept Extraction Error: {e}")
            return []

    async def generate_role_insight(self, text: str, role: str) -> str:
        if not self.llm:
            return "Gemini API Key not configured."

        prompts = {
            "student": "Provide a high-level 'Concept Summary' of this paper. Explain the core discovery or thesis in a way that is easy to grasp but academically accurate.",
            "researcher": "Perform 'Gap Detection' on this paper. Identify what is missing, what the future work could be, or where the current methodology might be limited.",
            "reviewer": "Perform 'Flaw Detection' on this paper. Critically analyze the logic, methodology, or assumptions and identify potential points of failure or weak evidence."
        }
        
        system_instruction = prompts.get(role, prompts["student"])
        prompt = f"{system_instruction}\n\nText:\n{text[:15000]}"
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Role Insight Error: {str(e)}"

    async def generate_novelty_score(self, text: str) -> int:
        if not self.llm:
            return 50
        
        prompt = f"On a scale of 0 to 100, how novel/unique is the research presented in this text? Return ONLY the number.\n\nText:\n{text[:5000]}"
        try:
            response = await self.llm.generate_content_async(prompt)
            import re
            match = re.search(r'\d+', response.text)
            return int(match.group()) if match else 50
        except:
            return 50

    async def cross_paper_analysis(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm:
            return "Intelligence engine not configured."
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nABSTRACT: {p['abstract'][:2000]}\n\n"
        
        prompt = f"""Perform a comparative analysis of the following research papers.
        Identify:
        1. Shared methodologies or theoretical frameworks.
        2. Common key concepts.
        3. Contrasting results or conflicting viewpoints.
        4. Synthesized summary of how these papers collectively advance the field.

        PAPERS DATA:
        {context}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Analysis Error: {str(e)}"

    async def generate_podcast_script(self, papers_data: List[Dict[str, Any]], tone: str = "casual") -> List[Dict[str, str]]:
        if not self.llm:
            return []
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nSUMMARY: {p['abstract'][:2000]}\n\n"

        prompt = f"""You are a podcast script writer for 'Research Radio'. 
        Generate a conversational dialogue between two hosts, 'Alex' and 'Jamie', discussing the following research.
        Tone: {tone}. 
        Format: A JSON list of objects: [{"speaker": "Alex", "text": "..."}]
        The conversation should be engaging, explaining complex ideas simply but accurately.
        
        RESEARCH DATA:
        {context}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            import json
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Podcast Script Error: {e}")
            return []

    async def index_all_papers(self, db: Session):
        from app.models.paper import Paper
        papers = db.query(Paper).all()
        self.chunks = []
        self.chunk_metadata = []
        self.index = faiss.IndexFlatL2(self.dimension)
        
        for paper in papers:
            text = ""
            if paper.sections:
                for section_content in paper.sections.values():
                    text += str(section_content) + "\n"
            if not text and paper.abstract:
                text = paper.abstract
            if text:
                from app.services.paper_service import paper_service
                chunks = paper_service.chunk_text(text)
                await self.add_to_index(chunks, paper.id)
        print(f"Indexed {len(papers)} papers ({len(self.chunks)} chunks) on startup.")

ai_service = AIService()
