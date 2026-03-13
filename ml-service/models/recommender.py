"""
PeerSync Hybrid Recommendation Engine.

This is the main orchestrator that:
1. Loads student/mentor data and ratings
2. Trains the collaborative filter
3. For a given student, computes both content-based and collaborative scores
4. Blends them using the hybrid strategy
5. Returns the top N mentor recommendations with match reasons
"""

import os
import pandas as pd
import numpy as np
import joblib

from utils.preprocess import (
    build_student_vector,
    build_mentor_vector,
    compute_schedule_overlap,
    compute_subject_relevance,
    generate_match_reasons
)
from utils.content_based import compute_content_score
from utils.collaborative import CollaborativeFilter
from utils.hybrid import compute_hybrid_score, score_to_percentage


class PeerSyncRecommender:
    """
    The main recommendation engine that combines content-based
    and collaborative filtering for peer mentor matching.
    """

    def __init__(self, data_dir: str = None):
        """
        Args:
            data_dir: Path to directory containing mentors.csv, students.csv, ratings.csv
        """
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')

        self.data_dir = data_dir
        self.mentors_df = None
        self.students_df = None
        self.ratings_df = None
        self.mentor_vectors = []       # Pre-computed mentor feature vectors
        self.collaborative = CollaborativeFilter(n_factors=20)
        self.is_loaded = False

    def load_data(self):
        """Load CSV data files and pre-compute mentor vectors."""
        print("Loading data...")

        mentors_path = os.path.join(self.data_dir, 'mentors.csv')
        students_path = os.path.join(self.data_dir, 'students.csv')
        ratings_path = os.path.join(self.data_dir, 'ratings.csv')

        self.mentors_df = pd.read_csv(mentors_path)
        self.students_df = pd.read_csv(students_path)
        self.ratings_df = pd.read_csv(ratings_path)

        print(f"  Loaded {len(self.mentors_df)} mentors")
        print(f"  Loaded {len(self.students_df)} students")
        print(f"  Loaded {len(self.ratings_df)} sessions/ratings")

        # Pre-compute mentor feature vectors
        print("Pre-computing mentor feature vectors...")
        self.mentor_vectors = []
        for _, mentor in self.mentors_df.iterrows():
            vec = build_mentor_vector(mentor.to_dict())
            self.mentor_vectors.append(vec)

        self.is_loaded = True

    def train(self):
        """Train the collaborative filtering model on historical ratings."""
        if not self.is_loaded:
            self.load_data()

        print("Training collaborative filter...")
        self.collaborative.fit(self.ratings_df)
        print("Training complete!")

    def save_model(self, path: str = None):
        """Save the trained model to disk."""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), 'recommender.pkl')
        joblib.dump(self.collaborative, path)
        print(f"Model saved to {path}")

    def load_model(self, path: str = None):
        """Load a pre-trained model from disk."""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), 'recommender.pkl')
        if os.path.exists(path):
            self.collaborative = joblib.load(path)
            print(f"Model loaded from {path}")
        else:
            print(f"No saved model found at {path}. Training from scratch...")
            self.train()

    def recommend(
        self,
        student_data: dict,
        top_n: int = 3,
        subject_filter: str = None
    ) -> list:
        """
        Get top N mentor recommendations for a student.

        Args:
            student_data: Dict with student profile fields:
                - student_id (optional, for collaborative lookup)
                - learning_style: str (e.g., 'Visual')
                - subjects_needed: str (pipe-separated, e.g., 'Data Structures|Machine Learning')
                - availability: str (pipe-separated, e.g., 'Mon_Morning|Wed_Afternoon')
                - gpa: float
                - semester: int
            top_n: Number of recommendations to return (default 3)
            subject_filter: Optional specific subject to filter mentors by

        Returns: List of dicts, each containing:
            - mentor_id, name, match_percentage, content_score,
              collaborative_score, hybrid_score, reasons, mentor_details
        """
        if not self.is_loaded:
            self.load_data()

        # Build student feature vector
        student_vec = build_student_vector(student_data)
        student_id = student_data.get('student_id', None)

        # Check if student has interaction history (for cold-start handling)
        has_history = False
        if student_id and self.ratings_df is not None:
            has_history = student_id in self.ratings_df['student_id'].values

        results = []

        for idx, mentor_row in self.mentors_df.iterrows():
            mentor_data = mentor_row.to_dict()
            mentor_vec = self.mentor_vectors[idx]
            mentor_id = mentor_data.get('mentor_id', f'M{idx}')

            # Optional subject filter
            if subject_filter:
                expertise = mentor_data.get('subject_expertise', '')
                if subject_filter not in expertise:
                    continue

            # Hard filter: skip mentors with 0 subject overlap
            subject_relevance = compute_subject_relevance(
                student_vec['subjects_vector'],
                mentor_vec['expertise_vector']
            )
            if subject_relevance == 0:
                continue

            # --- Content-Based Score ---
            content_score = compute_content_score(student_vec, mentor_vec)

            # --- Collaborative Score ---
            if self.collaborative.is_trained and student_id:
                collab_score = self.collaborative.predict(student_id, mentor_id)
            else:
                collab_score = 0.5  # Neutral if no collaborative data

            # --- Hybrid Blend ---
            hybrid_score = compute_hybrid_score(
                content_score,
                collab_score,
                has_interaction_history=has_history
            )

            # Schedule overlap for reasons
            schedule_overlap = compute_schedule_overlap(
                student_vec['availability_vector'],
                mentor_vec['availability_vector']
            )

            # Style match for reasons
            style_match = float(np.dot(
                student_vec['style_vector'],
                mentor_vec['style_vector']
            ))

            # Generate human-readable reasons
            reasons = generate_match_reasons(
                style_match, subject_relevance, schedule_overlap, mentor_data
            )

            results.append({
                'mentor_id': mentor_id,
                'name': mentor_data.get('name', f'Mentor {idx + 1}'),
                'match_percentage': score_to_percentage(hybrid_score),
                'hybrid_score': round(hybrid_score, 4),
                'content_score': round(content_score, 4),
                'collaborative_score': round(collab_score, 4),
                'style_match': bool(style_match > 0.9),
                'schedule_overlap': int(schedule_overlap * 8),
                'subject_relevance': round(subject_relevance, 2),
                'reasons': reasons,
                'mentor_details': {
                    'teaching_style': mentor_data.get('teaching_style', ''),
                    'subject_expertise': mentor_data.get('subject_expertise', '').split('|'),
                    'availability': mentor_data.get('availability', '').split('|'),
                    'semester': int(mentor_data.get('semester', 0)),
                    'patience_score': float(mentor_data.get('patience_score', 0)),
                }
            })

        # Sort by hybrid score descending
        results.sort(key=lambda x: x['hybrid_score'], reverse=True)

        # Return top N
        return results[:top_n]

    def add_feedback(self, student_id: str, mentor_id: str, rating: int):
        """
        Add a new rating to the dataset and flag for retraining.

        In a production system, this would trigger an async retraining job.
        For the hackathon demo, we retrain immediately (it's fast enough).

        Args:
            student_id: The student who gave the rating
            mentor_id: The mentor who was rated
            rating: Integer rating 1-5
        """
        new_row = pd.DataFrame([{
            'student_id': student_id,
            'mentor_id': mentor_id,
            'subject': 'Unknown',
            'rating': rating
        }])

        self.ratings_df = pd.concat([self.ratings_df, new_row], ignore_index=True)

        # Retrain collaborative filter with updated data
        print(f"Feedback received: {student_id} → {mentor_id} = {rating} stars")
        print("Retraining collaborative filter...")
        self.collaborative.fit(self.ratings_df)
        print("Retrained! Future recommendations will reflect this feedback.")
