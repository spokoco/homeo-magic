#!/usr/bin/env python3
"""
Repertorization engine: find remedies matching multiple rubrics.
"""

import json
from pathlib import Path
from collections import defaultdict

def load_data():
    """Load rubrics and remedies from JSON files."""
    data_dir = Path(__file__).parent.parent / "data"

    with open(data_dir / "symptoms.json") as f:
        rubrics = json.load(f)

    with open(data_dir / "remedies.json") as f:
        remedies = json.load(f)

    return rubrics, remedies

def search_rubrics(query: str, rubrics: dict, limit: int = 10) -> list[str]:
    """Search for rubrics matching a query string."""
    query = query.lower()
    matches = []

    for rubric in rubrics.keys():
        if query in rubric.lower():
            matches.append(rubric)
            if len(matches) >= limit:
                break

    return matches

def repertorize(selected_rubrics: list[str], rubrics: dict, remedies: dict) -> list[tuple[str, int, dict]]:
    """
    Find remedies that appear in ALL selected rubrics.
    Returns list of (remedy_abbrev, total_score, breakdown) sorted by score descending.
    """
    if not selected_rubrics:
        return []

    # Gather remedy scores per rubric
    remedy_scores = defaultdict(lambda: {"total": 0, "breakdown": {}})
    remedy_presence = defaultdict(set)  # track which rubrics each remedy appears in

    for rubric in selected_rubrics:
        if rubric not in rubrics:
            print(f"Warning: rubric not found: {rubric}")
            continue

        for remedy_abbrev, weight in rubrics[rubric]["remedies"].items():
            remedy_scores[remedy_abbrev]["total"] += weight
            remedy_scores[remedy_abbrev]["breakdown"][rubric] = weight
            remedy_presence[remedy_abbrev].add(rubric)

    # Filter to only remedies present in ALL rubrics
    num_rubrics = len(selected_rubrics)
    results = []

    for remedy_abbrev, scores in remedy_scores.items():
        if len(remedy_presence[remedy_abbrev]) == num_rubrics:
            full_name = remedies.get(remedy_abbrev, remedy_abbrev)
            results.append((remedy_abbrev, scores["total"], scores["breakdown"], full_name))

    # Sort by total score descending
    results.sort(key=lambda x: -x[1])

    return results

def demo():
    """Run a demo repertorization."""
    print("Loading data...")
    rubrics, remedies = load_data()
    print(f"Loaded {len(rubrics)} rubrics, {len(remedies)} remedies\n")

    # Demo: search for rubrics
    print("=== Searching for 'headache' ===")
    matches = search_rubrics("headache", rubrics, limit=15)
    for m in matches:
        print(f"  {m}")

    print("\n=== Searching for 'irritab' ===")
    matches = search_rubrics("irritab", rubrics, limit=10)
    for m in matches:
        print(f"  {m}")

    print("\n=== Searching for 'cold, agg' ===")
    matches = search_rubrics("cold, agg", rubrics, limit=10)
    for m in matches:
        print(f"  {m}")

    # Demo repertorization
    print("\n" + "="*60)
    print("DEMO REPERTORIZATION")
    print("="*60)

    selected = [
        "Head, pain, morning",
        "Mind, irritability",
        "Generalities, cold, in general agg."
    ]

    print(f"\nSelected rubrics:")
    for s in selected:
        print(f"  • {s}")

    results = repertorize(selected, rubrics, remedies)
    
    print(f"\nResults ({len(results)} remedies in intersection):\n")
    
    for i, (abbrev, score, breakdown, name) in enumerate(results[:15], 1):
        breakdown_str = " + ".join(f"{s.split(',')[0]}({w})" for s, w in breakdown.items())
        print(f"  {i:2}. {abbrev:12} {score:3} pts  ({name})")
        print(f"      {breakdown_str}")

if __name__ == "__main__":
    demo()
