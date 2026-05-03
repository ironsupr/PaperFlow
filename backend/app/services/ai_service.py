import os
from typing import List, Dict
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from app.core.config import settings

class AIService:
    def __init__(self):
        # Local Embedding Model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384
        self.index = faiss.IndexFlatL2(self.dimension)
        self.chunks = []

        # Gemini Configuration
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.llm = genai.GenerativeModel('gemini-3.1-flash-lite-preview')
        else:
            self.llm = None

    def generate_embeddings(self, text: str) -> np.ndarray:
        return self.model.encode([text])[0]

    def add_to_index(self, text_chunks: List[str]):
        if not text_chunks:
            return
        embeddings = self.model.encode(text_chunks)
        self.index.add(np.array(embeddings).astype('float32'))
        self.chunks.extend(text_chunks)

    def search_similar(self, query: str, top_k: int = 5) -> List[str]:
        query_vector = self.model.encode([query]).astype('float32')
        distances, indices = self.index.search(query_vector, top_k)
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.chunks):
                results.append(self.chunks[idx])
        return results

    async def generate_response(self, prompt: str, context: str = "") -> str:
        if not self.llm:
            return "Gemini API Key not configured. Please add GEMINI_API_KEY to your .env file."
        
        full_prompt = f"Context: {context}\n\nUser Question: {prompt}\n\nAssistant Response:"
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
        prompt = f"{system_instruction}\n\nText to summarize:\n{text[:15000]}" # Gemini handles large context, but let's be safe
        
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
            # Try to extract the first number found
            match = re.search(r'\d+', response.text)
            return int(match.group()) if match else 50
        except:
            return 50

ai_service = AIService()
