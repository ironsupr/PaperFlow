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

    async def extract_metadata(self, text: str) -> Dict[str, Any]:
        if not self.llm:
            return {}
        
        prompt = """Extract the following metadata from the provided research paper text:
        1. YEAR: The publication year (integer).
        2. DOMAIN: The broad scientific field (e.g., Computer Science, Biology, Physics).
        3. TOPIC: A more specific sub-topic (e.g., Deep Learning, Genetics, Quantum Mechanics).
        
        Format your response exactly as a JSON object: {"year": 2024, "domain": "...", "topic": "..."}
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
            print(f"Metadata Extraction Error: {e}")
            return {"year": None, "domain": "Unknown", "topic": "Unknown"}

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

    async def detect_research_gaps(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm:
            return "Intelligence engine not configured."
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nABSTRACT: {p['abstract'][:2000]}\n\n"
        
        prompt = f"""Identify research gaps and underexplored zones within the following research corpus.
        Provide a structured analysis:
        1. SPARSE RESEARCH ZONES: Areas where little work has been done.
        2. WEAK CONNECTIONS: Topics that are mentioned but lack deep integration.
        3. RECOMMENDED DIRECTIONS: Strategic paths for new research.
        
        RESEARCH CORPUS:
        {context}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Gap Analysis Error: {str(e)}"

    async def check_novelty_critique(self, idea: str, similar_chunks: List[str]) -> Dict[str, Any]:
        if not self.llm:
            return {"score": 50, "critique": "AI not configured"}
        
        context = "\n---\n".join(similar_chunks)
        prompt = f"""Compare the following NEW RESEARCH IDEA against the existing literature snippets provided.
        Evaluate its novelty on a scale of 0 to 100 and provide a brief critique of overlaps.
        Format your response exactly as a JSON object: {{"score": 85, "critique": "...", "overlaps": ["cited work X covers Y"]}}

        NEW IDEA:
        {idea}

        LITERATURE SNIPPETS:
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
            print(f"Novelty Check Error: {e}")
            return {"score": 50, "critique": f"Analysis failed: {str(e)}", "overlaps": []}

    async def analyze_trends(self, papers_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.llm:
            return {}
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nSUMMARY: {p['abstract'][:1000]}\n\n"

        prompt = f"""Analyze trending topics and declining research areas based on the provided corpus.
        Format your response exactly as a JSON object: 
        {{
            "trending": [{{ "topic": "Name", "momentum": "High", "reason": "..." }}],
            "declining": [{{ "topic": "Name", "reason": "..." }}],
            "clusters": [{{ "name": "Cluster Name", "papers": ["Title 1", "Title 2"] }}]
        }}

        CORPUS:
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
            print(f"Trend Analysis Error: {e}")
            return {}

    async def generate_research_ideas(self, papers_data: List[Dict[str, Any]], risk_level: str = "moderate") -> List[Dict[str, str]]:
        if not self.llm:
            return []
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nSUMMARY: {p['abstract'][:1000]}\n\n"

        risk_instruction = {
            "safe": "focus on incremental improvements and logical next steps.",
            "moderate": "propose novel combinations of existing methods or new applications.",
            "moonshot": "suggest radical shifts in methodology or wildly unique theoretical frameworks."
        }.get(risk_level, "propose a balanced mix of safe and novel ideas.")

        prompt = f"""Generate 3 high-potential research ideas based on the following corpus.
        Structure your ideas to be {risk_instruction}
        Format your response exactly as a JSON list of objects: 
        [{{ "title": "Idea Title", "rationale": "Why it's needed", "methods": "Proposed approach" }}]

        CORPUS:
        {context}
        """
        
        try:
            # Adjust temperature for moonshots? LLM parameter not directly in this call but we can instruct via prompt.
            response = await self.llm.generate_content_async(prompt)
            import json
            content = response.text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Idea Generation Error: {e}")
            return []

    async def compare_methodologies(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm:
            return "Intelligence engine not configured."
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nABSTRACT/CONTENT: {p['abstract'][:2000]}\n\n"
        
        prompt = f"""Compare the specific research methodologies used in the following papers.
        Highlight:
        1. STRENGTHS of each approach.
        2. WEAKNESSES or limitations.
        3. CORE DIFFERENCES in how they tackle the research problem.
        
        PAPERS:
        {context}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Method Comparison Error: {str(e)}"

    async def detect_flaws(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm:
            return "Intelligence engine not configured."
        
        context = ""
        for p in papers_data:
            context += f"PAPER: {p['title']}\nABSTRACT/CONTENT: {p['abstract'][:2000]}\n\n"
        
        prompt = f"""Perform a critical 'Flaw Detection' analysis on the following research corpus.
        Focus on:
        1. LOGICAL INCONSISTENCIES: Contradictions within or between papers.
        2. METHODOLOGICAL WEAKNESSES: Small sample sizes, lack of controls, or biased datasets.
        3. EVIDENTIARY GAPS: Claims that are not sufficiently supported by data.
        4. POTENTIAL BIASES: Industry influence or narrow perspective.
        
        CORPUS:
        {context}
        """
        
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Flaw Detection Error: {str(e)}"

    # --- New Reviewer Mode Methods ---

    async def generate_reviewer_scores(self, papers_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.llm: return {}
        context = "\n".join([f"PAPER: {p['title']}\nABSTRACT: {p['abstract'][:1500]}" for p in papers_data])
        prompt = f"""Evaluate the following research on a scale of 0 to 10 for the following metrics:
        1. CLARITY: How well-written and understandable is the paper?
        2. NOVELTY: How original and groundbreaking is the research?
        3. VALIDITY: How scientifically sound is the methodology?
        4. IMPACT: What is the potential contribution to the field?
        
        Format your response as a valid JSON object:
        {{"clarity": 8, "novelty": 7, "validity": 9, "impact": 8, "overall": 8}}
        
        CORPUS:
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
            print(f"Scoring Error: {e}")
            return {"clarity": 5, "novelty": 5, "validity": 5, "impact": 5, "overall": 5}

    async def verify_claims(self, papers_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not self.llm: return []
        context = "\n".join([f"PAPER: {p['title']}\nABSTRACT/METHODS: {p['abstract'][:2000]}" for p in papers_data])
        prompt = f"""Identify the top 3-5 major scientific claims made in this research and verify their support in the provided text.
        Format your response as a JSON list of objects:
        [{{"claim": "Claim text", "status": "supported", "context": "Reasoning for status"}}]
        Statuses: 'supported', 'unsupported', 'partial'.
        
        CORPUS:
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
            print(f"Claim Verification Error: {e}")
            return []

    async def generate_bias_report(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm: return "AI not configured."
        context = "\n".join([f"PAPER: {p['title']}\nABSTRACT: {p['abstract'][:2000]}" for p in papers_data])
        prompt = f"""Analyze the following research for potential bias, reproducibility concerns, and dataset limitations.
        Provide a concise but technical report.
        
        CORPUS:
        {context}
        """
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Bias Analysis Error: {str(e)}"

    async def generate_structured_review(self, papers_data: List[Dict[str, Any]]) -> str:
        if not self.llm: return "AI not configured."
        context = "\n".join([f"PAPER: {p['title']}\nABSTRACT: {p['abstract'][:2000]}" for p in papers_data])
        prompt = f"""Generate a formal, structured peer review report for the following research.
        Include sections:
        # Peer Review Report
        ## 1. Summary
        ## 2. Strengths
        ## 3. Major Weaknesses
        ## 4. Minor Points & Suggestions
        ## 5. Final Recommendation
        
        CORPUS:
        {context}
        """
        try:
            response = await self.llm.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Review Generation Error: {str(e)}"

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
