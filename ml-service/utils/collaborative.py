"""
Collaborative Filtering Module.

Uses the student-mentor interaction matrix (past ratings) to find patterns:
"Students similar to you rated Mentor X highly."

Implements SVD-based matrix factorization for latent factor discovery.
"""

import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD


class CollaborativeFilter:
    """
    Collaborative filtering recommendation engine using SVD matrix factorization.

    Learns latent factors from the student-mentor rating matrix to predict
    how a student would rate a mentor they haven't interacted with yet.
    """

    def __init__(self, n_factors: int = 20):
        """
        Args:
            n_factors: Number of latent factors for SVD decomposition.
                       Higher = more nuanced patterns but slower and risk of overfitting.
                       20 is a good balance for our data size.
        """
        self.n_factors = n_factors
        self.svd = None
        self.student_factors = None        # Student latent factor matrix
        self.mentor_factors = None         # Mentor latent factor matrix
        self.student_id_map = {}           # student_id → matrix row index
        self.mentor_id_map = {}            # mentor_id → matrix column index
        self.global_mean = 0.0             # Global average rating (for cold-start fallback)
        self.student_means = {}            # Per-student average rating
        self.mentor_means = {}             # Per-mentor average rating
        self.is_trained = False

    def fit(self, ratings_df: pd.DataFrame):
        """
        Train the collaborative filter on historical ratings data.

        Args:
            ratings_df: DataFrame with columns [student_id, mentor_id, rating]
        """
        if ratings_df.empty:
            print("Warning: Empty ratings data. Collaborative filter not trained.")
            return

        # Build ID mappings
        unique_students = ratings_df['student_id'].unique()
        unique_mentors = ratings_df['mentor_id'].unique()

        self.student_id_map = {sid: idx for idx, sid in enumerate(unique_students)}
        self.mentor_id_map = {mid: idx for idx, mid in enumerate(unique_mentors)}

        n_students = len(unique_students)
        n_mentors = len(unique_mentors)

        # Compute means for normalization
        self.global_mean = ratings_df['rating'].mean()

        self.student_means = (
            ratings_df.groupby('student_id')['rating'].mean().to_dict()
        )
        self.mentor_means = (
            ratings_df.groupby('mentor_id')['rating'].mean().to_dict()
        )

        # Build the rating matrix (students × mentors)
        # Fill missing values with 0 (will be handled by SVD)
        rating_matrix = np.zeros((n_students, n_mentors))

        for _, row in ratings_df.iterrows():
            s_idx = self.student_id_map[row['student_id']]
            m_idx = self.mentor_id_map[row['mentor_id']]
            rating_matrix[s_idx][m_idx] = row['rating']

        # Mean-center the matrix (subtract row means) for better SVD
        row_means = np.zeros(n_students)
        for i in range(n_students):
            non_zero = rating_matrix[i][rating_matrix[i] > 0]
            if len(non_zero) > 0:
                row_means[i] = non_zero.mean()
                mask = rating_matrix[i] > 0
                rating_matrix[i][mask] -= row_means[i]

        # Apply SVD decomposition
        n_components = min(self.n_factors, n_students - 1, n_mentors - 1)
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)

        self.student_factors = self.svd.fit_transform(rating_matrix)
        self.mentor_factors = self.svd.components_.T  # Transpose to get (n_mentors × n_factors)

        self.is_trained = True
        print(f"Collaborative filter trained: {n_students} students × {n_mentors} mentors")
        print(f"  Explained variance ratio: {self.svd.explained_variance_ratio_.sum():.2%}")

    def predict(self, student_id: str, mentor_id: str) -> float:
        """
        Predict the rating a student would give to a mentor.

        Args:
            student_id: The student's ID
            mentor_id: The mentor's ID

        Returns: Predicted rating normalized to 0-1 scale
        """
        if not self.is_trained:
            return 0.5  # Neutral fallback

        # Handle cold-start: unknown student or mentor
        if student_id not in self.student_id_map:
            # New student: return mentor's average rating
            if mentor_id in self.mentor_means:
                return self.mentor_means[mentor_id] / 5.0
            return self.global_mean / 5.0

        if mentor_id not in self.mentor_id_map:
            # New mentor: return student's average rating
            if student_id in self.student_means:
                return self.student_means[student_id] / 5.0
            return self.global_mean / 5.0

        # Both known: compute dot product of latent factors
        s_idx = self.student_id_map[student_id]
        m_idx = self.mentor_id_map[mentor_id]

        prediction = np.dot(
            self.student_factors[s_idx],
            self.mentor_factors[m_idx]
        )

        # Add back the student's mean
        student_mean = self.student_means.get(student_id, self.global_mean)
        prediction += student_mean

        # Clamp to 1-5 range, then normalize to 0-1
        prediction = max(1.0, min(5.0, prediction))
        return prediction / 5.0

    def rank_mentors(self, student_id: str, mentor_ids: list) -> list:
        """
        Rank a list of mentors by predicted rating for a student.

        Args:
            student_id: The student's ID
            mentor_ids: List of mentor IDs to rank

        Returns: List of (mentor_id, predicted_score) tuples, sorted descending
        """
        scores = []
        for mid in mentor_ids:
            score = self.predict(student_id, mid)
            scores.append((mid, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores
