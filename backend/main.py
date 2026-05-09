from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.session import engine, Base
from app.models import user, paper, graph_review
from sqlalchemy import text
from app.api.endpoints import auth, papers, ai, explore
import os

# Create tables
Base.metadata.create_all(bind=engine)

# Quick Auto-migration for existing SQLite database
def run_migrations():
    columns_to_add = [
        ("created_at", "VARCHAR"),
        ("year", "INTEGER"),
        ("domain", "VARCHAR"),
        ("topic", "VARCHAR"),
        ("citation_contexts", "JSON"),
        ("sections", "JSON"),
        ("highlights", "JSON")
    ]
    with engine.connect() as conn:
        # Check existing columns
        try:
            result = conn.execute(text("PRAGMA table_info(papers)"))
            existing_columns = [row[1] for row in result]
            for col_name, col_type in columns_to_add:
                if col_name not in existing_columns:
                    print(f"Migrating: Adding column {col_name} to papers table...")
                    conn.execute(text(f"ALTER TABLE papers ADD COLUMN {col_name} {col_type}"))
            if "created_at" in existing_columns or any(col_name == "created_at" for col_name, _ in columns_to_add):
                conn.execute(text("UPDATE papers SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)"))
            conn.commit()
        except Exception as e:
            print(f"Migration warning: {e}")

run_migrations()

app = FastAPI(title="PaperFlow AI API")

os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(papers.router, prefix="/papers", tags=["papers"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(explore.router, prefix="/explore", tags=["explore"])

@app.get("/")
async def root():
    return {"message": "Welcome to PaperFlow AI API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
