"""
API Routes for the PeerSync ML Microservice.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

# The recommender instance is injected from app.py
recommender = None


def set_recommender(rec):
    """Set the recommender instance (called from app.py on startup)."""
    global recommender
    recommender = rec


# --- Request/Response Models ---

class StudentProfile(BaseModel):
    """Student data for recommendation request."""
    student_id: Optional[str] = None
    learning_style: str = Field(..., description="VARK style: Visual, Auditory, Read-Write, Kinesthetic")
    subjects_needed: str = Field(..., description="Pipe-separated subjects, e.g. 'Data Structures|Machine Learning'")
    availability: str = Field(..., description="Pipe-separated time slots, e.g. 'Mon_Morning|Wed_Afternoon'")
    gpa: float = Field(default=2.5, ge=0.0, le=4.0)
    semester: int = Field(default=1, ge=1, le=8)

    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "S42",
                "learning_style": "Visual",
                "subjects_needed": "Data Structures|Machine Learning",
                "availability": "Mon_Morning|Wed_Afternoon|Fri_Evening",
                "gpa": 3.2,
                "semester": 3
            }
        }


class RecommendRequest(BaseModel):
    """Request body for /recommend endpoint."""
    student: StudentProfile
    top_n: int = Field(default=3, ge=1, le=10)
    subject_filter: Optional[str] = None


class FeedbackRequest(BaseModel):
    """Request body for /feedback endpoint."""
    student_id: str
    mentor_id: str
    rating: int = Field(..., ge=1, le=5)


class MentorRecommendation(BaseModel):
    """Single mentor recommendation in the response."""
    mentor_id: str
    name: str
    match_percentage: int
    hybrid_score: float
    content_score: float
    collaborative_score: float
    style_match: bool
    schedule_overlap: int
    subject_relevance: float
    reasons: list
    mentor_details: dict


class RecommendResponse(BaseModel):
    """Response body for /recommend endpoint."""
    success: bool
    student_id: Optional[str]
    total_matches: int
    recommendations: list


# --- Endpoints ---

@router.post("/recommend", response_model=RecommendResponse)
async def get_recommendations(request: RecommendRequest):
    """
    Get top N mentor recommendations for a student.

    This is the core endpoint. It:
    1. Takes a student's profile data
    2. Runs it through the hybrid recommendation engine
    3. Returns ranked mentor matches with scores and reasons
    """
    if recommender is None:
        raise HTTPException(status_code=500, detail="Recommender not initialized")

    try:
        student_data = request.student.model_dump()

        results = recommender.recommend(
            student_data=student_data,
            top_n=request.top_n,
            subject_filter=request.subject_filter
        )

        return RecommendResponse(
            success=True,
            student_id=request.student.student_id,
            total_matches=len(results),
            recommendations=results
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit a post-session rating.

    This endpoint:
    1. Records the rating
    2. Triggers model retraining
    3. Future recommendations will reflect this feedback
    """
    if recommender is None:
        raise HTTPException(status_code=500, detail="Recommender not initialized")

    try:
        recommender.add_feedback(
            student_id=request.student_id,
            mentor_id=request.mentor_id,
            rating=request.rating
        )

        return {
            "success": True,
            "message": f"Feedback recorded: {request.student_id} rated {request.mentor_id} {request.rating}/5 stars. Model retrained."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": recommender is not None and recommender.is_loaded,
        "collaborative_trained": recommender is not None and recommender.collaborative.is_trained
    }


@router.get("/stats")
async def get_stats():
    """Get model statistics."""
    if recommender is None or not recommender.is_loaded:
        raise HTTPException(status_code=500, detail="Recommender not loaded")

    return {
        "total_mentors": len(recommender.mentors_df),
        "total_students": len(recommender.students_df),
        "total_ratings": len(recommender.ratings_df),
        "avg_rating": round(recommender.ratings_df['rating'].mean(), 2),
        "collaborative_trained": recommender.collaborative.is_trained
    }
