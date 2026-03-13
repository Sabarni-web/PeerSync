"""
Hybrid Recommendation Module.

Combines Content-Based and Collaborative Filtering scores using
a weighted blend. The weight (alpha) auto-adjusts based on data availability.
"""


def compute_hybrid_score(
    content_score: float,
    collaborative_score: float,
    alpha: float = None,
    has_interaction_history: bool = True
) -> float:
    """
    Combine content-based and collaborative scores into a final hybrid score.

    Formula: final_score = alpha * content_score + (1 - alpha) * collaborative_score

    Args:
        content_score: Score from content-based filtering (0 to 1)
        collaborative_score: Score from collaborative filtering (0 to 1)
        alpha: Weight for content-based score (0 to 1).
               If None, auto-calculated based on data availability.
        has_interaction_history: Whether the student has past session history.

    Returns: Hybrid score between 0 and 1
    """
    if alpha is None:
        alpha = auto_tune_alpha(has_interaction_history)

    score = alpha * content_score + (1 - alpha) * collaborative_score

    return round(min(max(score, 0.0), 1.0), 4)


def auto_tune_alpha(has_interaction_history: bool) -> float:
    """
    Automatically determine the weight balance between content-based
    and collaborative filtering.

    Logic:
    - New user (no history) → alpha = 1.0 (100% content-based)
      Because collaborative filtering has no data to work with.

    - Existing user (has history) → alpha = 0.4 (40% content, 60% collaborative)
      Because collaborative filtering captures patterns that profiles can't.

    This is the cold-start handling strategy.

    Returns: alpha value between 0 and 1
    """
    if not has_interaction_history:
        # Cold start: rely entirely on profile similarity
        return 1.0
    else:
        # Established user: lean toward collaborative (it discovers hidden patterns)
        return 0.4


def score_to_percentage(score: float) -> int:
    """
    Convert a 0-1 score to a human-friendly match percentage.

    We apply a curve to make scores feel more intuitive:
    - Raw 0.7 → displayed as ~85% (feels like a good match)
    - Raw 0.5 → displayed as ~70% (feels moderate)
    - Raw 0.3 → displayed as ~55% (feels weak)

    Without this, most scores cluster around 0.4-0.7 which
    all feel "mediocre" to users.
    """
    # Apply a sigmoid-like curve to spread scores across 50-99%
    if score >= 0.8:
        percentage = 90 + (score - 0.8) * 50  # 90-100%
    elif score >= 0.5:
        percentage = 70 + (score - 0.5) * 66.7  # 70-90%
    elif score >= 0.3:
        percentage = 55 + (score - 0.3) * 75  # 55-70%
    else:
        percentage = 40 + score * 50  # 40-55%

    return min(99, max(40, int(round(percentage))))
