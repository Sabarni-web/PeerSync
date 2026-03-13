import pandas as pd
import numpy as np
import random

np.random.seed(42)
random.seed(42)

NUM_STUDENTS = 5000
NUM_MENTORS = 200
NUM_SESSIONS = 50000

# --- Constants ---
VARK_STYLES = ['Visual', 'Auditory', 'Read-Write', 'Kinesthetic']
SUBJECTS = [
    'Data Structures', 'Machine Learning', 'Web Development',
    'Calculus', 'Database Systems', 'Operating Systems',
    'Computer Networks', 'Python', 'Java', 'Statistics'
]
DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
TIME_SLOTS = ['Morning', 'Afternoon', 'Evening']
SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]


def generate_availability():
    """Generate a random availability schedule as a list of 'Day_Slot' strings."""
    num_slots = random.randint(3, 8)  # Each person is free 3-8 slots per week
    all_slots = [f"{day}_{slot}" for day in DAYS for slot in TIME_SLOTS]
    return sorted(random.sample(all_slots, num_slots))


def compute_schedule_overlap(student_avail, mentor_avail):
    """Compute the number of overlapping free slots."""
    return len(set(student_avail) & set(mentor_avail))


# =====================================================
# GENERATE MENTORS
# =====================================================
print("Generating Mentors...")

mentors_data = []
for i in range(NUM_MENTORS):
    # Each mentor can teach 1-3 subjects
    num_subjects = random.randint(1, 3)
    expertise = random.sample(SUBJECTS, num_subjects)

    mentors_data.append({
        'mentor_id': f"M{i + 1}",
        'name': f"Mentor_{i + 1}",
        'teaching_style': random.choice(VARK_STYLES),
        'subject_expertise': '|'.join(expertise),  # pipe-separated for CSV
        'availability': '|'.join(generate_availability()),
        'semester': random.choice(SEMESTERS[3:]),  # Mentors are usually in higher semesters
        'patience_score': round(random.uniform(3.0, 5.0), 1),  # Personality trait
    })

mentors_df = pd.DataFrame(mentors_data)

# =====================================================
# GENERATE STUDENTS
# =====================================================
print("Generating Students...")

students_data = []
for i in range(NUM_STUDENTS):
    # Each student struggles with 1-3 subjects
    num_struggles = random.randint(1, 3)
    struggles = random.sample(SUBJECTS, num_struggles)

    # Each student may be strong in 0-2 subjects (for future mentor opt-in)
    remaining = [s for s in SUBJECTS if s not in struggles]
    num_strengths = random.randint(0, min(2, len(remaining)))
    strengths = random.sample(remaining, num_strengths)

    students_data.append({
        'student_id': f"S{i + 1}",
        'name': f"Student_{i + 1}",
        'learning_style': random.choice(VARK_STYLES),
        'subjects_needed': '|'.join(struggles),
        'subjects_strong': '|'.join(strengths) if strengths else '',
        'availability': '|'.join(generate_availability()),
        'semester': random.choice(SEMESTERS),
        'gpa': round(random.uniform(2.0, 4.0), 2),  # GPA on 4.0 scale
    })

students_df = pd.DataFrame(students_data)

# =====================================================
# SIMULATE SESSIONS WITH MULTI-DIMENSIONAL RATINGS
# =====================================================
print(f"Simulating {NUM_SESSIONS} tutoring sessions...")

sessions_list = []
session_id = 0

for _ in range(NUM_SESSIONS):
    # Pick a random student
    student = students_df.sample(1).iloc[0]
    student_subjects = student['subjects_needed'].split('|')

    # Pick a random subject the student needs help with
    chosen_subject = random.choice(student_subjects)

    # Find mentors who teach this subject
    available_mentors = mentors_df[
        mentors_df['subject_expertise'].str.contains(chosen_subject, regex=False)
    ]

    if available_mentors.empty:
        continue

    # Pick a random available mentor
    mentor = available_mentors.sample(1).iloc[0]

    # --- Compute match factors ---
    style_match = 1 if student['learning_style'] == mentor['teaching_style'] else 0

    student_avail = student['availability'].split('|')
    mentor_avail = mentor['availability'].split('|')
    schedule_overlap = compute_schedule_overlap(student_avail, mentor_avail)

    # Normalize schedule overlap (0-1 range, max possible = 8)
    schedule_score = min(schedule_overlap / 8.0, 1.0)

    # --- Generate realistic rating based on multiple factors ---
    # Base score influenced by style match + schedule + mentor patience
    base_score = (
        2.0 * style_match +          # Style match adds 2 points
        1.5 * schedule_score +         # Good schedule overlap adds up to 1.5
        0.3 * (mentor['patience_score'] - 3.0) +  # Patience adds up to 0.6
        random.gauss(0, 0.5)           # Random noise
    )

    # Convert to 1-5 rating
    if base_score >= 3.0:
        rating_probs = [0.02, 0.03, 0.10, 0.35, 0.50]
    elif base_score >= 2.0:
        rating_probs = [0.05, 0.10, 0.35, 0.35, 0.15]
    elif base_score >= 1.0:
        rating_probs = [0.15, 0.30, 0.30, 0.20, 0.05]
    else:
        rating_probs = [0.35, 0.40, 0.15, 0.08, 0.02]

    rating = np.random.choice([1, 2, 3, 4, 5], p=rating_probs)

    # Generate session duration (good matches = longer sessions)
    base_duration = 20 + (rating * 8) + random.randint(-5, 10)
    duration_minutes = max(10, min(90, base_duration))  # Clamp between 10-90 min

    session_id += 1
    sessions_list.append({
        'session_id': f"SES{session_id}",
        'student_id': student['student_id'],
        'mentor_id': mentor['mentor_id'],
        'subject': chosen_subject,
        'style_match': style_match,
        'schedule_overlap': schedule_overlap,
        'duration_minutes': duration_minutes,
        'rating': rating,
    })

ratings_df = pd.DataFrame(sessions_list)

# =====================================================
# EXPORT TO CSV
# =====================================================
print("Exporting data to CSV files...")
mentors_df.to_csv('mentors.csv', index=False)
students_df.to_csv('students.csv', index=False)
ratings_df.to_csv('ratings.csv', index=False)

print("\n✅ Success! Generated:")
print(f"  - mentors.csv  ({len(mentors_df)} mentors, {mentors_df.columns.tolist()})")
print(f"  - students.csv ({len(students_df)} students, {students_df.columns.tolist()})")
print(f"  - ratings.csv  ({len(ratings_df)} sessions, {ratings_df.columns.tolist()})")

# --- Quick Stats ---
print("\n📊 Data Quality Check:")
print(f"  Average rating: {ratings_df['rating'].mean():.2f}")
print(f"  Style match rate: {ratings_df['style_match'].mean():.1%}")
print(f"  Avg session duration: {ratings_df['duration_minutes'].mean():.0f} minutes")
print(f"  Avg schedule overlap: {ratings_df['schedule_overlap'].mean():.1f} slots")

print("\n  Rating distribution:")
print(ratings_df['rating'].value_counts().sort_index().to_string())

print("\n📋 Preview of ratings.csv:")
print(ratings_df.head(10).to_string(index=False))
