# PaperFlow AI — Role-Adaptive Research Intelligence Workspace

## Overview
PaperFlow AI is a production-ready, full-stack research platform designed to serve Students, Researchers, and Peer Review Evaluators within a single, unified intelligent workspace.

## Features
- **Role-Adaptive UI:** The workspace adapts its intelligence panel and behavior based on the selected role (Student, Researcher, or Reviewer).
- **Persistent Knowledge Graph:** Interactive React Flow graph visualizing paper relationships.
- **AI-Powered Ingestion:** PDF parsing, chunking, and semantic embedding storage using FAISS.
- **RAG Query Engine:** Context-aware Q&A for papers using local vector search.
- **Role-Specific Intelligence:**
  - *Student:* Simplified summaries and podcast generation hooks.
  - *Researcher:* Gap detection and novelty checking.
  - *Reviewer:* Flaw detection and review report generation.

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Zustand, React Flow, Framer Motion.
- **Backend:** FastAPI, SQLAlchemy, SQLite (local dev), FAISS (vector DB), Sentence Transformers.

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

## Architecture
- **Monolithic FastAPI:** Centralized API handling Auth, Paper Management, and AI pipelines.
- **Local FAISS:** Enables high-performance semantic search without external cloud dependencies.
- **Unified Workspace:** A single-screen React application that manages complex state via Zustand and provides a fluid user experience.
