"""
Content-Based Filtering Module.

Computes similarity between a student's profile and each mentor's profile
using cosine similarity across multiple feature dimensions.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def compute_style_similarity(student_style: np.ndarray, mentor_style: np.ndarray) -> float:
    """
    Compute cosine similarity between student learning style and mentor teaching style.
    Both are one-hot encoded VARK vectors.

    Returns: float between 0 and 1
        - 1.0 = exact style match
        - 0.0 = no match
    """
    if np.sum(student_style) == 0 or np.sum(mentor_style) == 0:
        return 0.0

    sim = cosine_similarity(
        student_style.reshape(1, -1),
        mentor_style.reshape(1, -1)
    )[0][0]

    return max(0.0, float(sim))


def compute_subject_similarity(student_subjects: np.ndarray, mentor_subjects: np.ndarray) -> float:
    """
    Compute cosine similarity between student's needed subjects
    and mentor's expertise subjects.

    Both are multi-hot encoded vectors over ALL_SUBJECTS.

    Returns: float between 0 and 1
    """
    if np.sum(student_subjects) == 0 or np.sum(mentor_subjects) == 0:
        return 0.0

    sim = cosine_similarity(
        student_subjects.reshape(1, -1),
        mentor_subjects.reshape(1, -1)
    )[0][0]

    return max(0.0, float(sim))


def compute_content_score(student_vector: dict, mentor_vector: dict, weights: dict = None) -> float:
    """
    Compute the overall content-based similarity score between a student and mentor.

    Combines multiple similarity dimensions with configurable weights:
    - Style similarity (learning style ↔ teaching style)
    - Subject similarity (needs ↔ expertise)
    - Schedule overlap
    - Semester proximity (closer semesters may relate better)

    Args:
        student_vector: Output from build_student_vector()
        mentor_vector: Output from build_mentor_vector()
        weights: Optional dict of dimension weights

    Returns: float between 0 and 1
    """
    if weights is None:
        weights = {
            'style': 0.30,       # Learning/teaching style match
            'subject': 0.35,     # Subject expertise relevance
            'schedule': 0.20,    # Schedule compatibility
            'semester': 0.05,    # Semester proximity
            'patience': 0.10,    # Mentor patience score
        }

    # 1. Style similarity
    style_sim = compute_style_similarity(
        student_vector['style_vector'],
        mentor_vector['style_vector']
    )

    # 2. Subject similarity
    subject_sim = compute_subject_similarity(
        student_vector['subjects_vector'],
        mentor_vector['expertise_vector']
    )

    # 3. Schedule overlap (already computed in preprocess)
    from utils.preprocess import compute_schedule_overlap
    schedule_sim = compute_schedule_overlap(
        student_vector['availability_vector'],
        mentor_vector['availability_vector']
    )

    # 4. Semester proximity (mentors 1-3 semesters ahead are ideal)
    semester_diff = abs(
        mentor_vector['semester_normalized'] - student_vector['semester_normalized']
    )
    # Ideal is 1-3 semesters ahead, penalize same semester or too far
    ideal_diff = 2.0 / 7.0  # ~2 semesters normalized
    semester_sim = max(0, 1.0 - abs(semester_diff - ideal_diff) * 3)

    # 5. Mentor patience score (already normalized)
    patience_sim = mentor_vector['patience_normalized']

    # Weighted combination
    score = (
        weights['style'] * style_sim +
        weights['subject'] * subject_sim +
        weights['schedule'] * schedule_sim +
        weights['semester'] * semester_sim +
        weights['patience'] * patience_sim
    )

    return round(min(max(score, 0.0), 1.0), 4)


def rank_mentors_content_based(student_vector: dict, mentor_vectors: list) -> list:
    """
    Rank all mentors by content-based score for a given student.

    Args:
        student_vector: Processed student feature vector
        mentor_vectors: List of processed mentor feature vectors

    Returns: List of (mentor_index, score) tuples, sorted descending by score
    """
    scores = []
    for idx, mentor_vec in enumerate(mentor_vectors):
        score = compute_content_score(student_vector, mentor_vec)
        scores.append((idx, score))

    # Sort by score descending
    scores.sort(key=lambda x: x[1], reverse=True)

    return scores
