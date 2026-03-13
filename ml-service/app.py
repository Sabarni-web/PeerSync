"""
PeerSync ML Microservice — FastAPI Entry Point

Starts the recommendation engine and exposes REST API endpoints
for the Node.js backend to call.

Usage:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, set_recommender
from models.recommender import PeerSyncRecommender


# --- Lifespan: Load model on startup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the recommendation engine when the server starts."""
    print("=" * 60)
    print("  PeerSync ML Microservice Starting...")
    print("=" * 60)

    # Initialize recommender
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    rec = PeerSyncRecommender(data_dir=data_dir)

    # Load data and train
    rec.load_data()
    rec.train()

    # Inject into routes
    set_recommender(rec)

    print("=" * 60)
    print("  ML Engine Ready! Accepting requests.")
    print("=" * 60)

    yield  # Server is running

    # Cleanup on shutdown
    print("ML Microservice shutting down...")


# --- Create FastAPI App ---
app = FastAPI(
    title="PeerSync ML Service",
    description="AI-Powered Peer Mentor Recommendation Engine",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS (allow Node.js backend to call this service) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your backend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Routes ---
app.include_router(router, prefix="/api/ml")


# --- Root Endpoint ---
@app.get("/")
async def root():
    return {
        "service": "PeerSync ML Microservice",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "recommend": "POST /api/ml/recommend",
            "feedback": "POST /api/ml/feedback",
            "health": "GET /api/ml/health",
            "stats": "GET /api/ml/stats"
        }
    }
