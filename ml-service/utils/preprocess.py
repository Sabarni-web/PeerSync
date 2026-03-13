"""
Feature Engineering Pipeline for PeerSync Recommendation Engine.

Takes raw student and mentor data and transforms it into numerical
feature vectors suitable for the recommendation model.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler


# All possible values for encoding
VARK_STYLES = ['Visual', 'Auditory', 'Read-Write', 'Kinesthetic']
ALL_SUBJECTS = [
    'Data Structures', 'Machine Learning', 'Web Development',
    'Calculus', 'Database Systems', 'Operating Systems',
    'Computer Networks', 'Python', 'Java', 'Statistics'
]
ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
ALL_SLOTS = ['Morning', 'Afternoon', 'Evening']
ALL_TIME_SLOTS = [f"{day}_{slot}" for day in ALL_DAYS for slot in ALL_SLOTS]  # 18 total


def encode_learning_style(style: str) -> np.ndarray:
    """
    One-hot encode a VARK learning style.
    Returns a 4-element vector: [Visual, Auditory, Read-Write, Kinesthetic]
    """
    vector = np.zeros(len(VARK_STYLES))
    if style in VARK_STYLES:
        vector[VARK_STYLES.index(style)] = 1.0
    return vector


def encode_subjects(subjects_str: str) -> np.ndarray:
    """
    Multi-hot encode subjects from a pipe-separated string.
    Returns a 10-element vector (one per subject).
    """
    vector = np.zeros(len(ALL_SUBJECTS))
    if not subjects_str or pd.isna(subjects_str):
        return vector
    subjects = subjects_str.split('|')
    for subj in subjects:
        subj = subj.strip()
        if subj in ALL_SUBJECTS:
            vector[ALL_SUBJECTS.index(subj)] = 1.0
    return vector


def encode_availability(availability_str: str) -> np.ndarray:
    """
    Multi-hot encode availability from a pipe-separated string of 'Day_Slot'.
    Returns an 18-element binary vector.
    """
    vector = np.zeros(len(ALL_TIME_SLOTS))
    if not availability_str or pd.isna(availability_str):
        return vector
    slots = availability_str.split('|')
    for slot in slots:
        slot = slot.strip()
        if slot in ALL_TIME_SLOTS:
            vector[ALL_TIME_SLOTS.index(slot)] = 1.0
    return vector


def compute_schedule_overlap(student_avail: np.ndarray, mentor_avail: np.ndarray) -> float:
    """
    Compute the normalized schedule overlap between student and mentor.
    Returns a value between 0 and 1.
    """
    overlap = np.sum(student_avail * mentor_avail)
    max_possible = min(np.sum(student_avail), np.sum(mentor_avail))
    if max_possible == 0:
        return 0.0
    return overlap / max_possible


def compute_subject_relevance(student_needs: np.ndarray, mentor_expertise: np.ndarray) -> float:
    """
    Compute how well a mentor's expertise covers the student's needs.
    Returns a value between 0 and 1.
    """
    overlap = np.sum(student_needs * mentor_expertise)
    student_total = np.sum(student_needs)
    if student_total == 0:
        return 0.0
    return overlap / student_total


def build_student_vector(student: dict) -> dict:
    """
    Build a complete feature vector for a student.

    Input: dict with keys: learning_style, subjects_needed, availability, gpa, semester
    Output: dict with encoded arrays and raw values
    """
    style_vec = encode_learning_style(student.get('learning_style', ''))
    subjects_vec = encode_subjects(student.get('subjects_needed', ''))
    avail_vec = encode_availability(student.get('availability', ''))
    gpa = float(student.get('gpa', 2.5))
    semester = int(student.get('semester', 1))

    # Normalize GPA to 0-1 range (assuming 0-4 scale)
    gpa_normalized = min(gpa / 4.0, 1.0)

    # Normalize semester to 0-1 range (assuming 1-8)
    semester_normalized = (semester - 1) / 7.0

    return {
        'style_vector': style_vec,
        'subjects_vector': subjects_vec,
        'availability_vector': avail_vec,
        'gpa_normalized': gpa_normalized,
        'semester_normalized': semester_normalized,
        'raw': student
    }


def build_mentor_vector(mentor: dict) -> dict:
    """
    Build a complete feature vector for a mentor.

    Input: dict with keys: teaching_style, subject_expertise, availability, semester, patience_score
    Output: dict with encoded arrays and raw values
    """
    style_vec = encode_learning_style(mentor.get('teaching_style', ''))
    expertise_vec = encode_subjects(mentor.get('subject_expertise', ''))
    avail_vec = encode_availability(mentor.get('availability', ''))
    semester = int(mentor.get('semester', 4))
    patience = float(mentor.get('patience_score', 3.5))

    semester_normalized = (semester - 1) / 7.0
    patience_normalized = (patience - 1.0) / 4.0  # Normalize 1-5 to 0-1

    return {
        'style_vector': style_vec,
        'expertise_vector': expertise_vec,
        'availability_vector': avail_vec,
        'semester_normalized': semester_normalized,
        'patience_normalized': patience_normalized,
        'raw': mentor
    }


def generate_match_reasons(
    style_match: float,
    subject_relevance: float,
    schedule_overlap: float,
    mentor: dict
) -> list:
    """
    Generate human-readable reason tags explaining WHY this mentor was matched.
    """
    reasons = []

    if style_match > 0.9:
        student_style = mentor.get('teaching_style', 'Unknown')
        reasons.append(f"{student_style} teaching style matches yours")
    elif style_match > 0.5:
        reasons.append("Compatible teaching approach")

    if subject_relevance >= 1.0:
        reasons.append("Expert in all your needed subjects")
    elif subject_relevance > 0.5:
        reasons.append("Covers most of your needed subjects")
    elif subject_relevance > 0:
        reasons.append("Relevant subject expertise")

    if schedule_overlap > 0.6:
        reasons.append("Excellent schedule compatibility")
    elif schedule_overlap > 0.3:
        reasons.append("Good schedule overlap")

    patience = float(mentor.get('patience_score', 3.0))
    if patience >= 4.5:
        reasons.append("Highly rated for patience")
    elif patience >= 4.0:
        reasons.append("Known for clear explanations")

    return reasons
