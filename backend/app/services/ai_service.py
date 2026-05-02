import os
from typing import List
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings

class AIService:
    def __init__(self):
        # Using a lightweight model for local development
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.dimension = 384 # Dimension of all-MiniLM-L6-v2
        self.index = faiss.IndexFlatL2(self.dimension)
        self.chunks = [] # Store text chunks associated with index IDs

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
        # Placeholder for LLM call (e.g., OpenAI or Gemini)
        # For now, return a mock response
        return f"AI Response based on context ({len(context)} chars): This is a simulated response to: {prompt[:50]}..."

ai_service = AIService()
