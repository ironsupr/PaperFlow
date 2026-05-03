from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.models import user, paper, graph_review

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PaperFlow AI API")

@app.on_event("startup")
async def startup_event():
    from app.db.session import SessionLocal
    from app.services.ai_service import ai_service
    db = SessionLocal()
    try:
        await ai_service.index_all_papers(db)
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import auth, papers, ai
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(papers.router, prefix="/papers", tags=["papers"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])

@app.get("/")
async def root():
    return {"message": "Welcome to PaperFlow AI API"}

# Include routers here later
# from .app.api.endpoints import auth, papers, ai, graph, research, review, explore
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# ...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
